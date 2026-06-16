import { supabase } from '../lib/supabase';
import type { AttendanceAlert, AlertStatus, ResolutionAction } from '../types';

export const alertsService = {
  async getAlerts(filters?: { status?: AlertStatus; employee_id?: string; startDate?: string; endDate?: string }) {
    let query = supabase.from('attendance_alerts').select(`
      *,
      employee:employees!attendance_alerts_employee_id_fkey(id, full_name, matricula),
      summary:attendance_daily_summaries!attendance_alerts_summary_id_fkey(
        id, expected_minutes, worked_minutes, break_minutes,
        authorized_overtime_minutes, unauthorized_overtime_minutes, realized_overtime_minutes,
        overtime_status, balance_minutes
      )
    `).order('alert_date', { ascending: false }).order('created_at', { ascending: false });

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.employee_id) query = query.eq('employee_id', filters.employee_id);
    if (filters?.startDate) query = query.gte('alert_date', filters.startDate);
    if (filters?.endDate) query = query.lte('alert_date', filters.endDate);

    const { data, error } = await query;
    if (error) throw error;
    return data as (AttendanceAlert & { employee: any, summary: any })[];
  },

  async generateAlertsFromSummaries(startDate: string, endDate: string) {
    // Busca summaries no período que tem HE indevida ou estouro de pausa
    // Usa schedule_id do próprio summary (gravado no fechamento de ponto)
    const { data: summaries, error } = await supabase
      .from('attendance_daily_summaries')
      .select('*')
      .gte('server_date', startDate)
      .lte('server_date', endDate)
      .or('unauthorized_overtime_minutes.gt.0,break_minutes.gt.0');
    
    if (error) throw error;
    if (!summaries || summaries.length === 0) return 0;

    // Busca escalas via schedule_id do summary (quando disponível)
    const scheduleIdsFromSummary = [...new Set(summaries.map((s: any) => s.schedule_id).filter(Boolean))];
    let schedulesMap: Record<string, number> = {};

    if (scheduleIdsFromSummary.length > 0) {
      const { data: schedules } = await supabase
        .from('work_schedules')
        .select('id, break_duration_minutes')
        .in('id', scheduleIdsFromSummary);
      if (schedules) {
        schedules.forEach((sch: any) => { schedulesMap[sch.id] = sch.break_duration_minutes || 60; });
      }
    }

    // Para summaries sem schedule_id, buscar via employee_schedules ativo
    const summariesWithoutSchedule = summaries.filter((s: any) => !s.schedule_id);
    if (summariesWithoutSchedule.length > 0) {
      const empIds = [...new Set(summariesWithoutSchedule.map((s: any) => s.employee_id))];
      const { data: empSchedules } = await supabase
        .from('employee_schedules')
        .select('employee_id, schedule_id, work_schedules(id, break_duration_minutes)')
        .in('employee_id', empIds)
        .eq('is_active', true)
        .is('ends_at', null);

      if (empSchedules) {
        for (const es of empSchedules as any[]) {
          if (es.work_schedules && es.work_schedules.id) {
            schedulesMap[`emp_${es.employee_id}`] = es.work_schedules.break_duration_minutes || 60;
          }
        }
      }
    }

    let generatedCount = 0;
    for (const summary of summaries) {
      if (summary.unauthorized_overtime_minutes > 0) {
        await this.createAlertIfNotExists({
          organization_id: summary.organization_id,
          employee_id: summary.employee_id,
          summary_id: summary.id,
          alert_type: 'unauthorized_overtime',
          alert_date: summary.server_date,
          detected_minutes: summary.unauthorized_overtime_minutes
        });
        generatedCount++;
      }

      // Busca a pausa prevista: primeiro pelo schedule_id do summary, depois pelo employee_schedules
      const expectedBreak = summary.schedule_id
        ? (schedulesMap[summary.schedule_id] || 60)
        : (schedulesMap[`emp_${summary.employee_id}`] || 60);

      if (summary.break_minutes > expectedBreak && expectedBreak > 0) {
        await this.createAlertIfNotExists({
          organization_id: summary.organization_id,
          employee_id: summary.employee_id,
          summary_id: summary.id,
          alert_type: 'break_exceeded',
          alert_date: summary.server_date,
          detected_minutes: summary.break_minutes - expectedBreak
        });
        generatedCount++;
      }
    }
    return generatedCount;
  },

  async createAlertIfNotExists(alertData: any) {
    const { error } = await supabase
      .from('attendance_alerts')
      .insert([alertData]);
      
    // 23505 is unique violation in Postgres — alert already exists, skip silently
    if (error && error.code !== '23505') {
      if (import.meta.env.DEV) {
        console.error('[ALERTS][CREATE_ERROR]', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
      }
    }
  },

  async resolveAlert(alertId: string, action: ResolutionAction, minutes: number, justification: string) {
    const { data: session } = await supabase.auth.getSession();
    const adminId = session.session?.user?.id;
    if (!adminId) throw new Error('Acesso negado');

    // Busca o alerta original com validação
    const { data: alert, error: alertError } = await supabase
      .from('attendance_alerts')
      .select('*, summary:attendance_daily_summaries(*)')
      .eq('id', alertId)
      .single();

    if (alertError || !alert) throw new Error('Alerta não encontrado.');
    if (alert.status !== 'open') throw new Error('Este alerta já foi resolvido.');
    if (minutes > alert.detected_minutes) throw new Error('Não é possível regularizar mais minutos do que o detectado.');

    const isHeIndevida = alert.alert_type === 'unauthorized_overtime';
    const isApproval = action === 'approved' || action === 'partially_approved';

    let newStatus: AlertStatus = 'resolved';
    if (action === 'partially_approved' && minutes < alert.detected_minutes) {
      newStatus = 'partially_resolved';
    }

    // 1. Atualizar o alerta
    const { error: updateError } = await supabase
      .from('attendance_alerts')
      .update({
        status: newStatus,
        resolution_action: action,
        regularized_minutes: minutes,
        admin_notes: justification,
        resolved_by: adminId,
        resolved_at: new Date().toISOString()
      })
      .eq('id', alertId)
      .eq('status', 'open'); // safety check

    if (updateError) throw updateError;

    // 2. Se for aprovação de HE, atualiza o summary e gera o ledger
    if (isHeIndevida && isApproval && minutes > 0) {
      const summary = alert.summary;
      if (!summary) throw new Error('Resumo diário não encontrado para atualizar HE.');

      // Nova matemática
      const newAuth = (summary.authorized_overtime_minutes || 0) + minutes;
      const newReal = (summary.realized_overtime_minutes || 0) + minutes;
      const newUnauth = Math.max(0, (summary.unauthorized_overtime_minutes || 0) - minutes);
      const newBal = (summary.balance_minutes || 0) + minutes;
      const newStatusOvertime = newUnauth > 0 ? 'mista' : 'realizada';

      const { error: sumError } = await supabase
        .from('attendance_daily_summaries')
        .update({
          authorized_overtime_minutes: newAuth,
          realized_overtime_minutes: newReal,
          unauthorized_overtime_minutes: newUnauth,
          overtime_status: newStatusOvertime,
          balance_minutes: newBal
        })
        .eq('id', summary.id);

      if (sumError) throw sumError;

      // Gera o ledger no banco de horas (source_id = id do alerta para rastreio)
      const { error: ledgerError } = await supabase
        .from('hour_bank_transactions')
        .insert([{
          organization_id: alert.organization_id,
          employee_id: alert.employee_id,
          transaction_date: alert.alert_date,
          direction: 'credit',
          minutes: minutes,
          source_type: 'alert_resolution',
          description: `Regularização de HE indevida: ${justification}`,
          source_id: alert.id
        }]);

      if (ledgerError) throw ledgerError;
    }
  },

  async getEmployeesOnLunchRealtime() {
    const today = new Date().toLocaleDateString('en-CA');
    
    // PASSO 1 — Buscar registros de almoço do dia atual de forma simples
    const { data: records, error } = await supabase
      .from('attendance_records')
      .select('employee_id, punch_type, server_date, server_time, created_at')
      .eq('server_date', today)
      .in('punch_type', ['SAIDA_ALMOCO', 'RETORNO_ALMOCO'])
      .order('created_at', { ascending: false });

    if (error) {
      if (import.meta.env.DEV) {
        console.error('[ALERTS][LUNCH_QUERY_ERROR]', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
      }
      throw error;
    }

    if (!records || records.length === 0) return [];

    // PASSO 2 — Agrupar por employee_id
    const grouped: Record<string, any[]> = {};
    for (const rec of records) {
      if (!grouped[rec.employee_id]) grouped[rec.employee_id] = [];
      grouped[rec.employee_id].push(rec);
    }

    // Identificar quem está em almoço (último evento é SAIDA_ALMOCO)
    const onLunchEmpIds: string[] = [];
    const lunchOutMap: Record<string, any> = {};
    for (const empId of Object.keys(grouped)) {
      const empRecords = grouped[empId]; // já ordenados por created_at desc
      const lastLunchAction = empRecords[0]; // primeiro = mais recente
      if (lastLunchAction.punch_type === 'SAIDA_ALMOCO') {
        onLunchEmpIds.push(empId);
        lunchOutMap[empId] = lastLunchAction;
      }
    }

    if (onLunchEmpIds.length === 0) return [];

    // PASSO 3 — Buscar dados dos colaboradores
    const { data: employees } = await supabase
      .from('employees')
      .select('id, full_name, matricula')
      .in('id', onLunchEmpIds);

    const empMap: Record<string, any> = {};
    if (employees) {
      employees.forEach((e: any) => { empMap[e.id] = e; });
    }

    // PASSO 4 — Buscar escala ativa via employee_schedules
    const { data: empSchedules } = await supabase
      .from('employee_schedules')
      .select('employee_id, schedule_id, work_schedules(id, break_duration_minutes)')
      .in('employee_id', onLunchEmpIds)
      .eq('is_active', true)
      .is('ends_at', null);

    const breakMap: Record<string, number> = {};
    if (empSchedules) {
      for (const es of empSchedules as any[]) {
        if (es.work_schedules) {
          breakMap[es.employee_id] = es.work_schedules.break_duration_minutes || 60;
        }
      }
    }

    // PASSO 5 — Montar retorno
    return onLunchEmpIds.map(empId => {
      const rec = lunchOutMap[empId];
      const emp = empMap[empId] || { id: empId, full_name: 'Desconhecido', matricula: 'N/A' };
      const outTime = new Date(rec.created_at);
      const diffMinutes = Math.floor((new Date().getTime() - outTime.getTime()) / 60000);
      const breakExpected = breakMap[empId] || null;
      return {
        employee: emp,
        outTime: rec.server_time,
        diffMinutes,
        breakExpected: breakExpected ?? 60,
        exceeded: breakExpected ? diffMinutes > breakExpected : false
      };
    });
  }
};

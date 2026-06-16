import { supabase } from '../lib/supabase';
import { adminAttendanceService } from './adminAttendanceService';
import { format, parseISO } from 'date-fns';

export interface TimeReportRow {
  date: string;
  endDate?: string;
  isOvernight: boolean;
  scheduleName: string;
  scheduleType: string;
  expectedJourney: string;
  punchIn: string | null;
  punchLunchOut: string | null;
  punchLunchReturn: string | null;
  extraBreaks: number;
  punchOut: string | null;
  extraJourney: string | null;
  authorizedHE: number;
  realizedHE: number;
  unauthorizedHE: number;
  dailyBalance: number;
  status: string;
}

export interface TimeReportSummary {
  daysInPeriod: number;
  daysWithPunch: number;
  totalExpectedMinutes: number;
  totalWorkedMinutes: number;
  totalBreakMinutes: number;
  totalAuthorizedHE: number;
  totalRealizedHE: number;
  totalUnauthorizedHE: number;
  totalCredits: number;
  totalDebits: number;
  netBalance: number;
  daysWithDelay: number;
  daysWithEarlyExit: number;
  incompleteJourneys: number;
}

export interface TimeReportData {
  employee: {
    id: string;
    name: string;
    matricula: string;
    role: string;
  };
  organizationName: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  generatedBy: string;
  rows: TimeReportRow[];
  summary: TimeReportSummary;
}

export const formatMinutesToHHMM = (minutes: number): string => {
  if (minutes === 0 || !minutes) return '0h00';
  const isNegative = minutes < 0;
  const absMin = Math.abs(minutes);
  const h = Math.floor(absMin / 60);
  const m = Math.round(absMin % 60);
  return `${isNegative ? '-' : ''}${h}h${m.toString().padStart(2, '0')}`;
};

export const timeReportService = {
  async getEmployeeTimeReport(employeeId: string, startDate: string, endDate: string): Promise<TimeReportData | null> {
    try {
      // 1. Employee Info
      const { data: empData, error: empErr } = await supabase
        .from('employees')
        .select('*, organizations(name)')
        .eq('id', employeeId)
        .single();
      
      if (empErr || !empData) throw new Error('Colaborador não encontrado');

    if (import.meta.env.DEV) {
      console.log(`[DEV][REPORT] employeeId`, employeeId);
      console.log(`[DEV][REPORT] employee matricula`, empData.matricula);
      console.log(`[DEV][REPORT] startDate`, startDate);
      console.log(`[DEV][REPORT] endDate`, endDate);
      console.log(`[DEV][REPORT] report header employee cargo`, empData.cargo);
    }

      // Direct safe fetch for attendance records
      const { data: rawRecords, error: rawErr } = await supabase
        .from('attendance_records')
        .select(`
          *,
          employees!inner (id, full_name, matricula, is_active),
          work_schedules (name, schedule_type, crosses_midnight, work_start_time, work_end_time, break_start_time, break_end_time),
          attendance_photos (*)
        `)
        .eq('employee_id', employeeId)
        .gte('server_date', startDate)
        .lte('server_date', endDate)
        .order('server_date', { ascending: false })
        .order('punched_at', { ascending: true });
        
      if (rawErr) throw rawErr;

      if (import.meta.env.DEV) console.log(`[DEV][REPORT] raw attendance records count`, rawRecords?.length || 0);

      const groupedRecords = adminAttendanceService.groupAttendanceByEmployeeAndDate(rawRecords || []);
      
      if (import.meta.env.DEV) console.log(`[DEV][REPORT] grouped rows count`, groupedRecords.length);

      // 3. Summaries
      const { data: summaries } = await supabase
        .from('attendance_daily_summaries')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('server_date', startDate)
        .lte('server_date', endDate);

      if (import.meta.env.DEV) console.log(`[DEV][REPORT] summaries count`, summaries?.length || 0);

      // 4. Hour Bank Transactions (for credits/debits generated in this period)
      // Including those that refer to this period's dates
      const { data: txs } = await supabase
        .from('hour_bank_transactions')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate);

      // 5. Employee Requests (Authorized HE)
      const { data: reqs } = await supabase
        .from('employee_requests')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('request_type', 'hora_extra')
        .eq('status', 'aprovada')
        .gte('target_date', startDate)
        .lte('target_date', endDate);

      const rows: TimeReportRow[] = [];
      const reportSummary: TimeReportSummary = {
        daysInPeriod: Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 3600 * 24)) + 1,
        daysWithPunch: groupedRecords.length,
        totalExpectedMinutes: 0,
        totalWorkedMinutes: 0,
        totalBreakMinutes: 0,
        totalAuthorizedHE: 0,
        totalRealizedHE: 0,
        totalUnauthorizedHE: 0,
        totalCredits: 0,
        totalDebits: 0,
        netBalance: 0,
        daysWithDelay: 0,
        daysWithEarlyExit: 0,
        incompleteJourneys: 0
      };

      for (const group of groupedRecords) {
        const opDate = group.server_date;
        const sum = summaries?.find(s => s.server_date === opDate);
        const dayReqs = reqs?.filter(r => r.target_date === opDate) || [];
        const authHE = dayReqs.reduce((acc, r) => acc + (r.minutes_requested || 0), 0);
        const dailyTx = txs?.filter(t => t.transaction_date === opDate && t.source_type === 'daily_summary');
        const dBal = dailyTx?.reduce((acc, t) => t.direction === 'credit' ? acc + t.minutes : acc - t.minutes, 0) || 0;

        const pIn = group.punches['ENTRADA']?.record;
        const pLOut = group.punches['SAIDA_ALMOCO']?.record;
        const pLRet = group.punches['RETORNO_ALMOCO']?.record;
        const pOut = group.punches['SAIDA']?.record;
        const pExIn = group.punches['ENTRADA_EXTRA']?.record;
        const pExOut = group.punches['SAIDA_EXTRA']?.record;

        const sched = pIn?.work_schedules || pOut?.work_schedules;
        let sName = 'Manual';
        let sType = 'Manual';
        let expectedJ = 'Não previsto';

        if (sched) {
           sName = sched.name || 'Escala';
           sType = sched.schedule_type || 'Manual';
           if (sched.crosses_midnight) sType += ' / Plantão Noturno';

           if (sched.work_start_time && sched.work_end_time) {
             const ws = sched.work_start_time.substring(0, 5);
             const we = sched.work_end_time.substring(0, 5);
             const isOvernight = sched.crosses_midnight;
             const baseExpected = `${ws} às ${we}${isOvernight ? ' do dia seguinte' : ''}`;
             
             if (sched.break_start_time && sched.break_end_time) {
               const bs = sched.break_start_time.substring(0, 5);
               const be = sched.break_end_time.substring(0, 5);
               expectedJ = `${baseExpected}, almoço ${bs} às ${be}`;
             } else {
               expectedJ = `${baseExpected}, sem intervalo configurado`;
             }
           } else {
             expectedJ = 'Horário livre';
           }
        }

        const extractTime = (r: any) => r?.server_time ? r.server_time.substring(0, 5) : (r?.punched_at ? format(parseISO(r.punched_at), 'HH:mm') : null);

        let exJ = null;
        if (pExIn && pExOut) {
           const eI = extractTime(pExIn);
           const eO = extractTime(pExOut);
           const m = Math.floor((new Date(pExOut.punched_at || pExOut.created_at).getTime() - new Date(pExIn.punched_at || pExIn.created_at).getTime()) / 60000);
           exJ = `${eI} – ${eO} (${m} min)`;
        } else if (pExIn) {
           exJ = `${extractTime(pExIn)} – ...`;
        }

        const realizedHE = sum?.realized_overtime_minutes || 0;
        const unauthHE = sum?.unauthorized_overtime_minutes || 0;

        let st = sum?.status || 'Incompleto';
        if (!pOut) st = 'Incompleto';
        if (st === 'Incompleto') reportSummary.incompleteJourneys++;
        
        // Infer delays
        if (sched && pIn) {
           const expectedIn = new Date(`${opDate}T${sched.work_start_time}`);
           const actualIn = new Date(pIn.punched_at || pIn.created_at);
           if (actualIn > expectedIn && (actualIn.getTime() - expectedIn.getTime()) > 15 * 60000) {
              reportSummary.daysWithDelay++;
              st += st ? ', Atraso' : 'Atraso';
           }
        }

        if (group.is_overnight) st += ', Plantão noturno consolidado';
        if (group.extraBreaks > 0) st += ', Almoço fracionado';
        if (pExIn) st += ', Jornada extra registrada';
        if (unauthHE > 0) st += ', Excedente de HE não autorizado';
        if (authHE > 0 && realizedHE === 0) st += ', HE autorizada não realizada';

        rows.push({
          date: opDate,
          endDate: group.end_date,
          isOvernight: group.is_overnight || false,
          scheduleName: sName,
          scheduleType: sType,
          expectedJourney: expectedJ,
          punchIn: extractTime(pIn),
          punchLunchOut: extractTime(pLOut),
          punchLunchReturn: extractTime(pLRet),
          extraBreaks: group.extraBreaks,
          punchOut: extractTime(pOut),
          extraJourney: exJ,
          authorizedHE: authHE,
          realizedHE: realizedHE,
          unauthorizedHE: unauthHE,
          dailyBalance: dBal,
          status: st.replace(/^,\s*/, '')
        });

        reportSummary.totalWorkedMinutes += (sum?.worked_minutes || 0);
        reportSummary.totalAuthorizedHE += authHE;
        reportSummary.totalRealizedHE += realizedHE;
        reportSummary.totalUnauthorizedHE += unauthHE;
      }

      // Aggregate all transactions for this employee in the period to get true credits/debits
      txs?.forEach(t => {
         if (t.direction === 'credit') reportSummary.totalCredits += t.minutes;
         if (t.direction === 'debit') reportSummary.totalDebits += t.minutes;
      });
      reportSummary.netBalance = reportSummary.totalCredits - reportSummary.totalDebits;

      reportSummary.daysWithPunch = rows.length;

      if (import.meta.env.DEV) console.log(`[DEV][REPORT] report rows`, rows.length);

      const { data: session } = await supabase.auth.getSession();
      const adminName = session?.session?.user?.email || 'Administrador';

      return {
        employee: {
          id: empData.id,
          name: empData.full_name,
          matricula: empData.matricula,
          role: empData.cargo || 'Não informado'
        },
        organizationName: empData.organizations?.name || 'Aconchego dos Avós',
        periodStart: startDate,
        periodEnd: endDate,
        generatedAt: format(new Date(), 'dd/MM/yyyy HH:mm:ss'),
        generatedBy: adminName,
        rows,
        summary: reportSummary
      };
    } catch (e) {
      console.error('Error generating report:', e);
      throw e;
    }
  }
};

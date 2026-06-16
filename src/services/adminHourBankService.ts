import { supabase } from '../lib/supabase';

export interface AdminHourBankTransaction {
  id: string;
  organization_id: string;
  employee_id: string;
  transaction_date: string;
  direction: 'credit' | 'debit';
  minutes: number;
  source_type: string;
  source_id: string | null;
  description: string | null;
  created_at: string;
  employees?: {
    id: string;
    full_name: string;
    matricula: string;
    role: string | null;
  };
}

export const adminHourBankService = {
  async getAdminTransactions(orgId: string): Promise<AdminHourBankTransaction[]> {
    if (!orgId) throw new Error('Organização não identificada.');

    // 1. Buscar as transações
    const { data: transactionsData, error: txError } = await supabase
      .from('hour_bank_transactions')
      .select('*')
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (txError) {
      console.error('[DEV] Erro ao buscar transações admin:', txError);
      throw new Error('Falha ao buscar movimentações do banco de horas.');
    }

    const transactions = transactionsData || [];

    // 2. Buscar pendências de HE Indevida (Sinalizações Operacionais)
    const { data: alertsData, error: alertsError } = await supabase
      .from('attendance_alerts')
      .select('*')
      .eq('organization_id', orgId)
      .eq('alert_type', 'unauthorized_overtime')
      .eq('status', 'open');

    if (alertsError) {
      console.warn('[DEV] Erro ao buscar pendências de HE:', alertsError);
    }

    const alerts = alertsData || [];

    if (transactions.length === 0 && alerts.length === 0) {
      return [];
    }

    // 3. Fallback resiliente: buscar dados dos colaboradores
    const employeeIds = [...new Set([
      ...transactions.map((t: any) => t.employee_id),
      ...alerts.map((a: any) => a.employee_id)
    ])];

    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, full_name, matricula, role')
      .in('id', employeeIds)
      .eq('organization_id', orgId);

    if (empError) {
      console.warn('[DEV] Erro ao buscar colaboradores relacionados no extrato:', empError);
    }

    // 4. Mapear resultados (Transactions)
    const mappedTransactions: AdminHourBankTransaction[] = transactions.map((tx: any) => {
      const emp = employees?.find((e: any) => e.id === tx.employee_id);
      return {
        ...tx,
        employees: emp || {
          id: tx.employee_id,
          full_name: 'Colaborador Desconhecido',
          matricula: 'N/A',
          role: null
        }
      } as AdminHourBankTransaction;
    });

    // 5. Mapear resultados (Alerts -> Pseudo Transactions)
    if (alerts.length > 0) {
      const pendingAlerts: AdminHourBankTransaction[] = alerts.map((alert: any) => {
        const emp = employees?.find((e: any) => e.id === alert.employee_id);
        return {
          id: alert.id,
          organization_id: alert.organization_id,
          employee_id: alert.employee_id,
          transaction_date: alert.alert_date,
          direction: 'credit', // Visually showing as a credit...
          minutes: alert.detected_minutes,
          source_type: 'unauthorized_overtime_pending', // Special source type
          source_id: null,
          description: alert.admin_notes || 'Hora extra indevida (Pendente de Auditoria)',
          created_at: alert.created_at,
          employees: emp || {
            id: alert.employee_id,
            full_name: 'Colaborador Desconhecido',
            matricula: 'N/A',
            role: null
          }
        };
      });

      // Merge and re-sort by date
      mappedTransactions.push(...pendingAlerts);
      mappedTransactions.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime() || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return mappedTransactions;
  },

  async createManualHourBankAdjustment(payload: {
    organization_id: string;
    employee_id: string;
    transaction_date: string;
    direction: 'credit' | 'debit';
    minutes: number;
    description: string;
  }) {
    if (!payload.organization_id || !payload.employee_id) {
      throw new Error('Organização ou colaborador não identificados.');
    }

    const insertPayload = {
      organization_id: payload.organization_id,
      employee_id: payload.employee_id,
      transaction_date: payload.transaction_date,
      direction: payload.direction,
      minutes: payload.minutes,
      source_type: 'manual_adjustment',
      description: payload.description
    };

    if (import.meta.env.DEV) {
      console.log('[DEV] createManualHourBankAdjustment Payload:', insertPayload);
    }

    const { data, error } = await supabase
      .from('hour_bank_transactions')
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      console.error('[DEV] Erro ao criar ajuste manual:', error);
      throw new Error(`Falha ao criar ajuste manual: ${error.message}`);
    }

    return data;
  }
};

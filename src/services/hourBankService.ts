import { supabase } from '@/lib/supabase';

export interface DailySummaryPayload {
  organization_id: string;
  employee_id: string;
  schedule_id?: string | null;
  server_date: string;
  expected_minutes: number;
  worked_minutes: number;
  break_minutes: number;
  delay_minutes: number;
  early_leave_minutes: number;
  overtime_minutes: number;
  balance_minutes: number;
  first_punch_at?: string | null;
  last_punch_at?: string | null;
  entry_time?: string | null;
  lunch_out_time?: string | null;
  lunch_return_time?: string | null;
  exit_time?: string | null;
  status: string;
  notes?: string | null;
  authorized_overtime_minutes?: number;
  realized_overtime_minutes?: number;
  unauthorized_overtime_minutes?: number;
  overtime_status?: string | null;
}

export const hourBankService = {
  async getEmployeeHourBalance(employeeId?: string) {
    const { data, error } = await supabase.rpc('get_employee_hour_balance', {
      p_employee_id: employeeId || null
    });

    if (error) {
      console.error('Erro ao buscar saldo do banco de horas:', error);
      throw error;
    }

    // A RPC retorna um array (mesmo sendo RETURNS TABLE), normalmente com 1 linha
    return data && data.length > 0 ? data[0] : {
      balance_minutes: 0,
      credit_minutes: 0,
      debit_minutes: 0,
      transaction_count: 0
    };
  },

  async getDailySummary(employeeId: string, serverDate: string) {
    const { data, error } = await supabase
      .from('attendance_daily_summaries')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('server_date', serverDate)
      .is('deleted_at', null)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao buscar resumo diário:', error);
      throw error;
    }

    return data;
  },

  async saveOwnDailySummaryViaRpc(payload: DailySummaryPayload) {
    const rpcPayload = {
      p_server_date: payload.server_date,
      p_schedule_id: payload.schedule_id || null,
      p_expected_minutes: payload.expected_minutes,
      p_worked_minutes: payload.worked_minutes,
      p_break_minutes: payload.break_minutes,
      p_delay_minutes: payload.delay_minutes,
      p_early_leave_minutes: payload.early_leave_minutes,
      p_overtime_minutes: payload.overtime_minutes,
      p_balance_minutes: payload.balance_minutes,
      p_first_punch_at: payload.first_punch_at || null,
      p_last_punch_at: payload.last_punch_at || null,
      p_entry_time: payload.entry_time || null,
      p_lunch_out_time: payload.lunch_out_time || null,
      p_lunch_return_time: payload.lunch_return_time || null,
      p_exit_time: payload.exit_time || null,
      p_status: payload.status,
      p_notes: payload.notes || null,
      p_authorized_overtime_minutes: payload.authorized_overtime_minutes || 0,
      p_realized_overtime_minutes: payload.realized_overtime_minutes || 0,
      p_unauthorized_overtime_minutes: payload.unauthorized_overtime_minutes || 0,
      p_overtime_status: payload.overtime_status || null
    };

    if (import.meta.env.DEV) {
      console.log('[DEV] saveOwnDailySummaryViaRpc payload:', rpcPayload);
    }

    const { data, error } = await supabase.rpc('save_own_daily_attendance_summary', rpcPayload);

    if (error) {
      if (import.meta.env.DEV) {
        console.error('[DEV] save_own_daily_attendance_summary failed', {
          error: error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
      }
      throw error;
    }

    if (import.meta.env.DEV) {
      console.log('[DEV] save_own_daily_attendance_summary success:', data);
    }

    return data;
  },

  async getTransactions(employeeId: string, limit: number = 10) {
    const { data, error } = await supabase
      .from('hour_bank_transactions')
      .select('*')
      .eq('employee_id', employeeId)
      .is('deleted_at', null)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Erro ao buscar extrato do banco de horas:', error);
      throw error;
    }

    return data;
  }
};

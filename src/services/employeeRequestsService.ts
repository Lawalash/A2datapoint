import { supabase } from '../lib/supabase';

export type EmployeeRequestType = 'hora_extra' | 'compensacao' | 'ajuste_ponto' | 'abono' | 'folga';
export type EmployeeRequestStatus = 'pendente' | 'aprovada' | 'reprovada' | 'cancelada';

export interface EmployeeRequest {
  id: string;
  organization_id: string;
  employee_id: string;
  request_type: EmployeeRequestType;
  target_date?: string;
  start_date?: string;
  end_date?: string;
  minutes_requested?: number;
  justification?: string;
  status: EmployeeRequestStatus;
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface CreateEmployeeRequestPayload {
  organization_id: string;
  employee_id: string;
  request_type: EmployeeRequestType;
  target_date?: string;
  start_date?: string;
  end_date?: string;
  minutes_requested?: number;
  justification: string;
}

export const employeeRequestsService = {
  async getMyRequests(orgId: string, employeeId: string): Promise<EmployeeRequest[]> {
    if (!orgId || !employeeId) throw new Error('Parâmetros obrigatórios ausentes.');

    const { data, error } = await supabase
      .from('employee_requests')
      .select('*')
      .eq('organization_id', orgId)
      .eq('employee_id', employeeId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar solicitações:', error);
      throw new Error('Falha ao buscar solicitações.');
    }

    return data || [];
  },

  async createEmployeeRequest(payload: CreateEmployeeRequestPayload): Promise<EmployeeRequest> {
    if (import.meta.env.DEV) {
      console.log('[DEV] createEmployeeRequest payload:', payload);
    }
    const { data, error } = await supabase
      .from('employee_requests')
      .insert({
        organization_id: payload.organization_id,
        employee_id: payload.employee_id,
        request_type: payload.request_type,
        target_date: payload.target_date,
        start_date: payload.start_date,
        end_date: payload.end_date,
        minutes_requested: payload.minutes_requested,
        justification: payload.justification,
        status: 'pendente'
      })
      .select()
      .maybeSingle();

    if (error) {
      if (import.meta.env.DEV) console.error('[DEV] Erro retornado pelo Supabase (Insert Request):', error);
      throw new Error(`Não foi possível enviar a solicitação. Detalhe: ${error.message}`);
    }

    if (!data) {
      if (import.meta.env.DEV) console.warn('[DEV] Insert concluído, mas .select() retornou nulo (RLS bloqueou leitura). Gerando mock temporário para UI.');
      return {
        id: crypto.randomUUID(), // fake id para atualizar a lista imediatamente até o refetch puxar do banco
        ...payload,
        status: 'pendente',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as EmployeeRequest;
    }

    if (import.meta.env.DEV) console.log('[DEV] Solicitação criada e retornada com sucesso:', data);
    return data;
  },

  async cancelEmployeeRequest(orgId: string, employeeId: string, requestId: string): Promise<void> {
    const { error } = await supabase
      .from('employee_requests')
      .update({
        status: 'cancelada',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .eq('organization_id', orgId)
      .eq('employee_id', employeeId)
      .eq('status', 'pendente');

    if (error) {
      console.error('Erro ao cancelar solicitação:', error);
      throw new Error('Não foi possível cancelar a solicitação.');
    }
  }
};

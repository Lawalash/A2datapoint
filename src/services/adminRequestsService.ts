import { supabase } from '../lib/supabase';
import type { EmployeeRequest } from './employeeRequestsService';

export interface AdminEmployeeRequest extends EmployeeRequest {
  employees: {
    id: string;
    full_name: string;
    matricula: string;
    role: string | null;
  };
}

export const adminRequestsService = {
  async getAdminRequests(orgId: string): Promise<AdminEmployeeRequest[]> {
    if (!orgId) throw new Error('Organização não identificada.');

    if (import.meta.env.DEV) {
      console.log(`[DEV] getAdminRequests: Buscando solicitações reais para orgId: ${orgId}`);
    }

    // 1. Buscar solicitações
    const { data: requests, error: reqError } = await supabase
      .from('employee_requests')
      .select('*')
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (reqError) {
      console.error('[DEV] Erro ao buscar solicitações admin (employee_requests):', reqError);
      throw new Error('Falha ao buscar solicitações da organização.');
    }

    if (import.meta.env.DEV) {
      console.log(`[DEV] getAdminRequests: ${requests?.length || 0} solicitações encontradas.`);
    }

    if (!requests || requests.length === 0) {
      return [];
    }

    // 2. Buscar dados dos colaboradores vinculados
    const employeeIds = [...new Set(requests.map(r => r.employee_id))];
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, full_name, matricula, role')
      .in('id', employeeIds)
      .eq('organization_id', orgId);

    if (empError) {
      console.warn('[DEV] Erro ao buscar colaboradores relacionados, fallback para dados básicos:', empError);
    }

    if (import.meta.env.DEV) {
      console.log(`[DEV] getAdminRequests: ${employees?.length || 0} colaboradores carregados para join manual.`);
    }

    // 3. Mapear os resultados
    const mappedRequests = requests.map(req => {
      const emp = employees?.find(e => e.id === req.employee_id);
      return {
        ...req,
        employees: emp || {
          id: req.employee_id,
          full_name: 'Colaborador Desconhecido',
          matricula: 'N/A',
          role: null
        }
      } as AdminEmployeeRequest;
    });

    return mappedRequests;
  },

  async rejectEmployeeRequest(orgId: string, requestId: string, adminId: string, adminNotes?: string): Promise<void> {
    const { error } = await supabase
      .from('employee_requests')
      .update({
        status: 'reprovada',
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        admin_notes: adminNotes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .eq('organization_id', orgId)
      .eq('status', 'pendente');

    if (error) {
      console.error('Erro ao reprovar solicitação:', error);
      throw new Error('Não foi possível reprovar a solicitação.');
    }
  },

  async approveEmployeeRequest(
    orgId: string, 
    request: AdminEmployeeRequest, 
    adminId: string, 
    adminNotes?: string
  ): Promise<void> {
    // 1. Atualiza o status da solicitação
    const { error: updateError } = await supabase
      .from('employee_requests')
      .update({
        status: 'aprovada',
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        admin_notes: adminNotes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', request.id)
      .eq('organization_id', orgId)
      .eq('status', 'pendente');

    if (updateError) {
      console.error('Erro ao aprovar solicitação:', updateError);
      throw new Error('Não foi possível aprovar a solicitação.');
    }

    // 2. Cria ledger no banco de horas dependendo do tipo
    // Regra 17: Hora extra aprovada NÃO gera ledger. O ledger só é gerado no fechamento do dia (journeyCalculation)
    if (request.request_type === 'compensacao' && request.minutes_requested) {
      // Verifica se já existe um ledger (proteção contra duplicidade de rede)
      const { data: existingLedger, error: selectError } = await supabase
        .from('hour_bank_transactions')
        .select('id')
        .eq('organization_id', orgId)
        .eq('employee_id', request.employee_id)
        .eq('source_type', 'request_approval')
        .eq('source_id', request.id)
        .is('deleted_at', null)
        .maybeSingle();

      if (selectError) {
        console.error('Erro ao verificar ledger existente:', selectError);
      }

      if (!existingLedger) {
        const description = 'Solicitação de compensação aprovada';

        const { error: ledgerError } = await supabase
          .from('hour_bank_transactions')
          .insert({
            organization_id: orgId,
            employee_id: request.employee_id,
            transaction_date: request.target_date || new Date().toISOString().split('T')[0],
            direction: 'debit',
            minutes: request.minutes_requested,
            source_type: 'request_approval',
            source_id: request.id,
            description: description
          });

        if (ledgerError) {
          console.error('Erro ao criar transação no ledger:', ledgerError);
          // O fluxo de aprovação prossegue e documentamos que o ledger pode ser repetido manualmente ou requer sync depois
          throw new Error('Solicitação aprovada, mas houve falha ao atualizar o saldo do banco de horas.');
        }
      }
    }
  }
};

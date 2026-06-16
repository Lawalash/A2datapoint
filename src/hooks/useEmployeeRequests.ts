import { useState, useCallback, useEffect } from 'react';
import { employeeRequestsService } from '../services/employeeRequestsService';
import type { EmployeeRequest, CreateEmployeeRequestPayload } from '../services/employeeRequestsService';
import { useToast } from '../context/ToastContext';

export function useEmployeeRequests(orgId?: string, employeeId?: string) {
  const [requests, setRequests] = useState<EmployeeRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const fetchRequests = useCallback(async () => {
    if (!orgId || !employeeId) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await employeeRequestsService.getMyRequests(orgId, employeeId);
      setRequests(data);
    } catch (err: any) {
      setError(err.message || 'Não foi possível carregar suas solicitações.');
      addToast(err.message || 'Não foi possível carregar suas solicitações.', 'error');
    } finally {
      setLoading(false);
    }
  }, [orgId, employeeId, addToast]);

  // Busca inicial e no F5 quando orgId/employeeId estiverem disponíveis
  useEffect(() => {
    if (orgId && employeeId) {
      fetchRequests();
    }
  }, [orgId, employeeId, fetchRequests]);

  const createRequest = async (payload: Omit<CreateEmployeeRequestPayload, 'organization_id' | 'employee_id'>) => {
    if (!orgId || !employeeId) {
      addToast('Sessão inválida para criar solicitação.', 'error');
      return null;
    }

    try {
      const newRequest = await employeeRequestsService.createEmployeeRequest({
        ...payload,
        organization_id: orgId,
        employee_id: employeeId
      });
      
      setRequests(prev => [newRequest, ...prev]);
      addToast('Solicitação enviada para análise.', 'success');
      
      // Refetch forçando dados reias do banco para sobrescrever mock temporario
      await fetchRequests();
      
      return newRequest;
    } catch (err: any) {
      addToast(err.message || 'Não foi possível enviar a solicitação.', 'error');
      throw err;
    }
  };

  const cancelRequest = async (requestId: string) => {
    if (!orgId || !employeeId) return;

    try {
      await employeeRequestsService.cancelEmployeeRequest(orgId, employeeId, requestId);
      setRequests(prev => 
        prev.map(r => r.id === requestId ? { ...r, status: 'cancelada' } : r)
      );
      addToast('Solicitação cancelada.', 'success');
      
      // Refetch atualizando estado final
      await fetchRequests();
    } catch (err: any) {
      addToast(err.message || 'Não foi possível cancelar a solicitação.', 'error');
    }
  };

  return {
    requests,
    loading,
    error,
    fetchRequests,
    createRequest,
    cancelRequest
  };
}

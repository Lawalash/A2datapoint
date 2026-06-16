import { useState, useCallback, useEffect } from 'react';
import { adminRequestsService } from '../services/adminRequestsService';
import type { AdminEmployeeRequest } from '../services/adminRequestsService';
import { useToast } from '../context/ToastContext';

export function useAdminRequests(orgId?: string, adminId?: string) {
  const [requests, setRequests] = useState<AdminEmployeeRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const fetchRequests = useCallback(async () => {
    if (!orgId) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await adminRequestsService.getAdminRequests(orgId);
      setRequests(data);
    } catch (err: any) {
      setError(err.message || 'Falha ao buscar solicitações.');
      addToast(err.message || 'Falha ao buscar solicitações.', 'error');
    } finally {
      setLoading(false);
    }
  }, [orgId, addToast]);

  useEffect(() => {
    if (orgId) {
      fetchRequests();
    }
  }, [orgId, fetchRequests]);

  const approveRequest = async (request: AdminEmployeeRequest, adminNotes?: string) => {
    if (!orgId || !adminId) return false;

    try {
      await adminRequestsService.approveEmployeeRequest(orgId, request, adminId, adminNotes);
      addToast('Solicitação aprovada com sucesso.', 'success');
      await fetchRequests();
      return true;
    } catch (err: any) {
      addToast(err.message || 'Erro ao aprovar solicitação.', 'error');
      return false;
    }
  };

  const rejectRequest = async (requestId: string, adminNotes?: string) => {
    if (!orgId || !adminId) return false;

    try {
      await adminRequestsService.rejectEmployeeRequest(orgId, requestId, adminId, adminNotes);
      addToast('Solicitação reprovada com sucesso.', 'success');
      await fetchRequests();
      return true;
    } catch (err: any) {
      addToast(err.message || 'Erro ao reprovar solicitação.', 'error');
      return false;
    }
  };

  return {
    requests,
    loading,
    error,
    fetchRequests,
    approveRequest,
    rejectRequest
  };
}

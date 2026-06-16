import { useState, useCallback, useEffect } from 'react';
import { storageMonitoringService, type StorageMonitoringData } from '@/services/storageMonitoringService';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';
import { formatBytes } from '@/utils/localStorageMonitor';

export function useStorageMonitoring() {
  const [data, setData] = useState<StorageMonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const fetchMonitoringData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Não autenticado');

      const { data: adminEmployee, error: adminErr } = await supabase
        .from('employees')
        .select('organization_id')
        .eq('auth_user_id', session.user.id)
        .single();
      
      if (adminErr) throw adminErr;
      const orgId = adminEmployee.organization_id;

      const statsData = await storageMonitoringService.getMonitoringData(orgId);
      setData(statsData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao carregar dados de armazenamento');
      addToast(err.message || 'Erro ao carregar dados de armazenamento', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchMonitoringData();
  }, [fetchMonitoringData]);

  const cleanupEvidence = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await storageMonitoringService.cleanupAttendanceEvidence();
      addToast(`Sucesso! ${res.removed} evidências removidas. ${formatBytes(res.bytesFreed)} liberados.`, 'success');
      await fetchMonitoringData();
      return res;
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Erro ao realizar limpeza de armazenamento.', 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    data,
    loading,
    error,
    refetch: fetchMonitoringData,
    cleanupEvidence
  };
}

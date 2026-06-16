import { useState, useEffect, useCallback } from 'react';
import { adminHourBankService, type AdminHourBankTransaction } from '../services/adminHourBankService';

export const useAdminHourBank = (orgId: string | undefined) => {
  const [transactions, setTransactions] = useState<AdminHourBankTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!orgId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await adminHourBankService.getAdminTransactions(orgId);
      setTransactions(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar transações');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const createManualAdjustment = async (payload: Omit<Parameters<typeof adminHourBankService.createManualHourBankAdjustment>[0], 'organization_id'>) => {
    if (!orgId) return false;
    
    setCreating(true);
    setError(null);
    try {
      await adminHourBankService.createManualHourBankAdjustment({
        ...payload,
        organization_id: orgId
      });
      await fetchTransactions(); // Refetch after successful creation
      return true;
    } catch (err: any) {
      setError(err.message || 'Erro ao criar ajuste manual');
      return false;
    } finally {
      setCreating(false);
    }
  };

  return {
    transactions,
    loading,
    creating,
    error,
    refetch: fetchTransactions,
    createManualAdjustment
  };
};

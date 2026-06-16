import { useState, useCallback } from 'react';
import { hourBankService } from '@/services/hourBankService';
import { useToast } from '@/context/ToastContext';

export function useHourBank() {
  const [balance, setBalance] = useState<any>(null);
  const [dailySummary, setDailySummary] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const fetchBalance = useCallback(async (employeeId?: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await hourBankService.getEmployeeHourBalance(employeeId);
      setBalance(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTransactions = useCallback(async (employeeId: string, limit: number = 10) => {
    try {
      setLoading(true);
      setError(null);
      const data = await hourBankService.getTransactions(employeeId, limit);
      setTransactions(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDailySummary = useCallback(async (employeeId: string, date: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await hourBankService.getDailySummary(employeeId, date);
      setDailySummary(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const processEndOfDay = useCallback(async (summaryPayload: any) => {
    try {
      setLoading(true);
      setError(null);
      const savedSummary = await hourBankService.saveOwnDailySummaryViaRpc(summaryPayload);
      setDailySummary(savedSummary);
      
      // Refresh balance
      await fetchBalance(summaryPayload.employee_id);
      
      return savedSummary;
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      addToast('A apuração diária falhou. Ela precisará ser revisada pelo administrador.', 'error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [addToast, fetchBalance]);

  return {
    balance,
    dailySummary,
    transactions,
    loading,
    error,
    fetchBalance,
    fetchDailySummary,
    fetchTransactions,
    processEndOfDay
  };
}

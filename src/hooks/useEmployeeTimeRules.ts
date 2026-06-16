import { useState, useCallback } from 'react';
import { timeRulesService } from '@/services/timeRulesService';
import type { EmployeeTimeRulePayload } from '@/services/timeRulesService';
import { useToast } from '@/context/ToastContext';

export function useEmployeeTimeRules() {
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const getRule = useCallback(async (employeeId: string) => {
    try {
      setLoading(true);
      return await timeRulesService.getEmployeeTimeRule(employeeId);
    } catch (err: any) {
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveRule = async (payload: EmployeeTimeRulePayload) => {
    try {
      setLoading(true);
      await timeRulesService.upsertEmployeeTimeRule(payload);
      addToast('Regra individual salva com sucesso.', 'success');
      return true;
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Erro ao salvar regra individual.', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const removeRule = async (employeeId: string) => {
    try {
      setLoading(true);
      await timeRulesService.deactivateEmployeeTimeRule(employeeId);
      addToast('Colaborador voltou a usar a regra global.', 'success');
      return true;
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Erro ao remover regra individual.', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    getRule,
    saveRule,
    removeRule,
    loading
  };
}

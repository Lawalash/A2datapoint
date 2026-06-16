import { useState, useCallback, useEffect, useMemo } from 'react';
import { employeesService, type EmployeePayload } from '@/services/employeesService';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';

export function useEmployees() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const { addToast } = useToast();

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Não autenticado');

      // Descobrir a org do admin logado
      const { data: adminEmployee, error: adminErr } = await supabase
        .from('employees')
        .select('organization_id')
        .eq('auth_user_id', session.user.id)
        .single();
      
      if (adminErr) throw adminErr;
      const orgId = adminEmployee.organization_id;
      setOrganizationId(orgId);

      const list = await employeesService.listEmployees(orgId);
      setEmployees(list);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao carregar colaboradores');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const createEmployee = async (payload: Omit<EmployeePayload, 'organization_id'>) => {
    try {
      if (!organizationId) throw new Error('Organization ID não encontrado');
      setLoading(true);
      const newEmployee = await employeesService.createEmployee({
        ...payload,
        organization_id: organizationId
      });
      addToast('Colaborador cadastrado com sucesso!', 'success');
      await fetchEmployees();
      return newEmployee;
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Erro ao cadastrar', 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateEmployee = async (employeeId: string, payload: Partial<EmployeePayload>) => {
    try {
      setLoading(true);
      const updated = await employeesService.updateEmployee(employeeId, payload);
      addToast('Colaborador atualizado com sucesso!', 'success');
      await fetchEmployees();
      return updated;
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Erro ao atualizar', 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deactivateEmployee = async (employeeId: string) => {
    try {
      setLoading(true);
      const deactivated = await employeesService.deactivateEmployee(employeeId);
      addToast('Colaborador inativado.', 'info');
      await fetchEmployees();
      return deactivated;
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Erro ao inativar', 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const reactivateEmployee = async (employeeId: string) => {
    try {
      setLoading(true);
      const reactivated = await employeesService.reactivateEmployee(employeeId);
      addToast('Colaborador reativado com sucesso.', 'success');
      await fetchEmployees();
      return reactivated;
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Erro ao reativar', 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const generateNextMatricula = useCallback(async () => {
    if (!organizationId) return '0001';
    return await employeesService.getNextMatricula(organizationId);
  }, [organizationId]);

  const activeEmployees = useMemo(() => employees.filter(e => e.is_active), [employees]);
  const inactiveEmployees = useMemo(() => employees.filter(e => !e.is_active), [employees]);

  return {
    employees,
    activeEmployees,
    inactiveEmployees,
    loading,
    error,
    createEmployee,
    updateEmployee,
    deactivateEmployee,
    reactivateEmployee,
    generateNextMatricula,
    refetch: fetchEmployees
  };
}

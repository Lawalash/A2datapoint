import { useState, useCallback, useEffect } from 'react';
import { schedulesService, type SchedulePayload } from '@/services/schedulesService';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';

export function useSchedules() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const { addToast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Não autenticado');

      // Get org ID for the logged in admin
      const { data: adminEmployee, error: adminErr } = await supabase
        .from('employees')
        .select('organization_id')
        .eq('auth_user_id', session.user.id)
        .single();
      
      if (adminErr) throw adminErr;
      const orgId = adminEmployee.organization_id;
      setOrganizationId(orgId);

      const [schedulesList, assignmentsList] = await Promise.all([
        schedulesService.listSchedules(orgId),
        schedulesService.listScheduleAssignments(orgId)
      ]);

      setSchedules(schedulesList);
      setAssignments(assignmentsList);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao carregar escalas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createSchedule = async (payload: Omit<SchedulePayload, 'organization_id'>) => {
    try {
      if (!organizationId) throw new Error('Organization ID não encontrado');
      setLoading(true);
      const newSchedule = await schedulesService.createSchedule({
        ...payload,
        organization_id: organizationId
      });
      addToast('Escala criada com sucesso!', 'success');
      await fetchData();
      return newSchedule;
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Erro ao criar escala', 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateSchedule = async (scheduleId: string, payload: Partial<SchedulePayload>) => {
    try {
      setLoading(true);
      const updated = await schedulesService.updateSchedule(scheduleId, payload);
      addToast('Escala atualizada com sucesso!', 'success');
      await fetchData();
      return updated;
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Erro ao atualizar escala', 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deactivateSchedule = async (scheduleId: string) => {
    try {
      setLoading(true);
      const deactivated = await schedulesService.deactivateSchedule(scheduleId);
      addToast('Escala inativada com sucesso.', 'info');
      await fetchData();
      return deactivated;
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Erro ao inativar escala', 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const reactivateSchedule = async (scheduleId: string) => {
    try {
      setLoading(true);
      const reactivated = await schedulesService.reactivateSchedule(scheduleId);
      addToast('Escala reativada com sucesso.', 'success');
      await fetchData();
      return reactivated;
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Erro ao reativar escala', 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const assignSchedule = async (scheduleId: string, employeeIds: string[]) => {
    try {
      if (!organizationId) throw new Error('Organization ID não encontrado');
      setLoading(true);
      await schedulesService.assignScheduleToEmployees(scheduleId, employeeIds, organizationId);
      addToast('Escala atribuída com sucesso!', 'success');
      await fetchData();
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Erro ao atribuir escala', 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    schedules,
    activeSchedules: schedules.filter(s => s.is_active),
    assignments,
    loading,
    error,
    createSchedule,
    updateSchedule,
    deactivateSchedule,
    reactivateSchedule,
    assignSchedule,
    refetch: fetchData
  };
}

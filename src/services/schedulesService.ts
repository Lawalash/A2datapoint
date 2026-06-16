import { supabase } from '@/lib/supabase';
import { getLocalOperationDate } from '@/utils/dateUtils';

export interface SchedulePayload {
  organization_id: string;
  name: string;
  work_start_time: string;
  work_end_time: string;
  break_start_time?: string | null;
  break_end_time?: string | null;
  break_duration_minutes: number;
  work_days: string[];
  off_days: string[];
  is_active: boolean;
  schedule_type?: string;
  cycle_start_date?: string | null;
  cycle_work_days?: number | null;
  cycle_rest_days?: number | null;
  crosses_midnight?: boolean;
}

const normalizeTimeToSql = (time: string | null | undefined): string | null => {
  if (!time) return null;
  if (time.length === 5) return `${time}:00`;
  return time;
};

export const schedulesService = {
  async listSchedules(organizationId: string) {
    const { data, error } = await supabase
      .from('work_schedules')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createSchedule(payload: SchedulePayload) {
    const normalizedPayload = {
      ...payload,
      work_start_time: normalizeTimeToSql(payload.work_start_time),
      work_end_time: normalizeTimeToSql(payload.work_end_time),
      break_start_time: normalizeTimeToSql(payload.break_start_time),
      break_end_time: normalizeTimeToSql(payload.break_end_time),
    };

    const { data, error } = await supabase
      .from('work_schedules')
      .insert(normalizedPayload)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateSchedule(scheduleId: string, payload: Partial<SchedulePayload>) {
    const normalizedPayload = { ...payload };
    if (payload.work_start_time !== undefined) {
      normalizedPayload.work_start_time = normalizeTimeToSql(payload.work_start_time) as string;
    }
    if (payload.work_end_time !== undefined) {
      normalizedPayload.work_end_time = normalizeTimeToSql(payload.work_end_time) as string;
    }
    if (payload.break_start_time !== undefined) {
      normalizedPayload.break_start_time = normalizeTimeToSql(payload.break_start_time) as any;
    }
    if (payload.break_end_time !== undefined) {
      normalizedPayload.break_end_time = normalizeTimeToSql(payload.break_end_time) as any;
    }

    const { data, error } = await supabase
      .from('work_schedules')
      .update(normalizedPayload)
      .eq('id', scheduleId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deactivateSchedule(scheduleId: string) {
    const { data, error } = await supabase
      .from('work_schedules')
      .update({ is_active: false })
      .eq('id', scheduleId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async reactivateSchedule(scheduleId: string) {
    const { data, error } = await supabase
      .from('work_schedules')
      .update({ is_active: true })
      .eq('id', scheduleId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async listScheduleAssignments(organizationId: string) {
    const { data, error } = await supabase
      .from('employee_schedules')
      .select(`
        *,
        work_schedules (*),
        employees (*)
      `)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async assignScheduleToEmployees(scheduleId: string, employeeIds: string[], organizationId: string, startsAt?: string) {
    const today = startsAt || getLocalOperationDate();

    // 1. Fetch current active assignments for this schedule
    const { data: currentAssignments, error: fetchErr } = await supabase
      .from('employee_schedules')
      .select('id, employee_id')
      .eq('schedule_id', scheduleId)
      .eq('is_active', true);
      
    if (fetchErr) throw fetchErr;

    const currentEmployeeIds = (currentAssignments || []).map(a => a.employee_id);
    const idsToRemove = currentEmployeeIds.filter(id => !employeeIds.includes(id));
    const idsToAdd = employeeIds.filter(id => !currentEmployeeIds.includes(id));

    // 2. Inactivate assignments for employees that were removed
    if (idsToRemove.length > 0) {
      const assignmentsToInactivate = (currentAssignments || []).filter(a => idsToRemove.includes(a.employee_id)).map(a => a.id);
      
      const { error: removeErr } = await supabase
        .from('employee_schedules')
        .update({ 
          is_active: false, 
          ends_at: today,
          updated_at: new Date().toISOString()
        })
        .in('id', assignmentsToInactivate);
        
      if (removeErr) throw removeErr;
    }

    // 3. Process new assignments
    for (const employeeId of idsToAdd) {
      // Fetch ANY active assignment for this employee (could be from another schedule)
      const { data: activeAssignments, error: activeErr } = await supabase
        .from('employee_schedules')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('is_active', true);
        
      if (activeErr) throw activeErr;

      // Inactivate previous assignments
      if (activeAssignments && activeAssignments.length > 0) {
        const idsToInactivate = activeAssignments.map(a => a.id);
        const { error: inactivateErr } = await supabase
          .from('employee_schedules')
          .update({ 
            is_active: false, 
            ends_at: today,
            updated_at: new Date().toISOString()
          })
          .in('id', idsToInactivate);
          
        if (inactivateErr) throw inactivateErr;
      }

      // Insert new assignment
      const { error: insertErr } = await supabase
        .from('employee_schedules')
        .insert({
          organization_id: organizationId,
          employee_id: employeeId,
          schedule_id: scheduleId,
          starts_at: today,
          is_active: true
        });

      if (insertErr) throw insertErr;
    }
  },

  async getEmployeeActiveSchedule(employeeId: string) {
    const { data, error } = await supabase
      .from('employee_schedules')
      .select(`
        *,
        work_schedules (*)
      `)
      .eq('employee_id', employeeId)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is no rows returned
    return data;
  }
};

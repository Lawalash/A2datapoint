import { supabase } from '@/lib/supabase';
import type { TimeRules } from '@/utils/timeRules';

export interface EmployeeTimeRulePayload extends TimeRules {
  organization_id: string;
  employee_id: string;
  is_active: boolean;
}

export const timeRulesService = {
  async getEmployeeTimeRule(employeeId: string) {
    const { data, error } = await supabase
      .from('employee_time_rules')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async upsertEmployeeTimeRule(payload: EmployeeTimeRulePayload) {
    // Busca se já existe regra ativa para este colaborador
    const { data: existing, error: findError } = await supabase
      .from('employee_time_rules')
      .select('id')
      .eq('employee_id', payload.employee_id)
      .eq('organization_id', payload.organization_id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .maybeSingle();

    if (findError) throw findError;

    if (existing) {
      // Faz o update do existente
      const { data, error } = await supabase
        .from('employee_time_rules')
        .update({
          ...payload,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } else {
      // Faz insert
      const { data, error } = await supabase
        .from('employee_time_rules')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },

  async deactivateEmployeeTimeRule(employeeId: string) {
    const { data, error } = await supabase
      .from('employee_time_rules')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('employee_id', employeeId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .select();

    if (error) throw error;
    return data;
  }
};

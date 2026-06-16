import { supabase } from '@/lib/supabase';

export interface EmployeePayload {
  matricula: string;
  full_name: string;
  role: 'Master' | 'Administrador' | 'Colaborador';
  cargo: string;
  is_active: boolean;
  organization_id: string;
}

export const employeesService = {
  async listEmployees(organizationId: string) {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('full_name');
    
    if (error) throw error;
    return data;
  },

  async createEmployee(payload: EmployeePayload) {
    if (!payload.full_name) throw new Error('Nome do funcionário é obrigatório.');
    if (!payload.role) throw new Error('Perfil de acesso é obrigatório.');
    if (!payload.cargo) throw new Error('Cargo é obrigatório.');
    if (!payload.matricula) throw new Error('Não foi possível gerar a matrícula. Tente novamente.');

    const { data, error } = await supabase
      .from('employees')
      .insert([payload])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateEmployee(employeeId: string, payload: Partial<EmployeePayload>) {
    const { data, error } = await supabase
      .from('employees')
      .update(payload)
      .eq('id', employeeId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deactivateEmployee(employeeId: string) {
    // Soft delete apenas atualizando is_active
    const { data, error } = await supabase
      .from('employees')
      .update({ is_active: false })
      .eq('id', employeeId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async reactivateEmployee(employeeId: string) {
    const { data, error } = await supabase
      .from('employees')
      .update({ is_active: true })
      .eq('id', employeeId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getNextMatricula(organizationId: string) {
    const { data, error } = await supabase
      .from('employees')
      .select('matricula')
      .eq('organization_id', organizationId);

    if (error) throw error;

    if (!data || data.length === 0) {
      return '02'; // Base starting after admin (01)
    }

    const numericMatriculas = data
      .map(e => e.matricula)
      .filter(m => m && typeof m === 'string' && /^\d+$/.test(m))
      .map(m => parseInt(m, 10));

    if (numericMatriculas.length === 0) {
      return '02'; // Only 'admin' or text exist
    }

    const maxMatricula = Math.max(...numericMatriculas);
    const nextMatricula = maxMatricula < 1 ? 2 : maxMatricula + 1;
    return String(nextMatricula).padStart(2, '0');
  },

  async activateEmployeeAccess(employeeId: string) {
    const { data, error } = await supabase.functions.invoke('manage-employee-access', {
      body: {
        action: 'activate_access',
        employee_id: employeeId
      }
    });
    
    if (error) {
      if (import.meta.env.DEV) {
        console.error('[DEV] activateEmployeeAccess error:', {
          employeeId,
          message: error.message,
          context: error.context,
          name: error.name
        });
      }
      const msg = error.context?.json?.error || error.message || 'Erro desconhecido ao ativar acesso';
      throw new Error(msg);
    }
    return data;
  },

  async resetEmployeePassword(employeeId: string) {
    const { data, error } = await supabase.functions.invoke('manage-employee-access', {
      body: {
        action: 'reset_password',
        employee_id: employeeId
      }
    });

    if (error) {
      const msg = error.context?.json?.error || error.message || 'Erro desconhecido ao resetar senha';
      throw new Error(msg);
    }
    return data;
  }
};

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Gera senha forte
function generateStrongPassword() {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let pass = "";
  for (let i = 0; i < 10; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

serve(async (req) => {
  // Trata preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
    }
    const jwt = authHeader.replace('Bearer ', '');

    const { action, employee_id, current_password, new_password } = await req.json();

    if (!action) {
      return new Response(JSON.stringify({ error: 'Ação não fornecida' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }

    // Cria cliente admin (Service Role)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Valida o usuário chamador pelo JWT recebido do frontend
    const { data: { user: callerUser }, error: verifyError } = await supabaseAdmin.auth.getUser(jwt);
    if (verifyError || !callerUser) {
      return new Response(JSON.stringify({ error: 'Não autorizado ou JWT inválido' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
    }

    // Busca dados do chamador (pode ser Admin ou o proprio Colaborador)
    const { data: callerEmployee, error: callerEmpError } = await supabaseAdmin
      .from('employees')
      .select('id, matricula, organization_id, role, is_active, deleted_at, password_change_required')
      .eq('auth_user_id', callerUser.id)
      .single();

    if (callerEmpError || !callerEmployee || !callerEmployee.is_active || callerEmployee.deleted_at !== null) {
      return new Response(JSON.stringify({ error: 'Acesso negado ou usuário não encontrado' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 });
    }

    if (action === 'complete_password_change') {
      if (callerEmployee.role !== 'Colaborador') {
        return new Response(JSON.stringify({ error: 'Apenas colaboradores podem usar esta ação' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 });
      }
      // O frontend envia req.json() validado.
      if (!current_password || !new_password) {
         return new Response(JSON.stringify({ error: 'Senha atual e nova senha são obrigatórias' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
      }

      // Validar senha atual criando um cliente anônimo (padrão)
      const anonClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      );
      const email = `${callerEmployee.matricula}@a2datapoint.com`;
      const { error: signInError } = await anonClient.auth.signInWithPassword({
        email: email,
        password: current_password,
      });

      if (signInError) {
        return new Response(JSON.stringify({ error: 'Senha atual incorreta' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
      }

      // Atualiza senha do Auth User
      const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
        callerUser.id,
        { password: new_password }
      );

      if (updateAuthError) {
        return new Response(JSON.stringify({ error: updateAuthError.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
      }

      // Atualiza banco (verificando se as colunas existem silenciosamente no schema via update)
      await supabaseAdmin
        .from('employees')
        .update({ 
          password_change_required: false,
          password_changed_at: new Date().toISOString()
        })
        .eq('id', callerEmployee.id);

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    // A partir daqui, é fluxo de Administrador
    // A partir daqui, é fluxo de Administrador/Master
    if (callerEmployee.role !== 'Administrador' && callerEmployee.role !== 'Master') {
      return new Response(JSON.stringify({ error: 'Acesso negado. Requer privilégios de administrador ou master.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 });
    }

    if (!employee_id) {
       return new Response(JSON.stringify({ error: 'employee_id é obrigatório para ações administrativas' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }

    // Busca dados do Colaborador Alvo
    const { data: targetEmployee, error: targetEmpError } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('id', employee_id)
      .single();

    if (targetEmpError || !targetEmployee) {
      return new Response(JSON.stringify({ error: 'Colaborador não encontrado' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 });
    }

    if (targetEmployee.organization_id !== callerEmployee.organization_id) {
      return new Response(JSON.stringify({ error: 'Colaborador não pertence à mesma organização' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 });
    }

    if (!targetEmployee.is_active || targetEmployee.deleted_at !== null) {
      return new Response(JSON.stringify({ error: 'Alvo não é um funcionário ativo' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 });
    }

    // Executa a ação
    if (action === 'activate_access') {
      if (targetEmployee.auth_user_id) {
        return new Response(JSON.stringify({ error: 'Colaborador já possui acesso ativo' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 });
      }

      let authUserId = null;
      const temporaryPassword = generateStrongPassword();
      const email = `${targetEmployee.matricula}@a2datapoint.com`;

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: temporaryPassword,
        email_confirm: true
      });

      if (authError) {
        // Tratar reconciliação caso o auth user já exista
        const isAlreadyRegistered = authError.message?.toLowerCase().includes('already registered') || authError.status === 422 || authError.name === 'AuthApiError';
        
        if (isAlreadyRegistered) {
          const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
          if (!listError && usersData?.users) {
            const existingUser = usersData.users.find((u: any) => u.email === email);
            if (existingUser) {
              authUserId = existingUser.id;
              const { error: updatePassError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, { password: temporaryPassword });
              if (updatePassError) {
                return new Response(JSON.stringify({ error: `Falha ao reconciliar usuário: ${updatePassError.message}` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
              }
            } else {
              return new Response(JSON.stringify({ error: authError.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
            }
          } else {
            return new Response(JSON.stringify({ error: authError.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
          }
        } else {
          return new Response(JSON.stringify({ error: authError.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
        }
      } else {
        authUserId = authData.user.id;
      }

      // Atualiza o ID do auth_user_id e exige troca
      const { error: updateError } = await supabaseAdmin
        .from('employees')
        .update({ 
          auth_user_id: authUserId,
          password_change_required: true,
          last_password_reset_at: new Date().toISOString()
        })
        .eq('id', targetEmployee.id);

      if (updateError) {
        // Fallback: se falhou em atualizar o employee, pode tentar deletar o usuario criado no Auth se foi recem criado
        if (authData?.user) {
          await supabaseAdmin.auth.admin.deleteUser(authUserId);
        }
        return new Response(JSON.stringify({ error: 'Falha ao vincular usuário.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
      }

      return new Response(JSON.stringify({
        success: true,
        matricula: targetEmployee.matricula,
        email: email,
        temporary_password: temporaryPassword
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

    } else if (action === 'reset_password') {
      if (!targetEmployee.auth_user_id) {
        return new Response(JSON.stringify({ error: 'Colaborador ainda não possui acesso ativo' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
      }

      const temporaryPassword = generateStrongPassword();
      const email = `${targetEmployee.matricula}@a2datapoint.com`;

      const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        targetEmployee.auth_user_id,
        { password: temporaryPassword }
      );

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
      }

      // Exige troca
      await supabaseAdmin
        .from('employees')
        .update({ 
          password_change_required: true,
          last_password_reset_at: new Date().toISOString()
        })
        .eq('id', targetEmployee.id);

      return new Response(JSON.stringify({
        success: true,
        matricula: targetEmployee.matricula,
        email: email,
        temporary_password: temporaryPassword
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

    } else {
      return new Response(JSON.stringify({ error: 'Ação inválida' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});

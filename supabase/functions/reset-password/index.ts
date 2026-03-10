// supabase/functions/reset-password/index.ts
// Reseta a senha do utilizador para a matrícula (senha temporária)
// Deploy: supabase functions deploy reset-password

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // Verificar se o chamador é admin
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Apenas admins podem resetar senhas' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { userId } = await req.json() as { userId: string }

    // Buscar a matrícula do utilizador para usar como senha temporária
    const { data: targetProfile, error: profileError } = await supabase
      .from('profiles')
      .select('matricula')
      .eq('id', userId)
      .single()

    if (profileError || !targetProfile) {
      return new Response(JSON.stringify({ error: 'Utilizador não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Resetar senha para o número da matrícula (senha temporária)
    const tempPassword = String(targetProfile.matricula)

    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: tempPassword,
    })

    if (updateError) throw updateError

    // Marcar is_first_access = true para forçar redefinição no próximo login
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({ is_first_access: true })
      .eq('id', userId)

    if (profileUpdateError) throw profileUpdateError

    return new Response(
      JSON.stringify({
        success: true,
        message: `Senha resetada para a matrícula ${targetProfile.matricula}`,
        tempPassword,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Reset password error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
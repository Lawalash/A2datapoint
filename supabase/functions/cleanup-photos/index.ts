// supabase/functions/cleanup-photos/index.ts
// Edge Function para limpar fotos com mais de 7 dias do bucket punch_photos
// Deploy: supabase functions deploy cleanup-photos

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Apenas admins autenticados podem acionar esta função
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

    // Verificar se o utilizador é admin
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Apenas admins podem executar esta operação' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Calcular data limite: 7 dias atrás
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // Buscar todos os objetos do bucket
    const { data: files, error: listError } = await supabase.storage
      .from('punch_photos')
      .list('', { limit: 1000, offset: 0 })

    if (listError) throw listError

    if (!files || files.length === 0) {
      return new Response(JSON.stringify({ deleted: 0, message: 'Nenhum arquivo encontrado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Filtrar arquivos mais antigos que 7 dias
    const oldFiles = files.filter((file) => {
      const createdAt = new Date(file.created_at)
      return createdAt < sevenDaysAgo
    })

    if (oldFiles.length === 0) {
      return new Response(JSON.stringify({ deleted: 0, message: 'Nenhum arquivo antigo encontrado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Deletar arquivos antigos do storage
    const filePaths = oldFiles.map((f) => f.name)
    const { error: deleteStorageError } = await supabase.storage
      .from('punch_photos')
      .remove(filePaths)

    if (deleteStorageError) throw deleteStorageError

    // Atualizar time_logs para remover URLs das fotos deletadas
    // Mantém o registro de texto na BD, apenas remove a foto
    const { error: updateLogsError } = await supabase
      .from('time_logs')
      .update({ photo_url: null })
      .lt('created_at', sevenDaysAgo.toISOString())
      .not('photo_url', 'is', null)

    if (updateLogsError) throw updateLogsError

    const result = {
      deleted: oldFiles.length,
      message: `${oldFiles.length} foto(s) removida(s) com sucesso`,
      freedSpace: `~${(oldFiles.length * 2).toFixed(1)} MB`
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Cleanup error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
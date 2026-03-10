// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias.\n' +
    'Crie .env.local com base no .env.example'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})

// ── Helpers de Storage ──────────────────────────────────────────

/** URL pública de uma foto no bucket punch_photos */
export function getPhotoUrl(path: string): string {
  const { data } = supabase.storage.from('punch_photos').getPublicUrl(path)
  return data.publicUrl
}

/** Upload de foto (dataURL) para o Supabase Storage */
export async function uploadPhoto(
  userId: string,
  imageDataUrl: string
): Promise<string | null> {
  try {
    const res = await fetch(imageDataUrl)
    const blob = await res.blob()
    const fileName = `${userId}/${Date.now()}.jpg`

    const { data, error } = await supabase.storage
      .from('punch_photos')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      })

    if (error) throw error
    return getPhotoUrl(data.path)
  } catch (err) {
    console.error('Erro ao fazer upload da foto:', err)
    return null
  }
}

/** Acionar Edge Function de limpeza de fotos antigas */
export async function triggerPhotoCleanup(): Promise<{
  deleted: number
  message: string
  freedSpace?: string
}> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Não autenticado')

  const response = await fetch(
    `${supabaseUrl}/functions/v1/cleanup-photos`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    }
  )

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Erro desconhecido' }))
    throw new Error((err as { message?: string }).message ?? 'Falha ao limpar fotos')
  }

  return response.json() as Promise<{ deleted: number; message: string; freedSpace?: string }>
}
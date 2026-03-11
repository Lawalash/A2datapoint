// src/sections/admin/Storage.tsx
import { useState, useEffect, useCallback } from 'react'
import { useStore } from '@/hooks/useStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { supabase } from '@/lib/supabase'
import {
  Trash2, Image, CheckCircle2, HardDrive,
  AlertTriangle, Loader2, RefreshCw, X, Maximize2
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { TimeLog } from '@/types'

const STORAGE_LIMIT_MB = 500

// Cleanup via direct SDK — avoids Edge Function dependency
async function cleanupOldPhotos(): Promise<{ deleted: number; errors: number; message: string }> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  // 1. Find old logs with photos
  const { data: oldLogs, error: logsError } = await supabase
    .from('time_logs')
    .select('id, photo_url')
    .lt('timestamp', sevenDaysAgo.toISOString())
    .not('photo_url', 'is', null)

  if (logsError) {
    throw new Error(`Erro ao buscar registros: ${logsError.message}`)
  }

  if (!oldLogs || oldLogs.length === 0) {
    return { deleted: 0, errors: 0, message: 'Nenhuma foto antiga encontrada.' }
  }

  // 2. Extract storage paths from URLs
  const paths: string[] = []
  for (const log of oldLogs) {
    if (!log.photo_url) continue
    try {
      const url = new URL(log.photo_url)
      // Path: /storage/v1/object/public/punch_photos/USER_ID/FILE.jpg
      const match = url.pathname.match(/punch_photos\/(.+)$/)
      if (match) paths.push(match[1])
    } catch {
      // Skip invalid URLs silently
    }
  }

  if (paths.length === 0) {
    return { deleted: 0, errors: 0, message: 'Nenhum arquivo para remover.' }
  }

  // 3. Delete from storage in batches of 50 (smaller batches = more reliable)
  let deleted = 0
  let errors  = 0
  const batchSize = 50

  for (let i = 0; i < paths.length; i += batchSize) {
    const batch = paths.slice(i, i + batchSize)
    try {
      const { error: deleteError } = await supabase.storage.from('punch_photos').remove(batch)
      if (deleteError) {
        console.warn('Batch delete error:', deleteError.message)
        errors += batch.length
      } else {
        deleted += batch.length
      }
    } catch (err) {
      console.warn('Storage batch error:', err)
      errors += batch.length
    }
  }

  // 4. Clear photo_url references regardless (even if storage delete partially failed)
  const { error: clearError } = await supabase
    .from('time_logs')
    .update({ photo_url: null })
    .lt('timestamp', sevenDaysAgo.toISOString())
    .not('photo_url', 'is', null)

  if (clearError) {
    console.warn('Error clearing photo_url refs:', clearError.message)
  }

  const estimatedMB = deleted * 2
  const msg = errors > 0
    ? `${deleted} foto(s) removidas (~${estimatedMB}MB). ${errors} falharam (referências limpas).`
    : `${deleted} foto(s) removidas com sucesso (~${estimatedMB}MB liberados).`

  return { deleted, errors, message: msg }
}

export function Storage() {
  const [photoModal, setPhotoModal] = useState<{ url: string; name: string; time: string } | null>(null)
  const timeLogs    = useStore((state) => state.timeLogs)
  const fetchTimeLogs = useStore((state) => state.fetchTimeLogs)

  const [feedback,     setFeedback]     = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null)
  const [clearing,     setClearing]     = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    const from = new Date()
    from.setDate(from.getDate() - 30)
    fetchTimeLogs(from)
  }, [fetchTimeLogs])

  const refresh = useCallback(async () => {
    setIsRefreshing(true)
    const from = new Date()
    from.setDate(from.getDate() - 30)
    await fetchTimeLogs(from)
    setIsRefreshing(false)
  }, [fetchTimeLogs])

  const now         = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const withPhoto    = timeLogs.filter((r: TimeLog) => r.photo_url)
  const recentPhotos = withPhoto.filter((r: TimeLog) => new Date(r.timestamp) >= sevenDaysAgo)
  const oldPhotos    = withPhoto.filter((r: TimeLog) => new Date(r.timestamp) < sevenDaysAgo)

  const estimatedMB  = withPhoto.length * 2
  const usagePercent = Math.min((estimatedMB / STORAGE_LIMIT_MB) * 100, 100)

  const getStatus = (pct: number) => {
    if (pct < 50) return { text: 'Normal',  color: 'text-green-600' }
    if (pct < 80) return { text: 'Atenção', color: 'text-yellow-600' }
    return              { text: 'Crítico',  color: 'text-red-600' }
  }

  const status = getStatus(usagePercent)

  const handleClear = async () => {
    setClearing(true)
    setFeedback(null)
    try {
      const result = await cleanupOldPhotos()
      const type = result.errors > 0 ? 'warning' : 'success'
      setFeedback({ type, message: result.message })
      await refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido ao limpar fotos.'
      setFeedback({ type: 'error', message: msg })
    }
    setClearing(false)
    setTimeout(() => setFeedback(null), 8000)
  }

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[#0f2d5c]">Armazenamento</h1>
          <p className="text-sm text-gray-500 mt-1">Gerir fotos dos registros de ponto</p>
        </div>
        <button
          onClick={refresh}
          disabled={isRefreshing}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {feedback && (
        <Alert className={`mb-4 ${
          feedback.type === 'success' ? 'bg-green-50 border-green-300' :
          feedback.type === 'warning' ? 'bg-yellow-50 border-yellow-300' :
          'bg-red-50 border-red-300'
        }`}>
          {feedback.type === 'success'
            ? <CheckCircle2 className="h-4 w-4 text-green-600" />
            : <AlertTriangle className={`h-4 w-4 ${feedback.type === 'warning' ? 'text-yellow-600' : 'text-red-600'}`} />
          }
          <AlertDescription className={
            feedback.type === 'success' ? 'text-green-800' :
            feedback.type === 'warning' ? 'text-yellow-800' :
            'text-red-800'
          }>
            {feedback.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Usage card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center">
                <HardDrive className="w-7 h-7 text-red-600" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Uso estimado</p>
                <p className="text-2xl font-bold text-gray-800">
                  {estimatedMB} <span className="text-lg text-gray-400">/ {STORAGE_LIMIT_MB} MB</span>
                </p>
              </div>
            </div>
            <span className={`text-sm font-semibold ${status.color}`}>{status.text}</span>
          </div>
          <Progress value={usagePercent} className="h-2.5" />
          <p className="text-gray-400 text-xs mt-2 text-right">{usagePercent.toFixed(1)}% utilizado</p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Image className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-gray-500 text-xs">Últimos 7 dias</p>
              <p className="text-xl font-bold text-gray-800">{recentPhotos.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Image className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-gray-500 text-xs">Mais de 7 dias</p>
              <p className="text-xl font-bold text-gray-800">{oldPhotos.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {usagePercent > 80 && (
        <Card className="bg-red-50 border-red-200 mb-6">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-red-800">Armazenamento Quase Cheio</p>
              <p className="text-sm text-red-700">Recomendamos limpar fotos antigas imediatamente.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Note about storage permissions */}
      <Card className="bg-blue-50 border-blue-200 mb-6">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-blue-800 text-sm">Sobre a limpeza de fotos</p>
            <p className="text-xs text-blue-700 mt-1">
              Certifique-se que a política de Storage no Supabase permite DELETE para usuários autenticados no bucket <code>punch_photos</code>.
              As referências nos registros são sempre limpas, mesmo que a deleção do arquivo falhe.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Clear action */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-gray-500" />
            Limpar Fotos Antigas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-sm mb-4">
            Remove fotos com mais de 7 dias do storage. Os registros de texto são mantidos.
            <br />
            <strong className="text-gray-700">{oldPhotos.length} foto(s)</strong> serão removidas
            (~{oldPhotos.length * 2} MB liberados).
          </p>
          <Button
            variant="destructive"
            className="w-full h-12"
            onClick={handleClear}
            disabled={clearing || oldPhotos.length === 0}
          >
            {clearing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Limpando...</>
            ) : (
              <><Trash2 className="w-4 h-4 mr-2" />Limpar Fotos Antigas (&gt; 7 dias)</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Recent photos list */}
      {withPhoto.length > 0 && (
        <>
          <h2 className="text-gray-700 font-semibold mb-3">Fotos Recentes</h2>
          <div className="space-y-2">
            {withPhoto.slice(0, 6).map((record: TimeLog) => (
              <Card key={record.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <button
                    onClick={() => setPhotoModal({
                      url: record.photo_url!,
                      name: record.profile?.name ?? '—',
                      time: new Date(record.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
                    })}
                    className="w-12 h-12 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition-colors shrink-0 relative group"
                  >
                    <img
                      src={record.photo_url!}
                      alt="foto ponto"
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                      <Maximize2 className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">{record.profile?.name ?? '—'}</p>
                    <p className="text-gray-400 text-xs">{formatDistanceToNow(new Date(record.timestamp), { addSuffix: true, locale: ptBR })}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium shrink-0 ${record.type === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {record.type === 'in' ? 'Entrada' : 'Saída'}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {photoModal && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4" onClick={() => setPhotoModal(null)}>
          <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-white font-semibold">{photoModal.name}</p>
                <p className="text-white/50 text-sm">{photoModal.time}</p>
              </div>
              <button onClick={() => setPhotoModal(null)} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20">
                <X className="w-5 h-5" />
              </button>
            </div>
            <img src={photoModal.url} alt="Foto auditoria" className="w-full rounded-2xl object-contain max-h-[70vh]" />
          </div>
        </div>
      )}
    </div>
  )
}
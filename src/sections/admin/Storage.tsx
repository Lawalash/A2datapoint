// src/sections/admin/Storage.tsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { useStore } from '@/hooks/useStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { supabase } from '@/lib/supabase'
import {
  Trash2, Image, CheckCircle2, HardDrive,
  AlertTriangle, Loader2, RefreshCw, X, Maximize2, Clock,
  ChevronDown, ChevronUp
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { TimeLog } from '@/types'

const STORAGE_LIMIT_MB = 500
const REALTIME_POLL_MS = 30_000 // atualiza a cada 30s

// ── Extrai path do storage a partir de uma URL ──────────────────
function extractStoragePath(photoUrl: string): string | null {
  try {
    const url = new URL(photoUrl)
    const match = url.pathname.match(/punch_photos\/(.+)$/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

// ── Busca tamanho real do bucket via Storage API ─────────────────
async function fetchRealStorageSize(): Promise<{ totalMB: number; totalFiles: number } | null> {
  try {
    // Lista pastas de usuário no bucket
    const { data: userFolders, error: foldersErr } = await supabase.storage
      .from('punch_photos')
      .list('', { limit: 1000 })

    if (foldersErr || !userFolders) return null

    let totalBytes = 0
    let totalFiles = 0

    for (const folder of userFolders) {
      if (!folder.id) continue // é pasta
      // Arquivo no root (sem subpasta)
      if (folder.metadata?.size) {
        totalBytes += folder.metadata.size as number
        totalFiles++
        continue
      }
      // Lista arquivos dentro da pasta do usuário
      const { data: files } = await supabase.storage
        .from('punch_photos')
        .list(folder.name, { limit: 1000 })

      if (files) {
        for (const file of files) {
          if (file.metadata?.size) {
            totalBytes += file.metadata.size as number
            totalFiles++
          }
        }
      }
    }

    return { totalMB: totalBytes / (1024 * 1024), totalFiles }
  } catch {
    return null
  }
}

// ── Apaga fotos antigas (> N dias) ─────────────────────────────
async function cleanupPhotos(olderThanDays: number): Promise<{ deleted: number; errors: number; message: string }> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - olderThanDays)

  const { data: oldLogs, error: logsError } = await supabase
    .from('time_logs')
    .select('id, photo_url')
    .lt('timestamp', cutoff.toISOString())
    .not('photo_url', 'is', null)

  if (logsError) throw new Error(`Erro ao buscar registros: ${logsError.message}`)
  if (!oldLogs || oldLogs.length === 0) {
    return { deleted: 0, errors: 0, message: 'Nenhuma foto encontrada para remover.' }
  }

  const paths: string[] = []
  for (const log of oldLogs) {
    if (!log.photo_url) continue
    const path = extractStoragePath(log.photo_url)
    if (path) paths.push(path)
  }

  let deleted = 0, errors = 0
  const batchSize = 50
  for (let i = 0; i < paths.length; i += batchSize) {
    const batch = paths.slice(i, i + batchSize)
    const { error: deleteError } = await supabase.storage.from('punch_photos').remove(batch)
    if (deleteError) { errors += batch.length }
    else { deleted += batch.length }
  }

  // Limpa referências independentemente
  await supabase.from('time_logs').update({ photo_url: null }).lt('timestamp', cutoff.toISOString()).not('photo_url', 'is', null)

  const estimatedMB = (deleted * 2).toFixed(0)
  const msg = errors > 0
    ? `${deleted} foto(s) removidas (~${estimatedMB}MB). ${errors} falharam (refs limpas).`
    : `${deleted} foto(s) removidas com sucesso (~${estimatedMB}MB liberados).`

  return { deleted, errors, message: msg }
}

// ── Apaga uma foto individual ───────────────────────────────────
async function deletePhoto(log: TimeLog): Promise<{ ok: boolean; message: string }> {
  try {
    if (log.photo_url) {
      const path = extractStoragePath(log.photo_url)
      if (path) {
        await supabase.storage.from('punch_photos').remove([path])
      }
    }
    const { error } = await supabase.from('time_logs').update({ photo_url: null }).eq('id', log.id)
    if (error) throw error
    return { ok: true, message: 'Foto removida.' }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Erro ao remover foto.' }
  }
}

export function Storage() {
  const [photoModal, setPhotoModal]       = useState<{ url: string; name: string; time: string } | null>(null)
  const [feedback, setFeedback]           = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null)
  const [clearing, setClearing]           = useState(false)
  const [isRefreshing, setIsRefreshing]   = useState(false)
  const [deletingIds, setDeletingIds]     = useState<Set<string>>(new Set())
  const [showAll, setShowAll]             = useState(false)
  const [realStorage, setRealStorage]     = useState<{ totalMB: number; totalFiles: number } | null>(null)
  const [realLoading, setRealLoading]     = useState(false)
  const [cleanupDays, setCleanupDays]     = useState(7)

  const timeLogs      = useStore((state) => state.timeLogs)
  const fetchTimeLogs = useStore((state) => state.fetchTimeLogs)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchRealStorage = useCallback(async () => {
    setRealLoading(true)
    const result = await fetchRealStorageSize()
    setRealStorage(result)
    setRealLoading(false)
  }, [])

  const refresh = useCallback(async () => {
    setIsRefreshing(true)
    const from = new Date()
    from.setDate(from.getDate() - 90)
    await fetchTimeLogs(from)
    await fetchRealStorage()
    setIsRefreshing(false)
  }, [fetchTimeLogs, fetchRealStorage])

  // Carrega logs e storage ao montar
  useEffect(() => {
    const from = new Date()
    from.setDate(from.getDate() - 90)
    fetchTimeLogs(from)
    fetchRealStorage()
  }, [fetchTimeLogs, fetchRealStorage])

  // Polling em tempo real a cada 30s
  useEffect(() => {
    pollRef.current = setInterval(() => { void fetchRealStorage() }, REALTIME_POLL_MS)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [fetchRealStorage])

  const now          = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const withPhoto     = timeLogs.filter((r: TimeLog) => r.photo_url)
  const recentPhotos  = withPhoto.filter((r: TimeLog) => new Date(r.timestamp) >= sevenDaysAgo)
  const oldPhotos     = withPhoto.filter((r: TimeLog) => new Date(r.timestamp) < sevenDaysAgo)
  const veryOldPhotos = withPhoto.filter((r: TimeLog) => new Date(r.timestamp) < thirtyDaysAgo)

  // Usa tamanho real se disponível, senão estima
  const estimatedMB  = realStorage ? realStorage.totalMB : withPhoto.length * 2
  const totalFiles   = realStorage ? realStorage.totalFiles : withPhoto.length
  const usagePercent = Math.min((estimatedMB / STORAGE_LIMIT_MB) * 100, 100)

  const getStatus = (pct: number) => {
    if (pct < 50) return { text: 'Normal',  color: 'text-green-600',  bar: 'bg-green-500' }
    if (pct < 80) return { text: 'Atenção', color: 'text-yellow-600', bar: 'bg-yellow-500' }
    return              { text: 'Crítico',  color: 'text-red-600',    bar: 'bg-red-500' }
  }
  const status = getStatus(usagePercent)

  const showFeedback = (type: 'success' | 'error' | 'warning', message: string) => {
    setFeedback({ type, message })
    setTimeout(() => setFeedback(null), 8000)
  }

  const handleClear = async (days: number) => {
    setClearing(true)
    setFeedback(null)
    try {
      const result = await cleanupPhotos(days)
      showFeedback(result.errors > 0 ? 'warning' : 'success', result.message)
      await refresh()
    } catch (err) {
      showFeedback('error', err instanceof Error ? err.message : 'Erro desconhecido.')
    }
    setClearing(false)
  }

  const handleDeletePhoto = async (log: TimeLog) => {
    setDeletingIds(prev => new Set(prev).add(log.id))
    const result = await deletePhoto(log)
    setDeletingIds(prev => { const s = new Set(prev); s.delete(log.id); return s })
    if (result.ok) {
      showFeedback('success', result.message)
      await refresh()
    } else {
      showFeedback('error', result.message)
    }
  }

  const displayedPhotos = showAll ? withPhoto : withPhoto.slice(0, 12)

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[#0f2d5c]">Armazenamento</h1>
          <p className="text-sm text-gray-500 mt-1">Gerir fotos dos registros de ponto</p>
        </div>
        <button
          onClick={refresh}
          disabled={isRefreshing}
          title="Atualizar dados"
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
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
            feedback.type === 'warning' ? 'text-yellow-800' : 'text-red-800'
          }>
            {feedback.message}
          </AlertDescription>
        </Alert>
      )}

      {/* ── Uso real do storage ── */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center">
                <HardDrive className="w-7 h-7 text-red-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-gray-500 text-sm">Uso {realStorage ? 'real' : 'estimado'}</p>
                  {realLoading && <Loader2 className="w-3 h-3 text-gray-400 animate-spin" />}
                  {!realLoading && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />tempo real
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold text-gray-800">
                  {estimatedMB < 1 ? `${(estimatedMB * 1024).toFixed(0)} KB` : `${estimatedMB.toFixed(1)} MB`}
                  <span className="text-lg text-gray-400 font-normal"> / {STORAGE_LIMIT_MB} MB</span>
                </p>
                <p className="text-gray-400 text-xs mt-0.5">{totalFiles} arquivo(s) no bucket</p>
              </div>
            </div>
            <span className={`text-sm font-semibold ${status.color}`}>{status.text}</span>
          </div>
          <Progress value={usagePercent} className="h-3" />
          <p className="text-gray-400 text-xs mt-2 text-right">{usagePercent.toFixed(1)}% utilizado</p>
        </CardContent>
      </Card>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Últimos 7 dias', count: recentPhotos.length, color: 'bg-green-100 text-green-600' },
          { label: '8 a 30 dias',    count: oldPhotos.length - veryOldPhotos.length, color: 'bg-yellow-100 text-yellow-600' },
          { label: 'Mais de 30 dias',count: veryOldPhotos.length, color: 'bg-red-100 text-red-600' },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="p-4 flex items-center gap-2">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                <Image className="w-4 h-4" />
              </div>
              <div>
                <p className="text-gray-500 text-xs leading-tight">{item.label}</p>
                <p className="text-xl font-bold text-gray-800">{item.count}</p>
              </div>
            </CardContent>
          </Card>
        ))}
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

      {/* ── Acções de limpeza ── */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-gray-500" />
            Limpar Fotos por Período
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { days: 7,  label: '> 7 dias',  count: oldPhotos.length,    color: 'bg-yellow-600 hover:bg-yellow-700' },
            { days: 30, label: '> 30 dias', count: veryOldPhotos.length, color: 'bg-red-600 hover:bg-red-700' },
          ].map(opt => (
            <div key={opt.days} className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl">
              <div>
                <p className="font-medium text-gray-700 text-sm">Fotos com mais de {opt.days} dias</p>
                <p className="text-gray-400 text-xs">{opt.count} foto(s) · ~{opt.count * 2}MB estimado</p>
              </div>
              <Button
                className={`h-10 px-4 text-white shrink-0 ${opt.color}`}
                onClick={() => handleClear(opt.days)}
                disabled={clearing || opt.count === 0}
              >
                {clearing && cleanupDays === opt.days
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><Trash2 className="w-4 h-4 mr-1.5" />Limpar</>
                }
              </Button>
            </div>
          ))}

          {/* Limpar TODAS */}
          <div className="flex items-center justify-between gap-3 p-3 bg-red-50 rounded-xl border border-red-200">
            <div>
              <p className="font-medium text-red-700 text-sm">Todas as fotos</p>
              <p className="text-red-400 text-xs">{withPhoto.length} foto(s) · ~{withPhoto.length * 2}MB estimado</p>
            </div>
            <Button
              variant="destructive"
              className="h-10 px-4 shrink-0"
              onClick={() => {
                if (!confirm(`Apagar TODAS as ${withPhoto.length} fotos? Esta ação não pode ser desfeita.`)) return
                setCleanupDays(0)
                void handleClear(0)
              }}
              disabled={clearing || withPhoto.length === 0}
            >
              {clearing && cleanupDays === 0
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <><Trash2 className="w-4 h-4 mr-1.5" />Apagar Todas</>
              }
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Lista de fotos com delete individual ── */}
      {withPhoto.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Image className="w-4 h-4 text-gray-500" />
                Fotos no Storage ({withPhoto.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {displayedPhotos.map((record: TimeLog) => {
                const isDeleting = deletingIds.has(record.id)
                const isOld = new Date(record.timestamp) < sevenDaysAgo
                return (
                  <div key={record.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                    {/* Thumbnail */}
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

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">{record.profile?.name ?? '—'}</p>
                      <p className="text-gray-400 text-xs">
                        {formatDistanceToNow(new Date(record.timestamp), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>

                    {/* Tipo */}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium shrink-0 ${
                      record.type === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {record.type === 'in' ? 'Entrada' : 'Saída'}
                    </span>

                    {/* Badge antiga */}
                    {isOld && (
                      <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700 shrink-0 hidden sm:block">
                        +7d
                      </span>
                    )}

                    {/* Botão deletar individual */}
                    <button
                      onClick={() => {
                        if (!confirm('Remover esta foto? O registro de ponto é mantido.')) return
                        void handleDeletePhoto(record)
                      }}
                      disabled={isDeleting}
                      title="Remover foto"
                      className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors shrink-0 disabled:opacity-50"
                    >
                      {isDeleting
                        ? <Loader2 className="w-3.5 h-3.5 text-red-500 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      }
                    </button>
                  </div>
                )
              })}
            </div>

            {withPhoto.length > 12 && (
              <div className="px-4 py-3 border-t border-gray-100">
                <button
                  onClick={() => setShowAll(p => !p)}
                  className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showAll ? <><ChevronUp className="w-4 h-4" />Mostrar menos</> : <><ChevronDown className="w-4 h-4" />Ver todas as {withPhoto.length} fotos</>}
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {withPhoto.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            <Image className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma foto no storage</p>
          </CardContent>
        </Card>
      )}

      {/* Modal foto ampliada */}
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
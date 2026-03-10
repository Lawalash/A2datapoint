// src/sections/employee/Dashboard.tsx
import { useState, useRef, useEffect, useCallback } from 'react'
import { useStore } from '@/hooks/useStore'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  Camera, LogOut, Clock, CheckCircle2, AlertCircle,
  X, Calendar, Timer, Maximize2, Minimize2, WifiOff
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { PunchResult } from '@/types'

// ── Verificar janela de ponto ───────────────────────────────────
function isPunchAllowed(
  scheduledTime: string | undefined,
  type: 'in' | 'out'
): boolean {
  if (!scheduledTime) return true // sem escala = sempre permitido
  const [h, m] = scheduledTime.split(':').map(Number)
  const now = new Date()
  const scheduled = new Date()
  scheduled.setHours(h, m, 0, 0)
  const diff = (now.getTime() - scheduled.getTime()) / 60000
  return diff >= -3 && diff <= 120 // -3min até +2h (HE incluída)
}

export function EmployeeDashboard() {
  const [showCamera, setShowCamera] = useState(false)
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [showOvertime, setShowOvertime] = useState(false)
  const [overtimeMinutes, setOvertimeMinutes] = useState(30)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isRegistering, setIsRegistering] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { currentUser, logout, registerTime, requestOvertime, getUserTodayLastLog, getUserShiftToday } = useStore()

  const lastLog = getUserTodayLastLog()
  const shiftToday = getUserShiftToday()
  const nextType: 'in' | 'out' = lastLog?.type === 'in' ? 'out' : 'in'

  // Relógio em tempo real
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Verificar se ponto está disponível
  const scheduledTime = nextType === 'in' ? shiftToday?.start_time : shiftToday?.end_time
  const punchAllowed = isPunchAllowed(scheduledTime, nextType)

  // Fullscreen API
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch {
      // Fallback: simular fullscreen com CSS
      setIsFullscreen((prev) => !prev)
    }
  }, [])

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // Câmera
  const startCamera = async () => {
    setShowCamera(true)
    setCapturedPhoto(null)
  }

  useEffect(() => {
    if (!showCamera || capturedPhoto) return

    let stream: MediaStream | null = null

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } })
      .then((s) => {
        stream = s
        if (videoRef.current) {
          videoRef.current.srcObject = s
        }
      })
      .catch(() => {
        toast.error('Não foi possível aceder à câmera.')
        setShowCamera(false)
      })

    return () => {
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [showCamera, capturedPhoto])

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    const photoData = canvas.toDataURL('image/jpeg', 0.85)
    setCapturedPhoto(photoData)

    // Parar stream
    const stream = video.srcObject as MediaStream
    stream?.getTracks().forEach((t) => t.stop())
  }

  const handleRegisterTime = async () => {
    if (!capturedPhoto) return
    setIsRegistering(true)

    const result: PunchResult = await registerTime(nextType, capturedPhoto)

    setIsRegistering(false)
    setShowCamera(false)
    setCapturedPhoto(null)

    if (result.success) {
      if (result.flag === 'he_not_registered') {
        toast.warning(result.message + ' — HE não cadastrada registada para revisão do admin.')
      } else {
        toast.success(result.message)
      }
    } else {
      toast.error(result.message)
    }
  }

  const handleOvertimeRequest = async () => {
    const ok = await requestOvertime(overtimeMinutes)
    if (ok) {
      toast.success(
        `Solicitação de ${Math.floor(overtimeMinutes / 60)}h ${overtimeMinutes % 60 > 0 ? overtimeMinutes % 60 + 'min' : ''} enviada!`
      )
      setShowOvertime(false)
    } else {
      toast.error('Erro ao enviar solicitação. Tente novamente.')
    }
  }

  const formatOT = (min: number) => {
    const h = Math.floor(min / 60)
    const m = min % 60
    return h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ''}` : `${m}min`
  }

  // ── CAMERA VIEW ──────────────────────────────────────────────
  if (showCamera) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <div className="flex-1 relative">
          {!capturedPhoto ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ minHeight: '100dvh' }}
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Face guide oval */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-52 h-64 border-2 border-white/60 rounded-full" />
              </div>

              {/* Instruction */}
              <div className="absolute top-6 inset-x-4 text-center">
                <div className="inline-block bg-black/60 backdrop-blur-sm text-white text-sm font-medium px-4 py-2 rounded-full">
                  Posicione seu rosto no oval
                </div>
              </div>

              {/* Controls */}
              <div className="absolute bottom-10 inset-x-0 flex justify-center">
                <button
                  onClick={capturePhoto}
                  className="w-20 h-20 bg-white rounded-full flex items-center justify-center active:scale-95 transition-transform shadow-2xl"
                >
                  <div className="w-16 h-16 bg-white rounded-full border-4 border-[#0f2d5c]" />
                </button>
              </div>

              {/* Close */}
              <button
                onClick={() => setShowCamera(false)}
                className="absolute top-6 right-4 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              <img
                src={capturedPhoto}
                alt="Captura"
                className="w-full h-full object-cover"
                style={{ minHeight: '100dvh' }}
              />
              <div className="absolute bottom-10 inset-x-4">
                <div className="bg-black/75 backdrop-blur-md rounded-2xl p-5">
                  <p className="text-white text-center text-base font-medium mb-4">Confirmar foto?</p>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 h-14 bg-white/10 border-white/20 text-white hover:bg-white/20"
                      onClick={() => { setCapturedPhoto(null) }}
                    >
                      <X className="w-5 h-5 mr-2" />
                      Tirar outra
                    </Button>
                    <Button
                      className="flex-1 h-14 bg-[#00b4d8] hover:bg-[#0096b7] text-white"
                      onClick={handleRegisterTime}
                      disabled={isRegistering}
                    >
                      {isRegistering ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                      )}
                      {isRegistering ? 'Registrando...' : 'Confirmar'}
                    </Button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setCapturedPhoto(null)}
                className="absolute top-6 right-4 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── OVERTIME VIEW ─────────────────────────────────────────────
  if (showOvertime) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f2d5c] to-[#1a4080] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-7">
          <div className="text-center mb-7">
            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Timer className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-[#0f2d5c]">Solicitar Hora Extra</h2>
            <p className="text-gray-400 text-sm mt-1">Máximo: 1h 45min</p>
          </div>

          <div className="text-center mb-6">
            <span className="text-5xl font-black text-[#0f2d5c] tracking-tight font-mono">
              {formatOT(overtimeMinutes)}
            </span>
          </div>

          <Slider
            value={[overtimeMinutes]}
            onValueChange={(v) => setOvertimeMinutes(v[0])}
            min={15}
            max={105}
            step={15}
            className="mb-2"
          />
          <div className="flex justify-between text-xs text-gray-400 mb-7">
            <span>15 min</span>
            <span>1h 45min</span>
          </div>

          {/* Quick options */}
          <div className="flex gap-2 mb-7">
            {[30, 60, 90, 105].map((min) => (
              <button
                key={min}
                onClick={() => setOvertimeMinutes(min)}
                className={cn(
                  'flex-1 py-2 rounded-xl text-xs font-semibold transition-all',
                  overtimeMinutes === min
                    ? 'bg-[#0f2d5c] text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                )}
              >
                {formatOT(min)}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-13 border-gray-200"
              onClick={() => setShowOvertime(false)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 h-13 bg-amber-500 hover:bg-amber-600 text-white font-semibold"
              onClick={handleOvertimeRequest}
            >
              Enviar
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── MAIN VIEW ─────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className={cn(
        'min-h-screen bg-gradient-to-br from-[#0f2d5c] via-[#1a3a6e] to-[#0f2d5c] flex flex-col',
        isFullscreen && 'fixed inset-0 z-[9999]'
      )}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-safe-top pt-4 pb-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-6 h-6 bg-[#00b4d8] rounded-lg flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-[#00b4d8] text-xs font-bold tracking-widest uppercase">
              A2dataPOINT
            </span>
          </div>
          <p className="text-white/60 text-xs capitalize">
            {format(currentTime, "EEE, dd 'de' MMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 transition-colors"
            title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia (bloqueia navegação)'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => logout()}
            className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Welcome */}
      <div className="px-5 mb-6">
        <p className="text-white/60 text-sm">Bem-vindo(a)</p>
        <h1 className="text-white text-xl font-bold truncate">{currentUser?.name}</h1>
        {shiftToday && (
          <p className="text-white/40 text-xs mt-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Turno: {shiftToday.start_time.slice(0, 5)} – {shiftToday.end_time.slice(0, 5)}
          </p>
        )}
      </div>

      {/* Clock */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Time display */}
        <div className="text-center mb-10">
          <p className="text-6xl font-black text-white font-mono tracking-tight tabular-nums">
            {format(currentTime, 'HH:mm')}
          </p>
          <p className="text-white/40 text-sm mt-1 font-mono">
            {format(currentTime, 'ss')}s
          </p>
        </div>

        {/* Main punch button */}
        <div className="relative mb-8">
          {/* Pulse ring */}
          {punchAllowed && (
            <div className={cn(
              'absolute inset-0 rounded-full animate-ping opacity-20',
              nextType === 'in' ? 'bg-emerald-400' : 'bg-rose-400'
            )} style={{ animationDuration: '2s' }} />
          )}

          <button
            onClick={punchAllowed ? startCamera : undefined}
            disabled={!punchAllowed}
            className={cn(
              'relative w-56 h-56 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-200 active:scale-95',
              punchAllowed
                ? nextType === 'in'
                  ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/30'
                  : 'bg-gradient-to-br from-rose-400 to-rose-600 shadow-rose-500/30'
                : 'bg-white/10 cursor-not-allowed'
            )}
          >
            {punchAllowed ? (
              <>
                <Camera className="w-16 h-16 text-white mb-2" />
                <span className="text-white font-black text-lg tracking-wide">
                  {nextType === 'in' ? 'ENTRADA' : 'SAÍDA'}
                </span>
                <span className="text-white/70 text-xs mt-0.5">Toque para registrar</span>
              </>
            ) : (
              <>
                <WifiOff className="w-14 h-14 text-white/40 mb-2" />
                <span className="text-white/50 font-bold text-sm text-center px-4 leading-tight">
                  Fora da janela de ponto
                </span>
                {scheduledTime && (
                  <span className="text-white/30 text-xs mt-1">
                    Previsto: {scheduledTime.slice(0, 5)}
                  </span>
                )}
              </>
            )}
          </button>
        </div>

        {/* Last record status */}
        {lastLog && (
          <div className="flex items-center gap-2 mb-8">
            <div className={cn(
              'w-2 h-2 rounded-full',
              lastLog.type === 'in' ? 'bg-emerald-400' : 'bg-rose-400'
            )} />
            <p className="text-white/50 text-sm">
              Último: {lastLog.type === 'in' ? 'Entrada' : 'Saída'} às{' '}
              {format(new Date(lastLog.timestamp), 'HH:mm')}
              {lastLog.flag === 'he_not_registered' && (
                <span className="ml-2 text-amber-400 text-xs font-medium">
                  ⚠ HE não cadastrada
                </span>
              )}
            </p>
          </div>
        )}

        {/* Overtime button */}
        <button
          onClick={() => setShowOvertime(true)}
          className="w-full max-w-xs h-14 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl flex items-center justify-center gap-3 text-white font-semibold transition-all active:scale-98"
        >
          <Clock className="w-5 h-5 text-amber-400" />
          Solicitar Hora Extra / Plantão
        </button>
      </div>

      {/* Footer */}
      <div className="pb-safe-bottom pb-4 text-center">
        <p className="text-white/20 text-xs">
          Mat. {currentUser?.matricula} · A2dataPOINT v2.0
        </p>
        {isFullscreen && (
          <p className="text-white/30 text-xs mt-1">
            Modo tela cheia ativo · Toque em ⊡ para sair
          </p>
        )}
      </div>
    </div>
  )
}
// src/sections/employee/Dashboard.tsx
import { useState, useRef, useEffect, useCallback } from 'react'
import { useStore } from '@/hooks/useStore'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  Camera, LogOut, Clock, CheckCircle2,
  X, Calendar, Timer, Maximize2, Minimize2, WifiOff, ShieldCheck,
  UtensilsCrossed, Coffee
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { PunchResult } from '@/types'

// ── Portaria 671 — status da janela de ponto ────────────────────
type PunchStatus = 'no_shift' | 'too_early' | 'allowed' | 'too_late_ot' | 'locked'

function getPunchStatus(scheduledTime: string | undefined, type: 'in' | 'out'): PunchStatus {
  if (!scheduledTime) return 'no_shift'
  const [h, m] = scheduledTime.split(':').map(Number)
  const now = new Date()
  const scheduled = new Date()
  scheduled.setHours(h, m, 0, 0)
  const diff = (now.getTime() - scheduled.getTime()) / 60000

  if (type === 'in') {
    if (diff < -15) return 'too_early'
    if (diff > 60)  return 'locked'
    return 'allowed'
  } else {
    if (diff < -10)  return 'too_early'
    if (diff <= 30)  return 'allowed'
    if (diff <= 120) return 'too_late_ot'
    return 'locked'
  }
}

function punchStatusLabel(status: PunchStatus, scheduledTime?: string): string {
  switch (status) {
    case 'no_shift':    return 'Sem escala cadastrada'
    case 'too_early':   return `Cedo · Previsto ${scheduledTime?.slice(0, 5)}`
    case 'locked':      return 'Janela encerrada'
    case 'too_late_ot': return 'Saída com hora extra'
    default: return ''
  }
}

export function EmployeeDashboard() {
  const [showCamera, setShowCamera]         = useState(false)
  const [capturedPhoto, setCapturedPhoto]   = useState<string | null>(null)
  const [showOvertime, setShowOvertime]     = useState(false)
  const [overtimeMinutes, setOvertimeMinutes] = useState(30)
  const [isFullscreen, setIsFullscreen]     = useState(false)
  const [currentTime, setCurrentTime]       = useState(new Date())
  const [isRegistering, setIsRegistering]   = useState(false)
  const [isLunchReg, setIsLunchReg]         = useState(false)
  const [activeTab, setActiveTab]           = useState<'ponto' | 'almoco'>('ponto')

  const videoRef     = useRef<HTMLVideoElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const {
    currentUser, logout, registerTime, registerLunch,
    requestOvertime, getUserTodayLastLog, getUserShiftToday,
    navigateTo, timeLogs,
  } = useStore()

  const lastLog   = getUserTodayLastLog()
  const shiftToday = getUserShiftToday()
  const nextType: 'in' | 'out' = lastLog?.type === 'in' ? 'out' : 'in'

  // Almoço — logs de hoje do utilizador
  const today = new Date().toDateString()
  const todayUserLogs = timeLogs
    .filter((l) => l.user_id === currentUser?.id && new Date(l.timestamp).toDateString() === today)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const lastLunchLog = todayUserLogs.find((l) => l.type === 'lunch_start' || l.type === 'lunch_end')
  const isOnLunch    = lastLunchLog?.type === 'lunch_start'
  const lunchDone    = lastLunchLog?.type === 'lunch_end'
  const nextLunchType: 'lunch_start' | 'lunch_end' = isOnLunch ? 'lunch_end' : 'lunch_start'
  const checkedIn    = todayUserLogs.some((l) => l.type === 'in')

  useEffect(() => {
    const iv = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(iv)
  }, [])

  const scheduledTime = nextType === 'in' ? shiftToday?.start_time : shiftToday?.end_time
  const punchStatus   = getPunchStatus(scheduledTime, nextType)
  const punchAllowed  = punchStatus === 'allowed' || punchStatus === 'too_late_ot'

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch { setIsFullscreen((p) => !p) }
  }, [])

  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])

  const startCamera = async () => { setShowCamera(true); setCapturedPhoto(null) }

  useEffect(() => {
    if (!showCamera || capturedPhoto) return
    let stream: MediaStream | null = null
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } })
      .then((s) => { stream = s; if (videoRef.current) videoRef.current.srcObject = s })
      .catch(() => { toast.error('Câmera indisponível.'); setShowCamera(false) })
    return () => { stream?.getTracks().forEach((t) => t.stop()) }
  }, [showCamera, capturedPhoto])

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const v = videoRef.current, c = canvasRef.current
    c.width = v.videoWidth; c.height = v.videoHeight
    c.getContext('2d')?.drawImage(v, 0, 0)
    setCapturedPhoto(c.toDataURL('image/jpeg', 0.85))
    ;(v.srcObject as MediaStream)?.getTracks().forEach((t) => t.stop())
  }

  const handleRegisterTime = async () => {
    if (!capturedPhoto) return
    setIsRegistering(true)
    const result: PunchResult = await registerTime(nextType, capturedPhoto)
    setIsRegistering(false); setShowCamera(false); setCapturedPhoto(null)
    if (result.success) {
      result.flag === 'he_not_registered'
        ? toast.warning('Saída registrada — pedido de HE gerado automaticamente para aprovação.')
        : toast.success(result.message)
    } else { toast.error(result.message) }
  }

  const handleLunch = async () => {
    setIsLunchReg(true)
    const r = await registerLunch(nextLunchType)
    setIsLunchReg(false)
    r.success ? toast.success(r.message) : toast.error(r.message)
  }

  const handleOvertimeRequest = async () => {
    const ok = await requestOvertime(overtimeMinutes)
    if (ok) {
      toast.success(`${Math.floor(overtimeMinutes / 60)}h${overtimeMinutes % 60 > 0 ? ` ${overtimeMinutes % 60}min` : ''} enviado!`)
      setShowOvertime(false)
    } else { toast.error('Erro ao enviar solicitação.') }
  }

  const fmtOT = (min: number) => {
    const h = Math.floor(min / 60), m = min % 60
    return h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ''}` : `${m}min`
  }

  // ── CAMERA ─────────────────────────────────────────────────────
  if (showCamera) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <div className="flex-1 relative">
          {!capturedPhoto ? (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ minHeight: '100dvh' }} />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-52 h-64 border-2 border-white/60 rounded-full" />
              </div>
              <div className="absolute top-6 inset-x-4 text-center">
                <div className="inline-block bg-black/60 backdrop-blur-sm text-white text-sm font-medium px-4 py-2 rounded-full">
                  Posicione seu rosto no oval
                </div>
              </div>
              <div className="absolute bottom-10 inset-x-0 flex justify-center">
                <button onClick={capturePhoto} className="w-20 h-20 bg-white rounded-full flex items-center justify-center active:scale-95 transition-transform shadow-2xl">
                  <div className="w-16 h-16 bg-white rounded-full border-4 border-[#0f2d5c]" />
                </button>
              </div>
              <button onClick={() => setShowCamera(false)} className="absolute top-6 right-4 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white">
                <X className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              <img src={capturedPhoto} alt="Captura" className="w-full h-full object-cover" style={{ minHeight: '100dvh' }} />
              <div className="absolute bottom-10 inset-x-4">
                <div className="bg-black/75 backdrop-blur-md rounded-2xl p-5">
                  <p className="text-white text-center text-base font-medium mb-4">Confirmar foto?</p>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 h-14 bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={() => setCapturedPhoto(null)}>
                      <X className="w-5 h-5 mr-2" />Tirar outra
                    </Button>
                    <Button className="flex-1 h-14 bg-[#00b4d8] hover:bg-[#0096b7] text-white" onClick={handleRegisterTime} disabled={isRegistering}>
                      {isRegistering
                        ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />Aguarde...</>
                        : <><CheckCircle2 className="w-5 h-5 mr-2" />Confirmar</>}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── HE ────────────────────────────────────────────────────────
  if (showOvertime) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f2d5c] via-[#1a3a6e] to-[#0f2d5c] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <button onClick={() => setShowOvertime(false)} className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white/70"><X className="w-4 h-4" /></button>
          <span className="text-white font-semibold">Solicitar HE</span>
          <div className="w-9" />
        </div>
        <div className="flex-1 px-6 pt-8">
          <div className="bg-white/10 rounded-2xl p-5 mb-6 text-center">
            <Timer className="w-10 h-10 text-amber-400 mx-auto mb-2" />
            <p className="text-white font-black text-4xl">{fmtOT(overtimeMinutes)}</p>
            <p className="text-white/40 text-sm mt-1">de hora extra</p>
          </div>
          <Slider value={[overtimeMinutes]} onValueChange={(v) => setOvertimeMinutes(v[0])} min={15} max={105} step={15} className="mb-2" />
          <div className="flex justify-between text-xs text-gray-400 mb-7"><span>15 min</span><span>1h 45min</span></div>
          <div className="flex gap-2 mb-7">
            {[30, 60, 90, 105].map((min) => (
              <button key={min} onClick={() => setOvertimeMinutes(min)} className={cn('flex-1 py-2 rounded-xl text-xs font-semibold transition-all', overtimeMinutes === min ? 'bg-[#0f2d5c] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}>
                {fmtOT(min)}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 h-12 border-gray-200" onClick={() => setShowOvertime(false)}>Cancelar</Button>
            <Button className="flex-1 h-12 bg-amber-500 hover:bg-amber-600 text-white font-semibold" onClick={handleOvertimeRequest}>Enviar</Button>
          </div>
        </div>
      </div>
    )
  }

  // ── MAIN ──────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className={cn('min-h-screen bg-gradient-to-br from-[#0f2d5c] via-[#1a3a6e] to-[#0f2d5c] flex flex-col', isFullscreen && 'fixed inset-0 z-[9999]')}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-6 h-6 bg-[#00b4d8] rounded-lg flex items-center justify-center"><Clock className="w-3.5 h-3.5 text-white" /></div>
            <span className="text-[#00b4d8] text-xs font-bold tracking-widest uppercase">A2dataPOINT</span>
          </div>
          <p className="text-white/60 text-xs capitalize">{format(currentTime, "EEE, dd 'de' MMM", { locale: ptBR })}</p>
        </div>
        <div className="flex items-center gap-2">
          {currentUser?.role === 'admin' && (
            <button onClick={() => navigateTo('admin')} className="w-9 h-9 rounded-xl bg-[#00b4d8]/20 border border-[#00b4d8]/30 flex items-center justify-center text-[#00b4d8]" title="Painel Admin">
              <ShieldCheck className="w-4 h-4" />
            </button>
          )}
          <button onClick={toggleFullscreen} className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 transition-colors">
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button onClick={() => logout()} className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Welcome */}
      <div className="px-5 mb-4">
        <p className="text-white/60 text-sm">Bem-vindo(a)</p>
        <h1 className="text-white text-xl font-bold truncate">{currentUser?.name}</h1>
        {shiftToday ? (
          <p className="text-white/40 text-xs mt-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Turno: {shiftToday.start_time.slice(0, 5)} – {shiftToday.end_time.slice(0, 5)}
            {shiftToday.lunch_duration_minutes > 0 && ` · Almoço: ${shiftToday.lunch_duration_minutes}min`}
          </p>
        ) : (
          <p className="text-amber-400/80 text-xs mt-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Sem escala hoje — contate o administrador
          </p>
        )}
      </div>

      {/* Tabs Ponto / Almoço */}
      {checkedIn && (
        <div className="px-5 mb-2">
          <div className="flex bg-white/10 rounded-xl p-1 gap-1">
            <button
              onClick={() => setActiveTab('ponto')}
              className={cn('flex-1 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5',
                activeTab === 'ponto' ? 'bg-white text-[#0f2d5c]' : 'text-white/60')}
            >
              <Clock className="w-3.5 h-3.5" />Ponto
            </button>
            <button
              onClick={() => setActiveTab('almoco')}
              className={cn('flex-1 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5',
                activeTab === 'almoco' ? 'bg-white text-[#0f2d5c]' : 'text-white/60')}
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />Almoço
              {isOnLunch && <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />}
            </button>
          </div>
        </div>
      )}

      {/* Clock */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="text-center mb-8">
          <p className="text-6xl font-black text-white font-mono tracking-tight tabular-nums">{format(currentTime, 'HH:mm')}</p>
          <p className="text-white/40 text-sm mt-1 font-mono">{format(currentTime, 'ss')}s</p>
        </div>

        {/* ── ABA PONTO ── */}
        {(activeTab === 'ponto' || !checkedIn) && (
          <>
            <div className="relative mb-8">
              {punchAllowed && (
                <div className={cn('absolute inset-0 rounded-full animate-ping opacity-20', nextType === 'in' ? 'bg-emerald-400' : 'bg-rose-400')} style={{ animationDuration: '2s' }} />
              )}
              <button
                onClick={punchAllowed ? startCamera : undefined}
                disabled={!punchAllowed}
                className={cn(
                  'relative w-52 h-52 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-200 active:scale-95',
                  punchAllowed
                    ? nextType === 'in'
                      ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/30'
                      : 'bg-gradient-to-br from-rose-400 to-rose-600 shadow-rose-500/30'
                    : 'bg-white/10 cursor-not-allowed'
                )}
              >
                {punchAllowed ? (
                  <>
                    <Camera className="w-14 h-14 text-white mb-2" />
                    <span className="text-white font-black text-lg tracking-wide">{nextType === 'in' ? 'ENTRADA' : 'SAÍDA'}</span>
                    <span className="text-white/70 text-xs mt-0.5">
                      {punchStatus === 'too_late_ot' ? '⚠ Com hora extra' : 'Toque para registrar'}
                    </span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-12 h-12 text-white/40 mb-2" />
                    <span className="text-white/50 font-bold text-sm text-center px-4 leading-tight">
                      {punchStatusLabel(punchStatus, scheduledTime)}
                    </span>
                  </>
                )}
              </button>
            </div>

            {lastLog && (
              <div className="flex items-center gap-2 mb-6">
                <div className={cn('w-2 h-2 rounded-full', lastLog.type === 'in' ? 'bg-emerald-400' : 'bg-rose-400')} />
                <p className="text-white/50 text-sm">
                  Último: {lastLog.type === 'in' ? 'Entrada' : 'Saída'} às {format(new Date(lastLog.timestamp), 'HH:mm')}
                  {lastLog.flag === 'he_not_registered' && <span className="ml-2 text-amber-400 text-xs">⚠ HE gerada</span>}
                </p>
              </div>
            )}

            <button
              onClick={() => setShowOvertime(true)}
              className="w-full max-w-xs h-14 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl flex items-center justify-center gap-3 text-white font-semibold transition-all active:scale-95"
            >
              <Clock className="w-5 h-5 text-amber-400" />
              Solicitar Hora Extra / Plantão
            </button>
          </>
        )}

        {/* ── ABA ALMOÇO ── */}
        {activeTab === 'almoco' && checkedIn && (
          <div className="w-full max-w-xs">
            <div className="bg-white/10 rounded-2xl p-5 mb-6 text-center">
              <UtensilsCrossed className={cn('w-10 h-10 mx-auto mb-2', isOnLunch ? 'text-amber-400' : lunchDone ? 'text-green-400' : 'text-white/60')} />
              {isOnLunch ? (
                <>
                  <p className="text-white font-semibold">Em pausa para almoço</p>
                  <p className="text-white/50 text-xs mt-0.5">Saiu às {lastLunchLog ? format(new Date(lastLunchLog.timestamp), 'HH:mm') : '--:--'}</p>
                  {shiftToday && shiftToday.lunch_duration_minutes > 0 && (
                    <p className="text-amber-400/80 text-xs mt-1">Duração: {shiftToday.lunch_duration_minutes}min</p>
                  )}
                </>
              ) : lunchDone ? (
                <>
                  <p className="text-white font-semibold">Almoço finalizado ✓</p>
                  <p className="text-white/50 text-xs mt-0.5">Retornou às {lastLunchLog ? format(new Date(lastLunchLog.timestamp), 'HH:mm') : '--:--'}</p>
                </>
              ) : (
                <p className="text-white font-semibold">Pausa disponível</p>
              )}
            </div>

            <button
              onClick={handleLunch}
              disabled={isLunchReg || lunchDone}
              className={cn(
                'w-full h-16 rounded-2xl flex items-center justify-center gap-3 font-bold text-white text-lg transition-all active:scale-95 shadow-lg',
                lunchDone
                  ? 'bg-white/10 cursor-not-allowed opacity-50'
                  : isOnLunch
                    ? 'bg-gradient-to-br from-green-400 to-green-600'
                    : 'bg-gradient-to-br from-amber-400 to-orange-500'
              )}
            >
              {isLunchReg ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : lunchDone ? (
                <><CheckCircle2 className="w-6 h-6" />Almoço registrado</>
              ) : isOnLunch ? (
                <><Coffee className="w-6 h-6" />Retornar do Almoço</>
              ) : (
                <><UtensilsCrossed className="w-6 h-6" />Saída para Almoço</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pb-4 text-center">
        <p className="text-white/20 text-xs">Mat. {currentUser?.matricula} · A2dataPOINT v2.0</p>
        {isFullscreen && <p className="text-white/30 text-xs mt-1">Modo tela cheia ativo · ⊡ para sair</p>}
      </div>
    </div>
  )
}
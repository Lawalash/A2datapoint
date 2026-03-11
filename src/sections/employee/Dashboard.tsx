// src/sections/employee/Dashboard.tsx
import { useState, useRef, useEffect, useCallback } from 'react'
import { useStore } from '@/hooks/useStore'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  Camera, LogOut, Clock, CheckCircle2,
  X, Calendar, Maximize2, Minimize2, WifiOff, ShieldCheck,
  UtensilsCrossed, Coffee, AlertTriangle, Loader2
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { PunchResult } from '@/types'

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

function formatSeconds(totalSecs: number): string {
  const sign = totalSecs < 0 ? '-' : ''
  const abs = Math.abs(totalSecs)
  const h = Math.floor(abs / 3600)
  const m = Math.floor((abs % 3600) / 60)
  const s = abs % 60
  if (h > 0) return `${sign}${h}h ${String(m).padStart(2, '0')}min`
  return `${sign}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function EmployeeDashboard() {
  const [showCamera, setShowCamera]           = useState(false)
  const [capturedPhoto, setCapturedPhoto]     = useState<string | null>(null)
  const [showOvertime, setShowOvertime]       = useState(false)
  const [overtimeMinutes, setOvertimeMinutes] = useState(30)
  const [isFullscreen, setIsFullscreen]       = useState(false)
  const [currentTime, setCurrentTime]         = useState(new Date())
  const [isRegistering, setIsRegistering]     = useState(false)
  const [isLunchReg, setIsLunchReg]           = useState(false)
  const [activeTab, setActiveTab]             = useState<'ponto' | 'almoco'>('ponto')
  const [lunchElapsedSecs, setLunchElapsedSecs] = useState(0)

  const videoRef     = useRef<HTMLVideoElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const {
    currentUser, logout, registerTime, registerLunch,
    requestOvertime, getUserTodayLastLog, getUserShiftToday,
    navigateTo, timeLogs, isLogsLoading,
  } = useStore()

  const isAdmin = currentUser?.role === 'admin'

  // Clock tick
  useEffect(() => {
    const iv = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(iv)
  }, [])

  const lastLog    = getUserTodayLastLog() // only in/out logs
  const shiftToday = getUserShiftToday()

  // nextType derived from only 'in'/'out' logs
  const nextType: 'in' | 'out' = lastLog?.type === 'in' ? 'out' : 'in'

  // ── Lunch state ── only for non-admin
  const today = new Date().toDateString()
  const todayUserLogs = timeLogs
    .filter((l) => l.user_id === currentUser?.id && new Date(l.timestamp).toDateString() === today)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // checkedIn uses only punch logs
  const todayPunchLogs = todayUserLogs.filter(l => l.type === 'in' || l.type === 'out')
  const checkedIn = todayPunchLogs[0]?.type === 'in'

  const lunchLogs = todayUserLogs.filter(l => l.type === 'lunch_start' || l.type === 'lunch_end')
  const lastLunchLog  = lunchLogs[0]
  const isOnLunch     = lastLunchLog?.type === 'lunch_start'
  const lunchDone     = lastLunchLog?.type === 'lunch_end'
  const nextLunchType: 'lunch_start' | 'lunch_end' = isOnLunch ? 'lunch_end' : 'lunch_start'

  const lunchAllowedMinutes = shiftToday?.lunch_duration_minutes ?? 60
  const lunchAllowedSecs    = lunchAllowedMinutes * 60

  // Lunch elapsed timer
  useEffect(() => {
    if (!isOnLunch || !lastLunchLog) {
      setLunchElapsedSecs(0)
      return
    }
    const startTs = new Date(lastLunchLog.timestamp).getTime()
    const updateElapsed = () => setLunchElapsedSecs(Math.floor((Date.now() - startTs) / 1000))
    updateElapsed()
    const iv = setInterval(updateElapsed, 1000)
    return () => clearInterval(iv)
  }, [isOnLunch, lastLunchLog])

  // Auto-switch to 'ponto' tab when lunch finishes or user hasn't checked in
  useEffect(() => {
    if (!checkedIn || lunchDone) {
      setActiveTab('ponto')
    }
  }, [checkedIn, lunchDone])

  const lunchRemainingSecs  = lunchAllowedSecs - lunchElapsedSecs
  const lunchIsOvertime     = lunchRemainingSecs < 0

  // ── Punch status — admin always allowed, no schedule check
  const scheduledTime = nextType === 'in' ? shiftToday?.start_time : shiftToday?.end_time
  const punchStatus  = isAdmin ? 'allowed' : getPunchStatus(scheduledTime, nextType)
  const punchAllowed = punchStatus === 'allowed' || punchStatus === 'too_late_ot' || punchStatus === 'no_shift'
  const canPunch = isAdmin ? true : punchAllowed

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
        ? toast.warning('Saída registrada — pedido de HE gerado automaticamente.')
        : toast.success(result.message)
    } else { toast.error(result.message) }
  }

  const handleLunch = async () => {
    if (isLunchReg) return
    setIsLunchReg(true)
    const r = await registerLunch(nextLunchType)
    setIsLunchReg(false)
    if (r.success) {
      toast.success(r.message)
      if (nextLunchType === 'lunch_start') {
        setActiveTab('almoco')
      } else {
        // Lunch ended — go back to ponto tab
        setActiveTab('ponto')
      }
    } else {
      toast.error(r.message)
    }
  }

  const handleOvertimeRequest = async () => {
    const ok = await requestOvertime(overtimeMinutes)
    if (ok) {
      toast.success(`HE de ${Math.floor(overtimeMinutes / 60)}h${overtimeMinutes % 60 > 0 ? ` ${overtimeMinutes % 60}min` : ''} enviada!`)
      setShowOvertime(false)
    } else { toast.error('Erro ao enviar solicitação.') }
  }

  const fmtOT = (min: number) => {
    const h = Math.floor(min / 60), m = min % 60
    return h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ''}` : `${m}min`
  }

  // ── CAMERA SCREEN ───────────────────────────────────────────────
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
              <div className="absolute bottom-8 inset-x-0 flex flex-col items-center gap-4 px-6">
                <p className="text-white/70 text-sm">Posicione seu rosto no centro</p>
                <div className="flex items-center gap-6">
                  <button onClick={() => { setShowCamera(false); setCapturedPhoto(null) }} className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                    <X className="w-6 h-6 text-white" />
                  </button>
                  <button onClick={capturePhoto} className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl active:scale-95">
                    <Camera className="w-8 h-8 text-gray-800" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-screen px-6 gap-6">
              <p className="text-white text-xl font-bold">Confirmar foto?</p>
              <img src={capturedPhoto} alt="preview" className="w-52 h-64 object-cover rounded-2xl border-4 border-white/30" />
              <div className="flex gap-4 w-full max-w-xs">
                <button onClick={() => setCapturedPhoto(null)} className="flex-1 h-14 bg-white/20 rounded-2xl text-white font-semibold flex items-center justify-center gap-2">
                  <X className="w-5 h-5" />Repetir
                </button>
                <button
                  onClick={handleRegisterTime}
                  disabled={isRegistering}
                  className={cn('flex-1 h-14 rounded-2xl text-white font-bold flex items-center justify-center gap-2',
                    nextType === 'in' ? 'bg-emerald-500' : 'bg-rose-500')}
                >
                  {isRegistering ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  {isRegistering ? 'Salvando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── OVERTIME MODAL ──────────────────────────────────────────────
  if (showOvertime) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f2d5c] via-[#1a3a6e] to-[#0a1f42] flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <h2 className="text-white font-black text-2xl text-center mb-2">Hora Extra</h2>
          <p className="text-white/50 text-sm text-center mb-8">Informe a duração desejada</p>
          <div className="bg-white/10 rounded-2xl p-6 mb-6">
            <p className="text-5xl font-black text-white text-center mb-6 font-mono">{fmtOT(overtimeMinutes)}</p>
            <Slider min={15} max={105} step={15} value={[overtimeMinutes]} onValueChange={(v) => setOvertimeMinutes(v[0])} className="w-full" />
            <div className="flex justify-between text-white/30 text-xs mt-2">
              <span>15min</span><span>1h 45min</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 h-12 border-white/20 text-white hover:bg-white/10 bg-transparent" onClick={() => setShowOvertime(false)}>Cancelar</Button>
            <Button className="flex-1 h-12 bg-amber-500 hover:bg-amber-600 font-bold" onClick={handleOvertimeRequest}>Solicitar</Button>
          </div>
        </div>
      </div>
    )
  }

  // ── MAIN DASHBOARD ──────────────────────────────────────────────
  return (
    <div ref={containerRef} className="min-h-dvh bg-gradient-to-br from-[#0f2d5c] via-[#1a3a6e] to-[#0a1f42] flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#00b4d8]/20 border border-[#00b4d8]/40 rounded-lg flex items-center justify-center">
            <Clock className="w-4 h-4 text-[#00b4d8]" />
          </div>
          <span className="text-[#00b4d8] font-black text-sm tracking-widest uppercase">POINT</span>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
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
        <p className="text-white/60 text-sm">Bem-vindo(a){isAdmin ? ' · Admin' : ''}</p>
        <h1 className="text-white text-xl font-bold truncate">{currentUser?.name}</h1>
        {!isAdmin && (
          shiftToday ? (
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
          )
        )}
        {isAdmin && (
          <p className="text-white/40 text-xs mt-1">Registro de ponto simplificado</p>
        )}
      </div>

      {/* Tabs Ponto / Almoço — oculto para admin e quando não está trabalhando */}
      {!isAdmin && checkedIn && !lunchDone && (
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
              {isOnLunch && lunchIsOvertime && <AlertTriangle className="w-3 h-3 text-red-400" />}
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

        {/* ── LOADING STATE — prevent accidental double-punch on page load ── */}
        {isLogsLoading && (
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="w-52 h-52 rounded-full bg-white/10 flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 text-white/40 animate-spin mb-2" />
              <span className="text-white/40 text-sm">Carregando...</span>
            </div>
          </div>
        )}

        {/* ── ABA PONTO (admin: always; employee: when ponto tab or not checked in) ── */}
        {!isLogsLoading && (activeTab === 'ponto' || !checkedIn || isAdmin) && (
          <>
            <div className="relative mb-8">
              {canPunch && !isLogsLoading && (
                <div className={cn('absolute inset-0 rounded-full animate-ping opacity-20', nextType === 'in' ? 'bg-emerald-400' : 'bg-rose-400')} style={{ animationDuration: '2s' }} />
              )}
              <button
                onClick={canPunch ? startCamera : undefined}
                disabled={!canPunch || isLogsLoading}
                className={cn(
                  'relative w-52 h-52 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-200 active:scale-95',
                  canPunch && !isLogsLoading
                    ? nextType === 'in'
                      ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/30'
                      : 'bg-gradient-to-br from-rose-400 to-rose-600 shadow-rose-500/30'
                    : 'bg-white/10 cursor-not-allowed'
                )}
              >
                {canPunch && !isLogsLoading ? (
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
                  {lastLog.flag === 'logout_by_agent' && <span className="ml-2 text-orange-400 text-xs">⚠ Saída automática</span>}
                </p>
              </div>
            )}

            {/* Solicitar HE — oculto para admin */}
            {!isAdmin && (
              <button
                onClick={() => setShowOvertime(true)}
                className="w-full max-w-xs h-14 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl flex items-center justify-center gap-3 text-white font-semibold transition-all active:scale-95"
              >
                <Clock className="w-5 h-5 text-amber-400" />
                Solicitar Hora Extra / Plantão
              </button>
            )}
          </>
        )}

        {/* ── ABA ALMOÇO — apenas funcionários ── */}
        {!isAdmin && !isLogsLoading && activeTab === 'almoco' && checkedIn && (
          <div className="w-full max-w-xs">
            {/* Status card */}
            <div className="bg-white/10 rounded-2xl p-5 mb-4 text-center">
              <UtensilsCrossed className={cn('w-10 h-10 mx-auto mb-2',
                isOnLunch
                  ? lunchIsOvertime ? 'text-red-400' : 'text-amber-400'
                  : lunchDone ? 'text-green-400' : 'text-white/60'
              )} />
              {isOnLunch ? (
                <>
                  <p className="text-white font-semibold">Em pausa para almoço</p>
                  <p className="text-white/50 text-xs mt-0.5">
                    Saiu às {lastLunchLog ? format(new Date(lastLunchLog.timestamp), 'HH:mm') : '--:--'}
                  </p>

                  {/* Countdown timer */}
                  <div className={cn('mt-3 rounded-xl px-4 py-2 inline-block', lunchIsOvertime ? 'bg-red-500/20' : 'bg-amber-400/20')}>
                    <p className={cn('text-xs font-medium mb-0.5', lunchIsOvertime ? 'text-red-300' : 'text-amber-300')}>
                      {lunchIsOvertime ? '⚠ Pausa excedida' : 'Tempo restante'}
                    </p>
                    <p className={cn('text-2xl font-black font-mono', lunchIsOvertime ? 'text-red-400' : 'text-amber-300')}>
                      {formatSeconds(Math.abs(lunchRemainingSecs))}
                    </p>
                    <p className="text-white/40 text-xs mt-0.5">
                      de {lunchAllowedMinutes}min permitidos
                    </p>
                  </div>
                </>
              ) : lunchDone ? (
                <>
                  <p className="text-white font-semibold">Almoço finalizado ✓</p>
                  <p className="text-white/50 text-xs mt-0.5">
                    Retornou às {lastLunchLog ? format(new Date(lastLunchLog.timestamp), 'HH:mm') : '--:--'}
                  </p>
                  {(() => {
                    const lunchStart = lunchLogs.find(l => l.type === 'lunch_start')
                    const lunchEnd   = lunchLogs.find(l => l.type === 'lunch_end')
                    if (lunchStart && lunchEnd) {
                      const tookSecs = Math.floor((new Date(lunchEnd.timestamp).getTime() - new Date(lunchStart.timestamp).getTime()) / 1000)
                      const overSecs = tookSecs - lunchAllowedSecs
                      return (
                        <p className={cn('text-xs mt-2', overSecs > 0 ? 'text-red-300' : 'text-green-300')}>
                          Duração: {formatSeconds(tookSecs)}
                          {overSecs > 0 && ` (+${formatSeconds(overSecs)} extra)`}
                        </p>
                      )
                    }
                    return null
                  })()}
                </>
              ) : (
                <>
                  <p className="text-white font-semibold">Pausa disponível</p>
                  <p className="text-white/40 text-xs mt-0.5">{lunchAllowedMinutes}min permitidos</p>
                  <p className="text-white/30 text-xs mt-1">Toque em "Saída para Almoço" quando sair</p>
                </>
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
        <p className="text-white/20 text-xs">Mat. {currentUser?.matricula} · A2dataPOINT v2.1</p>
        {isFullscreen && <p className="text-white/30 text-xs mt-1">Modo tela cheia ativo</p>}
      </div>
    </div>
  )
}
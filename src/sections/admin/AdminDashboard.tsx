// src/sections/admin/AdminDashboard.tsx
import { useEffect, useState, useCallback } from 'react'
import { useStore } from '@/hooks/useStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Users, BarChart3, Clock, FileText,
  HardDrive, UserCheck, TrendingUp, X, UtensilsCrossed,
  AlertTriangle, RefreshCw, LogOut, ShieldAlert, Coffee,
  ArrowRightCircle, Bell
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { TimeLog } from '@/types'

function formatElapsed(startTs: string): string {
  const elapsed = Math.floor((Date.now() - new Date(startTs).getTime()) / 1000)
  const h = Math.floor(elapsed / 3600)
  const m = Math.floor((elapsed % 3600) / 60)
  const s = elapsed % 60
  if (h > 0) return `${h}h ${String(m).padStart(2,'0')}min`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

export function AdminDashboard() {
  const [photoModal, setPhotoModal] = useState<{ url: string; name: string; time: string } | null>(null)
  const [tick, setTick] = useState(0) // force re-render every second for timers
  const [agentLogoutIds, setAgentLogoutIds] = useState<Set<string>>(new Set())

  const navigateAdmin   = useStore((s) => s.navigateAdmin)
  const getTodayLogs    = useStore((s) => s.getTodayLogs)
  const profiles        = useStore((s) => s.profiles)
  const shifts          = useStore((s) => s.shifts)
  const overtimeRequests = useStore((s) => s.overtimeRequests)
  const fetchTimeLogs   = useStore((s) => s.fetchTimeLogs)
  const fetchOvertimeRequests = useStore((s) => s.fetchOvertimeRequests)
  const registerLogoutByAgent = useStore((s) => s.registerLogoutByAgent)

  // Tick every second for live timers
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    fetchTimeLogs()
    fetchOvertimeRequests()
  }, [fetchTimeLogs, fetchOvertimeRequests])

  const todayLogs      = getTodayLogs()
  const todayStr       = new Date().toDateString()
  const employees      = profiles.filter((p) => p.role === 'employee')
  const totalEmployees = employees.length
  const pendingOvertime = overtimeRequests.filter((r) => r.status === 'pending').length

  // ── Who is currently checked in (last punch is 'in') ──
  const checkedInUsers = employees.filter((emp) => {
    const empLogs = todayLogs
      .filter(l => l.user_id === emp.id && (l.type === 'in' || l.type === 'out'))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    return empLogs[0]?.type === 'in'
  })
  const presentCount = checkedInUsers.length

  // ── Who is currently on lunch ──
  const onLunchUsers = employees.filter((emp) => {
    const lunchLogs = todayLogs
      .filter(l => l.user_id === emp.id && (l.type === 'lunch_start' || l.type === 'lunch_end'))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    return lunchLogs[0]?.type === 'lunch_start'
  })

  // ── Lunch overtime alerts ──
  const lunchOvertimeUsers = onLunchUsers.filter((emp) => {
    const todayDow = new Date().getDay()
    const shift    = shifts.find(s => s.user_id === emp.id && s.day_of_week === todayDow)
    const allowed  = (shift?.lunch_duration_minutes ?? 60) * 60 * 1000
    const lunchStart = todayLogs
      .filter(l => l.user_id === emp.id && l.type === 'lunch_start')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]

    if (!lunchStart) return false
    return (Date.now() - new Date(lunchStart.timestamp).getTime()) > allowed
  })

  // ── Early arrival alerts (punched more than 15min early) ──
  const earlyArrivals = todayLogs.filter(l => {
    if (l.type !== 'in' || l.flag === 'logout_by_agent') return false
    const todayDow = new Date().getDay()
    const shift = shifts.find(s => s.user_id === l.user_id && s.day_of_week === todayDow)
    if (!shift) return false
    const [h, m] = shift.start_time.split(':').map(Number)
    const scheduled = new Date(l.timestamp)
    scheduled.setHours(h, m, 0, 0)
    const punchTime = new Date(l.timestamp)
    // Punched more than 15min before schedule
    return (scheduled.getTime() - punchTime.getTime()) > 15 * 60 * 1000
  })

  // ── Auto-logout check — runs every 5 minutes ──
  const checkAutoLogout = useCallback(async () => {
    const now = Date.now()
    for (const emp of checkedInUsers) {
      if (agentLogoutIds.has(emp.id)) continue

      const todayDow = new Date().getDay()
      const shift    = shifts.find(s => s.user_id === emp.id && s.day_of_week === todayDow)
      if (!shift) continue

      const [h, m] = shift.end_time.split(':').map(Number)
      const scheduled = new Date()
      scheduled.setHours(h, m, 0, 0)

      // Find approved overtime for today
      const todayStr = new Date().toISOString().split('T')[0]
      const approvedOT = overtimeRequests
        .filter(r => r.user_id === emp.id && r.date === todayStr && r.status === 'approved')
        .reduce((sum, r) => sum + r.duration_minutes, 0)

      const deadline = scheduled.getTime() + approvedOT * 60 * 1000 + 30 * 60 * 1000 // +30min tolerance

      if (now > deadline) {
        setAgentLogoutIds(prev => new Set([...prev, emp.id]))
        const ok = await registerLogoutByAgent(emp.id)
        if (ok) {
          toast.warning(
            `⚠ Saída automática registrada para ${emp.name} — não realizou saída manual no horário previsto.`,
            { duration: 10000 }
          )
        }
      }
    }
  }, [checkedInUsers, shifts, overtimeRequests, agentLogoutIds, registerLogoutByAgent])

  useEffect(() => {
    checkAutoLogout()
    const iv = setInterval(checkAutoLogout, 5 * 60 * 1000) // every 5 min
    return () => clearInterval(iv)
  }, [checkAutoLogout])

  const menuItems = [
    { id: 'users'      as const, label: 'Utilizadores',    icon: Users,       color: 'bg-blue-500',   desc: 'Criar e gerir matrículas' },
    { id: 'monitoring' as const, label: 'Monitoramento',   icon: BarChart3,   color: 'bg-green-500',  desc: 'Escala e estatísticas' },
    { id: 'overtime'   as const, label: 'Aprovação de HE', icon: Clock,       color: 'bg-orange-500', desc: `${pendingOvertime} pendentes` },
    { id: 'shifts'     as const, label: 'Escalas',         icon: Calendar2,   color: 'bg-teal-500',   desc: 'Gerir turnos' },
    { id: 'reports'    as const, label: 'Relatórios',      icon: FileText,    color: 'bg-purple-500', desc: 'Exportar e visualizar' },
    { id: 'storage'    as const, label: 'Armazenamento',   icon: HardDrive,   color: 'bg-red-500',    desc: 'Gerir fotos' },
  ]

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[#0f2d5c]">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1 capitalize">
            {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <button
          onClick={() => { fetchTimeLogs(); fetchOvertimeRequests() }}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
          title="Atualizar dados"
        >
          <RefreshCw className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* ── Alertas ativos ─────────────────────────────────────── */}
      {(lunchOvertimeUsers.length > 0 || earlyArrivals.length > 0 || pendingOvertime > 0) && (
        <div className="mb-6 space-y-2">
          {lunchOvertimeUsers.map(emp => (
            <div key={emp.id} className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-red-700 text-sm flex-1">
                <span className="font-semibold">{emp.name}</span> está com pausa de almoço excedida
              </p>
            </div>
          ))}
          {earlyArrivals.slice(0, 3).map(log => {
            const emp = profiles.find(p => p.id === log.user_id)
            return (
              <div key={log.id} className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <Bell className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-amber-700 text-sm flex-1">
                  <span className="font-semibold">{emp?.name ?? '—'}</span> registrou entrada antes do horário previsto
                </p>
              </div>
            )
          })}
          {pendingOvertime > 0 && (
            <button
              onClick={() => navigateAdmin('overtime')}
              className="w-full bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center gap-3 text-left hover:bg-orange-100 transition-colors"
            >
              <Clock className="w-4 h-4 text-orange-500 shrink-0" />
              <p className="text-orange-700 text-sm flex-1">
                <span className="font-semibold">{pendingOvertime} solicitação(ões) de HE</span> aguardando aprovação
              </p>
              <ArrowRightCircle className="w-4 h-4 text-orange-400" />
            </button>
          )}
        </div>
      )}

      {/* ── Cards de resumo ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-gray-500 text-xs">Presentes</p>
                <p className="text-xl font-bold text-gray-800">{presentCount}<span className="text-sm text-gray-400">/{totalEmployees}</span></p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-gray-500 text-xs">Em almoço</p>
                <p className="text-xl font-bold text-gray-800">
                  {onLunchUsers.length}
                  {lunchOvertimeUsers.length > 0 && (
                    <span className="text-xs text-red-500 ml-1">⚠{lunchOvertimeUsers.length}</span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-gray-500 text-xs">HE Pendentes</p>
                <p className="text-xl font-bold text-gray-800">{pendingOvertime}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-gray-500 text-xs">Total Equipa</p>
                <p className="text-xl font-bold text-gray-800">{totalEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Em Almoço agora ─────────────────────────────────────── */}
      {onLunchUsers.length > 0 && (
        <div className="mb-6">
          <h2 className="text-gray-700 font-semibold mb-3 flex items-center gap-2">
            <Coffee className="w-4 h-4 text-amber-500" />
            Em Pausa de Almoço Agora
          </h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {onLunchUsers.map(emp => {
              const todayDow   = new Date().getDay()
              const shift      = shifts.find(s => s.user_id === emp.id && s.day_of_week === todayDow)
              const allowed    = shift?.lunch_duration_minutes ?? 60
              const lunchStart = todayLogs
                .filter(l => l.user_id === emp.id && l.type === 'lunch_start')
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]

              const elapsedMs  = lunchStart ? Date.now() - new Date(lunchStart.timestamp).getTime() : 0
              const elapsedMin = Math.floor(elapsedMs / 60000)
              const isOver     = elapsedMin > allowed
              const _ = tick // force update

              return (
                <Card key={emp.id} className={cn('border', isOver ? 'border-red-300 bg-red-50' : 'border-amber-200 bg-amber-50')}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{emp.name}</p>
                      <p className="text-gray-500 text-xs">
                        Saiu: {lunchStart ? format(new Date(lunchStart.timestamp), 'HH:mm') : '--:--'}
                        {' · '}Limite: {allowed}min
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn('font-black font-mono text-sm', isOver ? 'text-red-600' : 'text-amber-600')}>
                        {lunchStart ? formatElapsed(lunchStart.timestamp) : '--'}
                      </p>
                      {isOver && <p className="text-red-400 text-xs">Excedido</p>}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Menu principal ──────────────────────────────────────── */}
      <h2 className="text-gray-700 font-semibold mb-3">Menu Principal</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {menuItems.map((item) => {
          const Icon = item.icon
          const badge = item.id === 'overtime' && pendingOvertime > 0 ? pendingOvertime : null
          return (
            <button
              key={item.id}
              onClick={() => navigateAdmin(item.id)}
              className="bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md active:scale-[0.98] transition-all text-left border border-gray-100 relative"
            >
              <div className={`w-11 h-11 ${item.color} rounded-xl flex items-center justify-center shrink-0`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-800 text-sm">{item.label}</h3>
                <p className="text-gray-400 text-xs truncate">{item.desc}</p>
              </div>
              {badge && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Registros de hoje ───────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-gray-700 font-semibold">Registros de Hoje</h2>
        <span className="text-gray-400 text-xs">{todayLogs.length} registros · em tempo real</span>
      </div>
      <Card>
        <CardContent className="p-0">
          {todayLogs.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">Nenhum registro hoje</div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {todayLogs
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 20)
                .map((record: TimeLog) => {
                  const typeConfig = {
                    in:          { label: 'Entrada',    bg: 'bg-green-100',  text: 'text-green-700',  letter: 'E' },
                    out:         { label: 'Saída',      bg: 'bg-red-100',    text: 'text-red-700',    letter: 'S' },
                    lunch_start: { label: 'Almoço↗',   bg: 'bg-amber-100',  text: 'text-amber-700',  letter: '☕' },
                    lunch_end:   { label: 'Almoço↙',   bg: 'bg-blue-100',   text: 'text-blue-700',   letter: '↩' },
                  }[record.type] ?? { label: record.type, bg: 'bg-gray-100', text: 'text-gray-700', letter: '?' }

                  return (
                    <div key={record.id} className="p-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${typeConfig.bg}`}>
                          <span className={`text-xs font-bold ${typeConfig.text}`}>{typeConfig.letter}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{record.profile?.name ?? '—'}</p>
                          <p className="text-gray-500 text-xs flex items-center gap-1">
                            {format(new Date(record.timestamp), 'HH:mm')}
                            <span className="text-gray-300">·</span>
                            <span>{typeConfig.label}</span>
                            {record.flag === 'he_not_registered' && <span className="text-amber-500 font-medium">⚠ HE</span>}
                            {record.flag === 'logout_by_agent' && <span className="text-orange-500 font-medium">⚠ Auto</span>}
                          </p>
                        </div>
                      </div>
                      {record.photo_url && (
                        <button
                          onClick={() => setPhotoModal({ url: record.photo_url!, name: record.profile?.name ?? '—', time: format(new Date(record.timestamp), 'HH:mm') })}
                          className="w-8 h-8 rounded-full overflow-hidden border-2 border-blue-200 hover:border-blue-500 transition-colors shrink-0"
                        >
                          <img src={record.photo_url} alt="foto" className="w-full h-full object-cover" />
                        </button>
                      )}
                    </div>
                  )
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo Modal */}
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

// Inline Calendar icon (since we use 'shifts' view id)
function Calendar2({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}
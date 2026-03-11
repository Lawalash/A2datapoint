// src/sections/admin/AdminDashboard.tsx
import { useMemo } from 'react'
import { useStore } from '@/hooks/useStore'
import { Card, CardContent } from '@/components/ui/card'
import {
  Users, Clock, CheckCircle2, AlertTriangle,
  TrendingUp, UserCheck, Coffee, Calendar,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { TimeLog } from '@/types'

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'agora'
  if (m < 60) return `${m}min atrás`
  return `${Math.floor(m / 60)}h atrás`
}

export function AdminDashboard() {
  const { profiles, timeLogs, overtimeRequests, shifts } = useStore()

  const employees = profiles.filter(p => p.role === 'employee')
  const today     = new Date().toDateString()
  const todayDow  = new Date().getDay()

  const todayLogs = useMemo(() =>
    timeLogs.filter(l => new Date(l.timestamp).toDateString() === today),
    [timeLogs, today]
  )

  // ── Quem está dentro agora ──────────────────────────────────
  const statusByUser = useMemo(() => {
    const map = new Map<string, 'in' | 'out' | 'lunch'>()
    // Processa por timestamp crescente
    const sorted = [...todayLogs].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
    for (const l of sorted) {
      if (l.type === 'in')          map.set(l.user_id, 'in')
      else if (l.type === 'out')    map.set(l.user_id, 'out')
      else if (l.type === 'lunch_start') map.set(l.user_id, 'lunch')
      else if (l.type === 'lunch_end')   map.set(l.user_id, 'in')
    }
    return map
  }, [todayLogs])

  const presentCount  = [...statusByUser.values()].filter(v => v === 'in').length
  const onLunchCount  = [...statusByUser.values()].filter(v => v === 'lunch').length
  const checkedOutCount = [...statusByUser.values()].filter(v => v === 'out').length
  const absentCount   = employees.filter(e => {
    const hasShift = shifts.some(s => s.user_id === e.id && s.day_of_week === todayDow)
    return hasShift && !statusByUser.has(e.id)
  }).length

  const pendingHE = overtimeRequests.filter(r => r.status === 'pending').length
  const todayPunchCount = todayLogs.filter(l => l.type === 'in' || l.type === 'out').length

  // ── Últimos registros ───────────────────────────────────────
  const recentLogs = useMemo(() =>
    [...timeLogs]
      .filter(l => l.type === 'in' || l.type === 'out')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8),
    [timeLogs]
  )

  // ── Colaboradores com escala hoje e seu status ──────────────
  const todayScheduled = useMemo(() =>
    employees
      .filter(e => shifts.some(s => s.user_id === e.id && s.day_of_week === todayDow))
      .map(e => {
        const shift = shifts.find(s => s.user_id === e.id && s.day_of_week === todayDow)!
        const status = statusByUser.get(e.id) ?? 'absent'
        return { ...e, shift, status }
      })
      .sort((a, b) => {
        const order = { in: 0, lunch: 1, out: 2, absent: 3 }
        return order[a.status] - order[b.status]
      }),
    [employees, shifts, todayDow, statusByUser]
  )

  const statusConfig = {
    in:     { label: 'Trabalhando', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
    lunch:  { label: 'Almoço',      color: 'bg-amber-100 text-amber-700',    dot: 'bg-amber-500'   },
    out:    { label: 'Saiu',        color: 'bg-gray-100 text-gray-500',       dot: 'bg-gray-400'    },
    absent: { label: 'Ausente',     color: 'bg-red-100 text-red-600',         dot: 'bg-red-400'     },
  }

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-[#0f2d5c]">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5 capitalize">
          {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Trabalhando', value: presentCount,    icon: UserCheck,   color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
          { label: 'Almoço',      value: onLunchCount,    icon: Coffee,      color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200'   },
          { label: 'Saíram',      value: checkedOutCount, icon: CheckCircle2,color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200'     },
          { label: 'Ausentes',    value: absentCount,     icon: AlertTriangle,color:'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200'      },
        ].map(item => (
          <Card key={item.label} className={cn('border', item.border)}>
            <CardContent className={cn('p-4 flex items-center gap-3', item.bg)}>
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-sm shrink-0')}>
                <item.icon className={cn('w-5 h-5', item.color)} />
              </div>
              <div>
                <p className="text-gray-500 text-xs">{item.label}</p>
                <p className={cn('text-2xl font-black', item.color)}>{item.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Linha 2 — HE pendentes + registros hoje */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card className={pendingHE > 0 ? 'border-amber-300 bg-amber-50' : ''}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
              <TrendingUp className={cn('w-5 h-5', pendingHE > 0 ? 'text-amber-500' : 'text-gray-400')} />
            </div>
            <div>
              <p className="text-gray-500 text-xs">HE Pendentes</p>
              <p className={cn('text-2xl font-black', pendingHE > 0 ? 'text-amber-600' : 'text-gray-700')}>{pendingHE}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
              <Clock className="w-5 h-5 text-[#0f2d5c]" />
            </div>
            <div>
              <p className="text-gray-500 text-xs">Registros Hoje</p>
              <p className="text-2xl font-black text-[#0f2d5c]">{todayPunchCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status da equipe hoje */}
        <Card>
          <CardContent className="p-0">
            <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-[#0f2d5c] flex items-center gap-2">
                <Users className="w-4 h-4" />
                Equipe Hoje
              </h2>
              <span className="text-xs text-gray-400">{todayScheduled.length} com escala</span>
            </div>
            <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
              {todayScheduled.length === 0 ? (
                <div className="py-10 text-center">
                  <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Nenhuma escala para hoje</p>
                </div>
              ) : todayScheduled.map(emp => {
                const s = statusConfig[emp.status as keyof typeof statusConfig]
                return (
                  <div key={emp.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
                    <div className={cn('w-2 h-2 rounded-full shrink-0', s.dot)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{emp.name}</p>
                      <p className="text-xs text-gray-400">
                        Mat. {emp.matricula} · {emp.shift.start_time.slice(0,5)}–{emp.shift.end_time.slice(0,5)}
                      </p>
                    </div>
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium shrink-0', s.color)}>
                      {s.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Últimos registros */}
        <Card>
          <CardContent className="p-0">
            <div className="px-4 pt-4 pb-3 border-b border-gray-100">
              <h2 className="font-bold text-[#0f2d5c] flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Últimos Registros
              </h2>
            </div>
            <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
              {recentLogs.length === 0 ? (
                <div className="py-10 text-center">
                  <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Nenhum registro ainda</p>
                </div>
              ) : recentLogs.map((log: TimeLog) => (
                <div key={log.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
                  <div className={cn('w-2 h-2 rounded-full shrink-0',
                    log.type === 'in' ? 'bg-emerald-500' : 'bg-rose-400'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {log.profile?.name ?? `Mat. ${log.user_id.slice(0,6)}`}
                    </p>
                    <p className="text-xs text-gray-400">{timeAgo(log.timestamp)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium',
                      log.type === 'in'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    )}>
                      {log.type === 'in' ? 'Entrada' : 'Saída'}
                    </span>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {format(new Date(log.timestamp), 'HH:mm')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
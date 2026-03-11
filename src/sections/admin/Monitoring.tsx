// src/sections/admin/Monitoring.tsx
import { useState, useMemo, useEffect } from 'react'
import { useStore } from '@/hooks/useStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Search, Clock, CheckCircle2, AlertTriangle, UtensilsCrossed,
  TrendingUp, ChevronDown, ChevronUp, RefreshCw, Users,
  Calendar, Loader2, X,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'
import { format, startOfWeek, startOfMonth, eachDayOfInterval, endOfWeek, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { TimeLog, OvertimeRequest } from '@/types'

// ── Types ──────────────────────────────────────────────────────
type Period = 'today' | 'week' | 'month'

interface EmployeeDay {
  date: string
  inLog:   TimeLog | null
  outLog:  TimeLog | null
  lunchStart: TimeLog | null
  lunchEnd:   TimeLog | null
  otRequests: OvertimeRequest[]
  workedMins: number
  lunchMins:  number
  expectedMins: number
  status: 'complete' | 'incomplete' | 'absent' | 'working'
}

// ── Helpers ──────────────────────────────────────────────────
function fmt(mins: number) {
  if (mins <= 0) return '0h'
  const h = Math.floor(mins / 60), m = Math.round(mins % 60)
  return h > 0 ? (m > 0 ? `${h}h ${m}min` : `${h}h`) : `${m}min`
}

function calcWorkedMins(logs: TimeLog[], dayStr: string, now: Date): number {
  const day = logs
    .filter(l => (l.type === 'in' || l.type === 'out') && l.log_date === dayStr)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  let total = 0, lastIn: Date | null = null
  for (const l of day) {
    if (l.type === 'in') lastIn = new Date(l.timestamp)
    else if (l.type === 'out' && lastIn) { total += new Date(l.timestamp).getTime() - lastIn.getTime(); lastIn = null }
  }
  if (lastIn) total += now.getTime() - lastIn.getTime()
  return total / 60000
}

function calcLunchMins(logs: TimeLog[], dayStr: string): number {
  const lunchLogs = logs
    .filter(l => (l.type === 'lunch_start' || l.type === 'lunch_end') && l.log_date === dayStr)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  let total = 0, start: Date | null = null
  for (const l of lunchLogs) {
    if (l.type === 'lunch_start') start = new Date(l.timestamp)
    else if (l.type === 'lunch_end' && start) { total += new Date(l.timestamp).getTime() - start.getTime(); start = null }
  }
  return total / 60000
}

function getShiftMins(shifts: ReturnType<typeof useStore.getState>['shifts'], userId: string, dow: number) {
  const s = shifts.find(sh => sh.user_id === userId && sh.day_of_week === dow)
  if (!s) return 0
  const [sh, sm] = s.start_time.split(':').map(Number)
  const [eh, em] = s.end_time.split(':').map(Number)
  return Math.max(0, (eh * 60 + em) - (sh * 60 + sm) - (s.lunch_duration_minutes ?? 60))
}

// ── Status badge ──────────────────────────────────────────────
function StatusBadge({ status }: { status: EmployeeDay['status'] }) {
  const map = {
    complete:   { label: 'Completo',    cls: 'bg-emerald-100 text-emerald-700' },
    incomplete: { label: 'Incompleto',  cls: 'bg-amber-100 text-amber-700' },
    working:    { label: 'Trabalhando', cls: 'bg-blue-100 text-blue-700' },
    absent:     { label: 'Ausente',     cls: 'bg-red-100 text-red-600' },
  }
  const { label, cls } = map[status]
  return <span className={cn('px-2 py-1 rounded-full text-xs font-semibold', cls)}>{label}</span>
}

// ── OT Status ──────────────────────────────────────────────────
function OTBadge({ status }: { status: string }) {
  if (status === 'approved') return <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Aprovada</span>
  if (status === 'rejected') return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Recusada</span>
  return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Pendente</span>
}

// ── Pie chart colors ───────────────────────────────────────────
const PIE_COLORS = ['#00b4d8', '#06d6a0', '#ef476f', '#ffd166', '#8338ec']

export function Monitoring() {
  const { profiles, timeLogs, overtimeRequests, shifts, fetchTimeLogs, fetchOvertimeRequests } = useStore()

  const [search, setSearch]       = useState('')
  const [period, setPeriod]       = useState<Period>('today')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [now] = useState(new Date())

  const employees = profiles.filter(p => p.role === 'employee')

  // ── Filtro de busca ────────────────────────────────────────
  const filtered = useMemo(() =>
    employees.filter(e => {
      const q = search.toLowerCase()
      return (
        e.name.toLowerCase().includes(q) ||
        String(e.matricula).includes(q) ||
        (e.cpf ?? '').includes(q)
      )
    }),
    [employees, search]
  )

  // ── Período ────────────────────────────────────────────────
  const { startDate, endDate, days } = useMemo(() => {
    const today = new Date()
    if (period === 'today') {
      return { startDate: today, endDate: today, days: [today] }
    }
    if (period === 'week') {
      const s = startOfWeek(today, { weekStartsOn: 1 })
      const e = endOfWeek(today, { weekStartsOn: 1 })
      return { startDate: s, endDate: e, days: eachDayOfInterval({ start: s, end: e }) }
    }
    const s = startOfMonth(today)
    const e = endOfMonth(today)
    return { startDate: s, endDate: e, days: eachDayOfInterval({ start: s, end: e }) }
  }, [period])

  // ── Refresh ────────────────────────────────────────────────
  const refresh = async () => {
    setIsRefreshing(true)
    await fetchTimeLogs(startDate)
    await fetchOvertimeRequests()
    setIsRefreshing(false)
  }

  useEffect(() => {
    fetchTimeLogs(startDate)
  }, [period, fetchTimeLogs, startDate])

  // ── Dados de um colaborador ────────────────────────────────
  const getEmployeeDays = (userId: string): EmployeeDay[] => {
    const userLogs = timeLogs.filter(l => l.user_id === userId)
    const userOT   = overtimeRequests.filter(r => r.user_id === userId)

    return days.map(d => {
      const dayStr = format(d, 'yyyy-MM-dd')
      const dow    = d.getDay()
      const isToday = d.toDateString() === now.toDateString()
      const isPast  = d < now && !isToday

      const dayLogs = userLogs.filter(l => l.log_date === dayStr)
      const inLog   = dayLogs.find(l => l.type === 'in') ?? null
      const outLog  = dayLogs.filter(l => l.type === 'out').at(-1) ?? null
      const lunchStart = dayLogs.find(l => l.type === 'lunch_start') ?? null
      const lunchEnd   = dayLogs.find(l => l.type === 'lunch_end') ?? null
      const dayOT   = userOT.filter(r => r.date === dayStr)

      const expectedMins = getShiftMins(shifts, userId, dow)
      const workedMins   = calcWorkedMins(userLogs, dayStr, now)
      const lunchMins    = calcLunchMins(userLogs, dayStr)

      let status: EmployeeDay['status'] = 'absent'
      if (inLog && !outLog && isToday) status = 'working'
      else if (inLog && outLog && workedMins >= expectedMins * 0.95) status = 'complete'
      else if (inLog && (outLog || !isToday)) status = 'incomplete'
      else if (isPast && expectedMins === 0) status = 'absent' // sem escala = não conta
      else if (!inLog && !isToday) status = 'absent'

      return { date: dayStr, inLog, outLog, lunchStart, lunchEnd, otRequests: dayOT, workedMins, lunchMins, expectedMins, status }
    })
  }

  // ── Dados do colaborador selecionado ──────────────────────
  const selected     = selectedId ? employees.find(e => e.id === selectedId) ?? null : null
  const selectedDays = selectedId ? getEmployeeDays(selectedId) : []

  const totalWorked  = selectedDays.reduce((s, d) => s + d.workedMins, 0)
  const totalExpected = selectedDays.filter(d => d.expectedMins > 0).reduce((s, d) => s + d.expectedMins, 0)
  const daysComplete = selectedDays.filter(d => d.status === 'complete').length
  const daysAbsent   = selectedDays.filter(d => d.status === 'absent' && d.expectedMins > 0).length
  const totalHEApproved = (selectedId ? overtimeRequests.filter(r => r.user_id === selectedId && r.status === 'approved') : [])
    .reduce((s, r) => s + r.duration_minutes, 0)

  // ── Pie chart data (equipe hoje) ──────────────────────────
  const teamPieData = useMemo(() => {
    const today = now.toDateString()
    const todayStr = format(now, 'yyyy-MM-dd')
    const todayLogs = timeLogs.filter(l => new Date(l.timestamp).toDateString() === today)
    const statusMap = new Map<string, 'working' | 'lunch' | 'out' | 'absent'>()
    const sorted = [...todayLogs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    for (const l of sorted) {
      if (l.type === 'in') statusMap.set(l.user_id, 'working')
      else if (l.type === 'out') statusMap.set(l.user_id, 'out')
      else if (l.type === 'lunch_start') statusMap.set(l.user_id, 'lunch')
      else if (l.type === 'lunch_end') statusMap.set(l.user_id, 'working')
    }
    const todayDow = now.getDay()
    let working = 0, lunch = 0, out = 0, absent = 0
    for (const e of employees) {
      const hasShift = shifts.some(s => s.user_id === e.id && s.day_of_week === todayDow)
      if (!hasShift) continue
      const s = statusMap.get(e.id)
      if (s === 'working') working++
      else if (s === 'lunch') lunch++
      else if (s === 'out') out++
      else absent++
    }
    return [
      { name: 'Trabalhando', value: working },
      { name: 'Almoço',      value: lunch   },
      { name: 'Saíram',      value: out     },
      { name: 'Ausentes',    value: absent  },
    ].filter(d => d.value > 0)
  }, [timeLogs, employees, shifts, now])

  // ── Bar chart data (selected employee) ───────────────────
  const barData = selectedDays
    .filter(d => d.expectedMins > 0)
    .slice(-14)
    .map(d => ({
      day:      format(new Date(d.date + 'T12:00'), 'dd/MM'),
      Trabalhado: Math.round(d.workedMins),
      Esperado:   d.expectedMins,
    }))

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[#0f2d5c]">Monitoramento</h1>
          <p className="text-sm text-gray-500 mt-0.5">Jornadas, HE e desempenho da equipe</p>
        </div>
        <button
          onClick={refresh}
          disabled={isRefreshing}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('w-4 h-4 text-gray-600', isRefreshing && 'animate-spin')} />
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por nome, matrícula ou CPF..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-11"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 h-11">
          {(['today', 'week', 'month'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-4 rounded-lg text-sm font-semibold transition-all',
                period === p ? 'bg-white text-[#0f2d5c] shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {p === 'today' ? 'Hoje' : p === 'week' ? 'Semana' : 'Mês'}
            </button>
          ))}
        </div>
      </div>

      {/* Linha: Pie chart + lista colaboradores */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Pie chart equipe */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-[#0f2d5c] flex items-center gap-2">
              <Users className="w-4 h-4" /> Status da Equipe Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            {teamPieData.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">Sem dados hoje</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={teamPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {teamPieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v} pessoa(s)`, '']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {teamPieData.map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-gray-600">{item.name}</span>
                      </div>
                      <span className="font-bold text-gray-800">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Lista colaboradores */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-[#0f2d5c] flex items-center gap-2">
              <Users className="w-4 h-4" />
              Colaboradores {filtered.length > 0 && <span className="text-gray-400 font-normal">({filtered.length})</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
              {filtered.map(emp => {
                const empDays = period === 'today' ? [getEmployeeDays(emp.id)[0]] : getEmployeeDays(emp.id)
                const todayDay = empDays.find(d => d.date === format(now, 'yyyy-MM-dd'))
                const totalW = empDays.reduce((s, d) => s + d.workedMins, 0)
                const isSelected = selectedId === emp.id
                return (
                  <button
                    key={emp.id}
                    onClick={() => setSelectedId(isSelected ? null : emp.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left',
                      isSelected && 'bg-blue-50 border-l-2 border-[#00b4d8]'
                    )}
                  >
                    <div className="w-9 h-9 rounded-full bg-[#0f2d5c]/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-[#0f2d5c]">{emp.name.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{emp.name}</p>
                      <p className="text-xs text-gray-400">Mat. {emp.matricula}</p>
                    </div>
                    {todayDay && <StatusBadge status={todayDay.status} />}
                    {period !== 'today' && (
                      <span className="text-xs text-gray-500 shrink-0">{fmt(totalW)}</span>
                    )}
                    {isSelected ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                  </button>
                )
              })}
              {filtered.length === 0 && (
                <div className="py-10 text-center text-gray-400 text-sm">Nenhum colaborador encontrado</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detalhe do colaborador selecionado */}
      {selected && (
        <div className="space-y-6">
          {/* KPIs do colaborador */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-[#0f2d5c]/10 flex items-center justify-center">
              <span className="font-bold text-[#0f2d5c]">{selected.name.charAt(0)}</span>
            </div>
            <div>
              <h2 className="font-bold text-[#0f2d5c] text-lg">{selected.name}</h2>
              <p className="text-gray-400 text-xs">Mat. {selected.matricula}{selected.cpf && ` · CPF: ${selected.cpf}`}</p>
            </div>
            <button
              onClick={() => setSelectedId(null)}
              className="ml-auto w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Horas Trabalhadas', value: fmt(totalWorked),   icon: Clock,       color: 'text-blue-600',    bg: 'bg-blue-50' },
              { label: 'Dias Completos',    value: daysComplete,        icon: CheckCircle2,color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Ausências',         value: daysAbsent,          icon: AlertTriangle,color:'text-red-600',     bg: 'bg-red-50' },
              { label: 'HE Aprovadas',      value: fmt(totalHEApproved),icon: TrendingUp,  color: 'text-amber-600',   bg: 'bg-amber-50' },
            ].map(item => (
              <Card key={item.label}>
                <CardContent className={cn('p-4 flex items-center gap-3', item.bg)}>
                  <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                    <item.icon className={cn('w-4 h-4', item.color)} />
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">{item.label}</p>
                    <p className={cn('font-black text-xl', item.color)}>{item.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Bar chart horas */}
          {barData.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-[#0f2d5c] flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Horas por Dia
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`${v} min`, '']} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Esperado"   fill="#e5e7eb" radius={[4,4,0,0]} />
                    <Bar dataKey="Trabalhado" fill="#00b4d8" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Tabela de dias */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-[#0f2d5c] flex items-center gap-2">
                <Clock className="w-4 h-4" /> Registros do Período
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Data</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Entrada</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Saída</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Almoço</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Trabalhado</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">HE</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {selectedDays
                      .filter(d => d.expectedMins > 0 || d.inLog)
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map(d => (
                        <tr key={d.date} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">
                            <p>{format(new Date(d.date + 'T12:00'), 'dd/MM', { locale: ptBR })}</p>
                            <p className="text-xs text-gray-400 capitalize">
                              {format(new Date(d.date + 'T12:00'), 'EEE', { locale: ptBR })}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            {d.inLog
                              ? <span className="text-emerald-700 font-mono text-sm">{format(new Date(d.inLog.timestamp), 'HH:mm')}</span>
                              : <span className="text-gray-300">—</span>
                            }
                          </td>
                          <td className="px-4 py-3">
                            {d.outLog
                              ? <div>
                                  <span className="text-rose-600 font-mono text-sm">{format(new Date(d.outLog.timestamp), 'HH:mm')}</span>
                                  {d.outLog.flag === 'he_not_registered' && <span className="ml-1 text-xs text-amber-500">⚠HE</span>}
                                  {d.outLog.flag === 'logout_by_agent' && <span className="ml-1 text-xs text-orange-500">⚠Auto</span>}
                                </div>
                              : d.status === 'working'
                                ? <span className="text-blue-500 text-xs flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />agora</span>
                                : <span className="text-gray-300">—</span>
                            }
                          </td>
                          <td className="px-4 py-3">
                            {d.lunchStart
                              ? <div className="text-xs">
                                  <p className="text-amber-600 font-mono">{format(new Date(d.lunchStart.timestamp), 'HH:mm')}</p>
                                  {d.lunchEnd && <p className="text-gray-500 font-mono">{format(new Date(d.lunchEnd.timestamp), 'HH:mm')}</p>}
                                  {!d.lunchEnd && <p className="text-amber-400 flex items-center gap-0.5"><UtensilsCrossed className="w-3 h-3" />ausente</p>}
                                </div>
                              : <span className="text-gray-300">—</span>
                            }
                          </td>
                          <td className="px-4 py-3">
                            {d.workedMins > 0
                              ? <span className={cn('font-semibold text-sm', d.workedMins >= d.expectedMins * 0.95 ? 'text-emerald-600' : 'text-amber-600')}>
                                  {fmt(d.workedMins)}
                                </span>
                              : <span className="text-gray-300">—</span>
                            }
                          </td>
                          <td className="px-4 py-3">
                            {d.otRequests.length > 0
                              ? <div className="space-y-1">
                                  {d.otRequests.map(ot => (
                                    <div key={ot.id} className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-mono text-xs text-gray-700">{fmt(ot.duration_minutes)}</span>
                                      <OTBadge status={ot.status} />
                                    </div>
                                  ))}
                                </div>
                              : <span className="text-gray-300">—</span>
                            }
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={d.status} />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Estado vazio */}
      {!selected && (
        <Card className="bg-gray-50 border-dashed">
          <CardContent className="py-12 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Selecione um colaborador para ver os detalhes</p>
            <p className="text-gray-300 text-sm mt-1">Jornada, HE e registros completos do período</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
// src/sections/admin/Monitoring.tsx
import { useEffect } from 'react'
import { useStore } from '@/hooks/useStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Users, Clock, Calendar, TrendingUp, AlertCircle
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import { format, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { TimeLog, OvertimeRequest } from '@/types'

const COLORS = ['#10B981', '#F59E0B', '#EF4444']

export function Monitoring() {
  const timeLogs = useStore((state) => state.timeLogs)
  const profiles = useStore((state) => state.profiles)
  const overtimeRequests = useStore((state) => state.overtimeRequests)
  const fetchTimeLogs = useStore((state) => state.fetchTimeLogs)
  const fetchOvertimeRequests = useStore((state) => state.fetchOvertimeRequests)

  useEffect(() => {
    fetchTimeLogs()
    fetchOvertimeRequests()
  }, [fetchTimeLogs, fetchOvertimeRequests])

  const employees = profiles.filter((p) => p.role === 'employee')
  const totalEmployees = employees.length

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i)
    const dayLogs = timeLogs.filter(
      (r: TimeLog) => new Date(r.timestamp).toDateString() === date.toDateString()
    )
    return {
      day: format(date, 'EEE', { locale: ptBR }).substring(0, 3),
      presentes: new Set(dayLogs.map((r: TimeLog) => r.user_id)).size,
    }
  })

  const overtimeData = [
    { name: 'Aprovadas', value: overtimeRequests.filter((r: OvertimeRequest) => r.status === 'approved').length },
    { name: 'Pendentes', value: overtimeRequests.filter((r: OvertimeRequest) => r.status === 'pending').length },
    { name: 'Rejeitadas', value: overtimeRequests.filter((r: OvertimeRequest) => r.status === 'rejected').length },
  ]

  const today = new Date()
  const todayLogs = timeLogs.filter(
    (r: TimeLog) => new Date(r.timestamp).toDateString() === today.toDateString()
  )
  const presentToday = new Set(todayLogs.map((r: TimeLog) => r.user_id)).size
  const absentToday = totalEmployees - presentToday

  const approvedOT = overtimeRequests.filter((r: OvertimeRequest) => r.status === 'approved')
  const avgOvertimePerDay = approvedOT.length > 0
    ? Math.round(approvedOT.reduce((acc, r) => acc + r.duration_minutes, 0) / 7)
    : 0

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-[#0f2d5c]">Monitoramento</h1>
        <p className="text-sm text-gray-500 mt-1">Visão geral da presença e horas extras</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-gray-500 text-xs">Presentes Hoje</p>
                <p className="text-xl font-bold text-gray-800">{presentToday}/{totalEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-gray-500 text-xs">Média HE/Dia</p>
                <p className="text-xl font-bold text-gray-800">
                  {Math.floor(avgOvertimePerDay / 60)}h{avgOvertimePerDay % 60 > 0 ? ` ${avgOvertimePerDay % 60}m` : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance chart */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            Presença — Últimos 7 Dias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7Days}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="presentes" fill="#10B981" radius={[4, 4, 0, 0]} name="Presentes" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Overtime pie */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            Status das Horas Extras
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={overtimeData}
                  cx="50%" cy="50%"
                  innerRadius={40} outerRadius={70}
                  paddingAngle={5} dataKey="value"
                >
                  {overtimeData.map((_e, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-1">
            {overtimeData.map((entry, i) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                <span className="text-xs text-gray-500">{entry.name} ({entry.value})</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alert */}
      {absentToday > 0 && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-yellow-800">Funcionários Ausentes</p>
              <p className="text-sm text-yellow-700">
                {absentToday} funcionário{absentToday > 1 ? 's' : ''} ainda não registraram ponto hoje.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
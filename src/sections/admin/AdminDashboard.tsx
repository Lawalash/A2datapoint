// src/sections/admin/AdminDashboard.tsx
import { useEffect } from 'react'
import { useStore } from '@/hooks/useStore'
import { Card, CardContent } from '@/components/ui/card'
import {
  Users, BarChart3, Clock, FileText,
  HardDrive, UserCheck, TrendingUp
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { TimeLog } from '@/types'

export function AdminDashboard() {
  const navigateAdmin = useStore((state) => state.navigateAdmin)
  const getTodayLogs = useStore((state) => state.getTodayLogs)
  const profiles = useStore((state) => state.profiles)
  const overtimeRequests = useStore((state) => state.overtimeRequests)
  const fetchTimeLogs = useStore((state) => state.fetchTimeLogs)

  useEffect(() => {
    fetchTimeLogs()
  }, [fetchTimeLogs])

  const todayLogs = getTodayLogs()
  const presentCount = new Set(todayLogs.map((r: TimeLog) => r.user_id)).size
  const totalEmployees = profiles.filter((p) => p.role === 'employee').length
  const pendingOvertime = overtimeRequests.filter((r) => r.status === 'pending').length

  const menuItems = [
    {
      id: 'users' as const,
      label: 'Gestão de Utilizadores',
      icon: Users,
      color: 'bg-blue-500',
      description: 'Criar e gerir matrículas',
    },
    {
      id: 'monitoring' as const,
      label: 'Monitoramento',
      icon: BarChart3,
      color: 'bg-green-500',
      description: 'Escala e estatísticas',
    },
    {
      id: 'overtime' as const,
      label: 'Aprovação de HE',
      icon: Clock,
      color: 'bg-orange-500',
      description: `${pendingOvertime} solicitações pendentes`,
    },
    {
      id: 'reports' as const,
      label: 'Relatórios',
      icon: FileText,
      color: 'bg-purple-500',
      description: 'Exportar e visualizar',
    },
    {
      id: 'storage' as const,
      label: 'Armazenamento',
      icon: HardDrive,
      color: 'bg-red-500',
      description: 'Gerir fotos',
    },
  ]

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-[#0f2d5c]">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1 capitalize">
          {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-gray-500 text-xs">Presentes Hoje</p>
                <p className="text-xl font-bold text-gray-800">
                  {presentCount}/{totalEmployees}
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
      </div>

      {/* Navigation menu */}
      <h2 className="text-gray-700 font-semibold mb-3">Menu Principal</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => navigateAdmin(item.id)}
              className="bg-white rounded-xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md active:scale-[0.98] transition-all text-left border border-gray-100"
            >
              <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center shrink-0`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-800 text-sm">{item.label}</h3>
                <p className="text-gray-500 text-xs truncate">{item.description}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Today's logs */}
      <h2 className="text-gray-700 font-semibold mb-3">Registros de Hoje</h2>
      <Card>
        <CardContent className="p-0">
          {todayLogs.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              Nenhum registro hoje
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {todayLogs.slice(0, 8).map((record: TimeLog) => (
                <div key={record.id} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        record.type === 'in' ? 'bg-green-100' : 'bg-red-100'
                      }`}
                    >
                      <span
                        className={`text-xs font-bold ${
                          record.type === 'in' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {record.type === 'in' ? 'E' : 'S'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">
                        {record.profile?.name ?? '—'}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {format(new Date(record.timestamp), 'HH:mm')}
                        {record.flag === 'he_not_registered' && (
                          <span className="ml-2 text-amber-500 font-medium">⚠ HE não cadastrada</span>
                        )}
                      </p>
                    </div>
                  </div>
                  {record.photo_url && (
                    <img
                      src={record.photo_url}
                      alt="foto"
                      className="w-8 h-8 rounded-full object-cover border border-gray-200"
                    />
                  )}
                </div>
              ))}
              {todayLogs.length > 8 && (
                <div className="p-3 text-center text-blue-600 text-sm">
                  +{todayLogs.length - 8} registros
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
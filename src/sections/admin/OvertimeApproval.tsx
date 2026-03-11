// src/sections/admin/OvertimeApproval.tsx
import { useEffect } from 'react'
import { useState } from 'react'
import { useStore } from '@/hooks/useStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Clock, CheckCircle2, XCircle,
  Calendar, User, Timer, Loader2
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { format, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { OvertimeRequest } from '@/types'

export function OvertimeApproval() {
  const overtimeRequests = useStore((state) => state.overtimeRequests)
  const approveOvertime = useStore((state) => state.approveOvertime)
  const rejectOvertime = useStore((state) => state.rejectOvertime)
  const fetchOvertimeRequests = useStore((state) => state.fetchOvertimeRequests)

  const [activeTab, setActiveTab] = useState('d0')
  const [loadingId, setLoadingId] = useState<string | null>(null)

  useEffect(() => {
    fetchOvertimeRequests()
  }, [fetchOvertimeRequests])

  const getByDay = (daysAgo: number): OvertimeRequest[] => {
    const target = subDays(new Date(), daysAgo)
    const targetStr = format(target, 'yyyy-MM-dd')
    return overtimeRequests.filter((r) => r.date === targetStr)
  }

  const d0 = getByDay(0)
  const d1 = getByDay(1)
  const d2 = getByDay(2)

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${h}h${m > 0 ? ` ${m}min` : ''}`
  }

  const handleApprove = async (id: string) => {
    setLoadingId(id)
    await approveOvertime(id)
    setLoadingId(null)
  }

  const handleReject = async (id: string) => {
    setLoadingId(id)
    await rejectOvertime(id)
    setLoadingId(null)
  }

  const RequestCard = ({ request }: { request: OvertimeRequest }) => (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-800">
                {request.profile?.name ?? `Mat. ${request.user_id.slice(0, 6)}`}
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                <Timer className="w-3.5 h-3.5" />
                {formatDuration(request.duration_minutes)}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-3.5 h-3.5" />
                {format(new Date(request.date), 'dd/MM/yyyy')}
              </div>
            </div>
          </div>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              request.status === 'pending'
                ? 'bg-yellow-100 text-yellow-700'
                : request.status === 'approved'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {request.status === 'pending' ? 'Pendente' : request.status === 'approved' ? 'Aprovada' : 'Rejeitada'}
          </span>
        </div>

        {request.status === 'pending' && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 h-10 border-red-300 text-red-600 hover:bg-red-50"
              onClick={() => handleReject(request.id)}
              disabled={loadingId === request.id}
            >
              {loadingId === request.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <><XCircle className="w-4 h-4 mr-2" />Rejeitar</>
              )}
            </Button>
            <Button
              className="flex-1 h-10 bg-green-600 hover:bg-green-700"
              onClick={() => handleApprove(request.id)}
              disabled={loadingId === request.id}
            >
              {loadingId === request.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <><CheckCircle2 className="w-4 h-4 mr-2" />Aprovar</>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )

  const EmptyState = () => (
    <div className="text-center py-10">
      <Clock className="w-12 h-12 text-gray-200 mx-auto mb-3" />
      <p className="text-gray-400 text-sm">Nenhuma solicitação para este dia</p>
    </div>
  )

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-[#0f2d5c]">Aprovação de HE</h1>
        <p className="text-sm text-gray-500 mt-1">Gerir horas extras dos últimos 3 dias</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Hoje (D-0)', requests: d0 },
          { label: 'Ontem (D-1)', requests: d1 },
          { label: 'D-2', requests: d2 },
        ].map(({ label, requests }) => (
          <Card key={label}>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-xl font-bold text-orange-600">
                {requests.filter((r) => r.status === 'pending').length}
              </p>
              <p className="text-xs text-gray-400">pendente(s)</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="d0">Hoje</TabsTrigger>
          <TabsTrigger value="d1">Ontem</TabsTrigger>
          <TabsTrigger value="d2">D-2</TabsTrigger>
        </TabsList>

        <TabsContent value="d0">
          <h3 className="text-gray-600 font-medium text-sm mb-3 capitalize">
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </h3>
          {d0.length === 0 ? <EmptyState /> : d0.map((r) => <RequestCard key={r.id} request={r} />)}
        </TabsContent>

        <TabsContent value="d1">
          <h3 className="text-gray-600 font-medium text-sm mb-3 capitalize">
            {format(subDays(new Date(), 1), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </h3>
          {d1.length === 0 ? <EmptyState /> : d1.map((r) => <RequestCard key={r.id} request={r} />)}
        </TabsContent>

        <TabsContent value="d2">
          <h3 className="text-gray-600 font-medium text-sm mb-3 capitalize">
            {format(subDays(new Date(), 2), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </h3>
          {d2.length === 0 ? <EmptyState /> : d2.map((r) => <RequestCard key={r.id} request={r} />)}
        </TabsContent>
      </Tabs>
    </div>
  )
}
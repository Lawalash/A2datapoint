import { useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Calendar,
  User,
  Timer
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { OvertimeRequest } from '@/types';

export function OvertimeApproval() {
  const navigateTo = useStore((state) => state.navigateTo);
  const overtimeRequests = useStore((state) => state.overtimeRequests);
  const approveOvertime = useStore((state) => state.approveOvertime);
  const rejectOvertime = useStore((state) => state.rejectOvertime);

  const [activeTab, setActiveTab] = useState('d0');

  // Filtra solicitações por data
  const getRequestsByDay = (daysAgo: number): OvertimeRequest[] => {
    const targetDate = subDays(new Date(), daysAgo);
    return overtimeRequests.filter((r: OvertimeRequest) => {
      const requestDate = new Date(r.date);
      return requestDate.toDateString() === targetDate.toDateString();
    });
  };

  const d0Requests = getRequestsByDay(0);
  const d1Requests = getRequestsByDay(1);
  const d2Requests = getRequestsByDay(2);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins > 0 ? mins + 'min' : ''}`;
  };

  const RequestCard = ({ request }: { request: OvertimeRequest }) => (
    <Card className="bg-white mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-800">{request.userName}</p>
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                <Timer className="w-4 h-4" />
                {formatDuration(request.duration)}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                {format(new Date(request.date), 'dd/MM/yyyy')}
              </div>
            </div>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
            request.status === 'approved' ? 'bg-green-100 text-green-700' :
            'bg-red-100 text-red-700'
          }`}>
            {request.status === 'pending' ? 'Pendente' :
             request.status === 'approved' ? 'Aprovada' : 'Rejeitada'}
          </span>
        </div>

        {request.status === 'pending' && (
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              className="flex-1 h-10 border-red-300 text-red-600 hover:bg-red-50"
              onClick={() => rejectOvertime(request.id)}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Rejeitar
            </Button>
            <Button
              className="flex-1 h-10 bg-green-600 hover:bg-green-700"
              onClick={() => approveOvertime(request.id)}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Aprovar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const EmptyState = () => (
    <div className="text-center py-8">
      <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500">Nenhuma solicitação para este dia</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-700 to-orange-800 p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateTo('admin-dashboard')}
            className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center active:bg-white/30"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <p className="text-orange-200 text-sm">Voltar ao Dashboard</p>
            <h1 className="text-white font-bold text-xl">Aprovação de HE</h1>
          </div>
        </div>
      </div>

      {/* Resumo */}
      <div className="p-4 grid grid-cols-3 gap-2">
        <Card className="bg-white">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-gray-500">Hoje (D-0)</p>
            <p className="text-xl font-bold text-orange-600">{d0Requests.filter((r: OvertimeRequest) => r.status === 'pending').length}</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-gray-500">Ontem (D-1)</p>
            <p className="text-xl font-bold text-orange-600">{d1Requests.filter((r: OvertimeRequest) => r.status === 'pending').length}</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-gray-500">Anteontem (D-2)</p>
            <p className="text-xl font-bold text-orange-600">{d2Requests.filter((r: OvertimeRequest) => r.status === 'pending').length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="d0" className="text-sm">
              Hoje
            </TabsTrigger>
            <TabsTrigger value="d1" className="text-sm">
              Ontem
            </TabsTrigger>
            <TabsTrigger value="d2" className="text-sm">
              Anteontem
            </TabsTrigger>
          </TabsList>

          <TabsContent value="d0" className="mt-0">
            <h3 className="text-gray-700 font-semibold mb-3">
              {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </h3>
            {d0Requests.length === 0 ? <EmptyState /> : 
              d0Requests.map((r: OvertimeRequest) => <RequestCard key={r.id} request={r} />)
            }
          </TabsContent>

          <TabsContent value="d1" className="mt-0">
            <h3 className="text-gray-700 font-semibold mb-3">
              {format(subDays(new Date(), 1), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </h3>
            {d1Requests.length === 0 ? <EmptyState /> : 
              d1Requests.map((r: OvertimeRequest) => <RequestCard key={r.id} request={r} />)
            }
          </TabsContent>

          <TabsContent value="d2" className="mt-0">
            <h3 className="text-gray-700 font-semibold mb-3">
              {format(subDays(new Date(), 2), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </h3>
            {d2Requests.length === 0 ? <EmptyState /> : 
              d2Requests.map((r: OvertimeRequest) => <RequestCard key={r.id} request={r} />)
            }
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

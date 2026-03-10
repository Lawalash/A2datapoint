import { useStore } from '@/hooks/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowLeft, 
  Users, 
  Clock, 
  Calendar,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { TimeRecord, OvertimeRequest } from '@/types';

export function Monitoring() {
  const navigateTo = useStore((state) => state.navigateTo);
  const timeRecords = useStore((state) => state.timeRecords);
  const users = useStore((state) => state.users);
  const overtimeRequests = useStore((state) => state.overtimeRequests);

  const employees = users.filter((u) => u.role === 'employee');
  const totalEmployees = employees.length;

  // Dados para gráfico de presença dos últimos 7 dias
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayRecords = timeRecords.filter((r: TimeRecord) => {
      const recordDate = new Date(r.timestamp);
      return recordDate.toDateString() === date.toDateString();
    });
    const uniqueUsers = new Set(dayRecords.map((r: TimeRecord) => r.userId)).size;
    return {
      day: format(date, 'EEE', { locale: ptBR }).substring(0, 3),
      presentes: uniqueUsers,
      total: totalEmployees
    };
  });

  // Dados para gráfico de HE
  const overtimeData = [
    { name: 'Aprovadas', value: overtimeRequests.filter((r: OvertimeRequest) => r.status === 'approved').length },
    { name: 'Pendentes', value: overtimeRequests.filter((r: OvertimeRequest) => r.status === 'pending').length },
    { name: 'Rejeitadas', value: overtimeRequests.filter((r: OvertimeRequest) => r.status === 'rejected').length },
  ];

  const COLORS = ['#10B981', '#F59E0B', '#EF4444'];

  // Estatísticas de hoje
  const today = new Date();
  const todayRecords = timeRecords.filter((r: TimeRecord) => {
    const recordDate = new Date(r.timestamp);
    return recordDate.toDateString() === today.toDateString();
  });
  const presentToday = new Set(todayRecords.map((r: TimeRecord) => r.userId)).size;
  const absentToday = totalEmployees - presentToday;

  // Média de horas extras por dia (últimos 7 dias)
  const avgOvertimePerDay = Math.round(
    overtimeRequests
      .filter((r: OvertimeRequest) => r.status === 'approved')
      .reduce((acc: number, r: OvertimeRequest) => acc + r.duration, 0) / 7
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-700 to-green-800 p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateTo('admin-dashboard')}
            className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center active:bg-white/30"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <p className="text-green-200 text-sm">Voltar ao Dashboard</p>
            <h1 className="text-white font-bold text-xl">Monitoramento</h1>
          </div>
        </div>
      </div>

      {/* Cards de estatísticas */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <Card className="bg-white">
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

        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-gray-500 text-xs">Média HE/Dia</p>
                <p className="text-xl font-bold text-gray-800">{Math.floor(avgOvertimePerDay / 60)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de presença */}
      <div className="px-4 pb-4">
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              Presença dos Últimos 7 Dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={last7Days}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Bar 
                    dataKey="presentes" 
                    fill="#10B981" 
                    radius={[4, 4, 0, 0]}
                    name="Presentes"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de HE */}
      <div className="px-4 pb-6">
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gray-500" />
              Status das Horas Extras
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={overtimeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {overtimeData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {overtimeData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index] }}
                  />
                  <span className="text-sm text-gray-600">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {absentToday > 0 && (
        <div className="px-4 pb-6">
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800">Funcionários Ausentes</p>
                  <p className="text-sm text-yellow-700">
                    {absentToday} funcionário{absentToday > 1 ? 's' : ''} ainda não registraram ponto hoje.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

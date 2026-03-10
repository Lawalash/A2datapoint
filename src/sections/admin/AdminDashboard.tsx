import { useStore } from '@/hooks/useStore';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowRight, 
  Users, 
  BarChart3, 
  Clock, 
  FileText, 
  Database,
  LogOut,
  UserCheck,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { TimeRecord } from '@/types';

export function AdminDashboard() {
  const navigateTo = useStore((state) => state.navigateTo);
  const logout = useStore((state) => state.logout);
  const getTodayRecords = useStore((state) => state.getTodayRecords);
  const users = useStore((state) => state.users);
  const overtimeRequests = useStore((state) => state.overtimeRequests);

  const todayRecords = getTodayRecords();
  const presentCount = new Set(todayRecords.map((r: TimeRecord) => r.userId)).size;
  const totalEmployees = users.filter((u) => u.role === 'employee').length;
  const pendingOvertime = overtimeRequests.filter((r) => r.status === 'pending').length;

  const menuItems = [
    { 
      id: 'admin-users', 
      label: 'Gestão de Usuários', 
      icon: Users, 
      color: 'bg-blue-500',
      description: 'Criar e gerenciar matrículas'
    },
    { 
      id: 'admin-monitoring', 
      label: 'Monitoramento', 
      icon: BarChart3, 
      color: 'bg-green-500',
      description: 'Escala e estatísticas'
    },
    { 
      id: 'admin-overtime', 
      label: 'Aprovação de HE', 
      icon: Clock, 
      color: 'bg-orange-500',
      description: `${pendingOvertime} solicitações pendentes`
    },
    { 
      id: 'admin-reports', 
      label: 'Relatórios', 
      icon: FileText, 
      color: 'bg-purple-500',
      description: 'Exportar e visualizar'
    },
    { 
      id: 'admin-storage', 
      label: 'Armazenamento', 
      icon: Database, 
      color: 'bg-red-500',
      description: 'Gerenciar fotos'
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-800 p-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-blue-200 text-sm">Painel Administrativo</p>
            <h1 className="text-white font-bold text-xl">Dashboard</h1>
          </div>
          <button
            onClick={logout}
            className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center active:bg-white/30"
          >
            <LogOut className="w-5 h-5 text-white" />
          </button>
        </div>
        <div className="mt-2 text-blue-200 text-sm">
          {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-gray-500 text-xs">Presentes Hoje</p>
                <p className="text-xl font-bold text-gray-800">{presentCount}/{totalEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
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

      {/* Menu de navegação */}
      <div className="px-4 pb-4">
        <h2 className="text-gray-700 font-semibold mb-3">Menu Principal</h2>
        <div className="space-y-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => navigateTo(item.id as AppState['currentView'])}
                className="w-full bg-white rounded-xl p-4 flex items-center gap-4 shadow-sm active:scale-[0.98] transition-transform"
              >
                <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-gray-800">{item.label}</h3>
                  <p className="text-gray-500 text-sm">{item.description}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Registros de hoje */}
      <div className="px-4 pb-6">
        <h2 className="text-gray-700 font-semibold mb-3">Registros de Hoje</h2>
        <Card className="bg-white">
          <CardContent className="p-0">
            {todayRecords.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <p>Nenhum registro hoje</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {todayRecords.slice(0, 5).map((record: TimeRecord) => (
                  <div key={record.id} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        record.type === 'in' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        <span className={`text-xs font-bold ${
                          record.type === 'in' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {record.type === 'in' ? 'E' : 'S'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{record.userName}</p>
                        <p className="text-gray-500 text-xs">
                          {format(new Date(record.timestamp), 'HH:mm')}
                        </p>
                      </div>
                    </div>
                    {record.photo && (
                      <div className="w-8 h-8 bg-gray-200 rounded-full" />
                    )}
                  </div>
                ))}
                {todayRecords.length > 5 && (
                  <div className="p-3 text-center text-blue-600 text-sm">
                    +{todayRecords.length - 5} registros
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Import type para AppState
import type { AppState } from '@/types';

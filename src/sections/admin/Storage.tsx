import { useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  Trash2, 
  Image,
  CheckCircle2,
  HardDrive,
  AlertTriangle
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { TimeRecord } from '@/types';

export function Storage() {
  const navigateTo = useStore((state) => state.navigateTo);
  const timeRecords = useStore((state) => state.timeRecords);
  const getStorageUsage = useStore((state) => state.getStorageUsage);
  const clearOldPhotos = useStore((state) => state.clearOldPhotos);

  const [feedback, setFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [clearing, setClearing] = useState(false);

  const storageUsed = getStorageUsage();
  const storageLimit = 500; // 500MB limite simulado
  const usagePercentage = Math.min((storageUsed / storageLimit) * 100, 100);

  // Conta fotos por período
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const photosWithData = timeRecords.filter((r: TimeRecord) => r.photo);
  const recentPhotos = photosWithData.filter((r: TimeRecord) => new Date(r.timestamp) >= sevenDaysAgo);
  const oldPhotos = photosWithData.filter((r: TimeRecord) => new Date(r.timestamp) < sevenDaysAgo);

  const handleClearOldPhotos = async () => {
    setClearing(true);
    
    // Simula delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    clearOldPhotos();
    setFeedback({
      type: 'success',
      message: `${oldPhotos.length} fotos antigas removidas com sucesso!`
    });
    
    setClearing(false);
    setTimeout(() => setFeedback(null), 3000);
  };

  const getUsageStatus = (percentage: number) => {
    if (percentage < 50) return { text: 'Normal', color: 'text-green-600' };
    if (percentage < 80) return { text: 'Atenção', color: 'text-yellow-600' };
    return { text: 'Crítico', color: 'text-red-600' };
  };

  const status = getUsageStatus(usagePercentage);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-700 to-red-800 p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateTo('admin-dashboard')}
            className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center active:bg-white/30"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <p className="text-red-200 text-sm">Voltar ao Dashboard</p>
            <h1 className="text-white font-bold text-xl">Armazenamento</h1>
          </div>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className="px-4 pt-4">
          <Alert className="bg-green-100 border-green-300">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <AlertDescription className="text-green-800">
              {feedback.message}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Card principal de uso */}
      <div className="p-4">
        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center">
                  <HardDrive className="w-7 h-7 text-red-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Uso de Armazenamento</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {storageUsed} <span className="text-lg text-gray-500">/ {storageLimit} MB</span>
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color} bg-opacity-10`}>
                {status.text}
              </span>
            </div>

            <Progress 
              value={usagePercentage} 
              className="h-3"
            />
            
            <p className="text-gray-500 text-sm mt-2 text-right">
              {usagePercentage.toFixed(1)}% utilizado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas de fotos */}
      <div className="px-4 pb-4">
        <h2 className="text-gray-700 font-semibold mb-3">Estatísticas de Fotos</h2>
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Image className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Últimos 7 dias</p>
                  <p className="text-xl font-bold text-gray-800">{recentPhotos.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Image className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Mais de 7 dias</p>
                  <p className="text-xl font-bold text-gray-800">{oldPhotos.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Alerta */}
      {usagePercentage > 80 && (
        <div className="px-4 pb-4">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">Armazenamento Quase Cheio</p>
                  <p className="text-sm text-red-700">
                    O armazenamento está acima de 80%. Recomendamos limpar fotos antigas.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Ação de limpar */}
      <div className="px-4 pb-6">
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-gray-500" />
              Limpar Fotos Antigas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-sm mb-4">
              Remove as fotos de registros com mais de 7 dias para liberar espaço.
              <br />
              <strong>{oldPhotos.length} fotos</strong> serão removidas ({oldPhotos.length * 2} MB).
            </p>
            
            <Button
              variant="destructive"
              className="w-full h-12"
              onClick={handleClearOldPhotos}
              disabled={clearing || oldPhotos.length === 0}
            >
              <Trash2 className="w-5 h-5 mr-2" />
              {clearing ? 'Limpando...' : 'Limpar Fotos Antigas (> 7 dias)'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Lista de fotos recentes */}
      <div className="px-4 pb-6">
        <h2 className="text-gray-700 font-semibold mb-3">Fotos Recentes</h2>
        <div className="space-y-2">
          {photosWithData.slice(0, 5).map((record: TimeRecord) => (
            <Card key={record.id} className="bg-white">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                    <Image className="w-6 h-6 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 text-sm">{record.userName}</p>
                    <p className="text-gray-500 text-xs">
                      {formatDistanceToNow(new Date(record.timestamp), { 
                        addSuffix: true,
                        locale: ptBR 
                      })}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    record.type === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {record.type === 'in' ? 'Entrada' : 'Saída'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

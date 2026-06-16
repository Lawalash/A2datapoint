import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, AlertTriangle, Trash2, Clock, CheckCircle, XCircle, HardDriveDownload, ShieldAlert } from 'lucide-react';
import { useStorageMonitoring } from '@/hooks/useStorageMonitoring';
import { getLocalStorageUsage, formatBytes, clearProfileAvatarsFromLocalStorage, type LocalStorageItem } from '@/utils/localStorageMonitor';
import { format, parseISO } from 'date-fns';

const STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024; // 1 GB (Exemplo de constante fixa)

const StorageMonitoringPanel: React.FC = () => {
  const { data, loading, error, refetch, cleanupEvidence } = useStorageMonitoring();
  const [localData, setLocalData] = useState<{ items: LocalStorageItem[], totalBytes: number }>({ items: [], totalBytes: 0 });
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [cleanupConfirmText, setCleanupConfirmText] = useState('');
  const [isCleaning, setIsCleaning] = useState(false);

  const loadLocalData = () => {
    setLocalData(getLocalStorageUsage());
  };

  useEffect(() => {
    loadLocalData();
    const handleUpdate = () => loadLocalData();
    window.addEventListener('avatarUpdated', handleUpdate);
    return () => window.removeEventListener('avatarUpdated', handleUpdate);
  }, []);

  const handleClearLocal = () => {
    if (confirm('Tem certeza que deseja limpar as fotos de perfil salvas localmente neste navegador? Isso não afeta o banco de dados.')) {
      clearProfileAvatarsFromLocalStorage();
    }
  };

  const handleCleanupSubmit = async () => {
    if (cleanupConfirmText !== 'LIMPAR') return;
    setIsCleaning(true);
    try {
      await cleanupEvidence();
      setShowCleanupModal(false);
      setCleanupConfirmText('');
    } catch (e) {
      // erro tratado no hook
    } finally {
      setIsCleaning(false);
    }
  };

  if (loading && !data && !isCleaning) {
    return (
      <div className="flex justify-center p-12">
        <RefreshCw className="w-8 h-8 animate-spin text-[#13A89E]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const { stats, latestPhotos } = data;
  const usagePercent = Math.min((stats.totalSizeBytes / STORAGE_LIMIT_BYTES) * 100, 100);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#13A89E]/10 flex items-center justify-center">
            <Database className="w-5 h-5 text-[#13A89E]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#1B325F]">Monitoramento de Armazenamento</h3>
            <p className="text-xs text-[#666]">Visão simplificada do consumo da nuvem e dados locais</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => { refetch(); loadLocalData(); }}
            className="flex-1 sm:flex-none px-4 py-2 bg-white border border-[#E5E5E5] text-[#1B325F] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </button>
          <button
            onClick={() => setShowCleanupModal(true)}
            disabled={stats.totalCount === 0 || isCleaning}
            className="flex-1 sm:flex-none px-4 py-2 bg-white border border-[#E5E5E5] text-[#DC3545] rounded-lg text-sm font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" /> Limpar Evidências
          </button>
        </div>
      </div>

      {/* Capacity Progress */}
      <div className="bg-white border border-[#E5E5E5] rounded-xl p-6 shadow-sm relative overflow-hidden">
        <div className="flex justify-between items-end mb-2 relative z-10">
          <div>
            <p className="text-sm font-semibold text-[#1B325F]">Capacidade de Evidências</p>
            <p className="text-xs text-[#666]">Configurado: {formatBytes(STORAGE_LIMIT_BYTES)}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-[#13A89E]">{formatBytes(stats.totalSizeBytes)}</p>
            <p className="text-xs text-[#666]">Consumido ({usagePercent.toFixed(1)}%)</p>
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 mb-4 relative z-10 overflow-hidden">
          <div 
            className={`h-3 rounded-full transition-all duration-500 ${usagePercent > 90 ? 'bg-[#DC3545]' : usagePercent > 70 ? 'bg-amber-500' : 'bg-[#13A89E]'}`} 
            style={{ width: `${usagePercent}%` }}
          ></div>
        </div>
        <p className="text-[10px] text-[#999] relative z-10 flex items-center gap-1">
          <ShieldAlert className="w-3 h-3" />
          A capacidade exibida é apenas uma configuração limitadora para alertas e pode não representar o teto do seu plano real no provedor (Supabase).
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-[#E5E5E5] rounded-xl shadow-sm">
          <h4 className="text-xs font-semibold text-[#666] uppercase mb-1">Fotos Armazenadas</h4>
          <p className="text-2xl font-bold text-[#1B325F]">{stats.totalCount}</p>
          <p className="text-xs text-[#999] mt-1">{stats.uploadedCount} OK / {stats.failedCount} Falhas</p>
        </div>
        <div className="p-4 bg-white border border-[#E5E5E5] rounded-xl shadow-sm">
          <h4 className="text-xs font-semibold text-[#666] uppercase mb-1">Pendências</h4>
          <p className={`text-2xl font-bold ${stats.pendingCount > 0 ? 'text-amber-600' : 'text-[#28A745]'}`}>{stats.pendingCount}</p>
          <p className="text-xs text-[#999] mt-1">Aguardando sync/upload</p>
        </div>
        <div className="p-4 bg-white border border-[#E5E5E5] rounded-xl shadow-sm">
          <h4 className="text-xs font-semibold text-[#666] uppercase mb-1">Espaço Restante</h4>
          <p className="text-2xl font-bold text-[#1B325F]">{formatBytes(Math.max(0, STORAGE_LIMIT_BYTES - stats.totalSizeBytes))}</p>
          <p className="text-xs text-[#999] mt-1">Na cota simulada</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Evidence */}
        <div className="bg-white border border-[#E5E5E5] rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#E5E5E5] bg-gray-50 flex justify-between items-center">
            <h4 className="font-semibold text-[#1B325F] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#13A89E]" />
              Últimas Evidências Ativas
            </h4>
            <span className="text-xs text-[#666]">Top 10 recentes</span>
          </div>
          <div className="p-0 flex-1 overflow-auto max-h-[310px]">
            {latestPhotos.length === 0 ? (
              <p className="text-sm text-[#999] text-center py-8">Nenhuma evidência recente armazenada.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-white sticky top-0 shadow-sm">
                  <tr className="text-left text-xs text-[#666] border-b border-[#E5E5E5]">
                    <th className="px-4 py-3 font-medium">Data</th>
                    <th className="px-4 py-3 font-medium">Colaborador</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0F0]">
                  {latestPhotos.map(photo => (
                    <tr key={photo.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-[#1A1A1A] whitespace-nowrap">
                        {format(parseISO(photo.createdAt), 'dd/MM/yyyy HH:mm')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-[#1A1A1A] font-medium truncate max-w-[150px]">{photo.fullName}</span>
                          <span className="text-[10px] text-[#999]">{photo.punchType}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium flex items-center gap-1 w-max px-2 py-0.5 rounded-md ${
                          photo.status === 'uploaded' ? 'bg-green-50 text-green-700 border border-green-200' :
                          photo.status === 'removed' ? 'bg-gray-100 text-gray-600 border border-gray-200' :
                          photo.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {photo.status === 'uploaded' && <CheckCircle className="w-3 h-3" />}
                          {photo.status === 'removed' && <Trash2 className="w-3 h-3" />}
                          {photo.status === 'pending' && <Clock className="w-3 h-3" />}
                          {photo.status === 'failed' && <XCircle className="w-3 h-3" />}
                          {photo.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Local Storage */}
        <div className="bg-white border border-[#E5E5E5] rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#E5E5E5] bg-gray-50 flex justify-between items-center">
            <h4 className="font-semibold text-[#1B325F] flex items-center gap-2">
              <HardDriveDownload className="w-4 h-4 text-[#13A89E]" />
              Dados Locais do Navegador
            </h4>
            <span className="text-xs font-bold bg-[#13A89E]/10 text-[#13A89E] px-2 py-1 rounded-lg">
              {formatBytes(localData.totalBytes)}
            </span>
          </div>
          <div className="p-4 flex-1 overflow-auto max-h-[310px]">
            <p className="text-xs text-[#666] mb-3">
              Este painel reflete o armazenamento do seu dispositivo atual. A limpeza exclui fotos de perfil base64 sem afetar os dados reais no servidor.
            </p>
            {localData.items.length === 0 ? (
              <p className="text-sm text-[#999] text-center py-4">Nenhum dado local encontrado.</p>
            ) : (
              <table className="w-full text-sm mb-4">
                <thead>
                  <tr className="text-left text-xs text-[#666] border-b border-[#E5E5E5]">
                    <th className="pb-2 font-medium">Chave (Tipo)</th>
                    <th className="pb-2 font-medium text-right">Tamanho</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0F0]">
                  {localData.items.map(item => (
                    <tr key={item.key}>
                      <td className="py-2 flex flex-col">
                        <span className="text-[#1A1A1A] font-medium max-w-[200px] truncate" title={item.key}>{item.key}</span>
                        <span className="text-[#666] text-[10px]">{item.type}</span>
                      </td>
                      <td className="py-2 text-right font-medium text-[#1B325F]">{formatBytes(item.sizeBytes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            
            <button
              onClick={handleClearLocal}
              className="w-full px-4 py-2 bg-white border border-[#E5E5E5] text-[#DC3545] rounded-lg text-xs font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Limpar Fotos de Perfil Locais
            </button>
          </div>
        </div>
      </div>

      {/* Cleanup Confirmation Modal */}
      {showCleanupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-red-50 p-6 flex flex-col items-center text-center border-b border-red-100">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-red-700">Limpeza de Evidências</h3>
              <p className="text-sm text-red-600 mt-2">
                Esta ação vai remover <strong className="text-red-800">{stats.totalCount}</strong> fotos do Storage, liberando aproximadamente <strong className="text-red-800">{formatBytes(stats.totalSizeBytes)}</strong>.
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg text-sm text-[#4A6478]">
                <ul className="list-disc pl-4 space-y-1">
                  <li>Os <strong>arquivos de imagem</strong> no Storage serão deletados.</li>
                  <li>Os arquivos <strong>NÃO</strong> poderão ser recuperados ou visualizados.</li>
                  <li>Os registros de <strong>ponto, horários, GPS e auditoria</strong> não serão afetados.</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1B325F] mb-1.5">
                  Digite <strong className="text-red-600">LIMPAR</strong> para confirmar:
                </label>
                <input
                  type="text"
                  value={cleanupConfirmText}
                  onChange={(e) => setCleanupConfirmText(e.target.value)}
                  placeholder="LIMPAR"
                  className="w-full h-11 px-4 bg-[#F8F9FA] border-[1.5px] border-[#E5E5E5] rounded-[10px] text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 uppercase"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCleanupModal(false)}
                  disabled={isCleaning}
                  className="flex-1 py-2.5 bg-white border border-[#E5E5E5] text-[#666666] rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCleanupSubmit}
                  disabled={cleanupConfirmText !== 'LIMPAR' || isCleaning}
                  className="flex-1 py-2.5 bg-[#DC3545] hover:bg-[#C82333] text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCleaning ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Confirmar Limpeza'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorageMonitoringPanel;

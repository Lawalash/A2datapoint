import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { alertsService } from '../../services/alertsService';
import type { ResolutionAction } from '../../types';
import { AlertTriangle, Clock, RefreshCw, CheckCircle, Coffee } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { AlertResolutionModal } from './AlertResolutionModal';

export const OperationalAlertsTab: React.FC = () => {
  const { addToast } = useToast();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [onLunch, setOnLunch] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const data = await alertsService.getAlerts();
      setAlerts(data);
    } catch (e: any) {
      if (import.meta.env.DEV) {
        console.error('[ALERTS][LOAD_ERROR]', {
          message: e?.message,
          code: e?.code,
          details: e?.details,
          hint: e?.hint,
        });
      }
      addToast('Erro ao carregar sinalizações.', 'error');
    }
    // Busca almoço separadamente para não quebrar a tela inteira
    try {
      const lunchData = await alertsService.getEmployeesOnLunchRealtime();
      setOnLunch(lunchData);
    } catch (e: any) {
      if (import.meta.env.DEV) {
        console.error('[ALERTS][LUNCH_ERROR]', {
          message: e?.message,
          code: e?.code,
          details: e?.details,
          hint: e?.hint,
        });
      }
      // Não exibe toast — almoço vazio é aceitável
      setOnLunch([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleSyncAlerts = async () => {
    setSyncing(true);
    try {
      // Sync last 7 days for safety
      const today = new Date();
      const endStr = format(today, 'yyyy-MM-dd');
      const startStr = format(new Date(today.setDate(today.getDate() - 7)), 'yyyy-MM-dd');
      const count = await alertsService.generateAlertsFromSummaries(startStr, endStr);
      addToast(`${count} novos alertas gerados.`, 'success');
      await fetchAlerts();
    } catch (e) {
      console.error(e);
      addToast('Erro ao sincronizar alertas.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleOpenModal = (alert: any) => {
    setSelectedAlert(alert);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedAlert(null);
  };

  const handleResolve = async (action: ResolutionAction, minutes: number, justification: string) => {
    if (!selectedAlert) return;
    try {
      await alertsService.resolveAlert(selectedAlert.id, action, minutes, justification);
      addToast('Sinalização resolvida com sucesso!', 'success');
      handleCloseModal();
      fetchAlerts();
    } catch (e: any) {
      console.error(e);
      addToast(e.message || 'Erro ao resolver sinalização.', 'error');
    }
  };

  const hePendenteCount = alerts.filter(a => a.alert_type === 'unauthorized_overtime' && a.status === 'open').length;
  const pausaExcedidaCount = alerts.filter(a => a.alert_type === 'break_exceeded' && a.status === 'open').length;
  const onLunchCount = onLunch.length;
  const resolvedCount = alerts.filter(a => a.status === 'resolved' || a.status === 'partially_resolved' || a.status === 'dismissed').length;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E5E5E5] flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-[#D9822B]/10 p-2 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-[#D9822B]" />
            </div>
            <span className="text-sm font-semibold text-[#666]">HE Indevida</span>
          </div>
          <div className="text-2xl font-bold text-[#1A1A1A]">{hePendenteCount} pendentes</div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E5E5E5] flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-[#DC3545]/10 p-2 rounded-lg">
              <Clock className="w-5 h-5 text-[#DC3545]" />
            </div>
            <span className="text-sm font-semibold text-[#666]">Pausas Excedidas</span>
          </div>
          <div className="text-2xl font-bold text-[#1A1A1A]">{pausaExcedidaCount} pendentes</div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E5E5E5] flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-[#13A89E]/10 p-2 rounded-lg">
              <Coffee className="w-5 h-5 text-[#13A89E]" />
            </div>
            <span className="text-sm font-semibold text-[#666]">Em Almoço</span>
          </div>
          <div className="text-2xl font-bold text-[#1A1A1A]">{onLunchCount} agora</div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E5E5E5] flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-[#28A745]/10 p-2 rounded-lg">
              <CheckCircle className="w-5 h-5 text-[#28A745]" />
            </div>
            <span className="text-sm font-semibold text-[#666]">Resolvidas</span>
          </div>
          <div className="text-2xl font-bold text-[#1A1A1A]">{resolvedCount} total</div>
        </div>
      </div>

      {/* Almoço Agora (se tiver gente) */}
      {onLunchCount > 0 && (
        <div className="bg-[#F8F9FA] rounded-2xl p-4 border border-[#E5E5E5]">
          <h3 className="font-bold text-[#003D5C] mb-3 flex items-center gap-2"><Coffee className="w-4 h-4"/> Colaboradores em Pausa/Almoço</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {onLunch.map(l => (
              <div key={l.employee.id} className="bg-white p-3 rounded-xl border border-[#E5E5E5] flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-[#1A1A1A]">{l.employee.full_name}</p>
                  <p className="text-xs text-[#666]">Saída: {l.outTime.substring(0,5)} | Previsto: {l.breakExpected}m</p>
                </div>
                <div className={`px-2 py-1 rounded-lg text-xs font-bold ${l.exceeded ? 'bg-[#DC3545]/10 text-[#DC3545]' : 'bg-[#13A89E]/10 text-[#13A89E]'}`}>
                  {l.diffMinutes} min
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabela de Sinalizações */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5E5] overflow-hidden">
        <div className="p-4 border-b border-[#E5E5E5] flex justify-between items-center bg-[#F8F9FA]">
          <h3 className="font-bold text-[#003D5C]">Auditoria e Sinalizações</h3>
          <button
            onClick={handleSyncAlerts}
            disabled={syncing}
            className="flex items-center gap-2 bg-[#003D5C] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:bg-[#002B42] disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} /> Sincronizar
          </button>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-[#666]">Carregando...</div>
        ) : alerts.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center">
            <CheckCircle className="w-12 h-12 text-[#28A745] mb-2" />
            <p className="text-[#666] font-medium">Nenhuma sinalização encontrada no momento.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-[#E5E5E5] text-xs font-semibold text-[#666666] uppercase tracking-wider">
                  <th className="p-4">Data</th>
                  <th className="p-4">Colaborador</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4">Detalhe</th>
                  <th className="p-4">Minutos</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {alerts.map(a => (
                  <tr key={a.id} className="hover:bg-[#F8F9FA] transition-colors">
                    <td className="p-4 text-sm font-medium text-[#1A1A1A]">{format(parseISO(a.alert_date), 'dd/MM/yyyy')}</td>
                    <td className="p-4 text-sm text-[#1A1A1A]">
                      <span className="font-medium">{a.employee?.full_name}</span>
                      <span className="block text-xs text-[#666]">Mat: {a.employee?.matricula}</span>
                    </td>
                    <td className="p-4 text-sm">
                      {a.alert_type === 'unauthorized_overtime' ? (
                        <span className="px-2 py-1 rounded bg-[#D9822B]/10 text-[#D9822B] text-xs font-bold">HE Indevida</span>
                      ) : a.alert_type === 'break_exceeded' ? (
                        <span className="px-2 py-1 rounded bg-[#DC3545]/10 text-[#DC3545] text-xs font-bold">Pausa Excedida</span>
                      ) : (
                        <span className="px-2 py-1 rounded bg-[#E5E5E5] text-[#666] text-xs font-bold">{a.alert_type}</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-[#666] max-w-xs truncate" title={a.admin_notes || ''}>
                      {a.alert_type === 'unauthorized_overtime' && 'Hora extra sem autorização prévia'}
                      {a.alert_type === 'break_exceeded' && `Pausa real excedeu o previsto em ${a.detected_minutes}m`}
                    </td>
                    <td className="p-4 text-sm font-bold text-[#1A1A1A]">{a.detected_minutes} min</td>
                    <td className="p-4 text-sm">
                      {a.status === 'open' ? (
                        <span className="text-[#D9822B] font-bold">Pendente</span>
                      ) : (
                        <span className="text-[#28A745] font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3"/> {a.status === 'partially_resolved' ? 'Parcial' : 'Resolvido'}</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleOpenModal(a)}
                        className="bg-[#003D5C]/10 text-[#003D5C] px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:bg-[#003D5C]/20"
                      >
                        {a.status === 'open' ? 'Resolver' : 'Ver Detalhes'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && selectedAlert && (
        <AlertResolutionModal
          alert={selectedAlert}
          onClose={handleCloseModal}
          onResolve={handleResolve}
        />
      )}
    </div>
  );
};

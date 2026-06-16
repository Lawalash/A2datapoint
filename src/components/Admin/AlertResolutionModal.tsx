import React, { useState } from 'react';
import type { ResolutionAction } from '../../types';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Props {
  alert: any;
  onClose: () => void;
  onResolve: (action: ResolutionAction, minutes: number, justification: string) => void;
}

export const AlertResolutionModal: React.FC<Props> = ({ alert: alertData, onClose, onResolve }) => {
  const isHeIndevida = alertData.alert_type === 'unauthorized_overtime';
  const isClosed = alertData.status !== 'open';

  const [action, setAction] = useState<ResolutionAction>(isHeIndevida ? 'approved' : 'acknowledged');
  const [minutes, setMinutes] = useState(alertData.detected_minutes.toString());
  const [justification, setJustification] = useState(alertData.admin_notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isClosed) return onClose();
    if (!justification.trim() || justification.length < 5) {
      window.alert('Por favor, insira uma justificativa de pelo menos 5 caracteres.');
      return;
    }
    let minsToResolve = parseInt(minutes, 10) || 0;
    if (minsToResolve > alertData.detected_minutes) {
      window.alert(`Não é possível regularizar mais do que ${alertData.detected_minutes} minutos.`);
      return;
    }
    
    // Se a ação for dismiss ou warn ou ack, minutos validados são 0
    if (action === 'dismissed' || action === 'warned' || action === 'acknowledged') {
      minsToResolve = 0;
    }

    // Se aprovado mas minutos < detected, vira partially_approved
    let finalAction = action;
    if (action === 'approved' && minsToResolve < alertData.detected_minutes) {
      finalAction = 'partially_approved';
    }

    onResolve(finalAction, minsToResolve, justification);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-[#E5E5E5] flex items-center justify-between bg-[#F8F9FA]">
          <h2 className="text-lg font-bold text-[#003D5C] flex items-center gap-2">
            {isClosed ? <CheckCircle className="w-5 h-5 text-[#28A745]"/> : <AlertTriangle className="w-5 h-5 text-[#D9822B]"/>}
            {isClosed ? 'Detalhes da Sinalização' : 'Resolver Sinalização'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-[#E5E5E5] rounded-full transition-colors">
            <X className="w-5 h-5 text-[#666]" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="bg-[#F8F9FA] p-4 rounded-xl border border-[#E5E5E5] mb-6">
            <p className="text-sm font-semibold text-[#1A1A1A] mb-1">Resumo do Alerta</p>
            <div className="grid grid-cols-2 gap-2 text-sm text-[#666]">
              <p>Colaborador: <span className="font-medium text-[#1A1A1A]">{alertData.employee?.full_name}</span></p>
              <p>Matrícula: <span className="font-medium text-[#1A1A1A]">{alertData.employee?.matricula}</span></p>
              <p>Data: <span className="font-medium text-[#1A1A1A]">{format(parseISO(alertData.alert_date), 'dd/MM/yyyy')}</span></p>
              <p>Detectado: <span className="font-bold text-[#DC3545]">{alertData.detected_minutes} minutos</span></p>
            </div>
            {alertData.summary && (
              <div className="mt-3 pt-3 border-t border-[#E5E5E5] text-xs text-[#666]">
                <p>Previsto: {alertData.summary.expected_minutes}m | Trabalhado: {alertData.summary.worked_minutes}m | Pausa Real: {alertData.summary.break_minutes}m</p>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isClosed && (
              <div className="bg-[#E5E5E5]/30 p-4 rounded-xl mb-4 text-sm">
                <p><strong>Ação tomada:</strong> {alertData.resolution_action}</p>
                <p><strong>Minutos regularizados:</strong> {alertData.regularized_minutes}</p>
                <p><strong>Justificativa admin:</strong> {alertData.admin_notes}</p>
              </div>
            )}

            {!isClosed && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-[#666] mb-2">Ação Administrativa</label>
                  <select
                    value={action}
                    onChange={(e) => setAction(e.target.value as ResolutionAction)}
                    className="w-full border border-[#E5E5E5] rounded-xl px-4 py-2 bg-[#F8F9FA] focus:border-[#003D5C] outline-none transition-all"
                  >
                    {isHeIndevida ? (
                      <>
                        <option value="approved">Regularizar HE (Crédito Total/Parcial)</option>
                        <option value="warned">Manter como Indevida e Advertir/Orientar</option>
                        <option value="acknowledged">Apenas Marcar como Ciente</option>
                      </>
                    ) : (
                      <>
                        <option value="acknowledged">Marcar como Ciente</option>
                        <option value="warned">Registrar Advertência/Orientação</option>
                      </>
                    )}
                  </select>
                </div>

                {isHeIndevida && action === 'approved' && (
                  <div>
                    <label className="block text-sm font-semibold text-[#666] mb-2">Minutos a Regularizar</label>
                    <input
                      type="number"
                      max={alertData.detected_minutes}
                      min={0}
                      value={minutes}
                      onChange={e => setMinutes(e.target.value)}
                      className="w-full border border-[#E5E5E5] rounded-xl px-4 py-2 focus:border-[#003D5C] outline-none transition-all"
                    />
                    <p className="text-xs text-[#666] mt-1">Isso será creditado no banco de horas e o status do dia será atualizado.</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-[#666] mb-2">Justificativa da Auditoria</label>
                  <textarea
                    required
                    value={justification}
                    onChange={e => setJustification(e.target.value)}
                    rows={3}
                    placeholder="Descreva o motivo desta ação administrativa..."
                    className="w-full border border-[#E5E5E5] rounded-xl px-4 py-2 focus:border-[#003D5C] outline-none transition-all resize-none"
                  />
                </div>
              </>
            )}

            <div className="pt-4 border-t border-[#E5E5E5] flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-[#E5E5E5] rounded-xl text-[#666] font-semibold hover:bg-[#F8F9FA] transition-all"
              >
                {isClosed ? 'Fechar' : 'Cancelar'}
              </button>
              {!isClosed && (
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#003D5C] text-white rounded-xl font-semibold hover:bg-[#002B42] transition-all shadow-md"
                >
                  Confirmar Resolução
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

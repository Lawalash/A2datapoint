import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, Loader2, AlertCircle } from 'lucide-react';
import { adminAttendanceService } from '../../services/adminAttendanceService';
import { format, parseISO } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  employeeMatricula: string;
  serverDate: string;
  scheduleId?: string;
  // Punches
  punchIn?: string | null;
  punchLunchOut?: string | null;
  punchLunchReturn?: string | null;
  punchOut?: string | null;
  extraBreaks: number;
  records?: any[];
}

const ScheduleDetailsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  employeeMatricula,
  serverDate,
  scheduleId,
  punchIn,
  punchOut,
  records
}) => {
  const [schedule, setSchedule] = useState<any>(null);
  const [dailySummary, setDailySummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    let mounted = true;
    const fetchSchedule = async () => {
      if (!isOpen || !(user as any)?.originalEmployee?.organization_id) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const data = await adminAttendanceService.getScheduleDetailsForAttendanceDay(
          (user as any).originalEmployee.organization_id,
          employeeId,
          serverDate,
          scheduleId
        );

        // Fetch daily summary para ver as notes (HE)
        const { data: sumData } = await supabase
          .from('attendance_daily_summaries')
          .select('notes')
          .eq('employee_id', employeeId)
          .eq('server_date', serverDate)
          .is('deleted_at', null)
          .maybeSingle();

        if (mounted) {
          if (sumData) setDailySummary(sumData);
          if (data) {
            setSchedule(data);
          } else {
            setError('Nenhuma escala encontrada para este colaborador nesta data.');
          }
        }
      } catch (err: any) {
        if (import.meta.env.DEV) {
          console.error('[DEV] getScheduleDetailsForAttendanceDay error:', err);
        }
        if (mounted) {
          setError('Não foi possível carregar a escala. Tente novamente.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchSchedule();

    return () => {
      mounted = false;
      setSchedule(null);
      setDailySummary(null);
      setError(null);
    };
  }, [isOpen, employeeId, serverDate, scheduleId, user]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-[#003D5C]/40 backdrop-blur-sm flex justify-center items-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-[#F8F9FA] border-b border-[#E5E5E5] flex justify-between items-center shrink-0">
            <div>
              <h2 className="text-xl font-bold text-[#003D5C] flex items-center gap-2">
                <Calendar className="w-5 h-5" /> Escala do Colaborador
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-white hover:bg-[#E5E5E5] text-[#A0A0A0] hover:text-[#003D5C] rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[70vh]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-[#7C9DB5]">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <p className="font-medium">Buscando escala...</p>
              </div>
            ) : error ? (
              <div className="bg-[#DC3545]/10 text-[#DC3545] p-6 rounded-xl text-center border border-[#DC3545]/20">
                <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-80" />
                <p className="text-sm font-semibold">{error}</p>
              </div>
            ) : schedule ? (
              <div className="space-y-6">
                {/* Bloco 1 - Identificação */}
                <div className="bg-[#F8F9FA] p-4 rounded-xl border border-[#E5E5E5]">
                  <p className="text-xs font-semibold text-[#666666] uppercase mb-2">Identificação</p>
                  <p className="text-base font-bold text-[#1A1A1A]">{employeeName}</p>
                  <div className="flex gap-4 mt-1 text-sm text-[#666666]">
                    <p>Matrícula: <span className="font-semibold text-[#1A1A1A]">{employeeMatricula}</span></p>
                    <p>Data: <span className="font-semibold text-[#1A1A1A]">{format(parseISO(serverDate), 'dd/MM/yyyy')}</span></p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Bloco 2 - Escala Prevista */}
                  <div className="bg-white border-2 border-[#E5E5E5] p-4 rounded-xl">
                    <p className="text-xs font-semibold text-[#003D5C] uppercase mb-3 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" /> Escala Prevista
                    </p>
                    <p className="font-bold text-[#1A1A1A] mb-3 text-sm">
                       {schedule.name}
                       {schedule.crosses_midnight && (
                         <span className="inline-block ml-2 text-[10px] font-semibold bg-[#6F42C1]/10 text-[#6F42C1] px-2 py-0.5 rounded-full whitespace-nowrap align-middle">
                           Cruza meia-noite
                         </span>
                       )}
                    </p>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#666666]">Entrada:</span>
                        <span className="font-semibold text-[#1A1A1A]">{schedule.work_start_time?.substring(0,5) || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#666666]">Saída:</span>
                        <span className="font-semibold text-[#1A1A1A]">
                           {schedule.work_end_time?.substring(0,5) || '-'}
                           {schedule.crosses_midnight && <span className="text-[10px] font-normal text-[#666] ml-1">(dia seguinte)</span>}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-[#E5E5E5] flex justify-between">
                        <span className="text-[#666666]">Intervalo:</span>
                        <span className="font-semibold text-[#1A1A1A]">
                          {schedule.break_start_time?.substring(0,5) || '-'} às {schedule.break_end_time?.substring(0,5) || '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#666666]">Duração:</span>
                        <span className="font-semibold text-[#1A1A1A]">{schedule.break_duration_minutes} minutos</span>
                      </div>
                      {schedule.work_days && schedule.work_days.length > 0 && (
                        <div className="pt-2 mt-2 border-t border-[#E5E5E5]">
                          <span className="text-[#666666] block mb-1">Dias configurados:</span>
                          <div className="flex flex-wrap gap-1">
                            {schedule.work_days.map((d: string) => (
                              <span key={d} className="px-1.5 py-0.5 bg-[#F0F0F0] text-[#666666] rounded text-[10px] font-semibold uppercase">
                                {d.substring(0, 3)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bloco 3 - Ponto Batido */}
                  <div className="bg-[#F8FAFC] border-2 border-[#7C9DB5]/30 p-4 rounded-xl">
                    <p className="text-xs font-semibold text-[#003D5C] uppercase mb-3 flex items-center gap-1.5">
                      <Clock className="w-4 h-4" /> Ponto Realizado
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#666666]">Entrada real:</span>
                        <span className="font-bold text-[#1A1A1A]">{punchIn || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#666666]">Saída real:</span>
                        <span className="font-bold text-[#1A1A1A]">{punchOut || '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bloco Pausas Realizadas */}
                {schedule && (
                  <div className="bg-white border-2 border-[#E5E5E5] p-4 rounded-xl">
                    <p className="text-xs font-semibold text-[#003D5C] uppercase mb-3 flex items-center gap-1.5">
                      <Clock className="w-4 h-4" /> Pausas Realizadas
                    </p>
                    
                    {(() => {
                        const sortedRecords = [...(records || [])].sort((a, b) => new Date(a.punched_at || a.created_at).getTime() - new Date(b.punched_at || b.created_at).getTime());
                        
                        const pairs: { startStr: string, endStr: string, durationMin: number }[] = [];
                        let openBreak: Date | null = null;
                        let openBreakStr: string = '';
                        let totalConsumed = 0;
                        
                        const extractTimeStr = (r: any) => r.server_time ? r.server_time.substring(0, 5) : format(new Date(r.punched_at || r.created_at), 'HH:mm');

                        for (const r of sortedRecords) {
                          if (r.punch_type === 'SAIDA_ALMOCO') {
                            openBreak = new Date(r.punched_at || r.created_at);
                            openBreakStr = extractTimeStr(r);
                          } else if (r.punch_type === 'RETORNO_ALMOCO' && openBreak) {
                            const end = new Date(r.punched_at || r.created_at);
                            const endStr = extractTimeStr(r);
                            const durationMin = Math.floor((end.getTime() - openBreak.getTime()) / 60000);
                            pairs.push({ startStr: openBreakStr, endStr: endStr, durationMin });
                            totalConsumed += durationMin;
                            openBreak = null;
                          }
                        }
                        
                        let currentBreakMin = 0;
                        if (openBreak) {
                          const isToday = format(openBreak, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                          if (isToday) {
                            currentBreakMin = Math.floor((new Date().getTime() - openBreak.getTime()) / 60000);
                            totalConsumed += Math.max(0, currentBreakMin);
                          }
                        }
                        
                        // Calculate expected
                        let expectedMin = 0;
                        if (schedule.break_start_time && schedule.break_end_time) {
                          const parseTime = (t: string) => { const [h,m] = t.split(':').map(Number); return h*60+m; };
                          expectedMin = parseTime(schedule.break_end_time) - parseTime(schedule.break_start_time);
                          if (expectedMin < 0) expectedMin += 24*60;
                        } else {
                          expectedMin = schedule.break_duration_minutes || 0;
                        }
                        
                        const isExceeded = totalConsumed > expectedMin;
                        const remaining = Math.max(0, expectedMin - totalConsumed);
                        const exceeded = Math.max(0, totalConsumed - expectedMin);
                        
                        if (pairs.length === 0 && !openBreak) {
                          return (
                            <p className="text-sm text-[#666666] italic">
                              {expectedMin > 0 ? "Não houve pausas registradas." : "Intervalo não configurado para esta escala."}
                            </p>
                          );
                        }
                        
                        return (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              {pairs.map((p, i) => (
                                <div key={i} className="flex justify-between text-sm items-center border-b border-[#F0F0F0] pb-2 last:border-0 last:pb-0">
                                  <span className="text-[#666666]">{i + 1}. {p.startStr} às {p.endStr}</span>
                                  <span className="font-semibold text-[#1A1A1A]">{p.durationMin} min</span>
                                </div>
                              ))}
                              {openBreak && (
                                <div className="flex justify-between text-sm items-center border-b border-[#F0F0F0] pb-2 last:border-0 last:pb-0">
                                  <div className="flex flex-col">
                                    <span className="text-[#666666]">{pairs.length + 1}. {openBreakStr} em andamento</span>
                                    <span className="text-[10px] uppercase font-bold text-[#D9822B] mt-0.5">Pausa em andamento</span>
                                  </div>
                                  <span className="font-semibold text-[#1A1A1A]">{currentBreakMin > 0 ? `${currentBreakMin} min` : '-'}</span>
                                </div>
                              )}
                            </div>
                            
                            <div className={`p-3 rounded-lg border ${isExceeded ? 'bg-[#DC3545]/10 border-[#DC3545]/20' : 'bg-[#F8F9FA] border-[#E5E5E5]'}`}>
                              <p className="text-xs font-bold text-[#666666] uppercase mb-2">Resumo</p>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-[#666666]">Previsto:</span>
                                  <span className="font-semibold">{expectedMin} min</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-[#666666]">Consumido:</span>
                                  <span className="font-semibold">{totalConsumed} min</span>
                                </div>
                                {isExceeded ? (
                                  <div className="flex justify-between text-[#DC3545] font-bold">
                                    <span>Excedente:</span>
                                    <span>{exceeded} min</span>
                                  </div>
                                ) : (
                                  <div className="flex justify-between text-[#28A745] font-semibold">
                                    <span>Restante:</span>
                                    <span>{remaining} min</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                    })()}
                  </div>
                )}
                
                {/* Bloco 4 - Hora Extra (HE) */}
                {dailySummary?.notes && dailySummary.notes.includes('authorized_overtime_minutes') && (
                  <div className="bg-white border-2 border-[#E5E5E5] p-4 rounded-xl">
                    <p className="text-xs font-semibold text-[#003D5C] uppercase mb-3 flex items-center gap-1.5">
                      <Clock className="w-4 h-4" /> Hora Extra Avançada
                    </p>
                    {(() => {
                      try {
                        const heInfo = JSON.parse(dailySummary.notes);
                        const isMista = (heInfo.realized_overtime_minutes > 0 && heInfo.unauthorized_overtime_minutes > 0) || heInfo.overtime_status === 'mista';
                        return (
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-[#666666]">HE Autorizada:</span>
                              <span className="font-semibold text-[#1A1A1A]">{heInfo.authorized_overtime_minutes} min</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#666666]">HE Realizada:</span>
                              <span className="font-semibold text-[#28A745]">{heInfo.realized_overtime_minutes} min</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#666666]">HE Indevida:</span>
                              <span className="font-semibold text-[#DC3545]">{heInfo.unauthorized_overtime_minutes} min</span>
                            </div>
                            <div className="pt-2 border-t border-[#E5E5E5] flex justify-between">
                              <span className="text-[#666666]">Status:</span>
                              <span className={`font-semibold ${heInfo.overtime_status === 'indevida' || isMista ? 'text-[#DC3545]' : 'text-[#1A1A1A] capitalize'}`}>
                                {isMista ? 'Autorizada + excedente indevido' : heInfo.overtime_status.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        );
                      } catch(e) { return null; }
                    })()}
                  </div>
                )}

                {/* Bloco 5 - Jornada Extra */}
                {records && (records.some(r => r.punch_type === 'ENTRADA_EXTRA') || records.some(r => r.punch_type === 'SAIDA_EXTRA')) && (
                  <div className="bg-[#8A2BE2]/10 border-2 border-[#8A2BE2]/20 p-4 rounded-xl">
                    <p className="text-xs font-semibold text-[#8A2BE2] uppercase mb-3 flex items-center gap-1.5">
                      <Clock className="w-4 h-4" /> Jornada Extra
                    </p>
                    {(() => {
                      const extraIn = records.find(r => r.punch_type === 'ENTRADA_EXTRA');
                      const extraOut = records.find(r => r.punch_type === 'SAIDA_EXTRA');
                      const extraInTime = extraIn ? format(new Date(extraIn.punched_at || extraIn.created_at), 'HH:mm') : '--:--';
                      const extraOutTime = extraOut ? format(new Date(extraOut.punched_at || extraOut.created_at), 'HH:mm') : '--:--';
                      
                      let extraMin = 0;
                      if (extraIn && extraOut) {
                        const inD = new Date(extraIn.punched_at || extraIn.created_at);
                        const outD = new Date(extraOut.punched_at || extraOut.created_at);
                        let eM = (outD.getHours() * 60 + outD.getMinutes()) - (inD.getHours() * 60 + inD.getMinutes());
                        if (eM < 0) eM += 24*60;
                        extraMin = eM;
                      }

                      return (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-[#666666]">Entrada Extra:</span>
                            <span className="font-semibold text-[#1A1A1A]">{extraInTime}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#666666]">Saída Extra:</span>
                            <span className="font-semibold text-[#1A1A1A]">{extraOutTime}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-[#8A2BE2]/10">
                            <span className="text-[#666666]">Tempo Realizado:</span>
                            <span className="font-semibold text-[#8A2BE2]">{extraMin} min</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Bloco 4 - Observação */}
                <div className="bg-[#E5E5E5]/50 p-3 rounded-lg text-xs text-[#666666] text-center italic">
                  Esta tela mostra a escala configurada para comparação direta com os registros de ponto batidos no dia.
                </div>
              </div>
            ) : null}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ScheduleDetailsModal;

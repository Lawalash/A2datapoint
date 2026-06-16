import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/context/ToastContext';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { Calendar, Plus, X, Users, Trash2, Edit2, Loader2, Info } from 'lucide-react';
import { useSchedules } from '@/hooks/useSchedules';
import { useEmployees } from '@/hooks/useEmployees';
import { calculateBreakDurationMinutes } from '@/utils/journeyCalculation';
import { calculateMonthlyScheduleSummary, doesScheduleCrossMidnight } from '@/utils/schedulePatternUtils';
import { format, startOfMonth, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AdminEscalas: React.FC = () => {
  const { addToast } = useToast();
  
  const { schedules, assignments, loading: loadingSchedules, createSchedule, updateSchedule, deactivateSchedule, reactivateSchedule, assignSchedule } = useSchedules();
  const { activeEmployees, loading: loadingEmployees } = useEmployees();
  
  const staff = activeEmployees.filter(e => e.role === 'Colaborador');

  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [escalaName, setEscalaName] = useState('Escala Padrão');
  const [scheduleType, setScheduleType] = useState('manual');
  const [cycleStartDate, setCycleStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [workDays, setWorkDays] = useState<Set<string>>(new Set(['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']));
  const [offDays, setOffDays] = useState<Set<string>>(new Set(['Sábado', 'Domingo']));
  const [timeStart, setTimeStart] = useState('08:00');
  const [timeEnd, setTimeEnd] = useState('17:00');
  const [breakStart, setBreakStart] = useState('12:00');
  const [breakEnd, setBreakEnd] = useState('13:00');

  const daysOfWeek = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

  const resetForm = () => {
    setEditingScheduleId(null);
    setEscalaName('Nova Escala');
    setScheduleType('manual');
    setCycleStartDate(format(new Date(), 'yyyy-MM-dd'));
    setSelectedUsers(new Set());
    setWorkDays(new Set(['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']));
    setOffDays(new Set(['Sábado', 'Domingo']));
    setTimeStart('08:00');
    setTimeEnd('17:00');
    setBreakStart('12:00');
    setBreakEnd('13:00');
  };

  const handleOpenNew = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (schedule: any) => {
    resetForm();
    setEditingScheduleId(schedule.id);
    setEscalaName(schedule.name || '');
    setScheduleType(schedule.schedule_type || 'manual');
    if (schedule.cycle_start_date) setCycleStartDate(schedule.cycle_start_date);
    setWorkDays(new Set(schedule.work_days || []));
    setOffDays(new Set(schedule.off_days || []));
    setTimeStart(schedule.work_start_time?.substring(0, 5) || '08:00');
    setTimeEnd(schedule.work_end_time?.substring(0, 5) || '17:00');
    if (schedule.break_start_time) setBreakStart(schedule.break_start_time.substring(0, 5));
    if (schedule.break_end_time) setBreakEnd(schedule.break_end_time.substring(0, 5));
    
    const assignedIds = assignments.filter(a => a.schedule_id === schedule.id).map(a => a.employee_id);
    setSelectedUsers(new Set(assignedIds));
    
    setShowModal(true);
  };

  const toggleUser = (id: string) => {
    const next = new Set(selectedUsers);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedUsers(next);
  };

  const toggleDay = (day: string) => {
    const next = new Set(workDays);
    if (next.has(day)) next.delete(day); else next.add(day);
    setWorkDays(next);
  };

  const toggleOffDay = (day: string) => {
    const next = new Set(offDays);
    if (next.has(day)) next.delete(day); else next.add(day);
    setOffDays(next);
  };

  const handleSave = async () => {
    if (!escalaName.trim()) { addToast('Nome da escala é obrigatório', 'error'); return; }
    if (scheduleType === 'manual' && workDays.size === 0) { addToast('Selecione os dias de trabalho', 'error'); return; }
    if (scheduleType !== 'manual' && !cycleStartDate) { addToast('A data inicial do ciclo é obrigatória para escalas automáticas', 'error'); return; }
    
    setIsSubmitting(true);
    try {
      const breakDuration = calculateBreakDurationMinutes(breakStart || null, breakEnd || null);
      
      let cycle_work_days = null;
      let cycle_rest_days = null;

      if (scheduleType === '12x36') { cycle_work_days = 1; cycle_rest_days = 1; }
      if (scheduleType === '5x2') { cycle_work_days = 5; cycle_rest_days = 2; }
      if (scheduleType === '6x1') { cycle_work_days = 6; cycle_rest_days = 1; }

      const crossesMidnight = doesScheduleCrossMidnight(timeStart, timeEnd);

      const payload = {
        name: escalaName,
        schedule_type: scheduleType,
        cycle_start_date: scheduleType !== 'manual' ? cycleStartDate : null,
        cycle_work_days: cycle_work_days,
        cycle_rest_days: cycle_rest_days,
        crosses_midnight: crossesMidnight,
        work_start_time: timeStart,
        work_end_time: timeEnd,
        break_start_time: breakStart || null,
        break_end_time: breakEnd || null,
        break_duration_minutes: breakDuration,
        work_days: scheduleType === 'manual' ? Array.from(workDays) : [],
        off_days: scheduleType === 'manual' ? Array.from(offDays) : [],
        is_active: true
      };

      let savedSchedule;
      if (editingScheduleId) {
        savedSchedule = await updateSchedule(editingScheduleId, payload);
      } else {
        savedSchedule = await createSchedule(payload);
      }

      await assignSchedule(savedSchedule.id, Array.from(selectedUsers));

      setShowModal(false);
    } catch (err) {
      console.error(err);
      addToast('Erro ao salvar escala', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (confirm('Tem certeza que deseja inativar esta escala? Ela deixará de estar disponível para novas atribuições, mas os históricos serão mantidos.')) {
      await deactivateSchedule(id);
    }
  };

  const handleReactivate = async (id: string) => {
    await reactivateSchedule(id);
  };

  const filteredSchedules = schedules.filter(s => {
    if (filter === 'active') return s.is_active;
    if (filter === 'inactive') return !s.is_active;
    return true;
  });

  const inputClass = "w-full h-11 px-4 bg-[#F8F9FA] border-[1.5px] border-[#E5E5E5] rounded-[10px] text-sm text-[#1A1A1A] outline-none focus:border-[#8BABC7]";

  // Virtual Calendar Builder
  const renderVirtualCalendar = () => {
    let cycleWorkDays = 1, cycleRestDays = 1;
    if (scheduleType === '5x2') { cycleWorkDays = 5; cycleRestDays = 2; }
    if (scheduleType === '6x1') { cycleWorkDays = 6; cycleRestDays = 1; }

    const previewSchedule = {
      schedule_type: scheduleType,
      cycle_start_date: scheduleType !== 'manual' ? cycleStartDate : null,
      cycle_work_days: cycleWorkDays,
      cycle_rest_days: cycleRestDays,
      work_start_time: timeStart,
      work_end_time: timeEnd,
      break_duration_minutes: calculateBreakDurationMinutes(breakStart || null, breakEnd || null),
      work_days: scheduleType === 'manual' ? Array.from(workDays) : [],
      off_days: scheduleType === 'manual' ? Array.from(offDays) : [],
    };

    const dateParam = new Date();
    const currentMonth = dateParam.getMonth() + 1;
    const currentYear = dateParam.getFullYear();

    const summary = calculateMonthlyScheduleSummary(previewSchedule, currentYear, currentMonth);
    const monthStart = startOfMonth(new Date(currentYear, currentMonth - 1));
    const startDayOfWeek = getDay(monthStart);

    return (
      <div className="mt-6 border border-[#E5E5E5] rounded-xl p-4 bg-white shadow-sm">
        <h4 className="text-sm font-semibold text-[#003D5C] mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4" /> Prévia do Calendário ({format(monthStart, 'MMMM/yyyy', { locale: ptBR })})
        </h4>
        
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="text-[10px] font-semibold text-[#666] uppercase">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="h-8 rounded bg-transparent" />
          ))}
          {summary.calendar.map((day, i) => {
            const dateNum = i + 1;
            let bgColor = 'bg-[#F8F9FA]';
            let textColor = 'text-[#666]';
            let crossDot = false;

            if (day.isWorkDay) {
              bgColor = 'bg-[#E6F3E6] border border-[#28A745]/30';
              textColor = 'text-[#28A745] font-bold';
              if (day.crossesMidnight) crossDot = true;
            } else {
              bgColor = 'bg-[#FFF0F0] border border-[#DC3545]/20';
              textColor = 'text-[#DC3545]';
            }

            return (
              <div key={day.date} className={`relative h-8 flex items-center justify-center rounded text-xs transition-all ${bgColor} ${textColor}`}>
                {dateNum}
                {crossDot && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#007BFF] rounded-full" title="Plantão cruza meia-noite" />}
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-[#E5E5E5] flex gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#28A745]"></div>
            <span className="text-[#666] font-medium">{summary.totalWorkDays} {scheduleType === 'manual' ? 'Dias Trabalhados' : 'Plantões'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#DC3545]"></div>
            <span className="text-[#666] font-medium">{summary.totalOffDays} Folgas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#007BFF]"></div>
            <span className="text-[#666] font-medium">Noturno</span>
          </div>
        </div>
      </div>
    );
  };

  if (loadingSchedules || loadingEmployees) {
    return (
      <AuthenticatedLayout requiredRole="Administrador" pageTitle="Gestão de Escalas">
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[#003D5C]" /></div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout requiredRole="Administrador" pageTitle="Gestão de Escalas">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="bg-white rounded-2xl shadow-sm p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#003D5C]/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[#003D5C]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#003D5C]">Escalas de Trabalho</h3>
              <p className="text-xs text-[#666666]">{filteredSchedules.length} escalas listadas</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="flex bg-gray-100 p-1 rounded-lg w-full sm:w-auto justify-center">
              <button onClick={() => setFilter('all')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'all' ? 'bg-white text-[#1B325F] shadow-sm' : 'text-[#7C9DB5] hover:text-[#1B325F]'}`}>Todas</button>
              <button onClick={() => setFilter('active')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'active' ? 'bg-white text-[#1B325F] shadow-sm' : 'text-[#7C9DB5] hover:text-[#1B325F]'}`}>Ativas</button>
              <button onClick={() => setFilter('inactive')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'inactive' ? 'bg-white text-[#1B325F] shadow-sm' : 'text-[#7C9DB5] hover:text-[#1B325F]'}`}>Inativas</button>
            </div>
            <motion.button whileTap={{ scale: 0.98 }} onClick={handleOpenNew}
              className="w-full sm:w-auto h-10 px-4 bg-[#003D5C] text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#004d75] transition-all cursor-pointer">
              <Plus className="w-4 h-4" /> Nova Escala
            </motion.button>
          </div>
        </div>

        {/* Current Scales Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8F9FA] text-[#003D5C] text-xs font-semibold uppercase border-b-2 border-[#E5E5E5]">
                <th className="text-left px-4 py-3">Nome da Escala</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Tipo</th>
                <th className="text-left px-4 py-3">Horário</th>
                <th className="text-left px-4 py-3">Padrão / Dias</th>
                <th className="text-left px-4 py-3">Colaboradores</th>
                <th className="text-right px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredSchedules.map(schedule => {
                const scheduleAssignments = assignments.filter(a => a.schedule_id === schedule.id);
                const isAuto = schedule.schedule_type && schedule.schedule_type !== 'manual';
                
                return (
                  <tr key={schedule.id} className="border-b border-[#F0F0F0] hover:bg-[#F8FAFC]">
                    <td className="px-4 py-4 text-[#1A1A1A] font-medium">{schedule.name}</td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide ${schedule.is_active ? 'bg-[#E6F3E6] text-[#28A745]' : 'bg-[#FFF3CD] text-[#856404]'}`}>
                        {schedule.is_active ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {isAuto ? (
                        <span className="text-xs font-semibold bg-[#EAEAEA] text-[#333] px-2 py-1 rounded">{schedule.schedule_type}</span>
                      ) : (
                        <span className="text-xs font-semibold text-[#666]">Manual</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="bg-[#E5E5E5]/50 text-[#1A1A1A] px-2 py-1 rounded text-xs font-mono font-medium inline-block w-fit">
                          {schedule.work_start_time?.substring(0,5)} - {schedule.work_end_time?.substring(0,5)}
                        </span>
                        {schedule.crosses_midnight && <span className="text-[10px] text-[#007BFF] font-bold">+1 dia</span>}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {isAuto ? (
                        <div className="text-xs text-[#666]">
                          <p>Início: {schedule.cycle_start_date ? format(new Date(schedule.cycle_start_date + 'T12:00:00'), 'dd/MM/yyyy') : '--'}</p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span className="text-[#666] text-xs">T: {schedule.work_days?.map((d:string)=>d.substring(0,3)).join(', ')}</span>
                          <span className="text-[#DC3545] text-xs">F: {schedule.off_days?.map((d:string)=>d.substring(0,3)).join(', ')}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex -space-x-2">
                        {scheduleAssignments.length > 0 ? (
                          <span className="text-xs font-semibold bg-[#E6F3E6] text-[#28A745] px-2 py-1 rounded-full">
                            {scheduleAssignments.length} vinculados
                          </span>
                        ) : (
                          <span className="text-xs text-[#999]">Nenhum</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {schedule.is_active && (
                          <button onClick={() => handleEdit(schedule)} title="Editar" className="p-2 text-[#7C9DB5] hover:text-[#003D5C] hover:bg-[#003D5C]/10 rounded-lg transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {schedule.is_active ? (
                          <button onClick={() => handleDeactivate(schedule.id)} title="Inativar Escala" className="p-2 text-[#DC3545] hover:bg-[#DC3545]/10 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <button onClick={() => handleReactivate(schedule.id)} title="Reativar Escala" className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors text-xs font-semibold px-3">
                            Reativar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredSchedules.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#999]">Nenhuma escala encontrada neste filtro.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* New Scale Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-[#003D5C]">{editingScheduleId ? 'Editar Escala' : 'Criar Nova Escala'}</h3>
                <button onClick={() => setShowModal(false)} className="text-[#666] hover:text-[#1A1A1A] cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Col */}
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-[#003D5C] mb-2">Nome da Escala</label>
                      <input type="text" value={escalaName} onChange={e => setEscalaName(e.target.value)} className={inputClass} placeholder="Ex: Plantão Diurno 12x36" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#003D5C] mb-2">Tipo de Escala</label>
                      <select value={scheduleType} onChange={e => setScheduleType(e.target.value)} className={inputClass}>
                        <option value="manual">Manual (Semanal)</option>
                        <option value="12x36">12x36</option>
                        <option value="5x2">5x2</option>
                        <option value="6x1">6x1</option>
                      </select>
                    </div>
                    {scheduleType !== 'manual' && (
                      <div>
                        <label className="block text-sm font-medium text-[#003D5C] mb-2" title="Data do primeiro plantão / início do ciclo">Data Início do Ciclo</label>
                        <input type="date" value={cycleStartDate} onChange={e => setCycleStartDate(e.target.value)} className={inputClass} />
                      </div>
                    )}
                  </div>

                  {scheduleType === 'manual' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-[#003D5C] mb-2">Dias de Trabalho</label>
                        <div className="flex flex-wrap gap-2">
                          {daysOfWeek.map(day => (
                            <button key={day} onClick={() => toggleDay(day)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                workDays.has(day) ? 'bg-[#003D5C] text-white border-[#003D5C]' : 'bg-white text-[#666] border-[#E5E5E5] hover:border-[#8BABC7]'
                              }`}>
                              {day.substring(0, 3)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[#003D5C] mb-2">Dias de Folga</label>
                        <div className="flex flex-wrap gap-2">
                          {daysOfWeek.map(day => (
                            <button key={day} onClick={() => toggleOffDay(day)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                offDays.has(day) ? 'bg-[#DC3545] text-white border-[#DC3545]' : 'bg-white text-[#666] border-[#E5E5E5] hover:border-[#DC3545]/50'
                              }`}>
                              {day.substring(0, 3)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#003D5C] mb-2">Entrada</label>
                      <input type="time" value={timeStart} onChange={e => setTimeStart(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#003D5C] mb-2">Saída</label>
                      <input type="time" value={timeEnd} onChange={e => setTimeEnd(e.target.value)} className={inputClass} />
                    </div>
                  </div>

                  {doesScheduleCrossMidnight(timeStart, timeEnd) && (
                    <div className="bg-[#E6F3FF] border border-[#007BFF]/30 p-3 rounded-xl flex items-start gap-2">
                      <Info className="w-4 h-4 text-[#007BFF] mt-0.5" />
                      <p className="text-xs text-[#0056b3]">O sistema reconheceu que este plantão cruza a meia-noite (termina no dia seguinte). A jornada será fechada corretamente.</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#003D5C] mb-2">Início Almoço (Opcional)</label>
                      <input type="time" value={breakStart} onChange={e => setBreakStart(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#003D5C] mb-2">Fim Almoço</label>
                      <input type="time" value={breakEnd} onChange={e => setBreakEnd(e.target.value)} className={inputClass} />
                    </div>
                  </div>

                  {renderVirtualCalendar()}
                </div>

                {/* Right Col: Users */}
                <div>
                  <label className="block text-sm font-medium text-[#003D5C] mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Atribuir a Colaboradores
                  </label>
                  <p className="text-xs text-[#666] mb-3">Ao atribuir, a escala anterior do colaborador será inativada.</p>
                  
                  <div className="border border-[#E5E5E5] rounded-xl p-2 h-[480px] overflow-y-auto bg-[#F8F9FA]">
                    {staff.length === 0 && (
                      <p className="text-sm text-[#999] text-center mt-8">Nenhum colaborador ativo encontrado.</p>
                    )}
                    {staff.map(u => {
                      const currentAssignment = assignments.find(a => a.employee_id === u.id);
                      const currentScheduleName = currentAssignment ? currentAssignment.work_schedules?.name : 'Nenhuma';
                      
                      return (
                        <label key={u.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white cursor-pointer transition-all border border-transparent hover:border-[#E5E5E5] hover:shadow-sm mb-1">
                          <input type="checkbox" checked={selectedUsers.has(u.id)} onChange={() => toggleUser(u.id)}
                            className="w-4 h-4 rounded border-[#E5E5E5] text-[#003D5C] focus:ring-[#003D5C]" />
                          <div>
                            <p className="text-sm font-semibold text-[#1A1A1A]">{u.full_name}</p>
                            <p className="text-[11px] text-[#666]">Matrícula: {u.matricula} • Atual: <span className="font-medium text-[#003D5C]">{currentScheduleName}</span></p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-[#E5E5E5]">
                <button onClick={() => setShowModal(false)} className="h-10 px-5 border border-[#E5E5E5] text-[#666] rounded-lg text-sm font-medium hover:bg-[#F8F9FA] transition-all cursor-pointer">
                  Cancelar
                </button>
                <motion.button 
                  whileTap={{ scale: 0.98 }} 
                  onClick={handleSave} 
                  disabled={isSubmitting}
                  className="h-10 px-6 bg-[#003D5C] text-white rounded-lg text-sm font-semibold hover:bg-[#004d75] transition-all cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Salvar e Atribuir Escala
                </motion.button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthenticatedLayout>
  );
};

export default AdminEscalas;

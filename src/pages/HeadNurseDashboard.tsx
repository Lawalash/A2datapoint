import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/context/ToastContext';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import KPICard from '@/components/KPICard';
import RiskSelector from '@/components/RiskSelector';
import {
  Activity, AlertTriangle, ClipboardList, Plus, RefreshCw, X, Calendar, TrendingUp, BarChart2
} from 'lucide-react';
import { mockClinicalRecords, mockPatients, riskColorMap } from '@/data/mockData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

const HeadNurseDashboard: React.FC = () => {
  const { addToast } = useToast();
  const [records, setRecords] = useState([...mockClinicalRecords]);
  const [filterDate, setFilterDate] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  
  // Patient Modal
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showProjection, setShowProjection] = useState(false);

  const filteredRecords = useMemo(() => {
    if (!filterDate) return records;
    const day = filterDate.split('-')[2];
    const month = filterDate.split('-')[1];
    const formattedFilter = `${day}/${month}`;
    return records.filter(r => r.dateTime.includes(formattedFilter));
  }, [records, filterDate]);

  const handleOpenPatientModal = (record: any) => {
    setSelectedPatient(record);
    setShowProjection(false);
    setShowPatientModal(true);
  };

  // Mock chart data
  const mockHistoryData = [
    { day: 'D-7', health: 65 },
    { day: 'D-6', health: 68 },
    { day: 'D-5', health: 60 },
    { day: 'D-4', health: 72 },
    { day: 'D-3', health: 75 },
    { day: 'D-2', health: 80 },
    { day: 'D-1', health: 85 },
    { day: 'Hoje', health: 88 },
  ];

  const mockProjectionData = [
    { day: 'Hoje', health: 88 },
    { day: 'D+1', health: 89 },
    { day: 'D+2', health: 91 },
    { day: 'D+3', health: 92 },
    { day: 'D+4', health: 94 },
    { day: 'D+5', health: 95 },
    { day: 'D+6', health: 97 },
    { day: 'D+7', health: 98 },
  ];

  // Modal form state
  const [formPatient, setFormPatient] = useState('');
  const [formPa, setFormPa] = useState('');
  const [formHgt, setFormHgt] = useState('');
  const [formFc, setFormFc] = useState('');
  const [formFr, setFormFr] = useState('');
  const [formSpo2, setFormSpo2] = useState('');
  const [formTemp, setFormTemp] = useState('');
  const [formRisk, setFormRisk] = useState('');
  const [formObs, setFormObs] = useState('');

  const handleNewRecord = () => {
    setShowModal(true);
  };

  const handleRefresh = () => {
    setRecords([...mockClinicalRecords]);
    addToast('Dados atualizados!', 'success');
  };

  const handleSaveRecord = () => {
    if (!formPatient || !formRisk) {
      addToast('Selecione paciente e classificação de risco', 'error');
      return;
    }
    const patient = mockPatients.find(p => p.id === formPatient);
    if (!patient) return;

    const now = new Date();
    const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const newRecord = {
      id: (mockClinicalRecords.length + 1).toString(),
      dateTime: dateStr,
      patientId: patient.id,
      patientName: patient.name,
      nurseName: 'Dra. Carla Mendes',
      pa: formPa || '-',
      hgt: formHgt ? parseInt(formHgt) : 0,
      fc: formFc ? parseInt(formFc) : 0,
      fr: formFr ? parseInt(formFr) : 0,
      spo2: formSpo2 ? parseInt(formSpo2) : 0,
      temp: formTemp ? parseFloat(formTemp) : 0,
      symptoms: ['Nenhum'],
      pain: 'Nenhuma',
      risk: formRisk,
      generalState: 'Lúcido',
      feeding: 'Aceitou bem as refeições',
      hygiene: [],
      eliminations: [],
      skinDressing: 'Não possui',
      observations: formObs || '',
    };

    mockClinicalRecords.unshift(newRecord);
    setRecords([...mockClinicalRecords]);
    setShowModal(false);
    resetForm();
    addToast('Registro clínico salvo com sucesso!', 'success');
  };

  const resetForm = () => {
    setFormPatient(''); setFormPa(''); setFormHgt(''); setFormFc('');
    setFormFr(''); setFormSpo2(''); setFormTemp(''); setFormRisk(''); setFormObs('');
  };

  const vitalInputClass = "w-full h-[48px] bg-[#F8F9FA] border-[1.5px] border-[#E5E5E5] rounded-[10px] text-center text-base font-semibold text-[#1A1A1A] focus:border-[#8BABC7] focus:ring-[3px] focus:ring-[#8BABC7]/25 outline-none transition-all placeholder:text-[#CCC]";

  return (
    <AuthenticatedLayout requiredRole="Enfermeira Chefe" pageTitle="Acompanhamento Clínico">
      {/* Header with action */}
      <div className="flex items-center justify-between mb-6">
        <div />
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleNewRecord}
          className="h-11 px-5 bg-[#003D5C] text-white rounded-[10px] text-sm font-semibold flex items-center gap-2 hover:bg-[#004d75] transition-all cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Registro
        </motion.button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KPICard label="Pacientes Monitorados Hoje" value="12" icon={Activity} color="#003D5C" delay={0} />
        <KPICard label="Alertas Pendentes" value="2" icon={AlertTriangle} color="#DC3545" delay={0.1} />
        <KPICard label="Registros do Turno" value={filteredRecords.length} icon={ClipboardList} color="#7C9DB5" delay={0.2} />
      </div>

      {/* Recent Records Table */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-[#003D5C]">
            Histórico de Aferições Recentes
            <span className="ml-2 bg-[#003D5C] text-white text-xs px-2 py-0.5 rounded-full">
              {filteredRecords.length}
            </span>
          </h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#F8F9FA] border border-[#E5E5E5] px-3 py-1.5 rounded-lg">
              <Calendar className="w-4 h-4 text-[#666666]" />
              <input 
                type="date"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="bg-transparent text-sm text-[#1A1A1A] outline-none"
              />
            </div>
            <button
              onClick={handleRefresh}
              className="p-2 text-[#8BABC7] hover:text-[#003D5C] hover:bg-[#F8F9FA] rounded-lg transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8F9FA] text-[#003D5C] text-xs font-semibold uppercase border-b-2 border-[#E5E5E5]">
                <th className="text-left px-4 py-3">Data/Hora</th>
                <th className="text-left px-4 py-3">Paciente</th>
                <th className="text-left px-4 py-3">Responsável</th>
                <th className="text-left px-4 py-3">PA</th>
                <th className="text-left px-4 py-3">HGT</th>
                <th className="text-left px-4 py-3">FC</th>
                <th className="text-left px-4 py-3">FR</th>
                <th className="text-left px-4 py-3">SpO2</th>
                <th className="text-left px-4 py-3">Temp</th>
                <th className="text-left px-4 py-3">Risco</th>
                <th className="text-left px-4 py-3">Evolução</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map(record => {
                const riskColors = riskColorMap[record.risk] || riskColorMap['Não Urgente'];
                const isPriority = record.risk === 'Urgente' || record.risk === 'Muito Urgente' || record.risk === 'Emergência';
                const patientAttends = filteredRecords.filter(r => r.patientName === record.patientName).length;
                return (
                  <motion.tr
                    key={record.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => handleOpenPatientModal(record)}
                    className={`border-b border-[#F0F0F0] hover:bg-[#F8FAFC] transition-colors cursor-pointer ${
                      isPriority ? 'border-l-[3px]' : ''
                    }`}
                    style={isPriority ? { borderLeftColor: riskColors.bg.match(/#[A-Fa-f0-9]{6,}/)?.[0] || '#DC3545' } : {}}
                  >
                    <td className="px-4 py-3 text-[#1A1A1A] whitespace-nowrap">{record.dateTime}</td>
                    <td className="px-4 py-3 font-medium text-[#1A1A1A]">
                      {record.patientName}
                      {patientAttends > 1 && (
                        <span className="ml-2 text-[10px] bg-[#003D5C]/10 text-[#003D5C] px-1.5 py-0.5 rounded font-semibold">
                          {patientAttends} aferições
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#666666]">{record.nurseName}</td>
                    <td className="px-4 py-3 text-[#1A1A1A]">{record.pa}</td>
                    <td className="px-4 py-3 text-[#1A1A1A]">{record.hgt}</td>
                    <td className="px-4 py-3 text-[#1A1A1A]">{record.fc}</td>
                    <td className="px-4 py-3 text-[#1A1A1A]">{record.fr}</td>
                    <td className="px-4 py-3 text-[#1A1A1A]">{record.spo2}%</td>
                    <td className="px-4 py-3 text-[#1A1A1A]">{record.temp}°C</td>
                    <td className="px-4 py-3">
                      <span className={`${riskColors.bg} ${riskColors.text} text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap`}>
                        {record.risk}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#666666] max-w-[200px] truncate">{record.observations}</td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#E5E5E5]">
          <p className="text-sm text-[#666666]">Mostrando {filteredRecords.length} registros</p>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 border border-[#E5E5E5] rounded-md text-sm text-[#666666] hover:bg-[#F8F9FA] transition-colors cursor-pointer disabled:opacity-50" disabled>
              Anterior
            </button>
            <button className="px-3 py-1.5 border border-[#E5E5E5] rounded-md text-sm text-[#666666] hover:bg-[#F8F9FA] transition-colors cursor-pointer disabled:opacity-50" disabled>
              Próximo
            </button>
          </div>
        </div>
      </div>

      {/* New Record Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-[#003D5C]">Novo Registro Clínico Rápido</h3>
                <button onClick={() => { setShowModal(false); resetForm(); }} className="text-[#666666] hover:text-[#1A1A1A] cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-5">
                {/* Patient Select */}
                <div>
                  <label className="block text-sm font-medium text-[#003D5C] mb-1.5">Paciente</label>
                  <Select value={formPatient} onValueChange={setFormPatient}>
                    <SelectTrigger className="h-11 bg-[#F8F9FA] border-[#E5E5E5] rounded-[10px]">
                      <SelectValue placeholder="Selecione o paciente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {mockPatients.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name} — Leito {p.bedNumber}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Vital Signs Grid */}
                <div>
                  <label className="block text-sm font-medium text-[#003D5C] mb-2">Sinais Vitais</label>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-[#666666] mb-1">PA (mmHg)</label>
                      <input type="text" placeholder="120x80" value={formPa} onChange={e => setFormPa(e.target.value)} className={vitalInputClass} />
                    </div>
                    <div>
                      <label className="block text-xs text-[#666666] mb-1">HGT (mg/dL)</label>
                      <input type="number" placeholder="100" value={formHgt} onChange={e => setFormHgt(e.target.value)} className={vitalInputClass} />
                    </div>
                    <div>
                      <label className="block text-xs text-[#666666] mb-1">FC (BPM)</label>
                      <input type="number" placeholder="75" value={formFc} onChange={e => setFormFc(e.target.value)} className={vitalInputClass} />
                    </div>
                    <div>
                      <label className="block text-xs text-[#666666] mb-1">FR (rpm)</label>
                      <input type="number" placeholder="16" value={formFr} onChange={e => setFormFr(e.target.value)} className={vitalInputClass} />
                    </div>
                    <div>
                      <label className="block text-xs text-[#666666] mb-1">SpO2 (%)</label>
                      <input type="number" placeholder="98" value={formSpo2} onChange={e => setFormSpo2(e.target.value)} className={vitalInputClass} />
                    </div>
                    <div>
                      <label className="block text-xs text-[#666666] mb-1">Temp (°C)</label>
                      <input type="number" step="0.1" placeholder="36.5" value={formTemp} onChange={e => setFormTemp(e.target.value)} className={vitalInputClass} />
                    </div>
                  </div>
                </div>

                {/* Risk Classification */}
                <div>
                  <label className="block text-sm font-medium text-[#003D5C] mb-2">Classificação de Risco</label>
                  <RiskSelector selected={formRisk} onChange={setFormRisk} />
                </div>

                {/* Observations */}
                <div>
                  <label className="block text-sm font-medium text-[#003D5C] mb-1.5">Observações Rápidas</label>
                  <textarea
                    value={formObs}
                    onChange={e => setFormObs(e.target.value)}
                    placeholder="Observações sobre o paciente..."
                    className="w-full min-h-[80px] p-3 bg-[#F8F9FA] border-[1.5px] border-[#E5E5E5] rounded-[10px] text-sm text-[#1A1A1A] placeholder:text-[#999] focus:border-[#8BABC7] focus:ring-[3px] focus:ring-[#8BABC7]/25 outline-none transition-all resize-vertical"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="h-10 px-5 border border-[#E5E5E5] text-[#666666] rounded-lg text-sm font-medium hover:bg-[#F8F9FA] transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSaveRecord}
                  className="h-10 px-5 bg-[#003D5C] text-white rounded-lg text-sm font-semibold hover:bg-[#004d75] transition-all cursor-pointer"
                >
                  Salvar Registro
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Patient Detail Modal */}
      <AnimatePresence>
        {showPatientModal && selectedPatient && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowPatientModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-6 overflow-y-auto max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-xl font-bold text-[#003D5C]">{selectedPatient.patientName}</h3>
                  <p className="text-sm text-[#666666]">Relatório Detalhado de Saúde</p>
                </div>
                <button onClick={() => setShowPatientModal(false)} className="text-[#666666] hover:text-[#1A1A1A] cursor-pointer bg-[#F8F9FA] p-2 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Banner */}
              <div className="bg-[#28A745]/10 border border-[#28A745]/20 rounded-xl p-4 flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#28A745]/20 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-[#28A745]" />
                  </div>
                  <div>
                    <h4 className="text-[#28A745] font-semibold">Status: Melhorando</h4>
                    <p className="text-sm text-[#666666]">O paciente apresentou evolução positiva nos últimos 7 dias.</p>
                  </div>
                </div>
                {!showProjection && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowProjection(true)}
                    className="px-4 py-2 bg-[#003D5C] text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-[#004d75] transition-colors"
                  >
                    Simular Próximos 7 Dias
                  </motion.button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Last 7 Days Chart */}
                <div className="bg-[#F8F9FA] rounded-xl p-4 border border-[#E5E5E5]">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart2 className="w-4 h-4 text-[#7C9DB5]" />
                    <h4 className="font-semibold text-[#1A1A1A] text-sm">Histórico (Últimos 7 dias)</h4>
                  </div>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={mockHistoryData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} />
                        <YAxis domain={[0, 100]} hide />
                        <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Line type="monotone" dataKey="health" name="Índice de Saúde" stroke="#7C9DB5" strokeWidth={3} dot={{ r: 4, fill: '#003D5C', strokeWidth: 2, stroke: '#fff' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Next 7 Days Projection Chart */}
                <div className="bg-[#F8F9FA] rounded-xl p-4 border border-[#E5E5E5] relative overflow-hidden">
                  {!showProjection && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-4 text-center">
                      <p className="text-sm font-medium text-[#1A1A1A] mb-2">Projeção Indisponível</p>
                      <p className="text-xs text-[#666666]">Clique no botão "Simular Próximos 7 Dias" para gerar o cenário.</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-[#28A745]" />
                    <h4 className="font-semibold text-[#1A1A1A] text-sm">Projeção (Próximos 7 dias)</h4>
                  </div>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={mockProjectionData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} />
                        <YAxis domain={[0, 100]} hide />
                        <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Line type="monotone" dataKey="health" name="Índice de Saúde (Proj.)" stroke="#28A745" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4, fill: '#28A745', strokeWidth: 2, stroke: '#fff' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-5 border-t border-[#E5E5E5]">
                <h4 className="font-semibold text-[#1A1A1A] text-sm mb-3">Última Aferição Detalhada</h4>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                  <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E5E5E5] text-center">
                    <p className="text-xs text-[#666666] mb-1">PA</p>
                    <p className="font-bold text-[#1A1A1A]">{selectedPatient.pa}</p>
                  </div>
                  <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E5E5E5] text-center">
                    <p className="text-xs text-[#666666] mb-1">FC</p>
                    <p className="font-bold text-[#1A1A1A]">{selectedPatient.fc}</p>
                  </div>
                  <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E5E5E5] text-center">
                    <p className="text-xs text-[#666666] mb-1">SpO2</p>
                    <p className="font-bold text-[#1A1A1A]">{selectedPatient.spo2}%</p>
                  </div>
                  <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E5E5E5] text-center">
                    <p className="text-xs text-[#666666] mb-1">Temp</p>
                    <p className="font-bold text-[#1A1A1A]">{selectedPatient.temp}°C</p>
                  </div>
                  <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E5E5E5] text-center col-span-2 sm:col-span-2">
                    <p className="text-xs text-[#666666] mb-1">Evolução</p>
                    <p className="text-xs text-[#1A1A1A] font-medium truncate">{selectedPatient.observations}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthenticatedLayout>
  );
};

export default HeadNurseDashboard;

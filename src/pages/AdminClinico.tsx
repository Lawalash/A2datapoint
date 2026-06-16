import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import KPICard from '@/components/KPICard';
import { Activity, AlertTriangle, ClipboardList, RefreshCw, Calendar, X, TrendingUp, BarChart2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { mockClinicalRecords, mockPatients, riskColorMap } from '@/data/mockData';
import { useToast } from '@/context/ToastContext';

const AdminClinico: React.FC = () => {
  const { addToast } = useToast();
  const [records, setRecords] = useState([...mockClinicalRecords]);
  const [filterDate, setFilterDate] = useState<string>('');
  
  // Modal states
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [showProjection, setShowProjection] = useState(false);

  const filteredRecords = useMemo(() => {
    if (!filterDate) return records;
    // Mock logic: compare the "DD/MM" or just return random subset, since mock date is "24/04/2026 14:30"
    // For mockup purposes, if date is picked, let's just filter by a string match or return all if we want.
    // Better to just filter by the day part if we can:
    const day = filterDate.split('-')[2];
    const month = filterDate.split('-')[1];
    const formattedFilter = `${day}/${month}`;
    return records.filter(r => r.dateTime.includes(formattedFilter));
  }, [records, filterDate]);

  const highRisk = filteredRecords.filter(
    r => r.risk === 'Urgente' || r.risk === 'Muito Urgente' || r.risk === 'Emergência'
  ).length;

  const handleRefresh = () => {
    setRecords([...mockClinicalRecords]);
    addToast('Dados atualizados!', 'success');
  };

  const handleOpenPatientModal = (record: any) => {
    setSelectedPatient(record);
    setShowProjection(false);
    setShowModal(true);
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

  return (
    <AuthenticatedLayout requiredRole="Administrador" pageTitle="Acompanhamento Clínico">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KPICard label="Pacientes Monitorados" value={mockPatients.length} icon={Activity} color="#003D5C" delay={0} />
        <KPICard label="Registros do Período" value={filteredRecords.length} icon={ClipboardList} color="#7C9DB5" delay={0.1} />
        <KPICard label="Alertas de Risco" value={highRisk} icon={AlertTriangle} color="#DC3545" delay={0.2} />
      </div>

      {/* Records Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white rounded-2xl shadow-sm p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-[#003D5C]">
            Histórico de Aferições
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
                
                // Count how many times this patient was attended in the filtered records
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
      </motion.div>

      {/* Patient Detail Modal */}
      <AnimatePresence>
        {showModal && selectedPatient && (
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
              className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-6 overflow-y-auto max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-xl font-bold text-[#003D5C]">{selectedPatient.patientName}</h3>
                  <p className="text-sm text-[#666666]">Relatório Detalhado de Saúde</p>
                </div>
                <button onClick={() => setShowModal(false)} className="text-[#666666] hover:text-[#1A1A1A] cursor-pointer bg-[#F8F9FA] p-2 rounded-full">
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

export default AdminClinico;

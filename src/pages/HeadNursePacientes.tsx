import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { mockPatients, mockClinicalRecords, diseaseColorMap, dependencyGradeMap } from '@/data/mockData';
import { Search, CheckCircle, ClipboardList, X, Activity } from 'lucide-react';

type AlaFilter = 'TODAS' | 'MASCULINA' | 'FEMININA';
type GrauFilter = 0 | 1 | 2 | 3;

const HeadNursePacientes: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [alaFilter, setAlaFilter] = useState<AlaFilter>('TODAS');
  const [grauFilter, setGrauFilter] = useState<GrauFilter>(0);
  const [selectedPatientDaily, setSelectedPatientDaily] = useState<any>(null);
  const [showDailyModal, setShowDailyModal] = useState(false);

  const todayStr = (() => {
    const now = new Date();
    return `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
  })();

  const getTodayRecords = (patientId: string) => {
    return mockClinicalRecords.filter(r =>
      r.patientId === patientId && r.dateTime.startsWith(todayStr)
    );
  };

  const getAla = (bedNumber: string): 'MASCULINA' | 'FEMININA' => {
    const prefix = bedNumber.charAt(0).toUpperCase();
    return prefix === 'C' ? 'FEMININA' : 'MASCULINA';
  };

  const filtered = mockPatients.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (alaFilter !== 'TODAS' && getAla(p.bedNumber) !== alaFilter) return false;
    if (grauFilter !== 0 && p.dependencyGrade !== grauFilter) return false;
    return true;
  });

  return (
    <AuthenticatedLayout requiredRole="Enfermeira Chefe" pageTitle="Pacientes">
      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white rounded-2xl shadow-sm p-4 sm:p-5 mb-6"
      >
        <div className="relative max-w-md mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8BABC7]" />
          <input
            type="text"
            placeholder="Buscar paciente por nome..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 bg-[#F8F9FA] border border-[#E5E5E5] rounded-lg text-sm focus:border-[#8BABC7] outline-none transition-all"
          />
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3 mb-3">
          <span className="text-sm text-[#666] self-center mr-1">Ala:</span>
          {(['TODAS', 'MASCULINA', 'FEMININA'] as AlaFilter[]).map(ala => (
            <button key={ala} onClick={() => setAlaFilter(ala)}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                alaFilter === ala ? 'bg-[#003D5C] text-white' : 'bg-[#F8F9FA] text-[#666] hover:bg-[#E5E5E5]'
              }`}>
              {ala === 'TODAS' ? 'Todas' : ala === 'MASCULINA' ? 'Ala Masculina (A/B)' : 'Ala Feminina (C)'}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <span className="text-sm text-[#666] self-center mr-1">Grau:</span>
          <button onClick={() => setGrauFilter(0)}
            className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              grauFilter === 0 ? 'bg-[#003D5C] text-white' : 'bg-[#F8F9FA] text-[#666] hover:bg-[#E5E5E5]'
            }`}>Todos</button>
          {[1, 2, 3].map(g => {
            const info = dependencyGradeMap[g];
            return (
              <button key={g} onClick={() => setGrauFilter(g as GrauFilter)}
                className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  grauFilter === g ? `${info.bg} ${info.text} ring-1 ring-current` : 'bg-[#F8F9FA] text-[#666] hover:bg-[#E5E5E5]'
                }`}>
                {info.label} — {info.tag}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Patient Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((patient) => {
          const todayRecords = getTodayRecords(patient.id);
          const gradeInfo = dependencyGradeMap[patient.dependencyGrade];
          return (
            <motion.div key={patient.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-white rounded-2xl shadow-sm p-5 flex flex-col relative">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-base font-semibold text-[#1A1A1A]">{patient.name}</h4>
                  <p className="text-xs text-[#666]">{patient.age} anos</p>
                </div>
                <span className="bg-[#003D5C]/10 text-[#003D5C] text-xs font-semibold px-2.5 py-1 rounded-md">{patient.bedNumber}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {patient.chronicDiseases.map(d => {
                  const colors = diseaseColorMap[d] || diseaseColorMap['Nenhum'];
                  return <span key={d} className={`${colors.bg} ${colors.text} text-[11px] font-medium px-2 py-0.5 rounded-full`}>{d}</span>;
                })}
              </div>
              <div className="mb-3">
                <span className={`${gradeInfo.bg} ${gradeInfo.text} text-[11px] font-semibold px-2.5 py-1 rounded-full`}>{gradeInfo.label} — {gradeInfo.tag}</span>
              </div>
              <div className="mb-4 flex items-center justify-between">
                {todayRecords.length > 0 ? (
                  <div className="flex items-center gap-1.5 bg-[#28A745]/10 px-2.5 py-1 rounded-md">
                    <CheckCircle className="w-4 h-4 text-[#28A745]" />
                    <span className="text-xs font-semibold text-[#28A745]">{todayRecords.length} {todayRecords.length === 1 ? 'aferição hoje' : 'aferições hoje'}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 bg-[#F8F9FA] px-2.5 py-1 rounded-md">
                    <ClipboardList className="w-4 h-4 text-[#999]" />
                    <span className="text-xs font-medium text-[#999]">Sem registro hoje</span>
                  </div>
                )}
              </div>
              <div className="mt-auto flex flex-col gap-2">
                {todayRecords.length > 0 && (
                  <motion.button 
                    whileTap={{ scale: 0.98 }} 
                    onClick={() => { setSelectedPatientDaily({ patient, records: todayRecords }); setShowDailyModal(true); }}
                    className="h-9 w-full border border-[#003D5C] text-[#003D5C] rounded-lg text-sm font-semibold hover:bg-[#003D5C] hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Activity className="w-4 h-4" /> Ver Aferições do Dia
                  </motion.button>
                )}
                <motion.button whileTap={{ scale: 0.98 }} onClick={() => navigate('/enfermeira-chefe')}
                  className="h-10 w-full bg-[#003D5C] text-white rounded-lg text-sm font-semibold hover:bg-[#004d75] transition-all cursor-pointer">
                  Novo Registro
                </motion.button>
              </div>
            </motion.div>
          );
        })}
        {filtered.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full bg-white rounded-2xl shadow-sm p-8 text-center">
            <p className="text-[#666]">Nenhum paciente encontrado com os filtros selecionados.</p>
          </motion.div>
        )}
      </div>

      {/* Daily Records Modal */}
      <AnimatePresence>
        {showDailyModal && selectedPatientDaily && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowDailyModal(false)}
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
                <div>
                  <h3 className="text-lg font-bold text-[#003D5C]">{selectedPatientDaily.patient.name}</h3>
                  <p className="text-sm text-[#666666]">Timeline de aferições — {todayStr}</p>
                </div>
                <button onClick={() => setShowDailyModal(false)} className="text-[#666666] hover:text-[#1A1A1A] cursor-pointer bg-[#F8F9FA] p-2 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[#E5E5E5] before:to-transparent">
                {selectedPatientDaily.records.map((record: any) => {
                  return (
                    <div key={record.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-[#7C9DB5] text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-[#F8F9FA] p-4 rounded-xl border border-[#E5E5E5] shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-[#003D5C]">{record.dateTime.split(' ')[1]}</span>
                          <span className="text-[10px] bg-white border border-[#E5E5E5] px-2 py-0.5 rounded font-medium text-[#666]">{record.risk}</span>
                        </div>
                        <p className="text-xs text-[#666] mb-2">Por {record.nurseName}</p>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                          <div className="bg-white p-1.5 rounded border border-[#E5E5E5] text-center"><span className="text-[#999]">PA:</span> <strong className="text-[#1A1A1A]">{record.pa}</strong></div>
                          <div className="bg-white p-1.5 rounded border border-[#E5E5E5] text-center"><span className="text-[#999]">FC:</span> <strong className="text-[#1A1A1A]">{record.fc}</strong></div>
                          <div className="bg-white p-1.5 rounded border border-[#E5E5E5] text-center"><span className="text-[#999]">SpO2:</span> <strong className="text-[#1A1A1A]">{record.spo2}%</strong></div>
                          <div className="bg-white p-1.5 rounded border border-[#E5E5E5] text-center"><span className="text-[#999]">Temp:</span> <strong className="text-[#1A1A1A]">{record.temp}°C</strong></div>
                        </div>
                        
                        <div className="bg-white p-2 rounded border border-[#E5E5E5]">
                          <span className="text-[10px] text-[#999] block mb-0.5">Evolução:</span>
                          <p className="text-xs text-[#1A1A1A] italic">"{record.observations}"</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthenticatedLayout>
  );
};

export default HeadNursePacientes;

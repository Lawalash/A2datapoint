import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import ChipSelector from '@/components/ChipSelector';
import RiskSelector from '@/components/RiskSelector';
import {
  Search, CheckCircle, ChevronRight, ChevronLeft
} from 'lucide-react';
import { mockPatients, diseaseColorMap } from '@/data/mockData';
import { useSearchParams } from 'react-router-dom';

const symptomOptions = ['Nenhum', 'Cefaleia', 'Diarreia', 'Distensão Abdominal', 'Febre', 'Vertigem', 'Emese', 'Náusea', 'Coriza/Tosse', 'Mialgia', 'Gastralgia', 'Otalgia', 'Disúria', 'Algia', 'Outra'];

const painOptions = ['Nenhuma', 'Leve', 'Moderada', 'Intensa'];
const painColorMap: Record<string, { bg: string; text: string; border: string }> = {
  'Nenhuma': { bg: 'bg-[#28A745]', text: 'text-white', border: 'border-[#28A745]' },
  'Leve': { bg: 'bg-[#17A2B8]', text: 'text-white', border: 'border-[#17A2B8]' },
  'Moderada': { bg: 'bg-[#F0AD4E]', text: 'text-white', border: 'border-[#F0AD4E]' },
  'Intensa': { bg: 'bg-[#DC3545]', text: 'text-white', border: 'border-[#DC3545]' },
};

const generalStateOptions = ['Lúcido', 'Confuso', 'Tardio', 'Agitado'];
const generalStateColorMap: Record<string, { bg: string; text: string; border: string }> = {
  'Lúcido': { bg: 'bg-[#28A745]', text: 'text-white', border: 'border-[#28A745]' },
  'Confuso': { bg: 'bg-[#F0AD4E]', text: 'text-white', border: 'border-[#F0AD4E]' },
  'Tardio': { bg: 'bg-[#F0AD4E]', text: 'text-white', border: 'border-[#F0AD4E]' },
  'Agitado': { bg: 'bg-[#DC3545]', text: 'text-white', border: 'border-[#DC3545]' },
};

const feedingOptions = ['Aceitou bem as refeições', 'Aceitação parcial', 'Recusou', 'Dieta Especial'];
const feedingColorMap: Record<string, { bg: string; text: string; border: string }> = {
  'Aceitou bem as refeições': { bg: 'bg-[#28A745]', text: 'text-white', border: 'border-[#28A745]' },
  'Aceitação parcial': { bg: 'bg-[#F0AD4E]', text: 'text-white', border: 'border-[#F0AD4E]' },
  'Recusou': { bg: 'bg-[#DC3545]', text: 'text-white', border: 'border-[#DC3545]' },
  'Dieta Especial': { bg: 'bg-[#17A2B8]', text: 'text-white', border: 'border-[#17A2B8]' },
};

const hygieneOptions = ['Banho realizado', 'Higiene íntima', 'Troca de fralda', 'Mudança de decúbito', 'Hidratação de pele'];
const eliminationOptions = ['Diurese', 'Evacuação', 'Constipação', 'Diarreia'];

const skinDressingOptions = ['Realizado', 'Não realizado', 'Não possui'];
const skinDressingColorMap: Record<string, { bg: string; text: string; border: string }> = {
  'Realizado': { bg: 'bg-[#28A745]', text: 'text-white', border: 'border-[#28A745]' },
  'Não realizado': { bg: 'bg-[#DC3545]', text: 'text-white', border: 'border-[#DC3545]' },
  'Não possui': { bg: 'bg-[#6C757D]', text: 'text-white', border: 'border-[#6C757D]' },
};

const NurseDashboard: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<typeof mockPatients[0] | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [currentBlock, setCurrentBlock] = useState(1);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Pre-select patient from URL query param
  useEffect(() => {
    const pacienteId = searchParams.get('pacienteId');
    if (pacienteId && !selectedPatient) {
      const patient = mockPatients.find(p => p.id === pacienteId);
      if (patient) {
        setSelectedPatient(patient);
        setSearchQuery(patient.name);
      }
    }
  }, [searchParams]);

  // Block 1 state
  const [pa, setPa] = useState('');
  const [hgt, setHgt] = useState('');
  const [fc, setFc] = useState('');
  const [fr, setFr] = useState('');
  const [spo2, setSpo2] = useState('');
  const [temp, setTemp] = useState('');
  const [symptoms, setSymptoms] = useState<string[]>(['Nenhum']);
  const [pain, setPain] = useState('Nenhuma');
  const [risk, setRisk] = useState('');

  // Block 2 state
  const [generalState, setGeneralState] = useState('');
  const [feeding, setFeeding] = useState('');
  const [hygiene, setHygiene] = useState<string[]>([]);
  const [eliminations, setEliminations] = useState<string[]>([]);
  const [skinDressing, setSkinDressing] = useState('');
  const [observations, setObservations] = useState('');

  const filteredPatients = searchQuery.length > 0
    ? mockPatients.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.bedNumber.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleSelectPatient = (patient: typeof mockPatients[0]) => {
    setSelectedPatient(patient);
    setSearchQuery(patient.name);
    setShowSearchResults(false);
  };

  const handleNext = () => {
    if (!risk) {
      addToast('Selecione a classificação de risco', 'error');
      return;
    }
    setCurrentBlock(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setCurrentBlock(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = () => {
    if (!generalState) {
      addToast('Selecione o estado geral', 'error');
      return;
    }
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        resetForm();
      }, 2500);
    }, 1000);
  };

  const resetForm = () => {
    setSelectedPatient(null);
    setSearchQuery('');
    setCurrentBlock(1);
    setPa(''); setHgt(''); setFc(''); setFr(''); setSpo2(''); setTemp('');
    setSymptoms(['Nenhum']); setPain('Nenhuma'); setRisk('');
    setGeneralState(''); setFeeding(''); setHygiene([]);
    setEliminations([]); setSkinDressing(''); setObservations('');
  };

  const vitalInputClass = "w-full h-[52px] bg-[#F8F9FA] border-[1.5px] border-[#E5E5E5] rounded-[10px] text-center text-lg font-semibold text-[#1A1A1A] focus:border-[#8BABC7] focus:ring-[3px] focus:ring-[#8BABC7]/25 outline-none transition-all placeholder:text-[#CCC]";

  return (
    <AuthenticatedLayout requiredRole="Enfermeiro" pageTitle="Novo Registro Clínico">
      {/* Success overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="w-28 h-28 bg-[#28A745] rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_8px_24px_rgba(40,167,69,0.4)]"
              >
                <CheckCircle className="w-14 h-14 text-white" />
              </motion.div>
              <h3 className="text-2xl font-bold text-white mb-2">Prontuário salvo com sucesso!</h3>
              <p className="text-white/80">Assinado digitalmente por {user?.displayName}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Patient Search Header */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
        <div className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8BABC7]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setShowSearchResults(e.target.value.length > 0);
              if (selectedPatient && e.target.value !== selectedPatient.name) {
                setSelectedPatient(null);
              }
            }}
            onFocus={() => searchQuery.length > 0 && setShowSearchResults(true)}
            placeholder="Buscar paciente por nome ou prontuário..."
            className="w-full h-[52px] pl-12 pr-4 bg-[#F8F9FA] border-[1.5px] border-[#E5E5E5] rounded-[10px] text-[15px] text-[#1A1A1A] placeholder:text-[#999] focus:border-[#8BABC7] focus:ring-[3px] focus:ring-[#8BABC7]/25 outline-none transition-all"
          />

          {/* Search dropdown */}
          <AnimatePresence>
            {showSearchResults && filteredPatients.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-[10px] shadow-lg border border-[#E5E5E5] z-20 overflow-hidden"
              >
                {filteredPatients.map(patient => (
                  <button
                    key={patient.id}
                    onClick={() => handleSelectPatient(patient)}
                    className="w-full text-left px-4 py-3 hover:bg-[#F8F9FA] transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#1A1A1A]">{patient.name}</p>
                      <p className="text-xs text-[#666666]">Leito {patient.bedNumber} · {patient.age} anos</p>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Patient info after selection */}
        <AnimatePresence>
          {selectedPatient && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-[#E5E5E5] overflow-hidden"
            >
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <p className="text-lg font-bold text-[#003D5C]">{selectedPatient.name}</p>
                  <p className="text-sm text-[#666666]">{selectedPatient.age} anos · Leito {selectedPatient.bedNumber}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-[#666666]">Doenças Crônicas:</span>
                  {selectedPatient.chronicDiseases.map(disease => {
                    const colors = diseaseColorMap[disease] || diseaseColorMap['Nenhum'];
                    return (
                      <span
                        key={disease}
                        className={`${colors.bg} ${colors.text} text-xs font-medium px-3 py-1 rounded-full`}
                      >
                        {disease}
                      </span>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Block 1: SSVV / Risk Classification */}
      <AnimatePresence mode="wait">
        {currentBlock === 1 && (
          <motion.div
            key="block1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl shadow-md p-6 lg:p-8 mb-6 border-t-4 border-t-[#003D5C]"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-[#003D5C]">
                Bloco 1 - Sinais Vitais e Classificação de Risco
              </h3>
              <span className="text-sm text-[#8BABC7] font-medium">1/2</span>
            </div>

            {/* Vital Signs Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              <div>
                <label className="block text-[13px] font-medium text-[#003D5C] mb-1.5">PA (mmHg)</label>
                <input type="text" placeholder="120x80" value={pa} onChange={e => setPa(e.target.value)} className={vitalInputClass} />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#003D5C] mb-1.5">HGT (mg/dL)</label>
                <input type="number" placeholder="100" value={hgt} onChange={e => setHgt(e.target.value)} className={vitalInputClass} />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#003D5C] mb-1.5">FC (BPM)</label>
                <input type="number" placeholder="75" value={fc} onChange={e => setFc(e.target.value)} className={vitalInputClass} />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#003D5C] mb-1.5">FR (rpm)</label>
                <input type="number" placeholder="16" value={fr} onChange={e => setFr(e.target.value)} className={vitalInputClass} />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#003D5C] mb-1.5">SpO2 (%)</label>
                <input type="number" placeholder="98" value={spo2} onChange={e => setSpo2(e.target.value)} className={vitalInputClass} />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#003D5C] mb-1.5">Temp (°C)</label>
                <input type="number" step="0.1" placeholder="36.5" value={temp} onChange={e => setTemp(e.target.value)} className={vitalInputClass} />
              </div>
            </div>

            {/* Symptoms */}
            <div className="mb-8">
              <h4 className="text-base font-semibold text-[#003D5C] mb-1">Sintomas</h4>
              <p className="text-[13px] text-[#666666] mb-3">Selecione todos os presentes</p>
              <ChipSelector
                options={symptomOptions}
                selected={symptoms}
                onChange={setSymptoms}
                multiSelect
              />
            </div>

            {/* Pain */}
            <div className="mb-8">
              <h4 className="text-base font-semibold text-[#003D5C] mb-3">Dor</h4>
              <ChipSelector
                options={painOptions}
                selected={pain}
                onChange={setPain}
                colorMap={painColorMap}
              />
            </div>

            {/* Risk Classification */}
            <div>
              <h4 className="text-base font-semibold text-[#003D5C] mb-3">Classificação de Risco</h4>
              <RiskSelector selected={risk} onChange={setRisk} />
            </div>
          </motion.div>
        )}

        {/* Block 2: Daily Record and Evolution */}
        {currentBlock === 2 && (
          <motion.div
            key="block2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl shadow-md p-6 lg:p-8 mb-6 border-t-4 border-t-[#7C9DB5]"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-[#003D5C]">
                Bloco 2 - Registro Diário e Evolução
              </h3>
              <span className="text-sm text-[#8BABC7] font-medium">2/2</span>
            </div>

            {/* General State */}
            <div className="mb-6">
              <h4 className="text-base font-semibold text-[#003D5C] mb-3">Estado Geral</h4>
              <ChipSelector
                options={generalStateOptions}
                selected={generalState}
                onChange={setGeneralState}
                colorMap={generalStateColorMap}
              />
            </div>

            {/* Feeding */}
            <div className="mb-6">
              <h4 className="text-base font-semibold text-[#003D5C] mb-3">Alimentação</h4>
              <ChipSelector
                options={feedingOptions}
                selected={feeding}
                onChange={setFeeding}
                colorMap={feedingColorMap}
              />
            </div>

            {/* Hygiene/Comfort */}
            <div className="mb-6">
              <h4 className="text-base font-semibold text-[#003D5C] mb-1">Higiene e Conforto</h4>
              <p className="text-[13px] text-[#666666] mb-3">Selecione todos os realizados</p>
              <ChipSelector
                options={hygieneOptions}
                selected={hygiene}
                onChange={setHygiene}
                multiSelect
              />
            </div>

            {/* Eliminations */}
            <div className="mb-6">
              <h4 className="text-base font-semibold text-[#003D5C] mb-1">Eliminações</h4>
              <p className="text-[13px] text-[#666666] mb-3">Selecione todos os presentes</p>
              <ChipSelector
                options={eliminationOptions}
                selected={eliminations}
                onChange={setEliminations}
                multiSelect
              />
            </div>

            {/* Skin/Dressing */}
            <div className="mb-6">
              <h4 className="text-base font-semibold text-[#003D5C] mb-3">Pele e Curativo</h4>
              <ChipSelector
                options={skinDressingOptions}
                selected={skinDressing}
                onChange={setSkinDressing}
                colorMap={skinDressingColorMap}
              />
            </div>

            {/* Final Observations */}
            <div>
              <h4 className="text-base font-semibold text-[#003D5C] mb-3">Observações Finais</h4>
              <textarea
                value={observations}
                onChange={e => setObservations(e.target.value)}
                placeholder="Descreva observações adicionais sobre o paciente neste turno..."
                className="w-full min-h-[120px] p-4 bg-[#F8F9FA] border-[1.5px] border-[#E5E5E5] rounded-[10px] text-[15px] text-[#1A1A1A] placeholder:text-[#999] focus:border-[#8BABC7] focus:ring-[3px] focus:ring-[#8BABC7]/25 outline-none transition-all resize-vertical"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Form Navigation */}
      <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-[#E5E5E5] px-6 lg:px-8 py-5 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] z-30 -mx-6 lg:-mx-8">
        <div className="flex items-center justify-between max-w-none">
          <div>
            {currentBlock === 2 && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleBack}
                className="h-12 px-5 border-[1.5px] border-[#E5E5E5] text-[#666666] rounded-[10px] text-sm font-medium flex items-center gap-2 hover:bg-[#F8F9FA] transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Voltar
              </motion.button>
            )}
          </div>

          <div>
            {currentBlock === 1 ? (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleNext}
                className="h-[52px] px-6 bg-[#003D5C] text-white rounded-[10px] text-sm font-semibold flex items-center gap-2 hover:bg-[#004d75] transition-all cursor-pointer shadow-sm"
              >
                Avançar para Bloco 2
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={saving}
                className="h-14 px-8 bg-[#28A745] text-white rounded-xl text-base font-semibold flex items-center gap-3 shadow-[0_4px_12px_rgba(40,167,69,0.3)] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-70 cursor-pointer"
              >
                {saving ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
                {saving ? 'Salvando...' : 'Salvar e Assinar Prontuário'}
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

export default NurseDashboard;

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/context/ToastContext';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import KPICard from '@/components/KPICard';
import ChipSelector from '@/components/ChipSelector';
import { BedDouble, Plus, Trash2, Search, X } from 'lucide-react';
import { mockPatients, mockDischarges, diseaseColorMap } from '@/data/mockData';

const diseaseOptions = ['Diabetes', 'Hipertensão', 'Demência', 'Metástase', 'Nenhum'];

const AdminPacientes: React.FC = () => {
  const { addToast } = useToast();
  const [patients, setPatients] = useState([...mockPatients]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState('');
  const [newBed, setNewBed] = useState('');
  const [newDiseases, setNewDiseases] = useState<string[]>(['Nenhum']);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [patientToRemove, setPatientToRemove] = useState<{id: string, name: string} | null>(null);
  const [removeReason, setRemoveReason] = useState<'Óbito' | 'Transferência' | 'Alta' | 'Outros'>('Óbito');

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.bedNumber.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = () => {
    if (!newName || !newAge || !newBed) {
      addToast('Preencha todos os campos obrigatórios', 'error');
      return;
    }
    const newPatient = {
      id: (patients.length + 1).toString(),
      name: newName,
      age: parseInt(newAge),
      bedNumber: newBed,
      chronicDiseases: newDiseases,
      dependencyGrade: 1 as const,
    };
    const updated = [...patients, newPatient];
    setPatients(updated);
    // Sync to global mock
    mockPatients.push(newPatient);
    setShowModal(false);
    setNewName(''); setNewAge(''); setNewBed(''); setNewDiseases(['Nenhum']);
    addToast(`Paciente ${newName} cadastrado com sucesso!`, 'success');
  };

  const handleOpenRemoveModal = (id: string, name: string) => {
    setPatientToRemove({ id, name });
    setShowRemoveModal(true);
    setRemoveReason('Óbito');
  };

  const handleConfirmRemove = () => {
    if (!patientToRemove) return;
    const { id, name } = patientToRemove;
    const updated = patients.filter(p => p.id !== id);
    setPatients(updated);
    const idx = mockPatients.findIndex(p => p.id === id);
    if (idx !== -1) mockPatients.splice(idx, 1);
    
    const today = new Date();
    mockDischarges.push({
      id: (mockDischarges.length + 1).toString(),
      patientName: name,
      reason: removeReason,
      date: today.toLocaleDateString('pt-BR')
    });

    setShowRemoveModal(false);
    setPatientToRemove(null);
    addToast(`Paciente ${name} removido (${removeReason})`, 'info');
  };

  const inputClass = "w-full h-11 px-4 bg-[#F8F9FA] border-[1.5px] border-[#E5E5E5] rounded-[10px] text-sm text-[#1A1A1A] placeholder:text-[#999] focus:border-[#8BABC7] focus:ring-[3px] focus:ring-[#8BABC7]/25 outline-none transition-all";

  return (
    <AuthenticatedLayout requiredRole="Administrador" pageTitle="Gestão de Pacientes">
      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label="Pacientes Ativos" value={patients.length} icon={BedDouble} color="#003D5C" />
      </div>

      {/* Table Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white rounded-2xl shadow-sm p-6"
      >
        {/* Header row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8BABC7]" />
            <input
              type="text"
              placeholder="Buscar por nome ou leito..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-[#F8F9FA] border border-[#E5E5E5] rounded-lg text-sm focus:border-[#8BABC7] outline-none transition-all"
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowModal(true)}
            className="h-10 px-5 bg-[#003D5C] text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-[#004d75] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Novo Paciente
          </motion.button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8F9FA] text-[#003D5C] text-xs font-semibold uppercase border-b-2 border-[#E5E5E5]">
                <th className="text-left px-4 py-3">Nome</th>
                <th className="text-left px-4 py-3">Idade</th>
                <th className="text-left px-4 py-3">Leito</th>
                <th className="text-left px-4 py-3">Doenças Crônicas</th>
                <th className="text-left px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(patient => (
                <motion.tr
                  key={patient.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-b border-[#F0F0F0] hover:bg-[#F8FAFC]"
                >
                  <td className="px-4 py-3 font-medium text-[#1A1A1A]">{patient.name}</td>
                  <td className="px-4 py-3 text-[#1A1A1A]">{patient.age} anos</td>
                  <td className="px-4 py-3">
                    <span className="bg-[#003D5C]/10 text-[#003D5C] text-xs font-medium px-2.5 py-1 rounded-md">
                      {patient.bedNumber}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {patient.chronicDiseases.map(d => {
                        const colors = diseaseColorMap[d] || diseaseColorMap['Nenhum'];
                        return (
                          <span key={d} className={`${colors.bg} ${colors.text} text-xs font-medium px-2.5 py-0.5 rounded-full`}>
                            {d}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleOpenRemoveModal(patient.id, patient.name)}
                      className="w-8 h-8 rounded-md border border-[#DC3545] text-[#DC3545] flex items-center justify-center hover:bg-[#DC3545] hover:text-white transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </motion.tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#666666]">Nenhum paciente encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* New Patient Modal */}
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
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-[#003D5C]">Novo Paciente</h3>
                <button onClick={() => setShowModal(false)} className="text-[#666666] hover:text-[#1A1A1A] cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#003D5C] mb-1.5">Nome Completo</label>
                  <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome do paciente" className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#003D5C] mb-1.5">Idade</label>
                    <input type="number" value={newAge} onChange={e => setNewAge(e.target.value)} placeholder="75" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#003D5C] mb-1.5">Leito</label>
                    <input type="text" value={newBed} onChange={e => setNewBed(e.target.value)} placeholder="A-01" className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#003D5C] mb-1.5">Doenças Crônicas</label>
                  <ChipSelector options={diseaseOptions} selected={newDiseases} onChange={setNewDiseases} multiSelect />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="h-10 px-5 border border-[#E5E5E5] text-[#666666] rounded-lg text-sm font-medium hover:bg-[#F8F9FA] transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAdd}
                  className="h-10 px-5 bg-[#003D5C] text-white rounded-lg text-sm font-semibold hover:bg-[#004d75] transition-all cursor-pointer"
                >
                  Cadastrar Paciente
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Remove Patient Modal */}
      <AnimatePresence>
        {showRemoveModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowRemoveModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-[#003D5C]">Saída de Paciente</h3>
                <button onClick={() => setShowRemoveModal(false)} className="text-[#666] hover:text-[#1A1A1A] cursor-pointer"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-sm text-[#666] mb-4">Selecione o motivo da saída para o paciente <strong className="text-[#1A1A1A]">{patientToRemove?.name}</strong>:</p>
              <div className="space-y-3 mb-6">
                {['Óbito', 'Transferência', 'Alta', 'Outros'].map(reason => (
                  <label key={reason} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${removeReason === reason ? 'border-[#003D5C] bg-[#003D5C]/5' : 'border-[#E5E5E5] hover:border-[#8BABC7]'}`}>
                    <input type="radio" name="reason" value={reason} checked={removeReason === reason} onChange={(e) => setRemoveReason(e.target.value as any)} className="w-4 h-4 text-[#003D5C] focus:ring-[#003D5C]" />
                    <span className="text-sm font-medium text-[#1A1A1A]">{reason}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowRemoveModal(false)} className="h-10 px-5 border border-[#E5E5E5] text-[#666] rounded-lg text-sm font-medium hover:bg-[#F8F9FA] transition-all cursor-pointer">Cancelar</button>
                <motion.button whileTap={{ scale: 0.98 }} onClick={handleConfirmRemove} className="h-10 px-5 bg-[#DC3545] text-white rounded-lg text-sm font-semibold hover:bg-[#b02a37] transition-all cursor-pointer">Confirmar Saída</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthenticatedLayout>
  );
};

export default AdminPacientes;

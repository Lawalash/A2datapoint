import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/context/ToastContext';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { FileDown, Loader2, Download, FileText, CheckSquare, Square } from 'lucide-react';
import { mockPatients, mockClinicalRecords, riskColorMap } from '@/data/mockData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const AdminRelatorios: React.FC = () => {
  const { addToast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(mockPatients.map(p => p.id)));
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const allSelected = selectedIds.size === mockPatients.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(mockPatients.map(p => p.id)));
    }
  };

  const togglePatient = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value);
    setShowCustomDate(value === 'Personalizado');
  };

  const handleGenerate = () => {
    if (selectedIds.size === 0) { addToast('Selecione ao menos um paciente', 'error'); return; }
    if (!selectedPeriod) { addToast('Selecione o período', 'error'); return; }
    if (showCustomDate && (!dateStart || !dateEnd)) { addToast('Preencha as datas', 'error'); return; }
    setGenerating(true);
    setShowReport(false);
    setTimeout(() => { setGenerating(false); setShowReport(true); addToast('Relatório gerado com sucesso!', 'success'); }, 1500);
  };

  const getReportRecords = () => mockClinicalRecords.filter(r => selectedIds.has(r.patientId));

  const getGroupedRecords = () => {
    const records = getReportRecords();
    const groups: Record<string, typeof records> = {};
    records.forEach(r => { if (!groups[r.patientName]) groups[r.patientName] = []; groups[r.patientName].push(r); });
    return groups;
  };

  const inputClass = "h-11 px-3 bg-[#F8F9FA] border-[1.5px] border-[#E5E5E5] rounded-[10px] text-sm focus:border-[#8BABC7] outline-none transition-all";

  return (
    <AuthenticatedLayout requiredRole="Administrador" pageTitle="Relatórios">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-[#003D5C]/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-[#003D5C]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#003D5C]">Gerar Relatório de Acompanhamento</h3>
            <p className="text-xs text-[#666666]">Selecione pacientes e período</p>
          </div>
        </div>

        {/* Patient checkboxes */}
        <div className="mb-5">
          <p className="text-sm font-medium text-[#003D5C] mb-2">Pacientes</p>
          <div className="border border-[#E5E5E5] rounded-xl p-3 max-h-[240px] overflow-y-auto">
            {/* Select all */}
            <button onClick={toggleAll} className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[#F8F9FA] cursor-pointer transition-colors">
              {allSelected
                ? <CheckSquare className="w-[18px] h-[18px] text-[#003D5C]" />
                : <Square className="w-[18px] h-[18px] text-[#999]" />
              }
              <span className="text-sm font-semibold text-[#003D5C]">Selecionar Todos ({mockPatients.length})</span>
            </button>
            <div className="border-t border-[#F0F0F0] my-1" />
            {/* Individual patients */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5">
              {mockPatients.map(p => (
                <button
                  key={p.id}
                  onClick={() => togglePatient(p.id)}
                  className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[#F8F9FA] cursor-pointer transition-colors text-left"
                >
                  {selectedIds.has(p.id)
                    ? <CheckSquare className="w-[18px] h-[18px] text-[#003D5C] flex-shrink-0" />
                    : <Square className="w-[18px] h-[18px] text-[#999] flex-shrink-0" />
                  }
                  <div className="min-w-0">
                    <span className="text-sm text-[#1A1A1A] block truncate">{p.name}</span>
                    <span className="text-[11px] text-[#999]">Leito {p.bedNumber}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-[#666] mt-1.5">{selectedIds.size} de {mockPatients.length} selecionados</p>
        </div>

        {/* Period + Generate */}
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-full sm:w-[200px]">
            <label className="block text-sm text-[#666666] mb-1.5">Período</label>
            <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
              <SelectTrigger className="h-11 bg-[#F8F9FA] border-[#E5E5E5] rounded-[10px]">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Dia">Dia</SelectItem>
                <SelectItem value="Semanal">Semanal (7 dias)</SelectItem>
                <SelectItem value="Quinzenal">Quinzenal (15 dias)</SelectItem>
                <SelectItem value="Mensal">Mensal</SelectItem>
                <SelectItem value="Personalizado">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AnimatePresence>
            {showCustomDate && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex gap-3 overflow-hidden">
                <div>
                  <label className="block text-sm text-[#666] mb-1.5">Início</label>
                  <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm text-[#666] mb-1.5">Fim</label>
                  <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className={inputClass} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <motion.button whileTap={{ scale: 0.98 }} onClick={handleGenerate} disabled={generating}
            className="h-11 px-5 bg-[#003D5C] text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-[#004d75] transition-all disabled:opacity-70 cursor-pointer">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            Gerar Relatório PDF
          </motion.button>
        </div>

        {/* Report Preview */}
        <AnimatePresence>
          {showReport && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6 border border-[#E5E5E5] rounded-xl p-4 sm:p-6 bg-[#FAFAFA]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h4 className="text-lg font-semibold text-[#003D5C]">Relatório de Acompanhamento</h4>
                  <p className="text-sm text-[#666]">
                    {selectedIds.size === mockPatients.length ? 'Todos os Pacientes (Consolidado)' : `${selectedIds.size} paciente(s)`} | Período: {selectedPeriod}
                  </p>
                </div>
                <button onClick={() => addToast('Download iniciado!', 'info')}
                  className="h-10 px-4 border border-[#003D5C] text-[#003D5C] rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-[#003D5C] hover:text-white transition-all cursor-pointer">
                  <Download className="w-4 h-4" /> Baixar PDF
                </button>
              </div>
              <div className="space-y-6">
                {Object.entries(getGroupedRecords()).map(([patientName, records]) => (
                  <div key={patientName}>
                    <div className="flex items-center gap-3 mb-3">
                      <hr className="flex-1 border-[#E5E5E5]" />
                      <span className="text-sm font-semibold text-[#003D5C] whitespace-nowrap">{patientName}</span>
                      <hr className="flex-1 border-[#E5E5E5]" />
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-[#F8F9FA] text-[#003D5C] text-xs font-semibold uppercase border-b-2 border-[#E5E5E5]">
                            <th className="text-left px-4 py-3">Data</th>
                            <th className="text-left px-4 py-3">PA</th>
                            <th className="text-left px-4 py-3">HGT</th>
                            <th className="text-left px-4 py-3">FC</th>
                            <th className="text-left px-4 py-3">SpO2</th>
                            <th className="text-left px-4 py-3">Temp</th>
                            <th className="text-left px-4 py-3">Risco</th>
                          </tr>
                        </thead>
                        <tbody>
                          {records.map((r, i) => {
                            const rc = riskColorMap[r.risk] || riskColorMap['Não Urgente'];
                            return (
                              <tr key={i} className="border-b border-[#F0F0F0] hover:bg-[#F8FAFC]">
                                <td className="px-4 py-3 text-[#1A1A1A] whitespace-nowrap">{r.dateTime.split(' ')[0]}</td>
                                <td className="px-4 py-3">{r.pa}</td>
                                <td className="px-4 py-3">{r.hgt}</td>
                                <td className="px-4 py-3">{r.fc}</td>
                                <td className="px-4 py-3">{r.spo2}%</td>
                                <td className="px-4 py-3">{r.temp}°C</td>
                                <td className="px-4 py-3"><span className={`${rc.bg} ${rc.text} text-xs font-semibold px-3 py-1 rounded-full`}>{r.risk}</span></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
                {getReportRecords().length === 0 && (
                  <p className="text-center text-[#666] py-6">Nenhum registro encontrado para os pacientes selecionados.</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AuthenticatedLayout>
  );
};

export default AdminRelatorios;

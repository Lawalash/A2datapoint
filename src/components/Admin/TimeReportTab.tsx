import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { timeReportService } from '../../services/timeReportService';
import type { TimeReportData } from '../../services/timeReportService';
import { TimeReportPrintView } from './TimeReportPrintView';
import { Printer, RefreshCw, X, Search } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { useToast } from '@/context/ToastContext';

export const TimeReportTab: React.FC = () => {
  const { addToast } = useToast();
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-01'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<TimeReportData | null>(null);

  useEffect(() => {
    const fetchEmployees = async () => {
      const { data } = await supabase
        .from('employees')
        .select('id, full_name, matricula')
        .order('full_name');
      if (data) setEmployees(data);
    };
    fetchEmployees();
  }, []);

  const handleGenerate = async () => {
    if (!selectedEmployeeId) {
      addToast('Selecione um colaborador.', 'error');
      return;
    }
    if (!startDate || !endDate) {
      addToast('Selecione o período inicial e final.', 'error');
      return;
    }
    
    const days = differenceInDays(new Date(endDate), new Date(startDate));
    if (days < 0) {
      addToast('A data final não pode ser menor que a inicial.', 'error');
      return;
    }
    if (days > 31) {
      addToast('Para melhor desempenho, gere relatórios de até 31 dias por vez.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const data = await timeReportService.getEmployeeTimeReport(selectedEmployeeId, startDate, endDate);
      setReportData(data);
    } catch (e: any) {
      addToast(e.message || 'Erro ao gerar relatório', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setSelectedEmployeeId('');
    setStartDate(format(new Date(), 'yyyy-MM-01'));
    setEndDate(format(new Date(), 'yyyy-MM-dd'));
    setReportData(null);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-full bg-[#F8F9FA] relative print:static">
      {/* Estilo local para otimizar impressão */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 6mm 8mm 8mm 8mm; }
          html, body, #root { margin: 0 !important; padding: 0 !important; height: auto !important; min-height: 0 !important; background: #ffffff !important; }
          body * { visibility: hidden; }
          .print-view, .print-view * { visibility: visible; }
          .print-view { 
            position: absolute !important; 
            left: 0 !important; top: 0 !important; 
            width: 100% !important; margin: 0 !important; padding: 0 !important; padding-top: 0 !important; margin-top: 0 !important;
            display: block !important; min-height: 0 !important; height: auto !important; transform: none !important;
          }
        }
      `}</style>

      {/* Header/Filters (escondido na impressão via @media print escondendo tudo fora de .print-view) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E5E5E5] mb-6 print:hidden">
        <h2 className="text-lg font-bold text-[#003D5C] mb-4">Gerar Espelho de Ponto</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="col-span-2">
            <label className="block text-sm font-semibold text-[#666666] mb-1">Colaborador</label>
            <select
              value={selectedEmployeeId}
              onChange={e => setSelectedEmployeeId(e.target.value)}
              className="w-full bg-[#F8F9FA] border-[1.5px] border-[#E5E5E5] rounded-xl px-4 py-2 text-[#1A1A1A] outline-none focus:border-[#003D5C] focus:ring-[3px] focus:ring-[#003D5C]/20 transition-all"
            >
              <option value="">Selecione um colaborador...</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.full_name} ({e.matricula})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#666666] mb-1">Data Inicial</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full bg-[#F8F9FA] border-[1.5px] border-[#E5E5E5] rounded-xl px-4 py-2 text-[#1A1A1A] outline-none focus:border-[#003D5C] transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#666666] mb-1">Data Final</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full bg-[#F8F9FA] border-[1.5px] border-[#E5E5E5] rounded-xl px-4 py-2 text-[#1A1A1A] outline-none focus:border-[#003D5C] transition-all"
            />
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="flex items-center gap-2 bg-[#003D5C] text-white px-6 py-2.5 rounded-xl font-semibold transition-all hover:bg-[#002B42] active:scale-95 disabled:opacity-50"
          >
            {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            Gerar Prévia
          </button>
          <button
            onClick={handleClear}
            className="flex items-center gap-2 bg-[#F8F9FA] text-[#666666] border-[1.5px] border-[#E5E5E5] px-6 py-2.5 rounded-xl font-semibold transition-all hover:bg-[#E5E5E5] active:scale-95"
          >
            <X className="w-5 h-5" /> Limpar
          </button>
        </div>
      </div>

      {/* Preview Area (visível em tela, mas escondido na impressão, exceto o PrintView que é filho) */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5E5] flex-1 overflow-hidden print:border-none print:shadow-none print:bg-transparent print:m-0 print:p-0">
        {!reportData && !isLoading && (
          <div className="h-full flex flex-col items-center justify-center p-12 text-[#A0A0A0] print:hidden">
            <Search className="w-16 h-16 mb-4 text-[#E5E5E5]" />
            <p className="text-lg font-medium">Preencha os filtros para gerar o relatório</p>
          </div>
        )}

        {reportData && (
          <>
            {import.meta.env.DEV && console.log('[DEV][REPORT_UI] reportData exists', !!reportData)}
            {import.meta.env.DEV && console.log('[DEV][REPORT_UI] rows length', reportData.rows.length)}
            {import.meta.env.DEV && console.log('[DEV][REPORT_UI] first row', reportData.rows[0])}
            {import.meta.env.DEV && console.log('[DEV][REPORT_UI] scheduleLabel', reportData.rows[0]?.scheduleName, reportData.rows[0]?.scheduleType)}
            {import.meta.env.DEV && console.log('[DEV][REPORT_UI] plannedJourneyLabel', reportData.rows[0]?.expectedJourney)}
            {import.meta.env.DEV && console.log('[DEV][REPORT_UI] is print view mounted', true)}
            {import.meta.env.DEV && console.log('[DEV][REPORT_UI] is preview visible', true)}
            <div className="p-4 border-b border-[#E5E5E5] flex justify-between items-center bg-[#F8F9FA] print:hidden">
              <h3 className="font-bold text-[#003D5C]">Prévia do Relatório</h3>
              <div className="flex flex-col items-end gap-1">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 bg-[#D9822B] text-white px-5 py-2 rounded-xl font-semibold transition-all hover:bg-[#B86B20] active:scale-95 shadow-md"
                >
                  <Printer className="w-5 h-5" /> Imprimir / Salvar PDF
                </button>
                <span className="text-[10px] text-[#666666]">
                  Dica: na janela de impressão, desmarque "Cabeçalhos e rodapés" para remover data, título e URL do navegador.
                </span>
              </div>
            </div>
            <div className="p-8 overflow-auto print:p-0 print:overflow-visible">
              <TimeReportPrintView data={reportData} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

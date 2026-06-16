import React from 'react';
import type { TimeReportData } from '../../services/timeReportService';
import { formatMinutesToHHMM } from '../../services/timeReportService';
import { format, parseISO } from 'date-fns';

interface TimeReportPrintViewProps {
  data: TimeReportData | null;
}

export const TimeReportPrintView: React.FC<TimeReportPrintViewProps> = ({ data }) => {
  if (!data) return null;

  return (
    <div translate="no" className="notranslate print-view bg-white text-black p-4 print:p-0 print:m-0 print:pt-0 font-sans w-full max-w-[1200px] mx-auto block print:h-auto print:min-h-0">
      {/* Header */}
      <div className="border-b-2 border-black pb-2 mb-4 flex justify-between items-start">
        <div>
          <h1 className="text-xl print:text-[18px] font-bold uppercase tracking-wider mb-0.5">A2 DataPoint</h1>
          <h2 className="text-base print:text-[13px] font-semibold text-gray-700">{data.organizationName}</h2>
          <p className="text-xs print:text-[10px] mt-1 font-medium">Relatório Gerencial de Ponto / Espelho de Ponto</p>
          <p className="text-[10px] text-gray-500 italic">Relatório para conferência interna da jornada registrada.</p>
        </div>
        <div className="text-right text-xs print:text-[10px]">
          <p><span className="font-semibold">Período:</span> {format(parseISO(data.periodStart), 'dd/MM/yyyy')} a {format(parseISO(data.periodEnd), 'dd/MM/yyyy')}</p>
          <p><span className="font-semibold">Emissão:</span> {data.generatedAt}</p>
          <p><span className="font-semibold">Responsável:</span> {data.generatedBy}</p>
        </div>
      </div>

      {/* Employee Info */}
      <div className="grid grid-cols-2 gap-2 mb-4 text-xs print:text-[10px] p-2 print:p-1.5 bg-gray-50 border border-gray-300 rounded-lg print:border-black print:rounded-none">
        <p><span className="font-semibold uppercase text-[10px] print:text-[9px] text-gray-500 block mb-0.5">Colaborador</span> <span className="font-bold text-sm print:text-xs">{data.employee.name}</span></p>
        <p><span className="font-semibold uppercase text-[10px] print:text-[9px] text-gray-500 block mb-0.5">Matrícula</span> <span className="font-bold text-sm print:text-xs">{data.employee.matricula}</span></p>
        <p className="col-span-2"><span className="font-semibold uppercase text-[10px] print:text-[9px] text-gray-500 block mb-0.5">Cargo / Função</span> <span className="font-bold text-sm print:text-xs">{data.employee.role}</span></p>
      </div>

      {/* Main Table */}
      <div className="mb-4">
        <table className="w-full text-xs text-left border-collapse border border-black print:text-[8.5px] print:leading-[1.2]">
          <thead className="bg-gray-100 font-bold uppercase print:text-[8px]">
            <tr>
              <th className="border border-black p-2 print:px-1 print:py-[3px]">Data</th>
              <th className="border border-black p-2 print:px-1 print:py-[3px]">Escala Planejada</th>
              <th className="border border-black p-2 print:px-1 print:py-[3px]">Jornada Prevista</th>
              <th className="border border-black p-2 print:px-1 print:py-[3px]">Entrada</th>
              <th className="border border-black p-2 print:px-1 print:py-[3px]">Saída Almoço</th>
              <th className="border border-black p-2 print:px-1 print:py-[3px]">Ret. Almoço</th>
              <th className="border border-black p-2 print:px-1 print:py-[3px]">Saída</th>
              <th className="border border-black p-2 print:px-1 print:py-[3px]">Jornada Extra</th>
              <th className="border border-black p-2 print:px-1 print:py-[3px] text-center" title="Hora Extra Autorizada (min)">HE Auth</th>
              <th className="border border-black p-2 print:px-1 print:py-[3px] text-center" title="Hora Extra Realizada (min)">HE Real</th>
              <th className="border border-black p-2 print:px-1 print:py-[3px] text-center text-red-700" title="Hora Extra Indevida (min)">HE Indev</th>
              <th className="border border-black p-2 print:px-1 print:py-[3px] text-center">Saldo</th>
              <th className="border border-black p-2 print:px-1 print:py-[3px]">Status / Observações</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, idx) => (
              <tr key={idx} className="border-b border-black">
                <td className="border border-black p-2 print:px-1 print:py-[3px] whitespace-nowrap font-medium">
                  {row.isOvernight && row.endDate ? (
                    <>{format(parseISO(row.date), 'dd/MM')} &rarr; {format(parseISO(row.endDate), 'dd/MM')}</>
                  ) : (
                    format(parseISO(row.date), 'dd/MM/yyyy')
                  )}
                </td>
                <td className="border border-black p-2 print:px-1 print:py-[3px]">
                  <span className="block font-semibold">{row.scheduleName}</span>
                  <span className="block text-[9px] print:text-[8px] text-gray-600 uppercase mt-0.5">{row.scheduleType}</span>
                </td>
                <td className="border border-black p-2 print:px-1 print:py-[3px] break-words max-w-[120px]">{row.expectedJourney}</td>
                <td className="border border-black p-2 print:px-1 print:py-[3px] font-semibold">{row.punchIn || '—'}</td>
                <td className="border border-black p-2 print:px-1 print:py-[3px]">{row.punchLunchOut || '—'}</td>
                <td className="border border-black p-2 print:px-1 print:py-[3px]">
                  {row.punchLunchReturn || '—'}
                  {row.extraBreaks > 0 && <span className="block text-[8px] print:text-[7px] italic mt-0.5">+{row.extraBreaks} pausa(s)</span>}
                </td>
                <td className="border border-black p-2 print:px-1 print:py-[3px] font-semibold">{row.punchOut || '—'}</td>
                <td className="border border-black p-2 print:px-1 print:py-[3px]">{row.extraJourney || '—'}</td>
                <td className="border border-black p-2 print:px-1 print:py-[3px] text-center">{row.authorizedHE > 0 ? `${row.authorizedHE}m` : '—'}</td>
                <td className="border border-black p-2 print:px-1 print:py-[3px] text-center">{row.realizedHE > 0 ? `${row.realizedHE}m` : '—'}</td>
                <td className="border border-black p-2 print:px-1 print:py-[3px] text-center font-bold text-red-700">{row.unauthorizedHE > 0 ? `${row.unauthorizedHE}m` : '—'}</td>
                <td className="border border-black p-2 print:px-1 print:py-[3px] text-center font-semibold">{formatMinutesToHHMM(row.dailyBalance)}</td>
                <td className="border border-black p-2 print:px-1 print:py-[3px] max-w-[150px] print:max-w-[100px] break-words" title={row.status}>{row.status}</td>
              </tr>
            ))}
            {data.rows.length === 0 && (
              <tr>
                <td colSpan={13} className="border border-black p-4 text-center italic text-gray-500">Nenhum registro encontrado no período.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-2 print:gap-[2mm] mb-4 print:mb-[4mm] text-xs print:text-[9.5px] print:shadow-none" style={{ pageBreakInside: 'avoid' }}>
        <div className="border border-black p-2 print:p-[2mm] bg-gray-50 print:bg-white">
          <p className="uppercase text-[9px] print:text-[7.5px] font-bold text-gray-600 mb-0.5">Dias no período</p>
          <p className="font-bold text-base print:text-[11px] leading-tight">{data.summary.daysInPeriod}</p>
        </div>
        <div className="border border-black p-2 print:p-[2mm] bg-gray-50 print:bg-white">
          <p className="uppercase text-[9px] print:text-[7.5px] font-bold text-gray-600 mb-0.5">Dias com ponto</p>
          <p className="font-bold text-base print:text-[11px] leading-tight">{data.summary.daysWithPunch}</p>
        </div>
        <div className="border border-black p-2 print:p-[2mm] bg-gray-50 print:bg-white">
          <p className="uppercase text-[9px] print:text-[7.5px] font-bold text-gray-600 mb-0.5">Atrasos (dias)</p>
          <p className="font-bold text-base print:text-[11px] leading-tight">{data.summary.daysWithDelay}</p>
        </div>
        <div className="border border-black p-2 print:p-[2mm] bg-gray-50 print:bg-white">
          <p className="uppercase text-[9px] print:text-[7.5px] font-bold text-gray-600 mb-0.5">Jornadas Incompletas</p>
          <p className="font-bold text-base print:text-[11px] leading-tight">{data.summary.incompleteJourneys}</p>
        </div>
        <div className="border border-black p-2 print:p-[2mm] bg-gray-50 print:bg-white">
          <p className="uppercase text-[9px] print:text-[7.5px] font-bold text-gray-600 mb-0.5">Trabalho (Horas)</p>
          <p className="font-bold text-base print:text-[11px] leading-tight">{formatMinutesToHHMM(data.summary.totalWorkedMinutes)}</p>
        </div>

        <div className="border border-black p-2 print:p-[2mm] bg-gray-50 print:bg-white">
          <p className="uppercase text-[9px] print:text-[7.5px] font-bold text-gray-600 mb-0.5">HE Autorizada</p>
          <p className="font-bold text-base print:text-[11px] leading-tight text-blue-700">{formatMinutesToHHMM(data.summary.totalAuthorizedHE)}</p>
        </div>
        <div className="border border-black p-2 print:p-[2mm] bg-gray-50 print:bg-white">
          <p className="uppercase text-[9px] print:text-[7.5px] font-bold text-gray-600 mb-0.5">HE Realizada</p>
          <p className="font-bold text-base print:text-[11px] leading-tight text-green-700">{formatMinutesToHHMM(data.summary.totalRealizedHE)}</p>
        </div>
        <div className="border border-black p-2 print:p-[2mm] bg-gray-50 print:bg-white">
          <p className="uppercase text-[9px] print:text-[7.5px] font-bold text-gray-600 mb-0.5">HE Indevida</p>
          <p className="font-bold text-base print:text-[11px] leading-tight text-red-700">{formatMinutesToHHMM(data.summary.totalUnauthorizedHE)}</p>
        </div>
        <div className="border border-black p-2 print:p-[2mm] bg-gray-50 print:bg-white">
          <p className="uppercase text-[9px] print:text-[7.5px] font-bold text-gray-600 mb-0.5">Créditos de BH</p>
          <p className="font-bold text-base print:text-[11px] leading-tight text-green-700">{formatMinutesToHHMM(data.summary.totalCredits)}</p>
        </div>
        <div className="border border-black p-2 print:p-[2mm] bg-gray-50 print:bg-white">
          <p className="uppercase text-[9px] print:text-[7.5px] font-bold text-gray-600 mb-0.5">Débitos de BH</p>
          <p className="font-bold text-base print:text-[11px] leading-tight text-red-700">{formatMinutesToHHMM(data.summary.totalDebits)}</p>
        </div>

        <div className="border border-black p-2 print:p-[2mm] bg-gray-200 print:bg-gray-100 col-span-5 flex justify-between items-center print:min-h-0">
          <p className="uppercase text-xs print:text-[9.5px] font-bold text-black mb-0">Saldo Líquido no Período</p>
          <p className="font-bold text-lg print:text-[13px] leading-tight">{formatMinutesToHHMM(data.summary.netBalance)}</p>
        </div>
      </div>

      {/* Signatures */}
      <div className="mt-8 print:mt-[6mm] pt-4 print:pt-[4mm] border-t-2 border-black" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <h3 className="font-bold text-sm print:text-xs uppercase mb-4 print:mb-[2mm] text-center">Área de Conferência e Assinaturas</h3>
        <div className="grid grid-cols-2 gap-[18mm] print:gap-[12mm]">
          {/* Employee Signature */}
          <div className="flex flex-col justify-end min-h-[32mm] print:min-h-[22mm]">
            <div className="border-t border-black pt-1 w-full text-center">
              <p className="font-bold text-xs print:text-[9px]">{data.employee.name}</p>
              <p className="text-[10px] print:text-[8.5px]">Matrícula: {data.employee.matricula}</p>
            </div>
          </div>
          
          {/* Institution Stamp */}
          <div className="border border-dashed border-gray-400 rounded p-2 print:p-[3mm] flex items-end justify-center min-h-[42mm] print:min-h-[28mm]">
            <div className="border-t border-black pt-1 w-4/5 text-center">
              <p className="font-bold text-xs print:text-[9px]">Responsável / Carimbo da Instituição</p>
            </div>
          </div>
        </div>
        
        <div className="mt-4 print:mt-[2mm] text-center">
          <p className="text-xs print:text-[8.5px] font-semibold m-0">Data de conferência: ____ / ____ / ______</p>
          <p className="text-[10px] print:text-[8px] italic text-gray-600 mt-2 print:mt-1 m-0">“Declaro estar ciente dos registros de jornada apresentados neste relatório, podendo solicitar análise administrativa em caso de divergência.”</p>
        </div>
      </div>
    </div>
  );
};

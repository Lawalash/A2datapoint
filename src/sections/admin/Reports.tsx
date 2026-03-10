import { useState, useRef } from 'react';
import { useStore } from '@/hooks/useStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowLeft, 
  FileText, 
  Download, 
  Share2,
  User
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { TimeRecord, OvertimeRequest, WorkSchedule } from '@/types';

export function Reports() {
  const navigateTo = useStore((state) => state.navigateTo);
  const timeRecords = useStore((state) => state.timeRecords);
  const users = useStore((state) => state.users);
  const overtimeRequests = useStore((state) => state.overtimeRequests);
  const workSchedules = useStore((state) => state.workSchedules);

  const [generating, setGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  // Gera dados do relatório dos últimos 7 dias
  const generateReportData = () => {
    const employees = users.filter((u) => u.role === 'employee');
    const last7Days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i));

    return employees.map((employee) => {
      const dailyData = last7Days.map((date) => {
        const dayRecords = timeRecords.filter((r: TimeRecord) => {
          const recordDate = new Date(r.timestamp);
          return r.userId === employee.id && recordDate.toDateString() === date.toDateString();
        }).sort((a: TimeRecord, b: TimeRecord) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        const firstIn = dayRecords.find((r: TimeRecord) => r.type === 'in');
        const lastOut = [...dayRecords].reverse().find((r: TimeRecord) => r.type === 'out');

        const dayOvertime = overtimeRequests.filter((r: OvertimeRequest) => {
          const requestDate = new Date(r.date);
          return r.userId === employee.id && 
                 requestDate.toDateString() === date.toDateString() &&
                 r.status === 'approved';
        });

        const overtimeMinutes = dayOvertime.reduce((acc: number, r: OvertimeRequest) => acc + r.duration, 0);

        // Verifica escala
        const dayOfWeek = date.getDay();
        const schedule = workSchedules.find((s: WorkSchedule) => s.userId === employee.id && s.dayOfWeek === dayOfWeek);

        return {
          date,
          firstIn: firstIn ? new Date(firstIn.timestamp) : null,
          lastOut: lastOut ? new Date(lastOut.timestamp) : null,
          overtimeMinutes,
          overtimePending: overtimeRequests.filter((r: OvertimeRequest) => {
            const requestDate = new Date(r.date);
            return r.userId === employee.id && 
                   requestDate.toDateString() === date.toDateString() &&
                   r.status === 'pending';
          }).reduce((acc: number, r: OvertimeRequest) => acc + r.duration, 0),
          scheduledStart: schedule?.startTime || '08:00',
          scheduledEnd: schedule?.endTime || '17:00',
          status: firstIn ? 'present' : 'absent'
        };
      });

      return {
        employee,
        dailyData
      };
    });
  };

  const reportData = generateReportData();

  const generatePDF = async () => {
    setGenerating(true);
    
    try {
      if (reportRef.current) {
        const canvas = await html2canvas(reportRef.current, {
          scale: 2,
          useCORS: true,
          logging: false
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const pageHeight = 295;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        const pdfBlob = pdf.output('blob');
        const url = URL.createObjectURL(pdfBlob);
        setPdfUrl(url);
      }
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
    }
    
    setGenerating(false);
  };

  const sharePDF = async () => {
    if (pdfUrl) {
      try {
        const response = await fetch(pdfUrl);
        const blob = await response.blob();
        const file = new File([blob], `relatorio-ponto-${format(new Date(), 'yyyy-MM-dd')}.pdf`, { type: 'application/pdf' });
        
        if (navigator.share) {
          await navigator.share({
            title: 'Relatório de Ponto',
            text: 'Relatório de controle de ponto - Últimos 7 dias',
            files: [file]
          });
        } else {
          // Fallback: download direto
          const link = document.createElement('a');
          link.href = pdfUrl;
          link.download = `relatorio-ponto-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
          link.click();
        }
      } catch (error) {
        console.error('Erro ao compartilhar:', error);
      }
    }
  };

  const formatTime = (date: Date | null) => {
    if (!date) return '--:--';
    return format(date, 'HH:mm');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-700 to-purple-800 p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateTo('admin-dashboard')}
            className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center active:bg-white/30"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <p className="text-purple-200 text-sm">Voltar ao Dashboard</p>
            <h1 className="text-white font-bold text-xl">Relatórios</h1>
          </div>
        </div>
      </div>

      {/* Ações */}
      <div className="p-4">
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Relatório de 7 Dias</h3>
                <p className="text-gray-500 text-sm">Escala vs. Registros Reais</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                className="flex-1 h-12 bg-purple-600 hover:bg-purple-700"
                onClick={generatePDF}
                disabled={generating}
              >
                <Download className="w-5 h-5 mr-2" />
                {generating ? 'Gerando...' : 'Gerar PDF'}
              </Button>
              {pdfUrl && (
                <Button
                  variant="outline"
                  className="h-12 px-4"
                  onClick={sharePDF}
                >
                  <Share2 className="w-5 h-5" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview do relatório (hidden para PDF) */}
      <div className="px-4 pb-6">
        <h2 className="text-gray-700 font-semibold mb-3">Pré-visualização</h2>
        
        <div ref={reportRef} className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Cabeçalho do relatório */}
          <div className="bg-purple-700 p-4 text-white">
            <h3 className="text-lg font-bold">Relatório de Controle de Ponto</h3>
            <p className="text-purple-200 text-sm">
              Período: {format(subDays(new Date(), 6), 'dd/MM/yyyy')} a {format(new Date(), 'dd/MM/yyyy')}
            </p>
          </div>

          {/* Tabela de dados */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Funcionário</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-700">Data</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-700">Entrada</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-700">Saída</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-700">HE Aprovada</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-700">HE Pendente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reportData.map(({ employee, dailyData }) => 
                  dailyData.map((day, idx) => (
                    <tr key={`${employee.id}-${idx}`} className="hover:bg-gray-50">
                      {idx === 0 && (
                        <td rowSpan={dailyData.length} className="px-3 py-2 font-medium text-gray-800 align-top">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            {employee.name}
                          </div>
                        </td>
                      )}
                      <td className="px-3 py-2 text-center text-gray-600">
                        {format(day.date, 'dd/MM')}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={day.firstIn ? 'text-green-600' : 'text-red-500'}>
                          {formatTime(day.firstIn)}
                        </span>
                        <span className="text-gray-400 text-xs block">
                          ({day.scheduledStart})
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={day.lastOut ? 'text-green-600' : 'text-red-500'}>
                          {formatTime(day.lastOut)}
                        </span>
                        <span className="text-gray-400 text-xs block">
                          ({day.scheduledEnd})
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {day.overtimeMinutes > 0 ? (
                          <span className="text-green-600 font-medium">
                            {Math.floor(day.overtimeMinutes / 60)}h {day.overtimeMinutes % 60}m
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {day.overtimePending > 0 ? (
                          <span className="text-orange-600 font-medium">
                            {Math.floor(day.overtimePending / 60)}h {day.overtimePending % 60}m
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

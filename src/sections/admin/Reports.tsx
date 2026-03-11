// src/sections/admin/Reports.tsx
import { useState, useRef, useEffect } from 'react'
import { useStore } from '@/hooks/useStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FileText, Download, Share2, User, Loader2 } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import type { TimeLog, OvertimeRequest } from '@/types'

export function Reports() {
  const timeLogs = useStore((state) => state.timeLogs)
  const profiles = useStore((state) => state.profiles)
  const shifts = useStore((state) => state.shifts)
  const overtimeRequests = useStore((state) => state.overtimeRequests)
  const fetchTimeLogs = useStore((state) => state.fetchTimeLogs)
  const fetchOvertimeRequests = useStore((state) => state.fetchOvertimeRequests)

  const [generating, setGenerating] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const reportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const from = subDays(new Date(), 7)
    fetchTimeLogs(from)
    fetchOvertimeRequests()
  }, [fetchTimeLogs, fetchOvertimeRequests])

  // Inclui todos os perfis (admin + funcionários) no relatório
  const allUsers = profiles
  const last7Days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i))

  const reportData = allUsers.map((emp) => {
    const daily = last7Days.map((date) => {
      const dayLogs = timeLogs
        .filter(
          (r: TimeLog) =>
            r.user_id === emp.id &&
            new Date(r.timestamp).toDateString() === date.toDateString()
        )
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

      const firstIn = dayLogs.find((r) => r.type === 'in')
      const lastOut = [...dayLogs].reverse().find((r) => r.type === 'out')

      const dow = date.getDay()
      const shift = shifts.find((s) => s.user_id === emp.id && s.day_of_week === dow)

      const approvedOT = overtimeRequests
        .filter(
          (r: OvertimeRequest) =>
            r.user_id === emp.id &&
            new Date(r.date).toDateString() === date.toDateString() &&
            r.status === 'approved'
        )
        .reduce((acc, r) => acc + r.duration_minutes, 0)

      const pendingOT = overtimeRequests
        .filter(
          (r: OvertimeRequest) =>
            r.user_id === emp.id &&
            new Date(r.date).toDateString() === date.toDateString() &&
            r.status === 'pending'
        )
        .reduce((acc, r) => acc + r.duration_minutes, 0)

      return {
        date,
        firstIn: firstIn ? new Date(firstIn.timestamp) : null,
        lastOut: lastOut ? new Date(lastOut.timestamp) : null,
        approvedOT,
        pendingOT,
        scheduledStart: shift?.start_time?.slice(0, 5) ?? '--:--',
        scheduledEnd: shift?.end_time?.slice(0, 5) ?? '--:--',
      }
    })

    return { employee: emp, daily }
  })

  const generatePDF = async () => {
    if (!reportRef.current) return
    setGenerating(true)
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, logging: false })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgWidth = 210
      const pageHeight = 295
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      const url = URL.createObjectURL(pdf.output('blob'))
      setPdfUrl(url)
    } catch (err) {
      console.error('Erro ao gerar PDF:', err)
    }
    setGenerating(false)
  }

  const sharePDF = async () => {
    if (!pdfUrl) return
    const blob = await (await fetch(pdfUrl)).blob()
    const file = new File([blob], `relatorio-ponto-${format(new Date(), 'yyyy-MM-dd')}.pdf`, {
      type: 'application/pdf',
    })
    if (navigator.share) {
      await navigator.share({ title: 'Relatório de Ponto', files: [file] }).catch(() => {})
    } else {
      const a = document.createElement('a')
      a.href = pdfUrl
      a.download = file.name
      a.click()
    }
  }

  const fmt = (d: Date | null) => (d ? format(d, 'HH:mm') : '--:--')
  const fmtOT = (min: number) =>
    min > 0 ? `${Math.floor(min / 60)}h ${min % 60 > 0 ? min % 60 + 'm' : ''}`.trim() : '—'

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-[#0f2d5c]">Relatórios</h1>
        <p className="text-sm text-gray-500 mt-1">Escala vs. registros reais — últimos 7 dias</p>
      </div>

      {/* Actions */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Relatório de 7 Dias</h3>
              <p className="text-gray-500 text-sm">
                {format(subDays(new Date(), 6), 'dd/MM')} – {format(new Date(), 'dd/MM/yyyy')}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              className="flex-1 h-11 bg-purple-600 hover:bg-purple-700"
              onClick={generatePDF}
              disabled={generating}
            >
              {generating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gerando...</>
              ) : (
                <><Download className="w-4 h-4 mr-2" />Gerar PDF</>
              )}
            </Button>
            {pdfUrl && (
              <Button variant="outline" className="h-11 px-4" onClick={sharePDF}>
                <Share2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <h2 className="text-gray-700 font-semibold mb-3">Pré-visualização</h2>
      <div ref={reportRef} className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="bg-purple-700 p-4 text-white">
          <h3 className="text-lg font-bold">Relatório de Controle de Ponto</h3>
          <p className="text-purple-200 text-sm">
            {format(subDays(new Date(), 6), 'dd/MM/yyyy')} – {format(new Date(), 'dd/MM/yyyy')}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Funcionário</th>
                <th className="px-3 py-2 text-center font-medium text-gray-700">Data</th>
                <th className="px-3 py-2 text-center font-medium text-gray-700">Entrada</th>
                <th className="px-3 py-2 text-center font-medium text-gray-700">Saída</th>
                <th className="px-3 py-2 text-center font-medium text-gray-700">HE Aprov.</th>
                <th className="px-3 py-2 text-center font-medium text-gray-700">HE Pend.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reportData.map(({ employee, daily }) =>
                daily.map((day, idx) => (
                  <tr key={`${employee.id}-${idx}`} className="hover:bg-gray-50">
                    {idx === 0 && (
                      <td rowSpan={daily.length} className="px-3 py-2 font-medium text-gray-800 align-top">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          {employee.name}
                        </div>
                        <div className="text-gray-400 text-xs mt-0.5">Mat. {employee.matricula}</div>
                      </td>
                    )}
                    <td className="px-3 py-2 text-center text-gray-500">
                      {format(day.date, 'dd/MM', { locale: ptBR })}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={day.firstIn ? 'text-green-600' : 'text-gray-400'}>
                        {fmt(day.firstIn)}
                      </span>
                      <span className="text-gray-300 text-xs block">({day.scheduledStart})</span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={day.lastOut ? 'text-green-600' : 'text-gray-400'}>
                        {fmt(day.lastOut)}
                      </span>
                      <span className="text-gray-300 text-xs block">({day.scheduledEnd})</span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={day.approvedOT > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                        {fmtOT(day.approvedOT)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={day.pendingOT > 0 ? 'text-orange-500 font-medium' : 'text-gray-400'}>
                        {fmtOT(day.pendingOT)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
              {reportData.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-gray-400 text-sm">
                    Nenhum dado disponível
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
// src/sections/admin/Reports.tsx
import { useState, useRef, useEffect, useMemo } from 'react'
import { useStore } from '@/hooks/useStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FileText, Download, Share2, User, Loader2, Filter, ChevronDown } from 'lucide-react'
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import type { TimeLog, OvertimeRequest } from '@/types'

type Preset = '7d' | '15d' | '30d' | 'week' | 'month' | 'custom'

export function Reports() {
  const timeLogs = useStore((state) => state.timeLogs)
  const profiles = useStore((state) => state.profiles)
  const shifts = useStore((state) => state.shifts)
  const overtimeRequests = useStore((state) => state.overtimeRequests)
  const fetchTimeLogs = useStore((state) => state.fetchTimeLogs)
  const fetchOvertimeRequests = useStore((state) => state.fetchOvertimeRequests)

  const [generating, setGenerating] = useState(false)
  const [expandedDays, setExpandedDays] = useState<Set<string>>(() => new Set([format(new Date(), 'yyyy-MM-dd')]))
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const reportRef = useRef<HTMLDivElement>(null)

  // ── Filtros ─────────────────────────────────────────────────
  const [preset, setPreset] = useState<Preset>('7d')
  const [customFrom, setCustomFrom] = useState(format(subDays(new Date(), 6), 'yyyy-MM-dd'))
  const [customTo, setCustomTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  const { dateFrom, dateTo } = useMemo(() => {
    const today = new Date()
    switch (preset) {
      case '7d':   return { dateFrom: subDays(today, 6), dateTo: today }
      case '15d':  return { dateFrom: subDays(today, 14), dateTo: today }
      case '30d':  return { dateFrom: subDays(today, 29), dateTo: today }
      case 'week': return { dateFrom: startOfWeek(today, { weekStartsOn: 1 }), dateTo: endOfWeek(today, { weekStartsOn: 1 }) }
      case 'month':return { dateFrom: startOfMonth(today), dateTo: endOfMonth(today) }
      case 'custom':return { dateFrom: parseISO(customFrom), dateTo: parseISO(customTo) }
      default:     return { dateFrom: subDays(today, 6), dateTo: today }
    }
  }, [preset, customFrom, customTo])

  useEffect(() => {
    fetchTimeLogs(dateFrom)
    fetchOvertimeRequests()
  }, [dateFrom, fetchTimeLogs, fetchOvertimeRequests])

  const daysInRange = useMemo(
    () => eachDayOfInterval({ start: dateFrom, end: dateTo }),
    [dateFrom, dateTo]
  )

  const employees = useMemo(
    () => profiles.filter((p) => p.role === 'employee'),
    [profiles]
  )

  const usersToShow = useMemo(() => {
    if (selectedEmployeeId === 'all') return employees
    return employees.filter((p) => p.id === selectedEmployeeId)
  }, [employees, selectedEmployeeId])

  const reportData = useMemo(() =>
    usersToShow.map((emp) => {
      const daily = daysInRange.map((date) => {
        const dateStr = format(date, 'yyyy-MM-dd')

        const dayLogs = timeLogs
          .filter((r: TimeLog) =>
            r.user_id === emp.id &&
            (r.log_date === dateStr ||
              new Date(r.timestamp).toDateString() === date.toDateString())
          )
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

        const firstIn = dayLogs.find((r) => r.type === 'in')
        const lastOut = [...dayLogs].reverse().find((r) => r.type === 'out')
        const dow = date.getDay()
        const shift = shifts.find((s) => s.user_id === emp.id && s.day_of_week === dow)

        const approvedOT = overtimeRequests
          .filter((r: OvertimeRequest) =>
            r.user_id === emp.id && r.date === dateStr && r.status === 'approved'
          )
          .reduce((acc, r) => acc + r.duration_minutes, 0)

        const pendingOT = overtimeRequests
          .filter((r: OvertimeRequest) =>
            r.user_id === emp.id && r.date === dateStr && r.status === 'pending'
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
    }),
    [usersToShow, daysInRange, timeLogs, shifts, overtimeRequests]
  )

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
    const file = new File([blob], `relatorio-ponto-${format(new Date(), 'yyyy-MM-dd')}.pdf`, { type: 'application/pdf' })
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
    min > 0 ? `${Math.floor(min / 60)}h${min % 60 > 0 ? ` ${min % 60}m` : ''}` : '—'

  const toggleDay = (dateStr: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev)
      next.has(dateStr) ? next.delete(dateStr) : next.add(dateStr)
      return next
    })
  }

  const presetLabels: Record<Preset, string> = {
    '7d': 'Últimos 7 dias',
    '15d': 'Últimos 15 dias',
    '30d': 'Últimos 30 dias',
    week: 'Esta semana',
    month: 'Este mês',
    custom: 'Personalizado',
  }

  const activeEmployeeName = selectedEmployeeId === 'all'
    ? 'Todos os funcionários'
    : employees.find((e) => e.id === selectedEmployeeId)?.name ?? 'Funcionário'

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-[#0f2d5c]">Relatórios</h1>
        <p className="text-sm text-gray-500 mt-1">Escala vs. registros reais — controle de ponto</p>
      </div>

      {/* Painel de filtros */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <button
            className="w-full flex items-center justify-between text-left"
            onClick={() => setShowFilters((v) => !v)}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-purple-600 shrink-0" />
              <span className="font-medium text-gray-700">Filtros</span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {presetLabels[preset]}
              </span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {activeEmployeeName}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {showFilters && (
            <div className="mt-4 space-y-5 border-t pt-4">
              {/* Presets de período */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                  Período
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['7d', '15d', '30d', 'week', 'month', 'custom'] as Preset[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPreset(p)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        preset === p
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {presetLabels[p]}
                    </button>
                  ))}
                </div>

                {preset === 'custom' && (
                  <div className="flex gap-3 mt-3">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 block mb-1">De</label>
                      <Input
                        type="date"
                        value={customFrom}
                        onChange={(e) => setCustomFrom(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 block mb-1">Até</label>
                      <Input
                        type="date"
                        value={customTo}
                        max={format(new Date(), 'yyyy-MM-dd')}
                        onChange={(e) => setCustomTo(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Filtro por funcionário */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                  Funcionário
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedEmployeeId('all')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      selectedEmployeeId === 'all'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Todos ({employees.length})
                  </button>
                  {employees.map((emp) => (
                    <button
                      key={emp.id}
                      onClick={() => setSelectedEmployeeId(emp.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        selectedEmployeeId === emp.id
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {emp.name} · Mat.{emp.matricula}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Acções / gerar PDF */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">{activeEmployeeName}</h3>
              <p className="text-gray-500 text-sm">
                {format(dateFrom, 'dd/MM/yyyy')} – {format(dateTo, 'dd/MM/yyyy')}
                {' · '}{daysInRange.length} dias
                {selectedEmployeeId === 'all' && ` · ${usersToShow.length} func.`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              className="flex-1 h-11 bg-purple-600 hover:bg-purple-700"
              onClick={generatePDF}
              disabled={generating}
            >
              {generating
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gerando...</>
                : <><Download className="w-4 h-4 mr-2" />Gerar PDF</>}
            </Button>
            {pdfUrl && (
              <Button variant="outline" className="h-11 px-4" onClick={sharePDF}>
                <Share2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pré-visualização */}
      <h2 className="text-gray-700 font-semibold mb-3">Pré-visualização</h2>
      <div ref={reportRef} className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="bg-purple-700 p-4 text-white">
          <h3 className="text-lg font-bold">Relatório de Controle de Ponto</h3>
          <p className="text-purple-200 text-sm">
            {format(dateFrom, 'dd/MM/yyyy')} – {format(dateTo, 'dd/MM/yyyy')}
            {selectedEmployeeId !== 'all' && ` · ${activeEmployeeName}`}
          </p>
        </div>

        {/* Accordion por dia */}
        <div className="divide-y divide-gray-100">
          {daysInRange.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">Nenhum dado disponível</div>
          ) : (
            daysInRange.slice().reverse().map((date) => {
              const dateStr = format(date, 'yyyy-MM-dd')
              const isExpanded = expandedDays.has(dateStr)
              const dayRows = reportData
                .map(({ employee, daily }) => {
                  const d = daily.find((x) => format(x.date, 'yyyy-MM-dd') === dateStr)
                  return d ? { employee, day: d } : null
                })
                .filter(Boolean) as { employee: (typeof reportData)[0]['employee']; day: (typeof reportData)[0]['daily'][0] }[]

              const presentCount = dayRows.filter((r) => r.day.firstIn).length

              return (
                <div key={dateStr}>
                  {/* Day header — accordion toggle */}
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                    onClick={() => toggleDay(dateStr)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${isExpanded ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {format(date, 'dd')}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-gray-800 capitalize">
                          {format(date, "EEEE", { locale: ptBR })}
                        </p>
                        <p className="text-xs text-gray-400">{format(date, 'dd/MM/yyyy')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${presentCount > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        {presentCount}/{usersToShow.length} presentes
                      </span>
                      <span className="text-gray-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {/* Expanded table */}
                  {isExpanded && (
                    <div className="overflow-x-auto border-t border-gray-100">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">Funcionário</th>
                            <th className="px-3 py-2 text-center font-medium text-gray-600">Entrada</th>
                            <th className="px-3 py-2 text-center font-medium text-gray-600">Saída</th>
                            <th className="px-3 py-2 text-center font-medium text-gray-600">HE Aprov.</th>
                            <th className="px-3 py-2 text-center font-medium text-gray-600">HE Pend.</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {dayRows.map(({ employee, day }) => (
                            <tr key={employee.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-1.5">
                                  <User className="w-3 h-3 text-gray-400 shrink-0" />
                                  <span className="font-medium text-gray-800">{employee.name}</span>
                                </div>
                                <div className="text-gray-400 text-xs ml-4">Mat. {employee.matricula}</div>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className={day.firstIn ? 'text-green-600 font-medium' : 'text-gray-300'}>{fmt(day.firstIn)}</span>
                                <span className="text-gray-300 block text-xs">({day.scheduledStart})</span>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className={day.lastOut ? 'text-green-600 font-medium' : 'text-gray-300'}>{fmt(day.lastOut)}</span>
                                <span className="text-gray-300 block text-xs">({day.scheduledEnd})</span>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className={day.approvedOT > 0 ? 'text-green-600 font-medium' : 'text-gray-300'}>{fmtOT(day.approvedOT)}</span>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className={day.pendingOT > 0 ? 'text-orange-500 font-medium' : 'text-gray-300'}>{fmtOT(day.pendingOT)}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
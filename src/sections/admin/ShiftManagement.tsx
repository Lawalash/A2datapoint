// src/sections/admin/ShiftManagement.tsx
import { useState, useEffect } from 'react'
import { useStore } from '@/hooks/useStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Calendar, Clock, CheckSquare, Square, Save,
  Users, ChevronDown, ChevronUp, CheckCircle2, UtensilsCrossed
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const DAYS = [
  { value: 0, label: 'Domingo', short: 'Dom' },
  { value: 1, label: 'Segunda', short: 'Seg' },
  { value: 2, label: 'Terça',   short: 'Ter' },
  { value: 3, label: 'Quarta',  short: 'Qua' },
  { value: 4, label: 'Quinta',  short: 'Qui' },
  { value: 5, label: 'Sexta',   short: 'Sex' },
  { value: 6, label: 'Sábado',  short: 'Sáb' },
]

const PRESET_SHIFTS = [
  { label: 'Comercial (8h–18h)',  start: '08:00', end: '18:00' },
  { label: 'Manhã (6h–14h)',      start: '06:00', end: '14:00' },
  { label: 'Tarde (14h–22h)',     start: '14:00', end: '22:00' },
  { label: 'Noite (22h–6h)',      start: '22:00', end: '06:00' },
  { label: 'Integral (9h–18h)',   start: '09:00', end: '18:00' },
]

const LUNCH_PRESETS = [
  { label: 'Sem almoço',  value: 0  },
  { label: '15min',       value: 15 },
  { label: '30min',       value: 30 },
  { label: '1h',          value: 60 },
  { label: '1h 30min',    value: 90 },
  { label: '2h',          value: 120},
]

export function ShiftManagement() {
  const profiles          = useStore((s) => s.profiles)
  const shifts            = useStore((s) => s.shifts)
  const fetchProfiles     = useStore((s) => s.fetchProfiles)
  const fetchShifts       = useStore((s) => s.fetchShifts)
  const bulkAssignShifts  = useStore((s) => s.bulkAssignShifts)

  const [selectedUsers,   setSelectedUsers]   = useState<string[]>([])
  const [selectedDays,    setSelectedDays]    = useState<number[]>([1, 2, 3, 4, 5])
  const [startTime,       setStartTime]       = useState('08:00')
  const [endTime,         setEndTime]         = useState('18:00')
  const [lunchMinutes,    setLunchMinutes]    = useState(60)
  const [isSaving,        setIsSaving]        = useState(false)
  const [expandedUser,    setExpandedUser]    = useState<string | null>(null)
  const [searchTerm,      setSearchTerm]      = useState('')

  useEffect(() => {
    fetchProfiles()
    fetchShifts()
  }, [fetchProfiles, fetchShifts])

  const employees = profiles.filter((p) => p.role === 'employee')
  const filtered  = employees.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(p.matricula).includes(searchTerm)
  )

  const toggleUser = (userId: string) =>
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )

  const toggleDay = (day: number) =>
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )

  const selectAllUsers = () => setSelectedUsers(filtered.map((p) => p.id))
  const clearAllUsers  = () => setSelectedUsers([])

  const getUserShifts = (userId: string) =>
    shifts.filter((s) => s.user_id === userId).sort((a, b) => a.day_of_week - b.day_of_week)

  const applyPreset = (start: string, end: string) => { setStartTime(start); setEndTime(end) }

  const handleSave = async () => {
    if (selectedUsers.length === 0) { toast.error('Selecione pelo menos um funcionário.'); return }
    if (selectedDays.length === 0)  { toast.error('Selecione pelo menos um dia.'); return }
    if (!startTime || !endTime)     { toast.error('Defina os horários de entrada e saída.'); return }

    setIsSaving(true)
    const ok = await bulkAssignShifts(selectedUsers, selectedDays, startTime, endTime, lunchMinutes)
    setIsSaving(false)

    if (ok) {
      toast.success(`Escala aplicada a ${selectedUsers.length} funcionário(s) em ${selectedDays.length} dia(s)!`)
      setSelectedUsers([])
    } else {
      toast.error('Erro ao salvar escalas. Tente novamente.')
    }
  }

  const DOW_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-[#0f2d5c]">Gestão de Escalas</h1>
        <p className="text-sm text-gray-500 mt-1">Atribuir turnos em massa aos funcionários</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── Configuração de turno ─────────────────────────── */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#0f2d5c]" />
                Horário do Turno
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Presets */}
              <div>
                <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Turnos pré-definidos</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {PRESET_SHIFTS.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => applyPreset(preset.start, preset.end)}
                      className={cn(
                        'text-left px-3 py-2 rounded-lg text-sm transition-all border',
                        startTime === preset.start && endTime === preset.end
                          ? 'bg-[#0f2d5c] text-white border-[#0f2d5c]'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom time */}
              <div>
                <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Horário personalizado</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-600 mb-1 block">Entrada</Label>
                    <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-11 text-center font-mono text-base" />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600 mb-1 block">Saída</Label>
                    <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-11 text-center font-mono text-base" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Pausa Almoço ─────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-[#0f2d5c]" />
                Pausa para Almoço
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {LUNCH_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setLunchMinutes(p.value)}
                    className={cn(
                      'py-2 px-3 rounded-lg text-xs font-medium transition-all border',
                      lunchMinutes === p.value
                        ? 'bg-[#0f2d5c] text-white border-[#0f2d5c]'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Personalizado (minutos)</Label>
                <Input
                  type="number"
                  min={0}
                  max={180}
                  value={lunchMinutes}
                  onChange={(e) => setLunchMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                  className="h-10 text-center font-mono"
                  placeholder="Ex: 45"
                />
              </div>
              <p className="text-xs text-gray-400">
                {lunchMinutes === 0
                  ? 'Sem pausa para almoço nesta escala'
                  : `Colaborador terá ${lunchMinutes}min de pausa. Alertas automáticos se exceder.`}
              </p>
            </CardContent>
          </Card>

          {/* Days of week */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#0f2d5c]" />
                Dias da Semana
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {DAYS.map((day) => {
                  const active = selectedDays.includes(day.value)
                  return (
                    <button
                      key={day.value}
                      onClick={() => toggleDay(day.value)}
                      title={day.label}
                      className={cn(
                        'h-11 rounded-xl text-xs font-bold transition-all',
                        active ? 'bg-[#0f2d5c] text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      )}
                    >
                      {day.short.charAt(0)}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">
                {selectedDays.length === 0
                  ? 'Nenhum dia selecionado'
                  : `${selectedDays.length} dia(s): ${selectedDays.sort().map((d) => DOW_LABELS[d]).join(' ')}`}
              </p>
            </CardContent>
          </Card>

          {/* Save button */}
          <Button
            className="w-full h-14 bg-[#0f2d5c] hover:bg-[#1a3a6e] text-white font-semibold text-base"
            onClick={handleSave}
            disabled={isSaving || selectedUsers.length === 0 || selectedDays.length === 0}
          >
            {isSaving
              ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />Salvando...</>
              : <><Save className="w-5 h-5 mr-2" />Aplicar a {selectedUsers.length} funcionário(s)</>}
          </Button>
        </div>

        {/* ── Lista de funcionários ──────────────────────────── */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#0f2d5c]" />
                  Funcionários ({filtered.length})
                </CardTitle>
                <div className="flex gap-2">
                  <button onClick={selectAllUsers} className="text-xs text-[#0f2d5c] hover:underline flex items-center gap-1">
                    <CheckSquare className="w-3.5 h-3.5" />Todos
                  </button>
                  <span className="text-gray-300">|</span>
                  <button onClick={clearAllUsers} className="text-xs text-gray-400 hover:underline flex items-center gap-1">
                    <Square className="w-3.5 h-3.5" />Nenhum
                  </button>
                </div>
              </div>
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 text-sm mt-2"
              />
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[520px] overflow-y-auto divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <div className="py-10 text-center text-gray-400 text-sm">Nenhum funcionário encontrado</div>
                ) : (
                  filtered.map((emp) => {
                    const checked      = selectedUsers.includes(emp.id)
                    const userShifts   = getUserShifts(emp.id)
                    const isExpanded   = expandedUser === emp.id
                    const firstShift   = userShifts[0]

                    return (
                      <div key={emp.id}>
                        <div
                          className={cn('flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors', checked ? 'bg-blue-50' : 'hover:bg-gray-50')}
                          onClick={() => toggleUser(emp.id)}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleUser(emp.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 text-sm truncate">{emp.name}</p>
                            <p className="text-gray-400 text-xs">
                              Mat. {emp.matricula}
                              {firstShift && (
                                <span className="ml-2 text-[#0f2d5c]/60">
                                  {firstShift.start_time.slice(0,5)}–{firstShift.end_time.slice(0,5)}
                                  {firstShift.lunch_duration_minutes > 0 && ` · 🍽 ${firstShift.lunch_duration_minutes}min`}
                                </span>
                              )}
                            </p>
                          </div>

                          {userShifts.length > 0 && (
                            <div className="flex gap-0.5">
                              {[0,1,2,3,4,5,6].map((d) => {
                                const has = userShifts.some((s) => s.day_of_week === d)
                                return (
                                  <div key={d} className={cn('w-4 h-4 rounded-sm text-[8px] font-bold flex items-center justify-center', has ? 'bg-[#0f2d5c] text-white' : 'bg-gray-100 text-gray-300')}>
                                    {DOW_LABELS[d]}
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {userShifts.length > 0 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setExpandedUser(isExpanded ? null : emp.id) }}
                              className="text-gray-400 hover:text-gray-600 p-1"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          )}
                        </div>

                        {isExpanded && userShifts.length > 0 && (
                          <div className="bg-gray-50 px-4 py-3 border-t border-gray-100">
                            <p className="text-xs text-gray-500 mb-2 font-medium">Escala actual:</p>
                            <div className="space-y-1">
                              {userShifts.map((s) => (
                                <div key={s.id} className="flex items-center gap-2 text-xs">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                  <span className="text-gray-600 w-16">{DAYS.find((d) => d.value === s.day_of_week)?.label}</span>
                                  <span className="text-[#0f2d5c] font-mono font-medium">{s.start_time.slice(0,5)} – {s.end_time.slice(0,5)}</span>
                                  {s.lunch_duration_minutes > 0 && (
                                    <span className="text-amber-600">🍽 {s.lunch_duration_minutes}min</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
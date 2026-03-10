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
  Users, ChevronDown, ChevronUp, AlertCircle, CheckCircle2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const DAYS = [
  { value: 0, label: 'Domingo', short: 'Dom' },
  { value: 1, label: 'Segunda', short: 'Seg' },
  { value: 2, label: 'Terça', short: 'Ter' },
  { value: 3, label: 'Quarta', short: 'Qua' },
  { value: 4, label: 'Quinta', short: 'Qui' },
  { value: 5, label: 'Sexta', short: 'Sex' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
]

const PRESET_SHIFTS = [
  { label: 'Comercial (8h–18h)', start: '08:00', end: '18:00' },
  { label: 'Manhã (6h–14h)', start: '06:00', end: '14:00' },
  { label: 'Tarde (14h–22h)', start: '14:00', end: '22:00' },
  { label: 'Noite (22h–6h)', start: '22:00', end: '06:00' },
  { label: 'Integral (9h–18h)', start: '09:00', end: '18:00' },
]

export function ShiftManagement() {
  const { profiles, shifts, fetchProfiles, fetchShifts, bulkAssignShifts } = useStore()

  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]) // Seg–Sex
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('18:00')
  const [isSaving, setIsSaving] = useState(false)
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchProfiles()
    fetchShifts()
  }, [])

  const employees = profiles.filter((p) => p.role === 'employee')
  const filteredEmployees = employees.filter((e) =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  const selectAllUsers = () => {
    if (selectedUsers.length === filteredEmployees.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(filteredEmployees.map((e) => e.id))
    }
  }

  const applyPreset = (preset: typeof PRESET_SHIFTS[0]) => {
    setStartTime(preset.start)
    setEndTime(preset.end)
  }

  const getUserShifts = (userId: string) => {
    return shifts.filter((s) => s.user_id === userId)
  }

  const handleSave = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Selecione ao menos um funcionário')
      return
    }
    if (selectedDays.length === 0) {
      toast.error('Selecione ao menos um dia da semana')
      return
    }
    if (!startTime || !endTime) {
      toast.error('Defina os horários de entrada e saída')
      return
    }

    setIsSaving(true)
    const ok = await bulkAssignShifts(selectedUsers, selectedDays, startTime, endTime)
    setIsSaving(false)

    if (ok) {
      toast.success(
        `Escala atribuída a ${selectedUsers.length} funcionário(s) em ${selectedDays.length} dia(s)`
      )
      setSelectedUsers([])
    } else {
      toast.error('Erro ao salvar escalas. Tente novamente.')
    }
  }

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-[#0f2d5c]">Gestão de Escalas</h1>
        <p className="text-sm text-gray-500 mt-1">
          Atribua horários de turno para múltiplos funcionários de uma só vez
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* ── Configuração do turno ─────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-gray-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-[#0f2d5c] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#00b4d8]" />
                Horário do Turno
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Presets */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Turnos Rápidos
                </p>
                <div className="flex flex-wrap gap-2">
                  {PRESET_SHIFTS.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => applyPreset(preset)}
                      className={cn(
                        'text-xs px-3 py-1.5 rounded-full border font-medium transition-all',
                        startTime === preset.start && endTime === preset.end
                          ? 'bg-[#00b4d8] text-white border-[#00b4d8]'
                          : 'border-gray-200 text-gray-600 hover:border-[#00b4d8] hover:text-[#00b4d8]'
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-gray-600 mb-1.5 block">
                    Entrada
                  </Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="h-11 text-center font-mono text-base"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-600 mb-1.5 block">
                    Saída
                  </Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="h-11 text-center font-mono text-base"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Days selection */}
          <Card className="border-gray-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-[#0f2d5c] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#00b4d8]" />
                Dias da Semana
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1.5">
                {DAYS.map((day) => {
                  const selected = selectedDays.includes(day.value)
                  return (
                    <button
                      key={day.value}
                      onClick={() => toggleDay(day.value)}
                      className={cn(
                        'aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-semibold transition-all',
                        selected
                          ? 'bg-[#0f2d5c] text-white shadow-md'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      )}
                    >
                      {day.short}
                    </button>
                  )
                })}
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setSelectedDays([1, 2, 3, 4, 5])}
                  className="text-xs text-[#00b4d8] hover:underline"
                >
                  Seg–Sex
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() => setSelectedDays([0, 1, 2, 3, 4, 5, 6])}
                  className="text-xs text-[#00b4d8] hover:underline"
                >
                  Todos
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() => setSelectedDays([])}
                  className="text-xs text-gray-400 hover:underline"
                >
                  Limpar
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Save button */}
          <Button
            onClick={handleSave}
            disabled={isSaving || selectedUsers.length === 0 || selectedDays.length === 0}
            className="w-full h-12 bg-[#0f2d5c] hover:bg-[#1e3a5f] text-white font-semibold"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Aplicar a {selectedUsers.length} funcionário(s)
              </>
            )}
          </Button>
        </div>

        {/* ── Seleção de funcionários ───────────────────────── */}
        <div className="lg:col-span-3">
          <Card className="border-gray-100 h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-[#0f2d5c] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#00b4d8]" />
                  Funcionários ({filteredEmployees.length})
                </CardTitle>
                <button
                  onClick={selectAllUsers}
                  className="text-xs text-[#00b4d8] font-medium hover:underline flex items-center gap-1"
                >
                  {selectedUsers.length === filteredEmployees.length && filteredEmployees.length > 0
                    ? <><Square className="w-3 h-3" /> Desmarcar todos</>
                    : <><CheckSquare className="w-3 h-3" /> Selecionar todos</>
                  }
                </button>
              </div>
              <Input
                placeholder="Buscar funcionário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-2 h-9 text-sm"
              />
            </CardHeader>
            <CardContent className="p-0">
              {selectedUsers.length > 0 && (
                <div className="mx-4 mb-3 px-3 py-2 bg-[#00b4d8]/10 rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#00b4d8] shrink-0" />
                  <p className="text-xs text-[#0f2d5c] font-medium">
                    {selectedUsers.length} funcionário(s) selecionado(s)
                  </p>
                </div>
              )}

              <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
                {filteredEmployees.length === 0 ? (
                  <div className="py-10 text-center text-gray-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhum funcionário encontrado</p>
                  </div>
                ) : (
                  filteredEmployees.map((employee) => {
                    const isSelected = selectedUsers.includes(employee.id)
                    const userShifts = getUserShifts(employee.id)
                    const isExpanded = expandedUser === employee.id

                    return (
                      <div key={employee.id} className={cn(
                        'transition-colors',
                        isSelected ? 'bg-[#00b4d8]/5' : 'hover:bg-gray-50/50'
                      )}>
                        <div className="flex items-center gap-3 px-4 py-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleUser(employee.id)}
                            className="data-[state=checked]:bg-[#00b4d8] data-[state=checked]:border-[#00b4d8]"
                          />
                          <div
                            className="flex-1 flex items-center gap-2.5 cursor-pointer"
                            onClick={() => toggleUser(employee.id)}
                          >
                            <div className="w-8 h-8 rounded-full bg-[#0f2d5c]/10 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-[#0f2d5c]">
                                {employee.name.charAt(0)}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">
                                {employee.name}
                              </p>
                              <p className="text-xs text-gray-400">Mat. {employee.matricula}</p>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setExpandedUser(isExpanded ? null : employee.id)
                            }}
                            className="text-gray-400 hover:text-gray-600 p-1"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>

                        {/* Escalas atuais do funcionário */}
                        {isExpanded && (
                          <div className="px-4 pb-3 pl-12">
                            {userShifts.length === 0 ? (
                              <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-lg">
                                <AlertCircle className="w-3 h-3 shrink-0" />
                                Sem escala definida
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {DAYS.filter((d) => userShifts.find((s) => s.day_of_week === d.value))
                                  .map((d) => {
                                    const shift = userShifts.find((s) => s.day_of_week === d.value)!
                                    return (
                                      <div key={d.value} className="flex items-center gap-1 bg-[#0f2d5c]/5 rounded-lg px-2 py-1">
                                        <span className="text-xs font-semibold text-[#0f2d5c]">{d.short}</span>
                                        <span className="text-xs text-gray-500">
                                          {shift.start_time.slice(0, 5)}–{shift.end_time.slice(0, 5)}
                                        </span>
                                      </div>
                                    )
                                  })}
                              </div>
                            )}
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
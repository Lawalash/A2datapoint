// src/sections/admin/UserManagement.tsx
import { useState, useEffect } from 'react'
import { useStore } from '@/hooks/useStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Plus, Trash2, User, CheckCircle2, AlertCircle,
  Search, Loader2, KeyRound
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import type { Profile } from '@/types'

export function UserManagement() {
  const [newUserName, setNewUserName] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [resettingId, setResettingId] = useState<string | null>(null)

  const profiles = useStore((state) => state.profiles)
  const createUser = useStore((state) => state.createUser)
  const deleteUser = useStore((state) => state.deleteUser)
  const resetUserPassword = useStore((state) => state.resetUserPassword)
  const fetchProfiles = useStore((state) => state.fetchProfiles)

  useEffect(() => { fetchProfiles() }, [fetchProfiles])

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message })
    setTimeout(() => setFeedback(null), 5000)
  }

  const handleCreateUser = async () => {
    if (!newUserName.trim()) { showFeedback('error', 'Digite um nome válido.'); return }
    setIsCreating(true)
    const matricula = await createUser(newUserName.trim())
    setIsCreating(false)
    if (matricula) {
      showFeedback('success', `Criado! Matrícula: ${matricula} · Senha temporária: ${matricula}`)
      setNewUserName('')
      setShowDialog(false)
    } else {
      showFeedback('error', 'Erro ao criar. Verifique se a Edge Function "create-user" está activa.')
    }
  }

  const handleDeleteUser = async (profile: Profile) => {
    if (!confirm(`Excluir ${profile.name}? Esta ação não pode ser desfeita.`)) return
    setDeletingId(profile.id)
    const ok = await deleteUser(profile.id)
    setDeletingId(null)
    ok ? showFeedback('success', `${profile.name} excluído.`) : showFeedback('error', 'Erro ao excluir.')
  }

  const handleResetPassword = async (profile: Profile) => {
    if (!confirm(`Resetar senha de ${profile.name}?\nNova senha temporária será: ${profile.matricula}`)) return
    setResettingId(profile.id)
    const ok = await resetUserPassword(profile.id)
    setResettingId(null)
    if (ok) {
      showFeedback('success', `Senha de ${profile.name} resetada. Nova senha temp.: ${profile.matricula}`)
    } else {
      showFeedback('error', 'Erro ao resetar. Verifique a Edge Function "reset-password".')
    }
  }

  const employees = profiles.filter((p) => p.role === 'employee')
  const filtered = employees.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(p.matricula).includes(searchTerm)
  )
  const nextMatricula = employees.length > 0 ? Math.max(...employees.map((p) => p.matricula)) + 1 : 1

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-[#0f2d5c]">Gestão de Utilizadores</h1>
        <p className="text-sm text-gray-500 mt-1">Criar e gerir matrículas dos funcionários</p>
      </div>

      {feedback && (
        <Alert className={`mb-4 ${feedback.type === 'success' ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
          {feedback.type === 'success'
            ? <CheckCircle2 className="h-4 w-4 text-green-600" />
            : <AlertCircle className="h-4 w-4 text-red-600" />}
          <AlertDescription className={feedback.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {feedback.message}
          </AlertDescription>
        </Alert>
      )}

      <Card className="bg-blue-50 border-blue-200 mb-6">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-blue-600 text-sm font-medium">Próxima Matrícula Disponível</p>
            <p className="text-3xl font-bold text-blue-800">{nextMatricula}</p>
            <p className="text-blue-400 text-xs mt-0.5">Senha temporária = número da matrícula</p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-blue-600" />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Buscar por nome ou matrícula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12"
          />
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="h-12 w-12 bg-blue-600 hover:bg-blue-700 p-0">
              <Plus className="w-5 h-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Novo Funcionário</DialogTitle>
              <DialogDescription>
                A senha temporária será o número da matrícula. O funcionário define a própria senha no primeiro acesso.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Nome Completo</label>
                <Input
                  placeholder="Digite o nome completo"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateUser()}
                  className="h-12"
                  autoFocus
                />
              </div>
              <div className="bg-blue-50 p-3 rounded-lg space-y-1">
                <p className="text-sm text-blue-700">Matrícula: <strong>{nextMatricula}</strong></p>
                <p className="text-xs text-blue-500">Senha temporária: <strong>{nextMatricula}</strong></p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 h-12" onClick={() => setShowDialog(false)}>Cancelar</Button>
                <Button className="flex-1 h-12 bg-blue-600 hover:bg-blue-700" onClick={handleCreateUser} disabled={isCreating}>
                  {isCreating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {isCreating ? 'Criando...' : 'Criar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <h2 className="text-gray-700 font-semibold mb-3">Funcionários ({filtered.length})</h2>
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-gray-400">
              <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum funcionário encontrado</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((profile) => (
            <Card key={profile.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-11 h-11 bg-[#0f2d5c]/10 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-[#0f2d5c]">
                    {profile.name.charAt(0).toUpperCase()}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{profile.name}</p>
                  <p className="text-gray-500 text-sm">Mat. {profile.matricula}</p>
                  {profile.is_first_access && (
                    <span className="inline-block mt-0.5 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                      Aguardando 1º acesso
                    </span>
                  )}
                </div>

                {/* Reset password */}
                <button
                  onClick={() => handleResetPassword(profile)}
                  disabled={resettingId === profile.id}
                  title={`Resetar senha (nova temp: ${profile.matricula})`}
                  className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center hover:bg-amber-200 transition-colors disabled:opacity-50 shrink-0"
                >
                  {resettingId === profile.id
                    ? <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                    : <KeyRound className="w-4 h-4 text-amber-600" />}
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDeleteUser(profile)}
                  disabled={deletingId === profile.id}
                  title="Excluir funcionário"
                  className="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center hover:bg-red-200 transition-colors disabled:opacity-50 shrink-0"
                >
                  {deletingId === profile.id
                    ? <Loader2 className="w-4 h-4 text-red-600 animate-spin" />
                    : <Trash2 className="w-4 h-4 text-red-600" />}
                </button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
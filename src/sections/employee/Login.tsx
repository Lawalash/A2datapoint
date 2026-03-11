// src/sections/employee/Login.tsx
import { useState } from 'react'
import { useStore } from '@/hooks/useStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertCircle, Loader2, Clock,
  UserPlus, LogIn, ArrowLeft, ShieldCheck
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

type LoginMode = 'select' | 'first-access' | 'login' | 'admin-login'

export function EmployeeLogin() {
  const [mode, setMode] = useState<LoginMode>('select')
  const [matricula, setMatricula] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const login = useStore((state) => state.login)
  const logout = useStore((state) => state.logout)

  const reset = () => { setError(''); setMatricula(''); setPassword('') }
  const goTo = (m: LoginMode) => { reset(); setMode(m) }

  // Primeiro Acesso: login com senha temporária = matrícula
  const handleFirstAccess = async () => {
    setError('')
    const id = parseInt(matricula)
    if (isNaN(id) || id <= 0) { setError('Digite uma matrícula válida.'); return }

    setIsLoading(true)
    const result = await login(id, String(id))
    setIsLoading(false)

    if (!result.success) {
      setError('Matrícula não encontrada ou senha já foi alterada.\nSe esqueceu a senha, peça ao administrador para fazer o reset.')
      return
    }
    if (!result.isFirstAccess) {
      await logout()
      setError('Esta conta já foi ativada. Use "Já possuo login".')
      goTo('login')
    }
    // Se isFirstAccess = true, o store já navegou para 'first-access'
  }

  // Login funcionário normal (admin também pode usar para bater ponto)
  const handleLogin = async () => {
    setError('')
    const id = parseInt(matricula)
    if (isNaN(id) || id <= 0) { setError('Digite uma matrícula válida.'); return }
    if (!password) { setError('Digite sua senha.'); return }

    setIsLoading(true)
    // forceEmployeeView=true → admin vai para o dashboard de ponto, não para o painel admin
    const result = await login(id, password, true)
    setIsLoading(false)

    if (!result.success) {
      setError(result.error ?? 'Matrícula ou senha incorretos.')
    }
  }

  // Login admin
  const handleAdminLogin = async () => {
    setError('')
    const id = parseInt(matricula)
    if (isNaN(id) || id <= 0) { setError('Digite a matrícula.'); return }
    if (!password) { setError('Digite a senha.'); return }

    setIsLoading(true)
    const result = await login(id, password)
    setIsLoading(false)

    if (!result.success) {
      setError(result.error ?? 'Credenciais incorretas.')
    }
    // Se role === 'admin', o store navega automaticamente para 'admin'
  }

  // ── SELECT MODE ────────────────────────────────────────────────
  if (mode === 'select') {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-[#0f2d5c] via-[#1a3a6e] to-[#0a1f42] flex flex-col px-5">
        <div className="flex-1 flex flex-col items-center justify-center py-10">
          {/* Logo */}
          <div className="mb-8 text-center">
            <div className="w-16 h-16 bg-[#00b4d8]/20 border-2 border-[#00b4d8]/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-[#00b4d8]" />
            </div>
            <p className="text-white/50 text-xs font-semibold tracking-[0.2em] uppercase">A2data</p>
            <p className="text-[#00b4d8] font-black text-3xl tracking-[0.15em] uppercase leading-none">POINT</p>
            <p className="text-white/30 text-xs mt-2">Sistema de Controle de Ponto</p>
          </div>

          {/* Options */}
          <div className="w-full max-w-sm space-y-3">
            <button
              onClick={() => goTo('first-access')}
              className="w-full bg-white/10 hover:bg-white/15 border border-white/20 hover:border-[#00b4d8]/50 rounded-2xl p-4 flex items-center gap-4 transition-all active:scale-[0.98] text-left"
            >
              <div className="w-12 h-12 bg-[#00b4d8]/20 rounded-xl flex items-center justify-center shrink-0">
                <UserPlus className="w-6 h-6 text-[#00b4d8]" />
              </div>
              <div>
                <p className="text-white font-semibold text-base">Primeiro Acesso</p>
                <p className="text-white/40 text-xs mt-0.5">Ainda não criei minha senha</p>
              </div>
            </button>

            <button
              onClick={() => goTo('login')}
              className="w-full bg-[#00b4d8]/15 hover:bg-[#00b4d8]/25 border border-[#00b4d8]/30 hover:border-[#00b4d8]/60 rounded-2xl p-4 flex items-center gap-4 transition-all active:scale-[0.98] text-left"
            >
              <div className="w-12 h-12 bg-[#00b4d8]/30 rounded-xl flex items-center justify-center shrink-0">
                <LogIn className="w-6 h-6 text-[#00b4d8]" />
              </div>
              <div>
                <p className="text-white font-semibold text-base">Já possuo login</p>
                <p className="text-white/40 text-xs mt-0.5">Entrar com matrícula e senha</p>
              </div>
            </button>
          </div>
        </div>

        {/* Admin access — discreto no rodapé */}
        <div className="flex justify-center pb-6">
          <button
            onClick={() => goTo('admin-login')}
            className="flex items-center gap-2 text-white/20 hover:text-white/50 transition-colors text-xs py-2 px-4"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Acesso Administrativo
          </button>
        </div>
      </div>
    )
  }

  // ── FIRST ACCESS MODE ─────────────────────────────────────────
  if (mode === 'first-access') {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-[#0f2d5c] via-[#1a3a6e] to-[#0a1f42] flex flex-col items-center justify-center px-5 py-8">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-[#00b4d8]/20 border-2 border-[#00b4d8]/40 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <UserPlus className="w-7 h-7 text-[#00b4d8]" />
            </div>
            <h1 className="text-white font-bold text-xl">Primeiro Acesso</h1>
            <p className="text-white/40 text-sm mt-1">Digite sua matrícula para começar</p>
          </div>

          <Card className="shadow-2xl border-0">
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Matrícula</Label>
                <Input
                  type="number"
                  placeholder="Ex: 5"
                  value={matricula}
                  onChange={(e) => { setMatricula(e.target.value); setError('') }}
                  onKeyDown={(e) => e.key === 'Enter' && handleFirstAccess()}
                  className="h-14 text-2xl text-center font-mono tracking-widest"
                  autoFocus
                />
              </div>

              {error && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm whitespace-pre-line">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                className="w-full h-12 bg-[#0f2d5c] hover:bg-[#1a3a6e] text-white font-semibold"
                onClick={handleFirstAccess}
                disabled={isLoading}
              >
                {isLoading
                  ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Verificando...</>
                  : 'Continuar'}
              </Button>

              <button
                onClick={() => goTo('select')}
                className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors py-1"
              >
                <ArrowLeft className="w-4 h-4" />Voltar
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ── ADMIN LOGIN MODE ──────────────────────────────────────────
  if (mode === 'admin-login') {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-[#0f2d5c] via-[#1a3a6e] to-[#0a1f42] flex flex-col items-center justify-center px-5 py-8">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-white/10 border-2 border-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-7 h-7 text-white/70" />
            </div>
            <h1 className="text-white font-bold text-xl">Painel Admin</h1>
            <p className="text-white/40 text-sm mt-1">Acesso restrito a administradores</p>
          </div>

          <Card className="shadow-2xl border-0">
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Matrícula</Label>
                <Input
                  type="number"
                  placeholder="Ex: 1"
                  value={matricula}
                  onChange={(e) => { setMatricula(e.target.value); setError('') }}
                  className="h-12 text-xl text-center font-mono tracking-widest"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Senha</Label>
                <Input
                  type="password"
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                  className="h-12 text-xl text-center tracking-widest"
                />
              </div>

              {error && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                className="w-full h-12 bg-[#0f2d5c] hover:bg-[#1a3a6e] text-white font-semibold"
                onClick={handleAdminLogin}
                disabled={isLoading}
              >
                {isLoading
                  ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Entrando...</>
                  : 'Entrar como Admin'}
              </Button>

              <button
                onClick={() => goTo('select')}
                className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors py-1"
              >
                <ArrowLeft className="w-4 h-4" />Voltar
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ── LOGIN NORMAL MODE ─────────────────────────────────────────
  return (
    <div className="min-h-dvh bg-gradient-to-br from-[#0f2d5c] via-[#1a3a6e] to-[#0a1f42] flex flex-col items-center justify-center px-5 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-[#00b4d8]/20 border-2 border-[#00b4d8]/40 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <LogIn className="w-7 h-7 text-[#00b4d8]" />
          </div>
          <h1 className="text-white font-bold text-xl">Entrar</h1>
          <p className="text-white/40 text-sm mt-1">Use sua matrícula e senha</p>
        </div>

        <Card className="shadow-2xl border-0">
          <CardContent className="p-5 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Matrícula</Label>
              <Input
                type="number"
                placeholder="Ex: 5"
                value={matricula}
                onChange={(e) => { setMatricula(e.target.value); setError('') }}
                className="h-12 text-xl text-center font-mono tracking-widest"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Senha</Label>
              <Input
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="h-12 text-xl text-center tracking-widest"
              />
            </div>

            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}

            <Button
              className="w-full h-12 bg-[#00b4d8] hover:bg-[#0096b7] text-white font-semibold"
              onClick={handleLogin}
              disabled={isLoading}
            >
              {isLoading
                ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Entrando...</>
                : 'Entrar'}
            </Button>

            <button
              onClick={() => goTo('select')}
              className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors py-1"
            >
              <ArrowLeft className="w-4 h-4" />Voltar
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
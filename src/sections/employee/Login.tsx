// src/sections/employee/Login.tsx
import { useState } from 'react'
import { useStore } from '@/hooks/useStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserCog, User, AlertCircle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function EmployeeLogin() {
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const login = useStore((state) => state.login)
  const navigateTo = useStore((state) => state.navigateTo)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const id = parseInt(userId)
    if (isNaN(id) || id <= 0) {
      setError('Matrícula inválida. Digite um número válido.')
      return
    }

    setIsLoading(true)
    const result = await login(id, password)
    setIsLoading(false)

    if (!result.success) {
      setError(result.error ?? 'Matrícula ou senha incorretos.')
    }
  }

  const handleAdminAccess = () => {
    navigateTo('admin')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <User className="w-10 h-10 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-white">Controle de Ponto</h1>
        <p className="text-blue-200 text-sm mt-1">Sistema de Registro de Horários</p>
      </div>

      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl text-center text-gray-800">
            Acesso do Funcionário
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="userId" className="text-base font-medium text-gray-700">
                Matrícula
              </Label>
              <Input
                id="userId"
                type="number"
                placeholder="Digite sua matrícula"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="h-14 text-lg text-center tracking-widest"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-base font-medium text-gray-700">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 text-lg text-center"
              />
            </div>

            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full h-14 text-lg font-semibold bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  A entrar...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={handleAdminAccess}
              className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors"
            >
              <UserCog className="w-4 h-4" />
              Acesso Administrativo
            </button>
          </div>
        </CardContent>
      </Card>

      <p className="mt-8 text-blue-200 text-xs text-center">
        Toque nos campos para digitar
      </p>
    </div>
  )
}
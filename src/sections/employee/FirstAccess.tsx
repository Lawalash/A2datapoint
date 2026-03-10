import { useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function FirstAccess() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const currentUser = useStore(state => state.currentUser);
  const setFirstAccessComplete = useStore(state => state.setFirstAccessComplete);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 4) {
      setError('A senha deve ter pelo menos 4 dígitos.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (currentUser) {
      setFirstAccessComplete(currentUser.id, password);
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-600 via-green-700 to-green-800 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-sm shadow-2xl">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Senha Criada!</h2>
            <p className="text-gray-600 mb-6">
              Sua senha foi definida com sucesso. Você será redirecionado para o dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 flex flex-col items-center justify-center p-4">
      <div className="mb-6 text-center">
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Lock className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-xl font-bold text-white">Primeiro Acesso</h1>
        <p className="text-blue-200 text-sm mt-1">Crie sua senha de acesso</p>
      </div>

      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg text-center text-gray-800">
            Bem-vindo, {currentUser?.name}!
          </CardTitle>
          <CardDescription className="text-center">
            Crie uma senha curta (mínimo 4 dígitos) para acessar o sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-base font-medium text-gray-700">
                Nova Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 4 dígitos"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 text-lg text-center tracking-widest"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-base font-medium text-gray-700">
                Confirmar Senha
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Digite novamente"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-14 text-lg text-center tracking-widest"
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
            >
              Criar Senha
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

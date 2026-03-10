import { useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  User, 
  CheckCircle2,
  AlertCircle,
  Search
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function UserManagement() {
  const [newUserName, setNewUserName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  
  const navigateTo = useStore(state => state.navigateTo);
  const users = useStore(state => state.users);
  const createUser = useStore(state => state.createUser);
  const deleteUser = useStore(state => state.deleteUser);
  const getNextUserId = useStore(state => state.getNextUserId);

  const handleCreateUser = () => {
    if (!newUserName.trim()) {
      setFeedback({ type: 'error', message: 'Digite um nome válido.' });
      return;
    }

    const newId = createUser(newUserName.trim());
    setFeedback({ 
      type: 'success', 
      message: `Usuário criado! Matrícula: ${newId}` 
    });
    setNewUserName('');
    setShowDialog(false);
    
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleDeleteUser = (id: number, name: string) => {
    if (confirm(`Tem certeza que deseja excluir ${name}?`)) {
      deleteUser(id);
      setFeedback({ type: 'success', message: 'Usuário excluído com sucesso.' });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const filteredUsers = users.filter(u => 
    u.role === 'employee' && 
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const nextId = getNextUserId();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-800 p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateTo('admin-dashboard')}
            className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center active:bg-white/30"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <p className="text-blue-200 text-sm">Voltar ao Dashboard</p>
            <h1 className="text-white font-bold text-xl">Gestão de Usuários</h1>
          </div>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className="px-4 pt-4">
          <Alert className={feedback.type === 'success' ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'}>
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <AlertDescription className={feedback.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {feedback.message}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Próxima matrícula */}
      <div className="p-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Próxima Matrícula Disponível</p>
                <p className="text-3xl font-bold text-blue-800">{nextId}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Busca e botão adicionar */}
      <div className="px-4 pb-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Buscar funcionário..."
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
                  Crie uma nova matrícula para o funcionário.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Nome Completo
                  </label>
                  <Input
                    placeholder="Digite o nome completo"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="h-12"
                    autoFocus
                  />
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-700">
                    Matrícula será: <strong>{nextId}</strong>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-12"
                    onClick={() => setShowDialog(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1 h-12 bg-blue-600 hover:bg-blue-700"
                    onClick={handleCreateUser}
                  >
                    Criar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Lista de usuários */}
      <div className="px-4 pb-6">
        <h2 className="text-gray-700 font-semibold mb-3">
          Funcionários ({filteredUsers.length})
        </h2>
        <div className="space-y-2">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="bg-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{user.name}</p>
                      <p className="text-gray-500 text-sm">Matrícula: {user.id}</p>
                      {user.isFirstAccess && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                          Primeiro Acesso
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteUser(user.id, user.name)}
                    className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center active:bg-red-200"
                  >
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

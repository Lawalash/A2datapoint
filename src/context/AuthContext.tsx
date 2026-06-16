import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { User, UserRole } from '@/types';
import { mockUsers } from '@/data/mockData';
import { supabase } from '@/lib/supabase';
import { PRODUCT_MODE } from '@/config/productConfig';
import { mfaService } from '@/services/mfaService';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<User | null>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  isAuthenticated: boolean;
  hasRole: (role: UserRole) => boolean;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isLoggingInRef = useRef(false);

  const loadSupabaseUser = async (session: any) => {
    if (!session?.user) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      await fetchRealEmployee(session.user.id);
    } catch (err) {
      console.error('loadSupabaseUser ignorando erro:', err);
    }
  };

  // Recuperar sessão ao carregar a página e escutar mudanças
  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (mounted) await loadSupabaseUser(session);
      } catch (err) {
        console.error('Erro ao restaurar sessão:', err);
        if (mounted) setIsLoading(false);
      }
    };

    if (PRODUCT_MODE === 'A2_DATAPOINT') {
      restoreSession();

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (mounted && !isLoggingInRef.current) {
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            await loadSupabaseUser(session);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setIsLoading(false);
          }
        }
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchRealEmployee = async (authUserId: string) => {
    try {
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('auth_user_id', authUserId)
        .is('deleted_at', null)
        .single();

      if (employeeError) {
        // PGRST116 = The result contains 0 rows (often due to RLS hiding inactive employees)
        if (employeeError.code === 'PGRST116') {
          await supabase.auth.signOut();
          throw new Error('Usuário inativo. Procure o administrador.');
        }
        
        // Verifica falha de conexão do Supabase
        const isNetworkError = 
          employeeError.message?.includes('Failed to fetch') || 
          employeeError.message?.includes('fetch failed');
        if (isNetworkError) {
          throw new Error('Servidor temporariamente indisponível. Verifique sua internet e tente novamente. Se persistir, acione o suporte.');
        }
        
        throw new Error('Perfil não encontrado.');
      }

      if (!employee) {
        throw new Error('Perfil não encontrado.');
      }

      if (!employee.is_active) {
        await supabase.auth.signOut();
        throw new Error('Usuário inativo. Procure o administrador.');
      }

      if (employee.role !== 'Master' && employee.role !== 'Administrador' && employee.role !== 'Colaborador') {
        throw new Error('Acesso negado. Perfil inválido.');
      }

      let mfaStatus: User['mfaStatus'] = 'not_required';
      if (employee.role === 'Administrador' || employee.role === 'Master') {
        try {
          const aal = await mfaService.getAuthenticatorAssuranceLevel();
          if (aal?.currentLevel === 'aal2') {
            mfaStatus = 'verified';
          } else {
            const factors = await mfaService.listMfaFactors();
            if (factors.length === 0) {
              mfaStatus = 'needs_enrollment';
            } else {
              mfaStatus = 'pending_challenge';
            }
          }
        } catch (mfaError) {
          console.error("MFA Error (possibly disabled in dashboard):", mfaError);
          mfaStatus = 'error';
        }
      }

      // Adaptar employee real para o User type esperado pelo app
      const adaptedUser: User = {
        id: employee.id,
        username: employee.matricula,
        password: '', // Não expor senha
        displayName: employee.full_name,
        role: employee.role,
        cargo: employee.cargo,
        route: (employee.role === 'Administrador' || employee.role === 'Master') ? '/admin' : '/ponto',
        mfaStatus,
        ...( { isReal: true, originalEmployee: employee } as any ) // Flag customizada para controle interno
      };

      setUser(adaptedUser);
      return adaptedUser;
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error('[AUTH][ERROR]', err);
      }
      setError(err.message || 'Erro ao carregar perfil.');
      setUser(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (username: string, password: string): Promise<User | null> => {
    setIsLoading(true);
    setError(null);
    try {
      if (PRODUCT_MODE === 'A2_DATAPOINT') {
        // Fluxo Híbrido: Admin vai para Supabase, Colaborador vai para Mock
        const isNumeric = /^\d+$/.test(username);
        const isRealColaborador = isNumeric && username !== '123456';
        const isEmailOrAdmin = username === 'admin' || username === '01' || username.includes('@') || isRealColaborador;
        
        if (isEmailOrAdmin) {
          // Auth Real (Supabase)
          let email = username.includes('@') ? username : `${username}@a2datapoint.com`;
          
          if (username === 'admin' || username === '01') email = 'admin@aconchego.datapoint.local';
          else if (isRealColaborador) email = `${username}@a2datapoint.com`;
          
          if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
             throw new Error('Configuração do servidor inválida. Acione o suporte.');
          }
          if (!import.meta.env.VITE_SUPABASE_URL.startsWith('https://')) {
             throw new Error('Configuração do servidor inválida. Acione o suporte.');
          }

          isLoggingInRef.current = true;
          try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
              email,
              password
            });

            if (authError) {
               const isNetworkError = 
                 authError.name === 'AuthRetryableFetchError' || 
                 authError.message.includes('Failed to fetch') ||
                 authError.message.includes('fetch failed') ||
                 authError.message.includes('ERR_NAME_NOT_RESOLVED') ||
                 authError.message.includes('NetworkError');
               
               if (isNetworkError) {
                   throw new Error('Servidor temporariamente indisponível. Verifique sua internet e tente novamente. Se persistir, acione o suporte.');
               }
               throw new Error('Credenciais inválidas.');
            }

            if (data.session) {
               const adaptedUser = await fetchRealEmployee(data.session.user.id);
               return adaptedUser || null;
            }
          } finally {
            isLoggingInRef.current = false;
          }
          return null;
        }
      }

      // Fluxo Mock (para colaboradores ou modo legado)
      if (import.meta.env.VITE_ENABLE_DEMO_MOCK === 'true') {
        await new Promise(resolve => setTimeout(resolve, 600));
        const foundUser = mockUsers.find(
          u => u.username === username && u.password === password
        );
        
        if (foundUser) {
          setUser(foundUser);
          setIsLoading(false);
          return foundUser;
        }
      }
      
      throw new Error('Credenciais inválidas.');
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error('[AUTH][LOGIN_ERROR]', err);
      }
      setError(err.message || 'Erro de autenticação');
      setIsLoading(false);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      // Se for usuário real (veio do Supabase), faz signout
      if (user && (user as any).isReal) {
        await supabase.auth.signOut();
      }
      setUser(null);
      setError(null);
    } catch (err) {
      console.error('Erro no logout', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      // Also update the user in mockUsers so password changes persist
      // Apenas para mocks. Não faremos update real via state nesta fase.
      if (!(prev as any).isReal) {
        const idx = mockUsers.findIndex(u => u.id === prev.id);
        if (idx !== -1) {
          Object.assign(mockUsers[idx], updates);
        }
      }
      return updated;
    });
  }, []);

  const isAuthenticated = user !== null;
  const hasRole = useCallback(
    (role: UserRole) => {
      if (!user) return false;
      if (user.role === 'Master' && role === 'Administrador') return true;
      return user.role === role;
    },
    [user]
  );

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, isAuthenticated, hasRole, isLoading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

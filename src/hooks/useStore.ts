// src/hooks/useStore.ts
import { create } from 'zustand'
import { supabase, uploadPhoto } from '@/lib/supabase'
import type {
  AppState,
  AppView,
  AdminView,
  TimeLog,
  OvertimeRequest,
  AuthResult,
  PunchResult,
} from '@/types'

// ── Helper: chamar Edge Function autenticada ──────────────────
async function callEdgeFunction(
  functionName: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; data: unknown; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL as string}/functions/v1/${functionName}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token ?? ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )
    const data = await res.json() as unknown
    if (!res.ok) {
      const errMsg = (data as { error?: string }).error ?? `Erro ${res.status}`
      return { ok: false, data, error: errMsg }
    }
    return { ok: true, data }
  } catch (err) {
    return { ok: false, data: null, error: (err as Error).message }
  }
}

export const useStore = create<AppState>((set, get) => ({
  // ── Estado inicial ──────────────────────────────────────────
  currentUser: null,
  currentView: 'login',
  adminView: 'dashboard',
  profiles: [],
  shifts: [],
  timeLogs: [],
  overtimeRequests: [],
  isLoading: false,
  isAuthLoading: true,

  // ── Auth ────────────────────────────────────────────────────

  login: async (matricula: number, password: string, forceEmployeeView = false): Promise<AuthResult> => {
    set({ isAuthLoading: true })
    try {
      // O email de todos os utilizadores segue o padrão: {matricula}@a2datapoint.internal
      const email = `${matricula}@a2datapoint.internal`

      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error || !data.user) {
        set({ isAuthLoading: false })
        return { success: false, error: 'Matrícula ou senha incorretos.' }
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (profileError || !profile) {
        await supabase.auth.signOut()
        set({ isAuthLoading: false })
        return { success: false, error: 'Perfil não encontrado. Contacte o administrador.' }
      }

      const nextView: AppView = profile.is_first_access
        ? 'first-access'
        : forceEmployeeView
          ? 'employee-dashboard'
          : profile.role === 'admin'
            ? 'admin'
            : 'employee-dashboard'

      set({ currentUser: profile, currentView: nextView, isAuthLoading: false })

      if (profile.role === 'admin') {
        // Carregar dados do admin em background
        void get().fetchProfiles()
        void get().fetchTimeLogs()
        void get().fetchOvertimeRequests()
        void get().fetchShifts()
      } else {
        // Funcionário também precisa dos próprios turnos
        void get().fetchShifts()
      }

      return { success: true, user: profile, isFirstAccess: profile.is_first_access }
    } catch (err) {
      console.error('Login error:', err)
      set({ isAuthLoading: false })
      return { success: false, error: 'Erro de conexão. Verifique a internet e tente novamente.' }
    }
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({
      currentUser: null,
      currentView: 'login',
      adminView: 'dashboard',
      profiles: [],
      shifts: [],
      timeLogs: [],
      overtimeRequests: [],
    })
  },

  setFirstAccessComplete: async (password: string): Promise<boolean> => {
    const { currentUser } = get()
    if (!currentUser) return false

    try {
      // Actualizar senha no Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({ password })
      if (authError) throw authError

      // Marcar is_first_access = false no perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_first_access: false })
        .eq('id', currentUser.id)
      if (profileError) throw profileError

      const updatedUser = { ...currentUser, is_first_access: false }
      const nextView: AppView = currentUser.role === 'admin' ? 'admin' : 'employee-dashboard'

      set({ currentUser: updatedUser, currentView: nextView })

      if (currentUser.role === 'admin') {
        void get().fetchProfiles()
        void get().fetchTimeLogs()
        void get().fetchOvertimeRequests()
        void get().fetchShifts()
      } else {
        void get().fetchShifts()
      }

      return true
    } catch (err) {
      console.error('Erro ao definir senha:', err)
      return false
    }
  },

  // ── Navigation ──────────────────────────────────────────────

  navigateTo: (view: AppView) => {
    set({ currentView: view })
    if (view === 'admin') {
      void get().fetchProfiles()
      void get().fetchTimeLogs()
      void get().fetchOvertimeRequests()
      void get().fetchShifts()
    }
  },
  navigateAdmin: (view: AdminView) => set({ adminView: view }),

  // ── Time Registration ────────────────────────────────────────

  registerTime: async (type, photoDataUrl): Promise<PunchResult> => {
    const { currentUser } = get()
    if (!currentUser) return { success: false, message: 'Não autenticado' }

    set({ isLoading: true })

    try {
      // Validar janela de ponto via RPC
      const { data: validationResult } = await supabase.rpc('validate_punch_time', {
        p_user_id: currentUser.id,
        p_type: type,
      })

      const flag: TimeLog['flag'] =
        validationResult === 'he_not_registered' ? 'he_not_registered' : null

      // Upload da foto
      let photoUrl: string | null = null
      if (photoDataUrl) {
        photoUrl = await uploadPhoto(currentUser.id, photoDataUrl)
      }

      const { data: newLog, error } = await supabase
        .from('time_logs')
        .insert({ user_id: currentUser.id, type, photo_url: photoUrl, flag })
        .select()
        .single()

      if (error) throw error

      set((state) => ({ timeLogs: [newLog as TimeLog, ...state.timeLogs], isLoading: false }))

      const timeStr = new Date((newLog as TimeLog).timestamp).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })
      const message =
        type === 'in'
          ? `Entrada registrada com sucesso às ${timeStr}`
          : `Saída registrada com sucesso às ${timeStr}`

      return { success: true, flag, message, log: newLog as TimeLog }
    } catch (err) {
      console.error('Erro ao registrar ponto:', err)
      set({ isLoading: false })
      return { success: false, message: 'Erro ao registrar ponto. Tente novamente.' }
    }
  },

  requestOvertime: async (durationMinutes: number): Promise<boolean> => {
    const { currentUser } = get()
    if (!currentUser) return false
    if (durationMinutes > 105) return false

    try {
      const today = new Date().toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('overtime_requests')
        .insert({
          user_id: currentUser.id,
          date: today,
          duration_minutes: durationMinutes,
          status: 'pending',
        })
        .select()
        .single()

      if (error) throw error

      set((state) => ({ overtimeRequests: [data as OvertimeRequest, ...state.overtimeRequests] }))
      return true
    } catch (err) {
      console.error('Erro ao solicitar HE:', err)
      return false
    }
  },

  // ── Admin Actions ────────────────────────────────────────────

  approveOvertime: async (requestId: string): Promise<boolean> => {
    const { currentUser } = get()
    if (!currentUser || currentUser.role !== 'admin') return false

    try {
      const request = get().overtimeRequests.find((r) => r.id === requestId)
      if (!request) return false

      // Regra: só D-0, D-1 e D-2
      const requestDate = new Date(request.date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const diffDays = Math.floor((today.getTime() - requestDate.getTime()) / 86400000)
      if (diffDays > 2) return false

      const { error } = await supabase
        .from('overtime_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: currentUser.id,
        })
        .eq('id', requestId)

      if (error) throw error

      set((state) => ({
        overtimeRequests: state.overtimeRequests.map((r) =>
          r.id === requestId
            ? { ...r, status: 'approved', reviewed_at: new Date().toISOString() }
            : r
        ),
      }))
      return true
    } catch (err) {
      console.error('Erro ao aprovar HE:', err)
      return false
    }
  },

  rejectOvertime: async (requestId: string): Promise<boolean> => {
    const { currentUser } = get()
    if (!currentUser || currentUser.role !== 'admin') return false

    try {
      const { error } = await supabase
        .from('overtime_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: currentUser.id,
        })
        .eq('id', requestId)

      if (error) throw error

      set((state) => ({
        overtimeRequests: state.overtimeRequests.map((r) =>
          r.id === requestId
            ? { ...r, status: 'rejected', reviewed_at: new Date().toISOString() }
            : r
        ),
      }))
      return true
    } catch (err) {
      console.error('Erro ao rejeitar HE:', err)
      return false
    }
  },

  // Cria utilizador: tenta Edge Function primeiro, depois fallback via Admin REST API
  createUser: async (name: string, cpf?: string): Promise<number | null> => {
    const { currentUser } = get()
    if (!currentUser || currentUser.role !== 'admin') return null

    try {
      // 1ª tentativa: Edge Function "create-user"
      const result = await callEdgeFunction('create-user', { name, cpf: cpf ?? null })
      if (result.ok) {
        const json = result.data as { matricula: number }
        // Garantir nome e CPF correctos (edge function pode ter nome padrão)
        await supabase
          .from('profiles')
          .update({ name, cpf: cpf ?? null })
          .eq('matricula', json.matricula)
        await get().fetchProfiles()
        return json.matricula
      }
      console.warn('Edge Function "create-user" falhou, tentando fallback directo:', result.error)

      // 2ª tentativa: Admin REST API (requer VITE_SUPABASE_SERVICE_ROLE_KEY no .env.local)
      const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string | undefined
      if (!serviceKey) {
        console.error(
          'Fallback falhou: adicione VITE_SUPABASE_SERVICE_ROLE_KEY ao .env.local\n' +
          'Ou implante a Edge Function "create-user" no Supabase.'
        )
        return null
      }

      // Calcular próxima matrícula usando TODOS os perfis
      const allProfiles = get().profiles
      const nextMat = allProfiles.length > 0
        ? Math.max(...allProfiles.map((p) => p.matricula)) + 1
        : 1
      const email = `${nextMat}@a2datapoint.internal`
      const password = String(nextMat)

      // Criar utilizador no Supabase Auth via Admin API
      const authRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL as string}/auth/v1/admin/users`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
          },
          body: JSON.stringify({ email, password, email_confirm: true }),
        }
      )

      if (!authRes.ok) {
        const errBody = await authRes.json().catch(() => ({}))
        console.error('Admin REST API falhou ao criar auth user:', errBody)
        return null
      }

      const authUser = (await authRes.json()) as { id: string }

      // Upsert do perfil — caso já exista (criado por trigger com nome padrão),
      // actualiza com o nome e CPF correctos
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          { id: authUser.id, matricula: nextMat, name, cpf: cpf ?? null, role: 'employee', is_first_access: true },
          { onConflict: 'id' }
        )

      if (profileError) {
        // Último recurso: UPDATE directo
        await supabase
          .from('profiles')
          .update({ name, cpf: cpf ?? null, matricula: nextMat, is_first_access: true })
          .eq('id', authUser.id)
      }

      await get().fetchProfiles()
      return nextMat
    } catch (err) {
      console.error('Erro ao criar utilizador:', err)
      return null
    }
  },

  // CORRIGIDO: usa Edge Function delete-user (apaga do auth.users em cascata)
  deleteUser: async (userId: string): Promise<boolean> => {
    const { currentUser } = get()
    if (!currentUser || currentUser.role !== 'admin') return false

    try {
      // 1ª tentativa: Edge Function "delete-user"
      const result = await callEdgeFunction('delete-user', { userId })
      if (result.ok) {
        set((state) => ({
          profiles: state.profiles.filter((p) => p.id !== userId),
          shifts: state.shifts.filter((s) => s.user_id !== userId),
          timeLogs: state.timeLogs.filter((l) => l.user_id !== userId),
          overtimeRequests: state.overtimeRequests.filter((r) => r.user_id !== userId),
        }))
        return true
      }
      console.warn('Edge Function "delete-user" falhou, tentando fallback:', result.error)

      // 2ª tentativa: Admin REST API
      const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string | undefined
      if (!serviceKey) {
        console.error('Adicione VITE_SUPABASE_SERVICE_ROLE_KEY ao .env.local')
        return false
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL as string}/auth/v1/admin/users/${userId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
          },
        }
      )
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        console.error('Admin REST API falhou ao excluir utilizador:', errBody)
        return false
      }

      // Garantir remoção do perfil (em cascata deve apagar, mas como segurança)
      await supabase.from('profiles').delete().eq('id', userId)

      set((state) => ({
        profiles: state.profiles.filter((p) => p.id !== userId),
        shifts: state.shifts.filter((s) => s.user_id !== userId),
        timeLogs: state.timeLogs.filter((l) => l.user_id !== userId),
        overtimeRequests: state.overtimeRequests.filter((r) => r.user_id !== userId),
      }))
      return true
    } catch (err) {
      console.error('Erro ao excluir utilizador:', err)
      return false
    }
  },

  // CORRIGIDO: usa Edge Function reset-password com fallback via Admin REST API
  resetUserPassword: async (userId: string): Promise<boolean> => {
    const { currentUser } = get()
    if (!currentUser || currentUser.role !== 'admin') return false

    try {
      // 1ª tentativa: Edge Function "reset-password"
      const result = await callEdgeFunction('reset-password', { userId })
      if (result.ok) {
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === userId ? { ...p, is_first_access: true } : p
          ),
        }))
        return true
      }
      console.warn('Edge Function "reset-password" falhou, tentando fallback:', result.error)

      // 2ª tentativa: Admin REST API
      const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string | undefined
      if (!serviceKey) {
        console.error('Adicione VITE_SUPABASE_SERVICE_ROLE_KEY ao .env.local')
        return false
      }

      const profile = get().profiles.find((p) => p.id === userId)
      if (!profile) return false

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL as string}/auth/v1/admin/users/${userId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
          },
          body: JSON.stringify({ password: String(profile.matricula) }),
        }
      )
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        console.error('Admin REST API falhou ao resetar senha:', errBody)
        return false
      }

      // Marcar is_first_access = true no perfil
      await supabase.from('profiles').update({ is_first_access: true }).eq('id', userId)

      set((state) => ({
        profiles: state.profiles.map((p) =>
          p.id === userId ? { ...p, is_first_access: true } : p
        ),
      }))
      return true
    } catch (err) {
      console.error('Erro ao resetar senha:', err)
      return false
    }
  },

  bulkAssignShifts: async (userIds, days, startTime, endTime): Promise<boolean> => {
    const { currentUser } = get()
    if (!currentUser || currentUser.role !== 'admin') return false

    try {
      const { error } = await supabase.rpc('bulk_assign_shifts', {
        p_user_ids: userIds,
        p_days: days,
        p_start_time: startTime,
        p_end_time: endTime,
      })
      if (error) throw error
      await get().fetchShifts()
      return true
    } catch (err) {
      console.error('Erro ao atribuir escalas:', err)
      return false
    }
  },

  // ── Data Fetching ────────────────────────────────────────────

  fetchProfiles: async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('matricula', { ascending: true })
    if (!error && data) set({ profiles: data })
    else if (error) console.error('fetchProfiles:', error.message)
  },

  fetchShifts: async () => {
    const { currentUser } = get()
    if (!currentUser) return

    let query = supabase.from('shifts').select('*')

    // Admin carrega todos; funcionário carrega apenas os seus
    if (currentUser.role !== 'admin') {
      query = query.eq('user_id', currentUser.id)
    }

    const { data, error } = await query.order('day_of_week', { ascending: true })
    if (!error && data) set({ shifts: data })
    else if (error) console.error('fetchShifts:', error.message)
  },

  fetchTimeLogs: async (fromDate?: Date) => {
    const from = fromDate ?? (() => {
      const d = new Date()
      d.setDate(d.getDate() - 7)
      return d
    })()

    const { data, error } = await supabase
      .from('time_logs')
      .select('*, profile:profiles(name, matricula)')
      .gte('timestamp', from.toISOString())
      .order('timestamp', { ascending: false })
      .limit(500)

    if (!error && data) set({ timeLogs: data as TimeLog[] })
    else if (error) console.error('fetchTimeLogs:', error.message)
  },

  fetchOvertimeRequests: async () => {
    const { data, error } = await supabase
      .from('overtime_requests')
      .select('*, profile:profiles(name, matricula)')
      .order('created_at', { ascending: false })
      .limit(200)

    if (!error && data) set({ overtimeRequests: data as OvertimeRequest[] })
    else if (error) console.error('fetchOvertimeRequests:', error.message)
  },

  // ── Selectors ────────────────────────────────────────────────

  getTodayLogs: () => {
    const today = new Date().toDateString()
    return get().timeLogs.filter(
      (l) => new Date(l.timestamp).toDateString() === today
    )
  },

  getUserTodayLastLog: () => {
    const { currentUser, timeLogs } = get()
    if (!currentUser) return null
    const today = new Date().toDateString()
    const userLogs = timeLogs
      .filter(
        (l) =>
          l.user_id === currentUser.id &&
          new Date(l.timestamp).toDateString() === today
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    return userLogs[0] ?? null
  },

  getUserShiftToday: () => {
    const { currentUser, shifts } = get()
    if (!currentUser) return null
    const todayDow = new Date().getDay()
    return (
      shifts.find(
        (s) => s.user_id === currentUser.id && s.day_of_week === todayDow
      ) ?? null
    )
  },

  getPendingOvertimeCount: () =>
    get().overtimeRequests.filter((r) => r.status === 'pending').length,
}))

// ── Restaurar sessão ao carregar a app ────────────────────────
supabase.auth.getSession().then(async ({ data: { session } }) => {
  if (session?.user) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (profile && !error) {
      const view: AppView =
        profile.is_first_access
          ? 'first-access'
          : profile.role === 'admin'
            ? 'admin'
            : 'employee-dashboard'

      useStore.setState({ currentUser: profile, currentView: view, isAuthLoading: false })

      const store = useStore.getState()
      if (profile.role === 'admin') {
        void store.fetchProfiles()
        void store.fetchTimeLogs()
        void store.fetchOvertimeRequests()
        void store.fetchShifts()
      } else {
        // BUG FIX: funcionário também precisa carregar os turnos
        void store.fetchShifts()
      }
    } else {
      // Sessão existente mas perfil não encontrado — limpar
      await supabase.auth.signOut()
      useStore.setState({ isAuthLoading: false })
    }
  } else {
    useStore.setState({ isAuthLoading: false })
  }
})

supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    useStore.setState({
      currentUser: null,
      currentView: 'login',
      adminView: 'dashboard',
      profiles: [],
      timeLogs: [],
      overtimeRequests: [],
      shifts: [],
    })
  }
})
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


// ============================================================
// Store
// ============================================================
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

  login: async (matricula: number, password: string): Promise<AuthResult> => {
    set({ isAuthLoading: true })
    try {
      // Email sintético para Supabase Auth
      const email = `${matricula}@a2datapoint.internal`

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error || !data.user) {
        set({ isAuthLoading: false })
        return { success: false, error: 'Matrícula ou senha incorretos.' }
      }

      // Buscar perfil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (profileError || !profile) {
        await supabase.auth.signOut()
        set({ isAuthLoading: false })
        return { success: false, error: 'Perfil não encontrado.' }
      }

      const nextView: AppView = profile.is_first_access
        ? 'first-access'
        : profile.role === 'admin'
          ? 'admin'
          : 'employee-dashboard'

      set({
        currentUser: profile,
        currentView: nextView,
        isAuthLoading: false,
      })

      // Pré-carregar dados se admin
      if (profile.role === 'admin') {
        get().fetchProfiles()
        get().fetchTimeLogs()
        get().fetchOvertimeRequests()
        get().fetchShifts()
      }

      return { success: true, user: profile, isFirstAccess: profile.is_first_access }
    } catch {
      set({ isAuthLoading: false })
      return { success: false, error: 'Erro de conexão. Tente novamente.' }
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
      // Atualizar password no Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({ password })
      if (authError) throw authError

      // Atualizar is_first_access no perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_first_access: false })
        .eq('id', currentUser.id)

      if (profileError) throw profileError

      const updatedUser = { ...currentUser, is_first_access: false }
      set({
        currentUser: updatedUser,
        currentView: 'employee-dashboard',
      })

      return true
    } catch (err) {
      console.error('Erro ao definir senha:', err)
      return false
    }
  },

  // ── Navigation ──────────────────────────────────────────────

  navigateTo: (view: AppView) => set({ currentView: view }),

  navigateAdmin: (view: AdminView) => set({ adminView: view }),

  // ── Time Registration ────────────────────────────────────────

  registerTime: async (type, photoDataUrl): Promise<PunchResult> => {
    const { currentUser } = get()
    if (!currentUser) return { success: false, message: 'Não autenticado' }

    set({ isLoading: true })

    try {
      // 1. Validar horário via RPC
      const { data: validationResult } = await supabase.rpc('validate_punch_time', {
        p_user_id: currentUser.id,
        p_type: type,
      })

      const flag: TimeLog['flag'] =
        validationResult === 'he_not_registered' ? 'he_not_registered' : null

      // 2. Upload da foto (se fornecida)
      let photoUrl: string | null = null
      if (photoDataUrl) {
        photoUrl = await uploadPhoto(currentUser.id, photoDataUrl)
      }

      // 3. Inserir log
      const { data: newLog, error } = await supabase
        .from('time_logs')
        .insert({
          user_id: currentUser.id,
          type,
          photo_url: photoUrl,
          flag,
        })
        .select()
        .single()

      if (error) throw error

      // Atualizar cache local
      set((state) => ({
        timeLogs: [newLog, ...state.timeLogs],
        isLoading: false,
      }))

      const message =
        type === 'in'
          ? `Entrada registrada com sucesso às ${new Date(newLog.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
          : `Saída registrada com sucesso às ${new Date(newLog.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`

      return { success: true, flag, message, log: newLog }
    } catch (err) {
      console.error('Erro ao registrar ponto:', err)
      set({ isLoading: false })
      return { success: false, message: 'Erro ao registrar ponto. Tente novamente.' }
    }
  },

  requestOvertime: async (durationMinutes: number): Promise<boolean> => {
    const { currentUser } = get()
    if (!currentUser) return false
    if (durationMinutes > 105) return false // máximo 1h45

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

      set((state) => ({
        overtimeRequests: [data, ...state.overtimeRequests],
      }))

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
      // Verificar se é D-0, D-1 ou D-2
      const request = get().overtimeRequests.find((r) => r.id === requestId)
      if (!request) return false

      const requestDate = new Date(request.date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const diffDays = Math.floor((today.getTime() - requestDate.getTime()) / 86400000)

      if (diffDays > 2) {
        console.warn('Aprovação apenas permitida para D-0, D-1 e D-2')
        return false
      }

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

  createUser: async (name: string): Promise<number | null> => {
    const { currentUser } = get()
    if (!currentUser || currentUser.role !== 'admin') return null

    try {
      // Calcular próxima matrícula
      const { data: maxProfile } = await supabase
        .from('profiles')
        .select('matricula')
        .order('matricula', { ascending: false })
        .limit(1)
        .single()

      const nextMatricula = (maxProfile?.matricula ?? 0) + 1
      const email = `${nextMatricula}@a2datapoint.internal`

      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL as string}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token ?? ''}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name, email }),
        }
      )

      if (!response.ok) throw new Error('Falha ao criar utilizador')

      const json = await response.json() as { matricula: number }
      await get().fetchProfiles()
      return json.matricula
    } catch (err) {
      console.error('Erro ao criar utilizador:', err)
      return null
    }
  },

  deleteUser: async (userId: string): Promise<boolean> => {
    const { currentUser } = get()
    if (!currentUser || currentUser.role !== 'admin') return false

    try {
      // Soft delete: apenas remover perfil (cascata remove dados relacionados)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (error) throw error

      set((state) => ({
        profiles: state.profiles.filter((p) => p.id !== userId),
        shifts: state.shifts.filter((s) => s.user_id !== userId),
        timeLogs: state.timeLogs.filter((l) => l.user_id !== userId),
        overtimeRequests: state.overtimeRequests.filter((r) => r.user_id !== userId),
      }))

      return true
    } catch (err) {
      console.error('Erro ao deletar utilizador:', err)
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

    if (!error && data) {
      set({ profiles: data })
    }
  },

  fetchShifts: async () => {
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .order('day_of_week', { ascending: true })

    if (!error && data) {
      set({ shifts: data })
    }
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

    if (!error && data) {
      set({ timeLogs: data as TimeLog[] })
    }
  },

  fetchOvertimeRequests: async () => {
    const { data, error } = await supabase
      .from('overtime_requests')
      .select('*, profile:profiles(name, matricula)')
      .order('created_at', { ascending: false })
      .limit(200)

    if (!error && data) {
      set({ overtimeRequests: data as OvertimeRequest[] })
    }
  },

  // ── Selectors ─────────────────────────────────────────────────

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
    return shifts.find(
      (s) => s.user_id === currentUser.id && s.day_of_week === todayDow
    ) ?? null
  },

  getPendingOvertimeCount: () =>
    get().overtimeRequests.filter((r) => r.status === 'pending').length,
}))

// ── Inicialização: restaurar sessão ───────────────────────────
supabase.auth.getSession().then(async ({ data: { session } }) => {
  if (session?.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (profile) {
      const view: AppView =
        profile.is_first_access
          ? 'first-access'
          : profile.role === 'admin'
            ? 'admin'
            : 'employee-dashboard'

      useStore.setState({ currentUser: profile, currentView: view, isAuthLoading: false })

      if (profile.role === 'admin') {
        const store = useStore.getState()
        store.fetchProfiles()
        store.fetchTimeLogs()
        store.fetchOvertimeRequests()
        store.fetchShifts()
      }
    } else {
      useStore.setState({ isAuthLoading: false })
    }
  } else {
    useStore.setState({ isAuthLoading: false })
  }
})

// Escutar mudanças de auth
supabase.auth.onAuthStateChange(async (event) => {
  if (event === 'SIGNED_OUT') {
    useStore.setState({
      currentUser: null,
      currentView: 'login',
      profiles: [],
      timeLogs: [],
      overtimeRequests: [],
      shifts: [],
    })
  }
})
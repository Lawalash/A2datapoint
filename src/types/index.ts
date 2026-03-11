// src/types/index.ts

export type AppView = 'login' | 'first-access' | 'employee-dashboard' | 'admin'
export type AdminView = 'dashboard' | 'users' | 'shifts' | 'monitoring' | 'overtime' | 'reports' | 'storage'

export interface Profile {
  id: string
  matricula: number
  name: string
  cpf: string | null
  role: 'admin' | 'employee'
  is_first_access: boolean
  created_at: string
  updated_at: string
}

export interface Shift {
  id: number
  user_id: string
  day_of_week: number
  start_time: string
  end_time: string
  lunch_duration_minutes: number
  created_at: string
  updated_at: string
}

export interface TimeLog {
  id: string
  user_id: string
  timestamp: string
  type: 'in' | 'out' | 'lunch_start' | 'lunch_end'
  photo_url: string | null
  flag: 'he_not_registered' | 'late' | 'early_exit' | 'logout_by_agent' | null
  note: string | null
  log_date: string
  created_at: string
  profile?: { name: string; matricula: number }
}

export interface OvertimeRequest {
  id: string
  user_id: string
  date: string
  duration_minutes: number
  status: 'pending' | 'approved' | 'rejected'
  note: string | null
  requested_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  created_at: string
  profile?: { name: string; matricula: number }
}

export interface AuthResult {
  success: boolean
  error?: string
  user?: Profile
  isFirstAccess?: boolean
}

export interface PunchResult {
  success: boolean
  message: string
  flag?: TimeLog['flag']
  log?: TimeLog
}

export interface AppState {
  currentUser: Profile | null
  currentView: AppView
  adminView: AdminView
  profiles: Profile[]
  shifts: Shift[]
  timeLogs: TimeLog[]
  overtimeRequests: OvertimeRequest[]
  isLoading: boolean
  isAuthLoading: boolean
  isLogsLoading: boolean // NEW: prevents race condition on page load

  // Auth
  login: (matricula: number, password: string, forceEmployeeView?: boolean) => Promise<AuthResult>
  logout: () => Promise<void>
  setFirstAccessComplete: (password: string) => Promise<boolean>

  // Navigation
  navigateTo: (view: AppView) => void
  navigateAdmin: (view: AdminView) => void

  // Time Registration
  registerTime: (type: 'in' | 'out', photoDataUrl?: string) => Promise<PunchResult>
  registerLunch: (type: 'lunch_start' | 'lunch_end') => Promise<PunchResult>
  requestOvertime: (durationMinutes: number) => Promise<boolean>
  registerLogoutByAgent: (userId: string) => Promise<boolean>

  // Admin Actions
  approveOvertime: (requestId: string) => Promise<boolean>
  rejectOvertime: (requestId: string) => Promise<boolean>
  createUser: (name: string, cpf?: string) => Promise<number | null>
  deleteUser: (userId: string) => Promise<boolean>
  resetUserPassword: (userId: string) => Promise<boolean>
  bulkAssignShifts: (
    userIds: string[],
    days: number[],
    startTime: string,
    endTime: string,
    lunchDurationMinutes?: number
  ) => Promise<boolean>

  // Data Fetching
  fetchProfiles: () => Promise<void>
  fetchShifts: () => Promise<void>
  fetchTimeLogs: (fromDate?: Date) => Promise<void>
  fetchOvertimeRequests: () => Promise<void>

  // Selectors
  getTodayLogs: () => TimeLog[]
  getUserTodayLastLog: () => TimeLog | null
  getUserShiftToday: () => Shift | null
  getPendingOvertimeCount: () => number
}
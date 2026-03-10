// Tipos do Sistema de Controle de Ponto

export interface User {
  id: number;
  name: string;
  password?: string;
  isFirstAccess: boolean;
  role: 'employee' | 'admin';
  createdAt: Date;
}

export interface TimeRecord {
  id: string;
  userId: number;
  userName: string;
  timestamp: Date;
  type: 'in' | 'out';
  photo?: string;
}

export interface OvertimeRequest {
  id: string;
  userId: number;
  userName: string;
  date: Date;
  duration: number; // em minutos
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Date;
}

export interface WorkSchedule {
  userId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface DailyReport {
  userId: number;
  userName: string;
  date: Date;
  scheduledStart: string;
  scheduledEnd: string;
  actualFirstIn?: Date;
  actualLastOut?: Date;
  overtimeApproved: number;
  overtimePending: number;
  status: 'present' | 'absent' | 'late' | 'early_exit';
}

export type View = 'login' | 'first-access' | 'employee-dashboard' | 'admin-dashboard' | 'admin-users' | 'admin-monitoring' | 'admin-overtime' | 'admin-reports' | 'admin-storage';

export interface AppState {
  currentUser: User | null;
  currentView: View;
  users: User[];
  timeRecords: TimeRecord[];
  overtimeRequests: OvertimeRequest[];
  workSchedules: WorkSchedule[];
  
  // Actions
  login: (id: number, password: string) => boolean;
  logout: () => void;
  setFirstAccessComplete: (id: number, password: string) => void;
  registerTime: (userId: number, type: 'in' | 'out', photo?: string) => void;
  requestOvertime: (userId: number, duration: number) => void;
  approveOvertime: (requestId: string) => void;
  rejectOvertime: (requestId: string) => void;
  createUser: (name: string) => number;
  deleteUser: (id: number) => void;
  getNextUserId: () => number;
  getTodayRecords: () => TimeRecord[];
  getOvertimeRequestsByDate: (date: Date) => OvertimeRequest[];
  getStorageUsage: () => number;
  clearOldPhotos: () => void;
  navigateTo: (view: View) => void;
}

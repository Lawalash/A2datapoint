export type UserRole = 'Master' | 'Administrador' | 'Enfermeira Chefe' | 'Enfermeiro' | 'ASG' | 'Colaborador';

export interface User {
  id: string;
  username: string;
  password?: string;
  displayName: string;
  role: UserRole;
  cargo?: string; // Add cargo
  route: string;
  workSchedule?: string; // e.g. "07:00-15:00", "19:00-07:00"
  mfaStatus?: 'not_required' | 'needs_enrollment' | 'pending_challenge' | 'verified' | 'error';
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  bedNumber: string;
  chronicDiseases: string[];
  dependencyGrade: 1 | 2 | 3;
}

export interface ClinicalRecord {
  id: string;
  dateTime: string;
  patientId: string;
  patientName: string;
  nurseName: string;
  pa: string;
  hgt: number;
  fc: number;
  fr: number;
  spo2: number;
  temp: number;
  symptoms: string[];
  pain: string;
  risk: string;
  generalState: string;
  feeding: string;
  hygiene: string[];
  eliminations: string[];
  skinDressing: string;
  observations: string;
}

export interface OvertimeRequest {
  id: string;
  employee: string;
  type: 'Compensação' | 'Hora Extra';
  justification: string;
  hours: number;
  status: 'Pendente' | 'Aprovada' | 'Reprovada' | 'Indevida';
}

export interface AttendanceRecord {
  id: string;
  employee: string;
  entry: string | null;
  exit: string | null;
  breakTime: string;
  total: string;
  status: 'Normal' | 'Atraso' | 'Falta';
}

export interface DischargeRecord {
  id: string;
  patientName: string;
  reason: 'Óbito' | 'Transferência' | 'Alta' | 'Outros';
  date: string;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

// --- A2 DataPoint Types ---

export interface DataPointEmployee extends User {
  matricula: string;
  pin: string;
  isActive: boolean;
  bancoHorasMinutos: number; // Saldo em minutos
  password_change_required?: boolean;
}

export type PunchType = 'ENTRADA' | 'SAIDA_ALMOCO' | 'RETORNO_ALMOCO' | 'SAIDA' | 'ENTRADA_EXTRA' | 'SAIDA_EXTRA';

export interface AttendancePunch {
  id: string;
  type: PunchType;
  time: string; // HH:mm format
  geolocationMockStatus: 'APPROVED' | 'PENDING' | 'REJECTED';
}

export interface DataPointAttendanceRecord extends AttendanceRecord {
  employeeId: string;
  date: string; // YYYY-MM-DD
  punches: AttendancePunch[];
}

export type RequestStatus = 'Pendente' | 'Aprovada' | 'Reprovada' | 'Indevida';

export interface DataPointOvertimeRequest extends OvertimeRequest {
  employeeId: string;
  date: string;
  adminJustification?: string;
}

export interface WorkSchedule {
  id: string;
  name: string;
  workDays: string[]; // e.g. ['Seg', 'Ter', 'Qua']
  entryTime: string;
  exitTime: string;
  breakDurationMinutes: number;
}

export interface InstitutionSettings {
  name: string;
  address: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  requirePhoto: boolean;
  requireGeoloc: boolean;
  
  entry_buffer_before_minutes?: number;
  entry_buffer_after_minutes?: number;
  exit_buffer_before_minutes?: number;
  exit_buffer_after_minutes?: number;
  lunch_start_buffer_before_minutes?: number;
  lunch_start_buffer_after_minutes?: number;
  lunch_return_buffer_before_minutes?: number;
  lunch_return_buffer_after_minutes?: number;
}

export interface HourBankBalance {
  employeeId: string;
  balanceMinutes: number;
}

export type AlertType = 'unauthorized_overtime' | 'break_exceeded' | 'open_lunch' | 'manual_note';
export type AlertStatus = 'open' | 'resolved' | 'partially_resolved' | 'dismissed';
export type ResolutionAction = 'approved' | 'partially_approved' | 'dismissed' | 'warned' | 'acknowledged';

export interface AttendanceAlert {
  id: string;
  organization_id: string;
  employee_id: string;
  summary_id?: string;
  alert_type: AlertType;
  alert_date: string;
  detected_minutes: number;
  status: AlertStatus;
  resolution_action?: ResolutionAction;
  regularized_minutes?: number;
  admin_notes?: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

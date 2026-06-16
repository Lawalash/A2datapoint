import type { User, Patient, ClinicalRecord, OvertimeRequest, AttendanceRecord, DischargeRecord } from '@/types';

export let mockUsers: User[] = [
  { id: '1', username: 'admin', password: 'admin', displayName: 'Admin A2', role: 'Administrador', route: '/admin', workSchedule: '08:00-17:00' },
  { id: '2', username: 'enfermchefe', password: 'enfermchefe', displayName: 'Dra. Carla Mendes', role: 'Enfermeira Chefe', route: '/enfermeira-chefe', workSchedule: '07:00-15:00' },
  { id: '3', username: 'enfermeiro', password: 'enfermeiro', displayName: 'Enf. Roberto Silva', role: 'Enfermeiro', route: '/enfermeiro', workSchedule: '07:00-15:00' },
  { id: '4', username: '4', password: '4', displayName: 'João Limpeza', role: 'ASG', route: '/ponto-tablet', workSchedule: '06:00-14:00' },
  { id: '5', username: '5', password: '5', displayName: 'Maria Auxiliar', role: 'ASG', route: '/ponto-tablet', workSchedule: '14:00-22:00' },
  { id: '6', username: '123456', password: '123', displayName: 'Colaborador Teste', role: 'Colaborador', route: '/meu-ponto', workSchedule: '08:00-17:00' },
];

export let mockPatients: Patient[] = [
  { id: '1', name: 'José da Silva', age: 78, bedNumber: 'A-12', chronicDiseases: ['Hipertensão', 'Diabetes'], dependencyGrade: 2 },
  { id: '2', name: 'Maria Oliveira', age: 82, bedNumber: 'B-05', chronicDiseases: ['Demência', 'Diabetes'], dependencyGrade: 3 },
  { id: '3', name: 'Antônio Pereira', age: 75, bedNumber: 'A-08', chronicDiseases: ['Nenhum'], dependencyGrade: 1 },
  { id: '4', name: 'Ana Paula Souza', age: 69, bedNumber: 'C-15', chronicDiseases: ['Metástase', 'Hipertensão'], dependencyGrade: 3 },
  { id: '5', name: 'Francisco Lima', age: 85, bedNumber: 'B-22', chronicDiseases: ['Diabetes', 'Demência'], dependencyGrade: 3 },
  { id: '6', name: 'Rosa Mendes', age: 71, bedNumber: 'A-03', chronicDiseases: ['Hipertensão'], dependencyGrade: 1 },
  { id: '7', name: 'Carlos Eduardo', age: 80, bedNumber: 'C-08', chronicDiseases: ['Nenhum'], dependencyGrade: 1 },
  { id: '8', name: 'Sebastiana Rocha', age: 77, bedNumber: 'B-11', chronicDiseases: ['Diabetes'], dependencyGrade: 2 },
];

export let mockClinicalRecords: ClinicalRecord[] = [
  {
    id: '1', dateTime: '24/04/2026 08:30', patientId: '1', patientName: 'José da Silva',
    nurseName: 'Enf. Carlos', pa: '130x80', hgt: 110, fc: 78, fr: 16, spo2: 97, temp: 36.5,
    symptoms: ['Nenhum'], pain: 'Nenhuma', risk: 'Pouco Urgente',
    generalState: 'Lúcido', feeding: 'Aceitou bem as refeições',
    hygiene: ['Banho realizado', 'Higiene íntima', 'Mudança de decúbito'],
    eliminations: ['Diurese', 'Evacuação'], skinDressing: 'Não possui',
    observations: 'Paciente estável, boa interação com a equipe.'
  },
  {
    id: '2', dateTime: '24/04/2026 08:15', patientId: '2', patientName: 'Maria Oliveira',
    nurseName: 'Téc. Ana', pa: '140x90', hgt: 145, fc: 82, fr: 18, spo2: 95, temp: 37.2,
    symptoms: ['Febre', 'Mialgia'], pain: 'Moderada', risk: 'Urgente',
    generalState: 'Confuso', feeding: 'Aceitação parcial',
    hygiene: ['Troca de fralda', 'Hidratação de pele'],
    eliminations: ['Diurese'], skinDressing: 'Realizado',
    observations: 'Febre controlada com antitérmico. Aguardando evolução.'
  },
  {
    id: '3', dateTime: '24/04/2026 07:45', patientId: '4', patientName: 'Ana Paula Souza',
    nurseName: 'Enf. Roberto', pa: '120x70', hgt: 95, fc: 88, fr: 20, spo2: 92, temp: 36.8,
    symptoms: ['Cefaleia', 'Náusea'], pain: 'Intensa', risk: 'Muito Urgente',
    generalState: 'Tardio', feeding: 'Recusou',
    hygiene: ['Banho realizado'],
    eliminations: ['Constipação'], skinDressing: 'Realizado',
    observations: 'Dor intensa relatada. Médico notificado para avaliação.'
  },
  {
    id: '4', dateTime: '24/04/2026 07:20', patientId: '3', patientName: 'Antônio Pereira',
    nurseName: 'Téc. Bruno', pa: '125x75', hgt: 100, fc: 72, fr: 14, spo2: 98, temp: 36.4,
    symptoms: ['Nenhum'], pain: 'Nenhuma', risk: 'Não Urgente',
    generalState: 'Lúcido', feeding: 'Aceitou bem as refeições',
    hygiene: ['Banho realizado', 'Higiene íntima', 'Troca de fralda', 'Mudança de decúbito'],
    eliminations: ['Diurese', 'Evacuação'], skinDressing: 'Não possui',
    observations: 'Paciente estável, bom humor, participou da fisioterapia.'
  },
  {
    id: '5', dateTime: '23/04/2026 19:00', patientId: '5', patientName: 'Francisco Lima',
    nurseName: 'Enf. Maria', pa: '150x95', hgt: 180, fc: 90, fr: 22, spo2: 93, temp: 37.5,
    symptoms: ['Febre', 'Diarreia', 'Distensão Abdominal'], pain: 'Moderada', risk: 'Emergência',
    generalState: 'Agitado', feeding: 'Recusou',
    hygiene: ['Troca de fralda'],
    eliminations: ['Diarreia'], skinDressing: 'Não realizado',
    observations: 'Paciente agitado, febre persistente. Equipe médica acionada.'
  },
  {
    id: '6', dateTime: '23/04/2026 18:30', patientId: '6', patientName: 'Rosa Mendes',
    nurseName: 'Téc. Ana', pa: '135x85', hgt: 120, fc: 76, fr: 17, spo2: 96, temp: 36.6,
    symptoms: ['Vertigem'], pain: 'Leve', risk: 'Pouco Urgente',
    generalState: 'Lúcido', feeding: 'Aceitação parcial',
    hygiene: ['Banho realizado', 'Hidratação de pele'],
    eliminations: ['Diurese'], skinDressing: 'Não possui',
    observations: 'Queixa de tontura ao levantar. Orientada a chamar a equipe.'
  },
];

export let mockOvertimeRequests: OvertimeRequest[] = [
  { id: '1', employee: 'Maria Santos', type: 'Compensação', justification: 'Folga médica', hours: 4, status: 'Pendente' },
  { id: '2', employee: 'João Silva', type: 'Hora Extra', justification: 'Cobertura plantão', hours: 2, status: 'Pendente' },
  { id: '3', employee: 'Ana Paula', type: 'Compensação', justification: '-', hours: 6, status: 'Indevida' },
  { id: '4', employee: 'Pedro Costa', type: 'Hora Extra', justification: 'Emergência', hours: 3, status: 'Aprovada' },
  { id: '5', employee: 'Juliana Martins', type: 'Compensação', justification: 'Congresso', hours: 8, status: 'Pendente' },
];

export const mockAttendanceRecords: AttendanceRecord[] = [
  { id: '1', employee: 'Maria Santos', entry: '06:55', exit: '15:05', breakTime: '1h', total: '8h10m', status: 'Normal' },
  { id: '2', employee: 'João Silva', entry: '07:10', exit: null, breakTime: '1h', total: '-', status: 'Atraso' },
  { id: '3', employee: 'Ana Paula', entry: '06:45', exit: '14:50', breakTime: '1h', total: '8h05m', status: 'Normal' },
  { id: '4', employee: 'Pedro Costa', entry: '-', exit: '-', breakTime: '-', total: '-', status: 'Falta' },
  { id: '5', employee: 'Juliana Martins', entry: '07:00', exit: null, breakTime: '1h', total: '-', status: 'Normal' },
  { id: '6', employee: 'Roberto Alves', entry: '18:45', exit: null, breakTime: '1h', total: '-', status: 'Normal' },
  { id: '7', employee: 'Fernanda Lima', entry: '19:05', exit: null, breakTime: '1h', total: '-', status: 'Atraso' },
  { id: '8', employee: 'Carlos Mendes', entry: '06:50', exit: '15:00', breakTime: '1h', total: '8h10m', status: 'Normal' },
];

export let mockDischarges: DischargeRecord[] = [
  { id: '1', patientName: 'Geraldo Pereira', reason: 'Óbito', date: '15/04/2026' },
  { id: '2', patientName: 'Sônia Maria', reason: 'Transferência', date: '20/04/2026' },
];

export const diseaseColorMap: Record<string, { bg: string; text: string }> = {
  'Diabetes': { bg: 'bg-blue-100', text: 'text-blue-800' },
  'Hipertensão': { bg: 'bg-purple-100', text: 'text-purple-800' },
  'Demência': { bg: 'bg-orange-100', text: 'text-orange-800' },
  'Metástase': { bg: 'bg-red-100', text: 'text-red-800' },
  'Nenhum': { bg: 'bg-gray-100', text: 'text-gray-600' },
};

export const riskColorMap: Record<string, { bg: string; text: string; border: string }> = {
  'Não Urgente': { bg: 'bg-[#28A745]', text: 'text-white', border: 'border-[#28A745]' },
  'Pouco Urgente': { bg: 'bg-[#6C757D]', text: 'text-white', border: 'border-[#6C757D]' },
  'Urgente': { bg: 'bg-[#F0AD4E]', text: 'text-white', border: 'border-[#F0AD4E]' },
  'Muito Urgente': { bg: 'bg-[#DC3545]', text: 'text-white', border: 'border-[#DC3545]' },
  'Emergência': { bg: 'bg-[#8B0000]', text: 'text-white', border: 'border-[#8B0000]' },
};

export const dependencyGradeMap: Record<number, { label: string; tag: string; bg: string; text: string }> = {
  1: { label: 'Grau I', tag: 'Independente', bg: 'bg-[#28A745]/15', text: 'text-[#28A745]' },
  2: { label: 'Grau II', tag: 'Dependência Parcial', bg: 'bg-[#F0AD4E]/15', text: 'text-[#F0AD4E]' },
  3: { label: 'Grau III', tag: 'Dependência Total', bg: 'bg-[#DC3545]/15', text: 'text-[#DC3545]' },
};

export const mockWeeklyAttendance = [
  { date: '21/04/2026', entry: '06:55', lunchOut: '12:00', lunchReturn: '13:00', exit: '15:05', total: '8h10m', status: 'Normal' as const },
  { date: '22/04/2026', entry: '07:08', lunchOut: '12:05', lunchReturn: '13:05', exit: '15:10', total: '8h02m', status: 'Atraso' as const },
  { date: '23/04/2026', entry: '06:50', lunchOut: '12:00', lunchReturn: '13:00', exit: '15:00', total: '8h10m', status: 'Normal' as const },
  { date: '24/04/2026', entry: '07:00', lunchOut: '-', lunchReturn: '-', exit: '-', total: '-', status: 'Normal' as const },
  { date: '25/04/2026', entry: '-', lunchOut: '-', lunchReturn: '-', exit: '-', total: '-', status: 'Falta' as const },
];

export const mockMyOvertimeRequests = [
  { id: '1', date: '14/04/2026', type: 'Hora Extra' as const, hours: 2, justification: 'Cobertura plantão noturno', status: 'Aprovada' as const },
  { id: '2', date: '18/04/2026', type: 'Compensação' as const, hours: 4, justification: 'Consulta médica', status: 'Pendente' as const },
  { id: '3', date: '20/04/2026', type: 'Hora Extra' as const, hours: 3, justification: 'Emergência na ala B', status: 'Reprovada' as const },
  { id: '4', date: '22/04/2026', type: 'Compensação' as const, hours: 8, justification: 'Folga aniversário', status: 'Pendente' as const },
];

export const updateOvertimeStatus = (id: string, status: 'Aprovada' | 'Reprovada') => {
  mockOvertimeRequests = mockOvertimeRequests.map(req =>
    req.id === id ? { ...req, status } : req
  );
};

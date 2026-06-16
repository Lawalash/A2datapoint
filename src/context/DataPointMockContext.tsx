import React, { createContext, useContext, useState, useEffect } from 'react';
import type { DataPointEmployee, DataPointAttendanceRecord, DataPointOvertimeRequest, WorkSchedule, InstitutionSettings, RequestStatus, PunchType } from '@/types';
import { mockUsers } from '@/data/mockData';

interface DataPointMockContextType {
  employees: DataPointEmployee[];
  attendanceRecords: DataPointAttendanceRecord[];
  requests: DataPointOvertimeRequest[];
  workSchedules: WorkSchedule[];
  institutionSettings: InstitutionSettings;
  registerPunch: (employeeId: string, type: PunchType, time: string) => void;
  createOvertimeRequest: (payload: Omit<DataPointOvertimeRequest, 'id' | 'status'>) => void;
  updateRequestStatus: (requestId: string, status: RequestStatus, adminJustification?: string) => void;
  createEmployee: (payload: Omit<DataPointEmployee, 'id'>) => void;
  updateEmployee: (payload: Partial<DataPointEmployee> & { id: string }) => void;
  deactivateEmployee: (employeeId: string) => void;
  resetEmployeePin: (employeeId: string, newPin: string) => void;
  createWorkSchedule: (payload: Omit<WorkSchedule, 'id'>) => void;
  assignScheduleToEmployee: (scheduleId: string, employeeId: string) => void;
  updateInstitutionSettings: (payload: Partial<InstitutionSettings>) => void;
  getEmployeeHourBalance: (employeeId: string) => number;
  getEmployeeAttendanceHistory: (employeeId: string) => DataPointAttendanceRecord[];
}

const DataPointMockContext = createContext<DataPointMockContextType | undefined>(undefined);

export const DataPointMockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [employees, setEmployees] = useState<DataPointEmployee[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<DataPointAttendanceRecord[]>([]);
  const [requests, setRequests] = useState<DataPointOvertimeRequest[]>([]);
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([]);
  const [institutionSettings, setInstitutionSettings] = useState<InstitutionSettings>({
    name: 'Aconchego dos Avós',
    address: 'Rua das Flores, 123',
    lat: -23.55052,
    lng: -46.633308,
    radiusMeters: 100,
    requirePhoto: true,
    requireGeoloc: true
  });

  useEffect(() => {
    // Seed employees from mockUsers to share login credentials initially
    const initialEmployees: DataPointEmployee[] = mockUsers.map(u => ({
      ...u,
      matricula: u.username,
      pin: u.password || '1234',
      isActive: true,
      bancoHorasMinutos: u.role === 'Colaborador' ? 750 : 0
    }));
    setEmployees(initialEmployees);
  }, []);

  const registerPunch = (employeeId: string, type: PunchType, time: string) => {
    const today = new Date().toISOString().split('T')[0];
    setAttendanceRecords(prev => {
      const existingRecordIndex = prev.findIndex(r => r.employeeId === employeeId && r.date === today);
      if (existingRecordIndex !== -1) {
        const newRecords = [...prev];
        const record = { ...newRecords[existingRecordIndex] };
        record.punches = [...record.punches, { id: Math.random().toString(), type, time, geolocationMockStatus: 'APPROVED' }];
        
        // Update entry/exit for simplified display if needed
        if (type === 'ENTRADA') record.entry = time;
        if (type === 'SAIDA') record.exit = time;

        newRecords[existingRecordIndex] = record;
        return newRecords;
      } else {
        return [...prev, {
          id: Math.random().toString(),
          employeeId,
          employee: employeeId,
          entry: type === 'ENTRADA' ? time : null,
          exit: type === 'SAIDA' ? time : null,
          breakTime: '',
          total: '',
          date: today,
          status: 'Normal',
          punches: [{ id: Math.random().toString(), type, time, geolocationMockStatus: 'APPROVED' }]
        }];
      }
    });
  };

  const createOvertimeRequest = (payload: Omit<DataPointOvertimeRequest, 'id' | 'status'>) => {
    setRequests(prev => [...prev, { ...payload, id: Math.random().toString(), status: 'Pendente' }]);
  };

  const updateRequestStatus = (requestId: string, status: RequestStatus, adminJustification?: string) => {
    setRequests(prev => prev.map(req => {
      if (req.id === requestId) {
        if (status === 'Aprovada' && req.status !== 'Aprovada') {
          // Adiciona as horas ao banco de horas do funcionario
          setEmployees(emp => emp.map(e => e.id === req.employeeId ? { ...e, bancoHorasMinutos: e.bancoHorasMinutos + (req.hours * 60) } : e));
        }
        return { ...req, status, adminJustification };
      }
      return req;
    }));
  };

  const createEmployee = (payload: Omit<DataPointEmployee, 'id'>) => {
    const newEmp = { ...payload, id: payload.matricula };
    setEmployees(prev => [...prev, newEmp]);
    // Also push to mockUsers so AuthContext can log them in
    mockUsers.push({ ...newEmp, username: newEmp.matricula, password: newEmp.pin });
  };

  const updateEmployee = (payload: Partial<DataPointEmployee> & { id: string }) => {
    setEmployees(prev => prev.map(e => e.id === payload.id ? { ...e, ...payload } : e));
    const u = mockUsers.find(mu => mu.id === payload.id);
    if(u) {
      if (payload.matricula) u.username = payload.matricula;
      if (payload.pin) u.password = payload.pin;
      if (payload.displayName) u.displayName = payload.displayName;
      if (payload.role) u.role = payload.role;
    }
  };

  const deactivateEmployee = (employeeId: string) => {
    setEmployees(prev => prev.map(e => e.id === employeeId ? { ...e, isActive: false } : e));
  };

  const resetEmployeePin = (employeeId: string, newPin: string) => {
    setEmployees(prev => prev.map(e => e.id === employeeId ? { ...e, pin: newPin } : e));
    const u = mockUsers.find(mu => mu.id === employeeId);
    if (u) {
      u.password = newPin;
    }
  };

  const createWorkSchedule = (payload: Omit<WorkSchedule, 'id'>) => {
    setWorkSchedules(prev => [...prev, { ...payload, id: Math.random().toString() }]);
  };

  const assignScheduleToEmployee = (scheduleId: string, employeeId: string) => {
    const sched = workSchedules.find(s => s.id === scheduleId);
    if (sched) {
      setEmployees(prev => prev.map(e => e.id === employeeId ? { ...e, workSchedule: `${sched.entryTime}-${sched.exitTime}` } : e));
      const u = mockUsers.find(mu => mu.id === employeeId);
      if (u) {
        u.workSchedule = `${sched.entryTime}-${sched.exitTime}`;
      }
    }
  };

  const updateInstitutionSettings = (payload: Partial<InstitutionSettings>) => {
    setInstitutionSettings(prev => ({ ...prev, ...payload }));
  };

  const getEmployeeHourBalance = (employeeId: string) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp ? emp.bancoHorasMinutos : 0;
  };

  const getEmployeeAttendanceHistory = (employeeId: string) => {
    return attendanceRecords.filter(r => r.employeeId === employeeId);
  };

  return (
    <DataPointMockContext.Provider value={{
      employees, attendanceRecords, requests, workSchedules, institutionSettings,
      registerPunch, createOvertimeRequest, updateRequestStatus,
      createEmployee, updateEmployee, deactivateEmployee, resetEmployeePin,
      createWorkSchedule, assignScheduleToEmployee, updateInstitutionSettings,
      getEmployeeHourBalance, getEmployeeAttendanceHistory
    }}>
      {children}
    </DataPointMockContext.Provider>
  );
};

export const useDataPointMock = () => {
  const context = useContext(DataPointMockContext);
  if (!context) throw new Error('useDataPointMock must be used within DataPointMockProvider');
  return context;
};

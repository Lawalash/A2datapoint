import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/context/ToastContext';
import { useCameraCapture } from '@/hooks/useCameraCapture';
import { Cross, Calendar, X, CheckCircle, LogOut, Timer, ChevronLeft, ChevronRight, MapPin, List, FileText, Camera, Settings, Upload, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useDataPointMock } from '@/context/DataPointMockContext';
import { useAuth } from '@/context/AuthContext';
import { schedulesService } from '@/services/schedulesService';
import { settingsService } from '@/services/settingsService';
import { timeRulesService } from '@/services/timeRulesService';
import { supabase } from '@/lib/supabase';
import { currentBranding } from '@/config/productConfig';
import type { DataPointEmployee, PunchType } from '@/types';
import { calculateDistanceMeters, formatDistance } from '@/utils/distance';
import { getCurrentPositionSafe } from '@/utils/geolocation';
import { useAttendance } from '@/hooks/useAttendance';
import { validatePunchTimeWindow, getPunchWindowLabel } from '@/utils/timeRules';
import { attendanceService } from '@/services/attendanceService';
import { useHourBank } from '@/hooks/useHourBank';
import { calculateJourney, determineNextPunchAction, calculateConsumedBreakMinutes } from '@/utils/journeyCalculation';
import { isWorkDayByPattern, getNextWorkDate } from '@/utils/schedulePatternUtils';
import { useEmployeeRequests } from '@/hooks/useEmployeeRequests';
import { getLocalOperationDate } from '@/utils/dateUtils';
import { loadProfileAvatar, saveProfileAvatar, removeProfileAvatar as removeProfileAvatarUtil } from '@/utils/avatarUtils';
import { DayOffCard } from '@/components/Point/DayOffCard';

const TabletPonto: React.FC = () => {
  const [matricula, setMatricula] = useState('');
  const [senha, setSenha] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loggedUser, setLoggedUser] = useState<DataPointEmployee | null>(null);
  const [showCompModal, setShowCompModal] = useState(false);
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [compType, setCompType] = useState<'mesmo_dia' | 'futura'>('mesmo_dia');
  const [compDate, setCompDate] = useState('');
  const [compHours, setCompHours] = useState('');
  const [compJustification, setCompJustification] = useState('');
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [otDate, setOtDate] = useState('');
  const [otHoursNum, setOtHoursNum] = useState('');
  const [otMinsNum, setOtMinsNum] = useState('');
  const [otJustification, setOtJustification] = useState('');
  const { addToast } = useToast();
  const { cameraState, setCameraState, cameraError, photoBlob, photoDataUrl, videoRef, startCamera, stopCamera, capturePhoto, retakePhoto } = useCameraCapture();
  const { employees, registerPunch, createOvertimeRequest, getEmployeeAttendanceHistory, getEmployeeHourBalance, requests } = useDataPointMock();
  const { user: authUser, login: authLogin, logout: authLogout } = useAuth();
  const attendance = useAttendance();
  const hourBank = useHourBank();
  
  // Apenas chamamos o hook, a organização e id virão do loggedUser
  const empRequests = useEmployeeRequests(
    (loggedUser as any)?.organization_id, 
    loggedUser?.id
  );

  const [realSchedule, setRealSchedule] = useState<any>(null);
  const [orgConfig, setOrgConfig] = useState<any>(null);
  const [appConfig, setAppConfig] = useState<any>(null);
  const [empTimeRule, setEmpTimeRule] = useState<any>(null);
  const [authorizedHeMinutes, setAuthorizedHeMinutes] = useState(0);
  const [activeDrawer, setActiveDrawer] = useState<'acoes' | 'historico' | 'solicitacoes' | 'configuracoes' | null>(null);
  const [fabOpen, setFabOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (loggedUser?.id) {
      const savedAvatar = loadProfileAvatar(loggedUser.id);
      if (savedAvatar) setAvatarPreview(savedAvatar);
      else setAvatarPreview(null);
    }
  }, [loggedUser]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!loggedUser?.id) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setAvatarPreview(base64);
        saveProfileAvatar(loggedUser.id, base64);
        addToast('Foto de perfil salva!', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAvatar = () => {
    if (!loggedUser?.id) return;
    setAvatarPreview(null);
    removeProfileAvatarUtil(loggedUser.id);
    addToast('Foto de perfil removida.', 'info');
  };

  const activeTimeRuleConfig = empTimeRule ? { ...appConfig, ...empTimeRule } : appConfig;
  const isIndividualRule = !!empTimeRule;

  // Geo states
  const [geoState, setGeoState] = useState<'idle' | 'locating' | 'valid' | 'invalid' | 'error'>('idle');
  const [geoMessage, setGeoMessage] = useState('');
  const [geoData, setGeoData] = useState<any>(null);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync real user from AuthContext
  useEffect(() => {
    const fetchRealSchedule = async (employeeId: string) => {
      try {
        const schedule = await schedulesService.getEmployeeActiveSchedule(employeeId);
        setRealSchedule(schedule);
        return schedule;
      } catch (err) {
        console.error('Erro ao buscar escala:', err);
        return null;
      }
    };

    const fetchConfigs = async (orgId: string, employeeId: string) => {
      try {
        const { organization, appSettings } = await settingsService.getFullSettings(orgId);
        setOrgConfig(organization);
        setAppConfig(appSettings);
        
        try {
          const rule = await timeRulesService.getEmployeeTimeRule(employeeId);
          setEmpTimeRule(rule || null);
        } catch (err) {
          console.error('Erro ao buscar regra individual:', err);
          setEmpTimeRule(null);
        }
      } catch (err) {
        console.error('Erro ao buscar configs:', err);
      }
    };

    const fetchHe = async (employeeId: string) => {
      try {
        const { data } = await supabase
          .from('employee_requests')
          .select('minutes_requested')
          .eq('employee_id', employeeId)
          .eq('request_type', 'hora_extra')
          .eq('status', 'aprovada')
          .eq('target_date', getLocalOperationDate())
          .is('deleted_at', null);
          
        if (data && data.length > 0) {
          setAuthorizedHeMinutes(data.reduce((acc: number, curr: any) => acc + (curr.minutes_requested || 0), 0));
        } else {
          setAuthorizedHeMinutes(0);
        }
      } catch (e) { console.error(e); }
    };

    if (authUser && (authUser as any).isReal) {
      const orig = (authUser as any).originalEmployee;
      setLoggedUser({
        ...orig,
        id: authUser.id,
        displayName: authUser.displayName,
        matricula: authUser.username,
        role: authUser.role,
        isActive: true,
        isReal: true // Flag customizada para a tela
      } as any);
      
      fetchConfigs(orig.organization_id, authUser.id);
      
      fetchRealSchedule(authUser.id).then(sched => {
        attendance.refreshTodayRecords(authUser.id, sched);
      });
      
      hourBank.fetchBalance(authUser.id);
      hourBank.fetchTransactions(authUser.id);
      const serverDate = getLocalOperationDate();
      hourBank.fetchDailySummary(authUser.id, serverDate);
      fetchHe(authUser.id);
      
      empRequests.fetchRequests();

      if (orig.password_change_required) {
        setShowPasswordChangeModal(true);
      } else {
        setShowPasswordChangeModal(false);
      }
    } else if (!authUser && loggedUser && (loggedUser as any).isReal) {
      setLoggedUser(null);
      setRealSchedule(null);
    }
  }, [authUser]);

  // Removido log spam de DEV aqui

  const handleLogin = async () => {
    if (!matricula || !senha) { addToast('Preencha matrícula e senha', 'error'); return; }
    
    if (matricula.includes('@')) {
      addToast('Digite apenas sua matrícula.', 'error');
      return;
    }

    // Check if it's a numeric matricula (real or mock)
    const isNumeric = /^\d+$/.test(matricula);
    const mockEnabled = import.meta.env.VITE_ENABLE_DEMO_MOCK === 'true';
    const isRealColaborador = isNumeric && (!mockEnabled || matricula !== '123456');

    if (isRealColaborador) {
      try {
        const logged = await authLogin(matricula, senha);
        if (logged) {
          // O useEffect do AuthContext vai popular o loggedUser e abrir o modal se precisar.
        } else {
          addToast('Credenciais inválidas', 'error');
        }
      } catch (err: any) {
        addToast(err.message || 'Credenciais inválidas', 'error');
      }
      return;
    }

    if (mockEnabled) {
      // Fluxo Mock
      const user = employees.find(u => (u.matricula === matricula || u.id === matricula) && u.pin === senha);
      if (!user) { addToast('Credenciais inválidas', 'error'); return; }
      if (!user.isActive) { addToast('Colaborador inativo', 'error'); return; }
      setLoggedUser(user);
      addToast(`Bem-vindo(a), ${user.displayName}!`, 'success');
      return;
    }

    addToast('Credenciais inválidas', 'error');
  };

  const handleLogout = async () => {
    if (authUser && (authUser as any).isReal) {
      await authLogout();
    }
    setLoggedUser(null); 
    setRealSchedule(null);
    setOrgConfig(null);
    setAppConfig(null);
    setGeoState('idle');
    setGeoData(null);
    setMatricula(''); 
    setSenha(''); 
    setShowPasswordChangeModal(false);
  };

  const handlePasswordChange = async () => {
    if (!newPassword || newPassword.length < 6) {
      addToast('A nova senha deve ter no mínimo 6 caracteres', 'error');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      addToast('A nova senha e a confirmação não conferem', 'error');
      return;
    }
    if (newPassword === senha) {
      addToast('A nova senha não pode ser igual à senha temporária atual', 'error');
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-employee-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          action: 'complete_password_change',
          current_password: senha,
          new_password: newPassword
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Erro ao alterar senha');
      }

      addToast('Senha alterada com sucesso! Bem-vindo(a).', 'success');
      setShowPasswordChangeModal(false);
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      addToast(err.message || 'Erro de comunicação', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleRegister = () => {
    if (loggedUser?.workSchedule) {
      addToast(`Validando horário na escala: ${loggedUser.workSchedule}...`, 'info');
    }
    startCamera();
  };

  const handleConfirmPhoto = async () => {
    if (!photoBlob || !loggedUser) return;
    
    // Tratamento para usuário MOCK
    if (!(loggedUser as any).isReal) {
      setCameraState('success');
      setTimeout(() => {
        stopCamera();
        const history = getEmployeeAttendanceHistory(loggedUser.id);
        const today = getLocalOperationDate();
        const todayRecord = history.find(r => r.date === today);
        let punchType: PunchType = 'ENTRADA';
        if (todayRecord) {
          if (todayRecord.punches.length === 1) punchType = 'SAIDA_ALMOCO';
          else if (todayRecord.punches.length === 2) punchType = 'RETORNO_ALMOCO';
          else punchType = 'SAIDA';
        }
        registerPunch(loggedUser.id, punchType, format(new Date(), 'HH:mm'));
      }, 1500);
      return;
    }

    // Fluxo REAL
    if (!geoData) return;

    try {
      setCameraState('uploading');
      
      const punchInfo = determineNextPunchAction(attendance.records, realSchedule, authorizedHeMinutes);
      let punchType = punchInfo.nextPunchType as PunchType;
      
      if (import.meta.env.DEV) console.log(`[DEV][EXTRA] nextPunchType on submit:`, punchType);

      if ((punchType as string) === 'FINALIZADO') {
        addToast('Sua jornada já foi finalizada hoje.', 'error');
        setCameraState('idle');
        return;
      }

      const payload = {
        organization_id: (loggedUser as any).organization_id,
        employee_id: loggedUser.id,
        schedule_id: realSchedule?.employee_schedules?.schedule_id || null,
        punch_type: punchType,
        latitude: geoData.latitude,
        longitude: geoData.longitude,
        gps_accuracy: geoData.gps_accuracy,
        distance_from_base_meters: geoData.distance_from_base_meters,
        is_within_radius: geoData.is_within_radius,
        device_info: geoData.device_info,
        user_agent: geoData.user_agent,
        photo_required: orgConfig?.requirePhoto || true,
        photo_status: 'pending',
        geolocation_required: orgConfig?.requireGeoloc || false,
        geolocation_status: geoData ? 'APPROVED' : 'REJECTED'
      };

      const record = await attendance.registerPunch(payload as any, punchType);
      
      if (!record) {
        throw new Error('Falha ao salvar o ponto no banco.');
      }
      
      await attendanceService.uploadAttendancePhoto(
        record.id,
        (loggedUser as any).organization_id,
        loggedUser.id,
        nextPunchType,
        photoBlob
      );
      
      // Apuração Fase 5.2
      if (nextPunchType === 'SAIDA' || nextPunchType === 'SAIDA_EXTRA') {
        try {
          const freshRecords = await attendanceService.getTodayAttendanceRecords(loggedUser.id);
          const serverDate = getLocalOperationDate();
          
          // Buscar horas extras autorizadas para hoje
          let authorized_overtime_minutes = 0;
          try {
            const { data: heData } = await supabase
              .from('employee_requests')
              .select('minutes_requested')
              .eq('employee_id', loggedUser.id)
              .eq('request_type', 'hora_extra')
              .eq('status', 'aprovada')
              .eq('target_date', serverDate)
              .is('deleted_at', null);
              
            if (heData && heData.length > 0) {
              authorized_overtime_minutes = heData.reduce((acc: number, curr: any) => acc + (curr.minutes_requested || 0), 0);
            }
          } catch (e) {
             console.error('Erro ao buscar HE autorizada:', e);
          }

          const calcResult = calculateJourney({
            date: serverDate,
            records: freshRecords,
            schedule: realSchedule,
            timeRules: activeTimeRuleConfig,
            authorized_overtime_minutes
          });

          await hourBank.processEndOfDay({
            organization_id: (loggedUser as any).organization_id,
            employee_id: loggedUser.id,
            schedule_id: realSchedule?.employee_schedules?.schedule_id || null,
            server_date: serverDate,
            ...calcResult
          });
        } catch (calcErr) {
          console.error('Erro na apuração diária:', calcErr);
        }
      }

      setCameraState('success');
      setTimeout(() => {
        stopCamera();
        setGeoState('idle');
        setGeoData(null);
      }, 2000);
      
    } catch (err: any) {
      setCameraState('error');
      addToast(err.message || 'Erro ao registrar o ponto.', 'error');
    }
  };

  const handleCompSubmit = async () => {
    const isFutura = compType === 'futura';
    if (isFutura && !compDate) { 
      addToast('Selecione a data da folga.', 'error'); 
      return; 
    }
    const hoursNum = parseFloat(compHours);
    if (!hoursNum || hoursNum <= 0) {
      addToast('Informe a quantidade de horas.', 'error');
      return;
    }
    if (!compJustification.trim()) {
      addToast('Informe a justificativa.', 'error');
      return;
    }
    
    if (loggedUser && (loggedUser as any).isReal) {
      try {
        await empRequests.createRequest({
          request_type: isFutura ? 'folga' : 'compensacao',
          target_date: isFutura ? compDate : getLocalOperationDate(),
          minutes_requested: hoursNum * 60,
          justification: compJustification
        });
        setShowCompModal(false); setCompDate(''); setCompHours(''); setCompJustification(''); setCompType('mesmo_dia');
      } catch (err) {
        // erro ja tratado no hook
      }
    } else {
      createOvertimeRequest({ 
        employeeId: loggedUser!.id, 
        employee: loggedUser!.displayName, 
        type: isFutura ? 'Folga' as any : 'Compensação' as any, 
        justification: compJustification,
        hours: hoursNum,
        date: isFutura ? compDate : getLocalOperationDate() 
      });
      setShowCompModal(false); setCompDate(''); setCompHours(''); setCompJustification(''); setCompType('mesmo_dia');
      addToast(isFutura ? 'Solicitação de folga enviada!' : 'Solicitação de compensação enviada!', 'success');
    }
  };

  const handleOtSubmit = async () => {
    if (!otDate || (!otHoursNum && !otMinsNum)) { addToast('Preencha data e horas/minutos', 'error'); return; }
    
    const h = parseInt(otHoursNum || '0', 10);
    const m = parseInt(otMinsNum || '0', 10);
    
    if (h < 0 || m < 0 || m >= 60) {
      addToast('Horas devem ser >= 0 e minutos entre 0 e 59.', 'error');
      return;
    }
    
    const totalMinutes = (h * 60) + m;
    if (totalMinutes <= 0) {
      addToast('A quantidade de horas extras deve ser maior que zero.', 'error');
      return;
    }
    
    if (loggedUser && (loggedUser as any).isReal) {
      try {
        await empRequests.createRequest({
          request_type: 'hora_extra',
          target_date: otDate,
          minutes_requested: totalMinutes,
          justification: otJustification || 'Solicitação extra'
        });
        setShowOvertimeModal(false); setOtDate(''); setOtHoursNum(''); setOtMinsNum(''); setOtJustification('');
      } catch (err) {
        // erro ja tratado no hook
      }
    } else {
      let tipo = 'Hora Extra';
      if (totalMinutes > 105) { // 1h45 = 105 min
        tipo = 'Plantão Extra';
      }
      createOvertimeRequest({ 
        employeeId: loggedUser!.id, 
        employee: loggedUser!.displayName, 
        type: tipo as any, 
        justification: otJustification,
        hours: totalMinutes / 60,
        date: otDate 
      });
      setShowOvertimeModal(false); setOtDate(''); setOtHoursNum(''); setOtMinsNum(''); setOtJustification('');
      addToast(`Solicitação de ${tipo} enviada!`, 'success');
    }
  };

  // Calendar helper
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
  const calDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const today = new Date();
  const isToday = (d: number) => d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
  const weekends = calDays.filter(d => { const dow = new Date(calYear, calMonth, d).getDay(); return dow === 0 || dow === 6; });

  const inputClass = "w-full h-14 bg-[#F8F9FA] border-[1.5px] border-[#E5E5E5] rounded-xl text-center text-lg font-semibold text-[#1A1A1A] placeholder:text-[#CCC] focus:border-[#8BABC7] focus:ring-[3px] focus:ring-[#8BABC7]/25 outline-none transition-all";
  const modalInputClass = "w-full h-11 px-4 bg-[#F8F9FA] border-[1.5px] border-[#E5E5E5] rounded-[10px] text-sm text-[#1A1A1A] placeholder:text-[#999] focus:border-[#8BABC7] focus:ring-[3px] focus:ring-[#8BABC7]/25 outline-none transition-all";

  const todayStr = getLocalOperationDate();
  const [historyStart, setHistoryStart] = useState('');
  const [historyEnd, setHistoryEnd] = useState('');
  const [appliedHistoryStart, setAppliedHistoryStart] = useState('');
  const [appliedHistoryEnd, setAppliedHistoryEnd] = useState('');
  
  const [realHistoryRecords, setRealHistoryRecords] = useState<any[]>([]);
  const [realHistoryLoading, setRealHistoryLoading] = useState(false);

  const handleApplyHistoryFilter = async () => {
    if (historyStart && historyEnd && new Date(historyStart) > new Date(historyEnd)) {
      addToast('A data inicial não pode ser maior que a final.', 'error');
      return;
    }
    setAppliedHistoryStart(historyStart);
    setAppliedHistoryEnd(historyEnd);

    if (loggedUser && (loggedUser as any).isReal) {
      setRealHistoryLoading(true);
      try {
        const startDate = historyStart || todayStr;
        const endDate = historyEnd || todayStr;
        
        const { data: records, error: recordsError } = await supabase
          .from('attendance_records')
          .select('*')
          .eq('employee_id', loggedUser.id)
          .gte('server_date', startDate)
          .lte('server_date', endDate)
          .order('server_date', { ascending: false })
          .order('server_time', { ascending: false })
          .order('created_at', { ascending: false });

        if (recordsError) throw recordsError;

        const { data: summaries, error: sumError } = await supabase
          .from('attendance_daily_summaries')
          .select('*')
          .eq('employee_id', loggedUser.id)
          .gte('server_date', startDate)
          .lte('server_date', endDate)
          .order('server_date', { ascending: false });

        if (sumError) throw sumError;

        const grouped = (records || []).reduce((acc: any, rec: any) => {
          if (!acc[rec.server_date]) {
            acc[rec.server_date] = {
              date: rec.server_date,
              records: [],
              summary: summaries?.find(s => s.server_date === rec.server_date)
            };
          }
          acc[rec.server_date].records.push(rec);
          return acc;
        }, {});

        // Reverse records so they are chronological per day if we want (or keep reverse chronological)
        // Usually, inside a day it's better chronological
        Object.values(grouped).forEach((day: any) => {
          day.records.sort((a: any, b: any) => {
            if (a.server_time && b.server_time) return a.server_time.localeCompare(b.server_time);
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          });
        });

        if (import.meta.env.DEV) {
          console.log('[DEV][PONTO_HISTORY] employeeId', loggedUser.id);
          console.log('[DEV][PONTO_HISTORY] startDate', startDate);
          console.log('[DEV][PONTO_HISTORY] endDate', endDate);
          console.log('[DEV][PONTO_HISTORY] raw records count', records?.length);
          console.log('[DEV][PONTO_HISTORY] summaries count', summaries?.length);
          console.log('[DEV][PONTO_HISTORY] grouped days count', Object.keys(grouped).length);
        }

        setRealHistoryRecords(
          Object.values(grouped).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        );
      } catch (err) {
        console.error(err);
        addToast('Erro ao buscar histórico', 'error');
      } finally {
        setRealHistoryLoading(false);
      }
    }
  };

  const myHistory = loggedUser ? getEmployeeAttendanceHistory(loggedUser.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : [];
  const myRequests = loggedUser ? requests.filter(r => r.employeeId === loggedUser.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : [];

  const filteredHistory = myHistory.filter(rec => {
    if (!appliedHistoryStart && !appliedHistoryEnd) return rec.date === todayStr;
    const recTime = new Date(rec.date + 'T00:00:00').getTime();
    const start = appliedHistoryStart ? new Date(appliedHistoryStart + 'T00:00:00').getTime() : 0;
    const end = appliedHistoryEnd ? new Date(appliedHistoryEnd + 'T00:00:00').getTime() : Infinity;
    return recTime >= start && recTime <= end;
  });

  const todayRecord = myHistory.find(r => r.date === todayStr);

  let nextPunchType: PunchType | 'FINALIZADO' = 'ENTRADA';
  let punchButtonText = 'Registrar Entrada';


  const extractLunchInfo = (scheduleStr?: string, realSchedObj?: any) => {
    if (realSchedObj && realSchedObj.work_schedules) {
       const w = realSchedObj.work_schedules;
       const start = w.break_start_time?.substring(0,5) || '12:00';
       const end = w.break_end_time?.substring(0,5) || '13:00';
       if (w.break_duration_minutes !== undefined && w.break_duration_minutes !== null) {
           return { start, end, duration: w.break_duration_minutes };
       }
       if (w.break_start_time && w.break_end_time) {
           const [h1, m1] = start.split(':').map(Number);
           const [h2, m2] = end.split(':').map(Number);
           const duration = (h2 * 60 + m2) - (h1 * 60 + m1);
           return { start, end, duration: duration > 0 ? duration : 0 };
       }
       return { start, end, duration: 0 };
    }
    const match = scheduleStr?.match(/Almo\u00e7o:\s*(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
    if (match) {
      const start = match[1];
      const end = match[2];
      const [h1, m1] = start.split(':').map(Number);
      const [h2, m2] = end.split(':').map(Number);
      const duration = (h2 * 60 + m2) - (h1 * 60 + m1);
      return { start, end, duration: duration > 0 ? duration : 0 };
    }
    return { start: '12:00', end: '13:00', duration: 60 };
  };
  const lunchInfo = extractLunchInfo(loggedUser?.workSchedule, realSchedule);

  const actionInfo = determineNextPunchAction(attendance.records || [], realSchedule, authorizedHeMinutes);
  
  if (loggedUser && (loggedUser as any).isReal) {
    nextPunchType = actionInfo.nextPunchType as PunchType | 'FINALIZADO';
    punchButtonText = actionInfo.punchButtonText;
  } else {
    // Fluxo Mock mantido
    if (todayRecord) {
      if (todayRecord.punches.length === 1) {
        nextPunchType = 'SAIDA_ALMOCO';
        punchButtonText = 'Sair para Almoço';
      } else if (todayRecord.punches.length === 2) {
        nextPunchType = 'RETORNO_ALMOCO';
        punchButtonText = 'Retornar do Almoço';
      } else if (todayRecord.punches.length === 3) {
        nextPunchType = 'SAIDA';
        punchButtonText = 'Registrar Saída';
      } else {
        nextPunchType = 'FINALIZADO';
        punchButtonText = 'Jornada Finalizada';
      }
    }
  }



  const [lunchElapsed, setLunchElapsed] = useState(0);
  const [extraJourneyElapsed, setExtraJourneyElapsed] = useState(0);

  const currentDayStr = getLocalOperationDate();
  const isWorkDay = realSchedule?.work_schedules ? isWorkDayByPattern(currentDayStr, realSchedule.work_schedules) : true;
  const hasOpenShift = attendance.records?.some(r => r.punch_type === 'ENTRADA') && !attendance.records?.some(r => r.punch_type === 'SAIDA');
  const isDayOff = !isWorkDay && !hasOpenShift && loggedUser && (loggedUser as any).isReal;
  const nextWorkDate = isDayOff ? getNextWorkDate(realSchedule?.work_schedules, currentDayStr) : null;

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (nextPunchType === 'RETORNO_ALMOCO') {
      let outDate: Date | null = null;
      
      if (loggedUser && (loggedUser as any).isReal && attendance.records) {
        // Encontra o ÚLTIMO SAIDA_ALMOCO
        const sorted = [...attendance.records].sort((a,b) => new Date(a.punched_at || a.created_at).getTime() - new Date(b.punched_at || b.created_at).getTime());
        const lunchOutPunch = sorted.reverse().find(p => p.punch_type === 'SAIDA_ALMOCO');
        if (lunchOutPunch) {
          outDate = new Date(lunchOutPunch.punched_at || lunchOutPunch.created_at);
        }
      } else if (todayRecord) {
        const lunchOutPunch = todayRecord.punches.find(p => p.type === 'SAIDA_ALMOCO');
        if (lunchOutPunch) {
          const [h, m] = lunchOutPunch.time.split(':').map(Number);
          outDate = new Date();
          outDate.setHours(h, m, 0, 0);
        }
      }

      if (outDate) {
        timer = setInterval(() => {
          const now = new Date();
          const elapsedSecs = Math.floor((now.getTime() - outDate!.getTime()) / 1000);
          setLunchElapsed(Math.max(0, elapsedSecs));
        }, 1000);
      }
    } else if (nextPunchType === 'SAIDA_EXTRA') {
      let extraInDate: Date | null = null;
      if (loggedUser && (loggedUser as any).isReal && attendance.records) {
        const sorted = [...attendance.records].sort((a,b) => new Date(a.punched_at || a.created_at).getTime() - new Date(b.punched_at || b.created_at).getTime());
        const extraInPunch = sorted.find(p => p.punch_type === 'ENTRADA_EXTRA');
        if (extraInPunch) {
          extraInDate = new Date(extraInPunch.punched_at || extraInPunch.created_at);
        }
      }
      if (extraInDate) {
        timer = setInterval(() => {
          const now = new Date();
          const elapsedSecs = Math.floor((now.getTime() - extraInDate!.getTime()) / 1000);
          setExtraJourneyElapsed(Math.max(0, elapsedSecs));
        }, 1000);
      }
    }
    return () => clearInterval(timer);
  }, [nextPunchType, todayRecord, attendance.records, loggedUser]);

  const formatElapsed = (secs: number) => {
    const h = Math.floor(secs / 3600).toString().padStart(2, '0');
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const consumedLunchMinutes = calculateConsumedBreakMinutes(attendance.records || []);
  const totalCurrentLunchUsedSecs = (consumedLunchMinutes * 60) + lunchElapsed;
  const isOvertimeLunch = Math.floor(totalCurrentLunchUsedSecs / 60) > lunchInfo.duration;

  const validateLocation = async () => {
    if (!orgConfig?.base_latitude || !orgConfig?.base_longitude) {
      setGeoState('error');
      setGeoMessage('Localização base da instituição ainda não configurada. Procure o administrador.');
      return;
    }

    setGeoState('locating');
    setGeoMessage('Validando sua localização...');

    try {
      const position = await getCurrentPositionSafe();
      const distance = calculateDistanceMeters(
        position.latitude,
        position.longitude,
        orgConfig.base_latitude,
        orgConfig.base_longitude
      );

      const allowedRadius = orgConfig.allowed_radius_meters || appConfig?.default_allowed_radius_meters || 100;
      const isWithin = distance <= allowedRadius;

      setGeoData({
        latitude: position.latitude,
        longitude: position.longitude,
        gps_accuracy: position.accuracy,
        distance_from_base_meters: Math.round(distance),
        is_within_radius: isWithin,
        captured_at: new Date(position.timestamp).toISOString(),
        user_agent: navigator.userAgent
      });

      if (isWithin || appConfig?.require_geolocation === false) {
        setGeoState('valid');
        setGeoMessage('Localização validada com sucesso.');
      } else {
        setGeoState('invalid');
        setGeoMessage(`Fora do raio permitido. Você está a ${formatDistance(distance)} da base. Permitido: ${formatDistance(allowedRadius)}.`);
      }
    } catch (err: any) {
      setGeoState('error');
      setGeoMessage(err.message || 'Erro ao validar localização.');
    }
  };

  const handleRegisterClick = async () => {
    if (import.meta.env.DEV) console.log(`[DEV][EXTRA] authorizedHeMinutes:`, authorizedHeMinutes);
    if (import.meta.env.DEV) console.log(`[DEV][EXTRA] current action:`, nextPunchType);
    if (import.meta.env.DEV) console.log(`[DEV][EXTRA] nextPunchType before camera:`, nextPunchType);
    
    if (nextPunchType === 'FINALIZADO') {
      addToast('Sua jornada já foi finalizada hoje.', 'info');
      return;
    }

    if (loggedUser && (loggedUser as any).isReal) {
      if (!realSchedule?.work_schedules) {
        addToast('Nenhuma escala ativa vinculada. Procure o administrador.', 'error');
        return;
      }

      if (isDayOff) {
        addToast('Hoje não é dia de expediente nesta escala. Procure o administrador.', 'error');
        return;
      }

      // Validar Janela de Horário
      const windowVal = validatePunchTimeWindow(nextPunchType, realSchedule.work_schedules, activeTimeRuleConfig || {}, undefined, authorizedHeMinutes);
      if (!windowVal.isWithinWindow) {
        addToast(windowVal.message || 'Fora do horário permitido pela escala.', 'error');
        return;
      }
      if (windowVal.isWarning && windowVal.message) {
        addToast(windowVal.message, 'info');
      }

      // Se for SAIDA_ALMOCO ou RETORNO_ALMOCO, NÃO pede GPS
      if (nextPunchType === 'SAIDA_ALMOCO' || nextPunchType === 'RETORNO_ALMOCO') {
        await attendance.registerPunch({
          organization_id: (loggedUser as any).organization_id,
          employee_id: loggedUser.id,
          schedule_id: realSchedule?.employee_schedules?.schedule_id || null,
          punch_type: nextPunchType,
          latitude: null,
          longitude: null,
          gps_accuracy: null,
          distance_from_base_meters: null,
          is_within_radius: null,
          device_info: navigator.userAgent,
          user_agent: navigator.userAgent
        });
        return;
      }

      // Se for ENTRADA ou SAIDA, pede GPS
      if (geoState === 'valid' && geoData) {
        startCamera();
      } else {
        validateLocation();
      }
      return;
    }

    if (nextPunchType === 'SAIDA_ALMOCO' || nextPunchType === 'RETORNO_ALMOCO') {
      registerPunch(loggedUser!.id, nextPunchType, format(new Date(), 'HH:mm'));
    } else {
      handleRegister(); // this calls startCamera() for ENTRADA and SAIDA
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center" style={{ background: 'linear-gradient(135deg, #E5E5E5 0%, #D4DFE8 50%, #C8D8E4 100%)' }}>
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-[#003D5C]/5 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#8BABC7]/8 blur-3xl" />

      {/* Camera overlay */}
      <AnimatePresence>
        {cameraState !== 'idle' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <button type="button" onClick={stopCamera} className="absolute top-6 right-6 text-white/70 hover:text-white z-50 cursor-pointer p-2"><X className="w-8 h-8" /></button>
            <div className="relative w-full max-w-[480px] h-[640px] bg-[#1a1a1a] rounded-3xl overflow-hidden flex flex-col items-center justify-center">
              
              {cameraState === 'starting' && (
                <div className="text-center text-white p-6">
                  <Camera className="w-16 h-16 mx-auto mb-4 animate-pulse text-[#7C9DB5]" />
                  <p className="text-xl font-semibold mb-2">Preparando Câmera</p>
                  <p className="text-sm text-white/60">Aguardando permissão...</p>
                </div>
              )}

              {cameraState === 'error' && (
                <div className="text-center text-white p-8">
                  <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <X className="w-10 h-10 text-red-500" />
                  </div>
                  <p className="text-xl font-semibold mb-2 text-red-400">Erro na Câmera</p>
                  <p className="text-sm text-white/80">{cameraError || 'Não foi possível acessar a câmera.'}</p>
                  <button type="button" onClick={stopCamera} className="mt-8 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white font-medium">Voltar</button>
                </div>
              )}

              {(cameraState === 'active' || cameraState === 'captured' || cameraState === 'uploading' || cameraState === 'success') && (
                <div className="absolute inset-0 flex flex-col">
                  {/* Viewport for Video or Captured Image */}
                  <div className="flex-1 relative bg-black">
                    <video 
                      ref={videoRef}
                      className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 ${cameraState !== 'active' ? 'hidden' : ''}`}
                      playsInline 
                      autoPlay 
                      muted 
                    />
                    {photoDataUrl && cameraState !== 'active' && (
                      <img src={photoDataUrl} alt="Captured" className="absolute inset-0 w-full h-full object-cover" />
                    )}
                  </div>

                  {/* Controls Area */}
                  <div className="h-40 bg-black flex flex-col items-center justify-center gap-4 px-6 border-t border-white/10 shrink-0">
                    {cameraState === 'active' && (
                      <>
                        <button type="button" onClick={capturePhoto} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-transform hover:scale-105 active:scale-95">
                          <div className="w-16 h-16 bg-white rounded-full pointer-events-none" />
                        </button>
                        <p className="text-white/60 text-sm">Posicione-se no enquadramento e capture a evidência visual.</p>
                      </>
                    )}

                    {cameraState === 'captured' && (
                      <div className="w-full flex items-center gap-4">
                        <button type="button" onClick={retakePhoto} className="flex-1 py-4 bg-white/10 rounded-2xl text-white font-semibold transition-colors hover:bg-white/20">
                          Tirar Novamente
                        </button>
                        <button type="button" onClick={handleConfirmPhoto} className="flex-1 py-4 bg-[#28A745] rounded-2xl text-white font-semibold transition-colors hover:bg-[#218838]">
                          Usar Foto
                        </button>
                      </div>
                    )}

                    {cameraState === 'uploading' && (
                      <div className="w-full text-center">
                        <div className="w-8 h-8 border-4 border-[#28A745] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-white font-medium">Anexando evidência...</p>
                      </div>
                    )}

                    {cameraState === 'success' && (
                      <div className="w-full text-center text-[#28A745]">
                        <CheckCircle className="w-12 h-12 mx-auto mb-2" />
                        <p className="font-semibold text-xl">Foto Anexada com Sucesso</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="text-center mb-6 z-10 mt-8">
        <div className="flex items-center justify-center gap-3 mb-1">
          <Cross className="w-8 h-8 text-[#003D5C]" />
          <span className="text-2xl font-bold text-[#003D5C]">{currentBranding.namePrimary}</span>
          <span className="text-2xl font-bold text-[#7C9DB5]">{currentBranding.nameSecondary}</span>
        </div>
      </div>

      {/* Modern Clock */}
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mb-6 z-10 text-center">
        <p className="text-7xl font-bold text-[#003D5C] tracking-wider font-mono" style={{ textShadow: '0 2px 8px rgba(0,61,92,0.1)' }}>
          {format(currentTime, 'HH:mm:ss')}
        </p>
        <p className="text-sm text-[#8BABC7] mt-2 capitalize">
          {format(currentTime, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </motion.div>

      <div className="w-full max-w-[500px] px-6 z-10 space-y-5">
        {!loggedUser ? (
          /* LOGIN CARD */
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[20px] shadow-lg p-8">
            <h3 className="text-lg font-semibold text-[#003D5C] text-center mb-6">Identificação do Colaborador</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#003D5C] mb-2">Matrícula</label>
                <input 
                  type="tel" 
                  inputMode="numeric" 
                  pattern="[0-9]*" 
                  value={matricula} 
                  onChange={e => setMatricula(e.target.value.replace(/\D/g, ''))} 
                  placeholder="Apenas números" 
                  className={inputClass} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#003D5C] mb-2">Senha</label>
                <input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="****" className={inputClass} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
              </div>
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleLogin} className="w-full h-16 bg-[#003D5C] text-white rounded-[14px] text-lg font-semibold shadow-[0_4px_12px_rgba(0,61,92,0.25)] hover:bg-[#004d75] transition-all cursor-pointer">
                Entrar
              </motion.button>
            </div>
          </motion.div>
        ) : (
          /* LOGGED IN VIEW */
          <>
            {/* User greeting */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[20px] shadow-sm p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Perfil" className="w-12 h-12 rounded-full object-cover bg-white" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#003D5C] flex items-center justify-center text-white text-lg font-bold">{loggedUser.displayName.charAt(0)}</div>
                )}
                <div>
                  <h4 className="font-semibold text-[#003D5C] text-lg text-left">{loggedUser.displayName}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm font-medium text-[#1A1A1A]">{loggedUser.cargo || 'Sem cargo informado'}</span>
                    <span className="text-[11px] text-[#999] ml-1">Matrícula: {loggedUser.matricula}</span>
                  </div>
                </div>
              </div>
              <button onClick={handleLogout} className="p-2 text-[#DC3545]/60 hover:text-[#DC3545] hover:bg-[#DC3545]/10 rounded-lg transition-all cursor-pointer" title="Sair">
                <LogOut className="w-5 h-5" />
              </button>
            </motion.div>

            {/* Hora Extra Autorizada Warning */}
            {authorizedHeMinutes > 0 && nextPunchType === 'ENTRADA_EXTRA' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                <div className="mt-3 p-4 bg-purple-50 border border-purple-200 rounded-[12px] flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 flex-shrink-0">
                    <Timer className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-purple-800">Hora extra autorizada disponível</p>
                    <p className="text-xs text-purple-600 font-medium">Tempo autorizado: {Math.floor(authorizedHeMinutes / 60)}h{authorizedHeMinutes % 60 > 0 ? `${(authorizedHeMinutes % 60).toString().padStart(2, '0')}m` : '00m'}</p>
                    <p className="text-xs text-purple-600 font-medium mt-0.5">Você pode iniciar uma jornada extra.</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Extra Journey Status */}
            {nextPunchType === 'SAIDA_EXTRA' && authorizedHeMinutes > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                <div className={`mt-3 p-4 border rounded-[12px] flex items-center gap-3 ${Math.floor(extraJourneyElapsed / 60) > authorizedHeMinutes ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${Math.floor(extraJourneyElapsed / 60) > authorizedHeMinutes ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-blue-100 text-blue-600'}`}>
                    <Timer className="w-5 h-5" />
                  </div>
                  <div className="w-full">
                    <p className={`text-sm font-semibold ${Math.floor(extraJourneyElapsed / 60) > authorizedHeMinutes ? 'text-red-800' : 'text-blue-800'}`}>Jornada extra em andamento</p>
                    <div className="flex justify-between items-center mt-1">
                      <p className={`text-xs font-mono font-medium ${Math.floor(extraJourneyElapsed / 60) > authorizedHeMinutes ? 'text-red-600' : 'text-blue-600'}`}>Trabalhado: {formatElapsed(extraJourneyElapsed)}</p>
                      <p className={`text-xs font-mono font-medium ${Math.floor(extraJourneyElapsed / 60) > authorizedHeMinutes ? 'text-red-600' : 'text-blue-600'}`}>Autorizado: {Math.floor(authorizedHeMinutes / 60).toString().padStart(2, '0')}:{(authorizedHeMinutes % 60).toString().padStart(2, '0')}:00</p>
                    </div>
                    {Math.floor(extraJourneyElapsed / 60) <= authorizedHeMinutes ? (
                      <p className="text-xs text-blue-600 font-medium mt-1">Tempo restante: {formatElapsed((authorizedHeMinutes * 60) - extraJourneyElapsed)}</p>
                    ) : (
                      <p className="text-xs text-red-600 font-medium mt-1">Tempo excedido em {formatElapsed(extraJourneyElapsed - (authorizedHeMinutes * 60))}<br/>O excedente será marcado como não autorizado.</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Geolocation Status */}
            <AnimatePresence>
              {geoState !== 'idle' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className={`mt-3 p-4 rounded-[16px] border ${
                    geoState === 'locating' ? 'bg-[#003D5C]/10 border-[#003D5C]/20 text-[#003D5C]' :
                    geoState === 'valid' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                    geoState === 'invalid' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                    'bg-red-50 border-red-200 text-red-700'
                  }`}>
                    <div className="flex items-center gap-3 mb-2">
                      {geoState === 'locating' && <Timer className="w-5 h-5 animate-pulse" />}
                      {geoState === 'valid' && <CheckCircle className="w-5 h-5" />}
                      {(geoState === 'invalid' || geoState === 'error') && <X className="w-5 h-5" />}
                      <p className="text-sm font-semibold">{geoMessage}</p>
                    </div>
                    {geoData && (
                      <div className="text-xs space-y-1 opacity-90 mt-2 border-t border-current/10 pt-2">
                        <p>Distância: <strong>{formatDistance(geoData.distance_from_base_meters)}</strong> (Permitido: {formatDistance(orgConfig?.allowed_radius_meters || appConfig?.default_allowed_radius_meters || 100)})</p>
                        <p>Precisão GPS: <strong>{formatDistance(geoData.gps_accuracy)}</strong></p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Day Off Card or Register Button */}
            {isDayOff ? (
              <DayOffCard nextWorkDate={nextWorkDate} />
            ) : (
              <motion.button disabled={attendance.submitting} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} whileTap={{ scale: nextPunchType !== 'FINALIZADO' && !attendance.submitting ? 0.97 : 1 }} onClick={handleRegisterClick}
                className={`w-full h-[72px] text-white rounded-[16px] text-lg font-semibold flex items-center justify-center gap-3 shadow-[0_4px_16px_rgba(0,61,92,0.3)] transition-all ${nextPunchType === 'FINALIZADO' || attendance.submitting ? 'bg-[#E5E5E5] text-[#999] cursor-not-allowed shadow-none' : 'bg-[#003D5C] hover:bg-[#004d75] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer'}`}>
                {attendance.submitting ? <Timer className="w-6 h-6 animate-spin" /> : <MapPin className="w-6 h-6" />} 
                {attendance.submitting ? 'Registrando...' : punchButtonText}
              </motion.button>
            )}

            {/* Lunch Status */}
            <AnimatePresence>
              {nextPunchType === 'RETORNO_ALMOCO' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className={`mt-3 p-5 rounded-2xl border-2 text-center shadow-sm ${isOvertimeLunch ? 'bg-red-50 border-red-300' : 'bg-amber-50 border-amber-300'}`}>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Timer className={`w-5 h-5 ${isOvertimeLunch ? 'text-red-600 animate-pulse' : 'text-amber-600 animate-pulse'}`} />
                      <p className={`text-sm font-bold uppercase tracking-wider ${isOvertimeLunch ? 'text-red-700' : 'text-amber-700'}`}>
                        Pausa em andamento
                      </p>
                    </div>
                    <p className={`text-xl font-bold tracking-wider my-2 text-gray-700`}>
                      Pausa atual: <span className={`font-mono text-2xl ${isOvertimeLunch ? 'text-red-700' : 'text-amber-700'}`}>{formatElapsed(lunchElapsed)}</span>
                    </p>
                    
                    <div className="bg-white/60 rounded-xl p-3 space-y-1.5 text-xs text-left inline-block w-full max-w-sm mt-1 border border-black/5">
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-700">Tempo previsto:</span>
                        <span className="text-gray-900 font-mono">{formatElapsed(lunchInfo.duration * 60)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-700">Total consumido hoje:</span>
                        <span className="text-gray-900 font-mono">
                          {formatElapsed(totalCurrentLunchUsedSecs)} de {formatElapsed(lunchInfo.duration * 60)}
                        </span>
                      </div>
                      
                      {(() => {
                        const expectedSecs = lunchInfo.duration * 60;
                        if (totalCurrentLunchUsedSecs > expectedSecs) {
                          return (
                            <div className="flex justify-between text-red-600 font-bold bg-red-100 px-2 py-1.5 rounded mt-1">
                              <span>Pausa excedida em:</span>
                              <span className="font-mono">{formatElapsed(totalCurrentLunchUsedSecs - expectedSecs)}</span>
                            </div>
                          );
                        } else {
                          return (
                            <div className="flex justify-between text-amber-700 mt-1">
                              <span className="font-semibold">Tempo restante:</span>
                              <span className="font-mono">{formatElapsed(expectedSecs - totalCurrentLunchUsedSecs)}</span>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Configured Lunch Info for info */}
            {!isDayOff && nextPunchType !== 'RETORNO_ALMOCO' && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center bg-[#F8F9FA] rounded-xl py-3 px-4 border border-[#E5E5E5] flex flex-col gap-1.5 justify-center items-center">
                 {realSchedule ? (
                   <>
                     <span className="text-[11px] font-bold text-[#003D5C] uppercase tracking-wider">{realSchedule.work_schedules?.name}</span>
                     <div className="flex flex-col gap-1 mt-1 text-sm text-[#1A1A1A]">
                       <span className="font-medium">
                         Expediente: {realSchedule.work_schedules?.work_start_time?.substring(0,5)} às {realSchedule.work_schedules?.work_end_time?.substring(0,5)}
                       </span>
                       {lunchInfo.duration > 0 ? (
                         <span className="font-medium text-amber-700">
                           Almoço previsto: {lunchInfo.start} às {lunchInfo.end} (Duração: {lunchInfo.duration} minutos)
                         </span>
                       ) : (
                         <span className="text-gray-500 text-xs">Sem intervalo configurado</span>
                       )}
                     </div>
                     <span className="text-[11px] text-[#13A89E] font-medium mt-1.5 bg-[#13A89E]/10 px-2 py-0.5 rounded-md">
                       {nextPunchType !== 'FINALIZADO' ? getPunchWindowLabel(nextPunchType as PunchType, realSchedule.work_schedules, activeTimeRuleConfig || {}, authorizedHeMinutes) : ''}
                     </span>
                     <div className="flex justify-center mt-1">
                       <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-medium ${isIndividualRule ? 'bg-indigo-50 text-indigo-600' : 'bg-[#E5E5E5] text-[#666]'}`}>
                         Regra Aplicada: {isIndividualRule ? 'Individual' : 'Global'}
                       </span>
                     </div>
                   </>
                 ) : (loggedUser as any).isReal ? (
                   <span className="text-xs text-[#DC3545] font-semibold p-2">Nenhuma escala ativa vinculada. Procure o administrador.</span>
                 ) : (
                   <div className="flex flex-col gap-1 text-sm text-[#1A1A1A]">
                     <span className="text-xs text-[#666] font-medium uppercase tracking-wider">Modo Teste</span>
                     <span className="font-medium text-amber-700">Almoço previsto: {lunchInfo.start} às {lunchInfo.end} ({lunchInfo.duration} min)</span>
                   </div>
                 )}
               </motion.div>
            )}

            {/* As seções Ações, Histórico e Solicitações foram removidas do fluxo principal */}
          </>
        )}
      </div>

      {/* Floating Side Menu (FAB - Logged In) */}
      <AnimatePresence>
        {loggedUser && (
          <div className="fixed right-6 bottom-6 z-40 flex flex-col items-end gap-3">
            <AnimatePresence>
              {fabOpen && (
                <motion.div initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }} className="flex flex-col gap-3 mb-2">
                  <button onClick={() => { setFabOpen(false); setActiveDrawer('acoes'); }} className="bg-white text-[#003D5C] shadow-lg rounded-full p-2 flex items-center justify-end gap-3 hover:bg-gray-50 transition-colors cursor-pointer group">
                    <span className="text-xs font-bold pl-3">Ações Rápidas</span>
                    <div className="bg-[#003D5C]/10 p-2 rounded-full group-hover:bg-[#003D5C] group-hover:text-white transition-colors"><Timer className="w-5 h-5" /></div>
                  </button>
                  <button onClick={() => { setFabOpen(false); setActiveDrawer('historico'); }} className="bg-white text-[#003D5C] shadow-lg rounded-full p-2 flex items-center justify-end gap-3 hover:bg-gray-50 transition-colors cursor-pointer group">
                    <span className="text-xs font-bold pl-3">Histórico de Ponto</span>
                    <div className="bg-[#003D5C]/10 p-2 rounded-full group-hover:bg-[#003D5C] group-hover:text-white transition-colors"><List className="w-5 h-5" /></div>
                  </button>
                  <button onClick={() => { setFabOpen(false); setActiveDrawer('solicitacoes'); }} className="bg-white text-[#003D5C] shadow-lg rounded-full p-2 flex items-center justify-end gap-3 hover:bg-gray-50 transition-colors cursor-pointer group">
                    <span className="text-xs font-bold pl-3">Minhas Solicitações</span>
                    <div className="bg-[#003D5C]/10 p-2 rounded-full group-hover:bg-[#003D5C] group-hover:text-white transition-colors"><FileText className="w-5 h-5" /></div>
                  </button>
                  <button onClick={() => { setFabOpen(false); setActiveDrawer('configuracoes'); }} className="bg-white text-[#003D5C] shadow-lg rounded-full p-2 flex items-center justify-end gap-3 hover:bg-gray-50 transition-colors cursor-pointer group">
                    <span className="text-xs font-bold pl-3">Configurações</span>
                    <div className="bg-[#003D5C]/10 p-2 rounded-full group-hover:bg-[#003D5C] group-hover:text-white transition-colors"><Settings className="w-5 h-5" /></div>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setFabOpen(!fabOpen)} className="bg-[#003D5C] hover:bg-[#004d75] text-white shadow-[0_4px_16px_rgba(0,61,92,0.3)] rounded-full w-14 h-14 flex items-center justify-center transition-colors cursor-pointer">
              <motion.div animate={{ rotate: fabOpen ? 45 : 0 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}>
                {fabOpen ? <Cross className="w-6 h-6 rotate-45" /> : <List className="w-6 h-6" />}
              </motion.div>
            </motion.button>
          </div>
        )}
      </AnimatePresence>

      {/* Drawers Panels */}
      {createPortal(
        <AnimatePresence>
          {activeDrawer && (
            <div className="fixed inset-0 z-[100] flex justify-end">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setActiveDrawer(null)} />
              <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative bg-[#F8F9FA] w-[90%] max-w-sm h-full shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-[#E5E5E5] bg-white">
                  <h3 className="text-lg font-bold text-[#003D5C]">
                    {activeDrawer === 'acoes' ? 'Ações Rápidas' : activeDrawer === 'historico' ? 'Histórico de Ponto' : activeDrawer === 'solicitacoes' ? 'Solicitações' : 'Configurações'}
                  </h3>
                  <button onClick={() => setActiveDrawer(null)} className="p-2 text-[#666] hover:bg-gray-100 rounded-full transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
                </div>
                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5">
                  {activeDrawer === 'acoes' && (
                    <div className="space-y-6">
                      <div className="bg-white rounded-xl p-5 text-center shadow-sm border border-[#E5E5E5]">
                        {(loggedUser as any)?.isReal ? (
                          <>
                            <p className="text-4xl font-bold text-[#28A745]">
                              {hourBank.balance?.balance_minutes >= 0 ? '+' : '-'}
                              {Math.floor(Math.abs(hourBank.balance?.balance_minutes || 0) / 60)}h
                              {Math.abs(hourBank.balance?.balance_minutes || 0) % 60}m
                            </p>
                            <p className="text-sm text-[#666666] mt-1">Saldo de Banco de Horas</p>
                          </>
                        ) : (
                          <>
                            <p className="text-4xl font-bold text-[#28A745]">{getEmployeeHourBalance(loggedUser!.id) >= 0 ? '+' : '-'}{Math.floor(Math.abs(getEmployeeHourBalance(loggedUser!.id)) / 60)}h{Math.abs(getEmployeeHourBalance(loggedUser!.id)) % 60}m</p>
                            <p className="text-sm text-[#666666] mt-1">Saldo de Banco de Horas</p>
                          </>
                        )}
                      </div>
                      <div className="flex flex-col gap-3">
                        <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setActiveDrawer(null); setShowCompModal(true); }} className="w-full h-14 bg-[#7C9DB5] text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-sm cursor-pointer hover:bg-[#688a9f]">
                          <Calendar className="w-5 h-5" /> Solicitar Compensação
                        </motion.button>
                        <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setActiveDrawer(null); setShowOvertimeModal(true); }} className="w-full h-14 bg-[#8BABC7] text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-sm cursor-pointer hover:bg-[#7a9ab5]">
                          <Timer className="w-5 h-5" /> Solicitar Hora Extra
                        </motion.button>
                      </div>

                      {/* Extrato de Banco de Horas */}
                      {(loggedUser as any)?.isReal && (
                        <div className="mt-6">
                          <h4 className="text-sm font-bold text-[#003D5C] mb-3 uppercase tracking-wider">Últimas Movimentações</h4>
                          {hourBank.loading ? (
                            <p className="text-xs text-[#666] text-center py-4">Carregando...</p>
                          ) : hourBank.transactions.length === 0 ? (
                            <p className="text-xs text-[#666] text-center py-4 bg-white rounded-xl border border-[#E5E5E5] shadow-sm">Nenhuma movimentação recente.</p>
                          ) : (
                            <div className="space-y-2">
                              {hourBank.transactions.slice(0, 10).map((tx: any) => (
                                <div key={tx.id} className="bg-white p-3 rounded-xl border border-[#E5E5E5] flex items-center justify-between shadow-sm">
                                  <div>
                                    <p className="text-xs font-semibold text-[#1A1A1A]">{format(new Date(tx.transaction_date + 'T00:00:00'), 'dd/MM/yyyy')}</p>
                                    <p className="text-[10px] text-[#666] truncate max-w-[150px]" title={tx.description || ''}>{tx.description || (tx.source_type === 'daily_summary' ? 'Apuração diária' : tx.source_type === 'request_approval' ? 'Solicitação aprovada' : 'Movimentação automática')}</p>
                                  </div>
                                  <span className={`text-xs font-bold font-mono px-2 py-1 rounded ${tx.direction === 'credit' ? 'bg-[#28A745]/10 text-[#28A745]' : 'bg-[#DC3545]/10 text-[#DC3545]'}`}>
                                    {tx.direction === 'credit' ? '+' : '-'}{Math.floor(tx.minutes / 60)}h{tx.minutes % 60 > 0 ? `${tx.minutes % 60}m` : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {activeDrawer === 'historico' && (
                    <div className="flex flex-col h-full">
                      <div className="mb-4 bg-white p-3 rounded-xl border border-[#E5E5E5] shadow-sm">
                        <p className="text-xs font-semibold text-[#003D5C] mb-2 uppercase tracking-wider">Filtrar Período</p>
                        <div className="flex items-center gap-2 mb-2">
                          <input type="date" value={historyStart} onChange={e => setHistoryStart(e.target.value)} className="w-1/2 h-9 px-2 bg-[#F8F9FA] border border-[#E5E5E5] rounded-md text-xs text-[#003D5C] outline-none focus:border-[#13A89E]" />
                          <span className="text-[#666] text-xs">até</span>
                          <input type="date" value={historyEnd} onChange={e => setHistoryEnd(e.target.value)} className="w-1/2 h-9 px-2 bg-[#F8F9FA] border border-[#E5E5E5] rounded-md text-xs text-[#003D5C] outline-none focus:border-[#13A89E]" />
                        </div>
                        <button onClick={handleApplyHistoryFilter} className="w-full h-8 bg-[#7C9DB5] hover:bg-[#688a9f] text-white rounded-md text-xs font-semibold transition-colors cursor-pointer">
                          Aplicar Filtro
                        </button>
                        {(!appliedHistoryStart && !appliedHistoryEnd) && (
                          <p className="text-[10px] text-center text-[#999] mt-2 italic">Mostrando apenas hoje por padrão.</p>
                        )}
                      </div>
                      <div className="flex-1">
                        {(loggedUser as any)?.isReal ? (
                          realHistoryLoading ? (
                            <div className="text-center mt-10"><p className="text-sm text-[#666]">Carregando histórico...</p></div>
                          ) : realHistoryRecords.length === 0 ? (
                            <div className="text-center mt-10"><p className="text-sm text-[#666]">Nenhum ponto registrado no período selecionado.</p></div>
                          ) : (
                            <div className="space-y-3">
                              {realHistoryRecords.map(day => {
                                const st = day.summary?.status;
                                const statusColor = st === 'hora_extra' || st === 'normal' ? 'bg-[#28A745]/10 text-[#28A745]' 
                                  : st === 'em_andamento' ? 'bg-[#13A89E]/10 text-[#13A89E]' 
                                  : st ? 'bg-[#F0AD4E]/10 text-[#F0AD4E]' : 'bg-[#E5E5E5] text-[#666]';
                                const statusText = st ? st.replace('_', ' ').toUpperCase() : 'FINALIZADO';
                                
                                const balances = day.summary?.balance_minutes;
                                const balText = balances ? `${balances > 0 ? '+' : ''}${Math.floor(balances/60)}h${Math.abs(balances)%60}m` : '';

                                return (
                                  <div key={day.date} className="p-4 bg-white rounded-xl border border-[#E5E5E5] shadow-sm">
                                    <div className="flex items-center justify-between mb-3">
                                      <span className="text-sm font-semibold text-[#1A1A1A]">{format(new Date(day.date + 'T00:00:00'), 'dd/MM/yyyy')}</span>
                                      <div className="flex items-center gap-2">
                                        {balances !== undefined && balances !== 0 && (
                                          <span className={`text-[10px] font-bold ${balances > 0 ? 'text-[#28A745]' : 'text-[#DC3545]'}`}>{balText}</span>
                                        )}
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusColor}`}>
                                          {statusText}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                      {day.records.map((rec: any) => (
                                        <div key={rec.id} className="text-sm bg-[#F8F9FA] border border-[#E5E5E5] px-3 py-2 rounded-lg flex items-center justify-between">
                                          <span className="text-[#666] font-medium">{rec.punch_type === 'ENTRADA' ? 'Entrada' : rec.punch_type === 'SAIDA_ALMOCO' ? 'S. Almoço' : rec.punch_type === 'RETORNO_ALMOCO' ? 'R. Almoço' : rec.punch_type === 'SAIDA' ? 'Saída' : rec.punch_type.replace('_', ' ')}</span>
                                          <div className="flex items-center gap-2">
                                            <span className="text-[#1A1A1A] font-bold">{rec.server_time ? rec.server_time.substring(0, 5) : new Date(rec.punched_at || rec.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                            <CheckCircle className="w-4 h-4 text-[#28A745]" />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )
                        ) : (
                          filteredHistory.length === 0 ? (
                            <div className="text-center mt-10"><p className="text-sm text-[#666]">Nenhum ponto registrado.</p></div>
                          ) : (
                            <div className="space-y-3">
                              {filteredHistory.map(rec => (
                                <div key={rec.id} className="p-4 bg-white rounded-xl border border-[#E5E5E5] shadow-sm">
                                  <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-semibold text-[#1A1A1A]">{format(new Date(rec.date + 'T00:00:00'), 'dd/MM/yyyy')}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${rec.status === 'Normal' ? 'bg-[#28A745]/10 text-[#28A745]' : 'bg-[#DC3545]/10 text-[#DC3545]'}`}>{rec.status}</span>
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    {rec.punches.map(p => (
                                      <div key={p.id} className="text-sm bg-[#F8F9FA] border border-[#E5E5E5] px-3 py-2 rounded-lg flex items-center justify-between">
                                        <span className="text-[#666] font-medium">{p.type === 'ENTRADA' ? 'Entrada' : p.type === 'SAIDA_ALMOCO' ? 'S. Almoço' : p.type === 'RETORNO_ALMOCO' ? 'R. Almoço' : 'Saída'}</span>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[#1A1A1A] font-bold">{p.time}</span>
                                          <CheckCircle className="w-4 h-4 text-[#28A745]" />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {activeDrawer === 'solicitacoes' && (
                    <div>
                      {(loggedUser as any)?.isReal ? (
                        empRequests.loading && empRequests.requests.length === 0 ? (
                          <div className="text-center mt-10"><p className="text-sm text-[#666]">Carregando solicitações...</p></div>
                        ) : empRequests.requests.length === 0 ? (
                          <div className="text-center mt-10"><p className="text-sm text-[#666]">Nenhuma solicitação encontrada.</p></div>
                        ) : (
                          <div className="space-y-3">
                            {empRequests.requests.map(req => (
                              <div key={req.id} className="p-4 bg-white rounded-xl border border-[#E5E5E5] shadow-sm relative">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-bold text-[#003D5C] uppercase tracking-wider">{req.request_type === 'hora_extra' ? 'Hora Extra' : req.request_type === 'compensacao' ? 'Compensação' : req.request_type === 'folga' ? 'Folga' : req.request_type.replace('_', ' ')}</span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${
                                    req.status === 'aprovada' ? 'bg-[#28A745]/10 text-[#28A745]' :
                                    req.status === 'reprovada' || req.status === 'cancelada' ? 'bg-[#DC3545]/10 text-[#DC3545]' :
                                    'bg-[#F0AD4E]/10 text-[#F0AD4E]'
                                  }`}>{req.status}</span>
                                </div>
                                <p className="text-xs text-[#666] mb-1">
                                  Data: <span className="font-medium text-[#1A1A1A]">
                                    {req.target_date ? format(new Date(req.target_date + 'T00:00:00'), 'dd/MM/yyyy') : '-'}
                                  </span>
                                  {req.minutes_requested && (
                                    <> • {Math.floor(req.minutes_requested / 60)}h{req.minutes_requested % 60 > 0 ? `${req.minutes_requested % 60}m` : ''}</>
                                  )}
                                </p>
                                {req.justification && (
                                  <div className="bg-[#F8F9FA] p-2 rounded text-xs text-[#666] border border-[#E5E5E5] mt-2">
                                    {req.justification}
                                  </div>
                                )}
                                {req.status === 'pendente' && (
                                  <button 
                                    onClick={() => {
                                      if(confirm('Deseja realmente cancelar esta solicitação?')) {
                                        empRequests.cancelRequest(req.id);
                                      }
                                    }}
                                    className="mt-3 text-xs font-semibold text-[#DC3545] hover:text-red-700 underline decoration-red-300 underline-offset-2 cursor-pointer"
                                  >
                                    Cancelar solicitação
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )
                      ) : (
                        myRequests.length === 0 ? (
                          <div className="text-center mt-10"><p className="text-sm text-[#666]">Nenhuma solicitação encontrada.</p></div>
                        ) : (
                          <div className="space-y-3">
                            {myRequests.map(req => (
                              <div key={req.id} className="p-4 bg-white rounded-xl border border-[#E5E5E5] shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-bold text-[#003D5C]">{req.type}</span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                    req.status === 'Aprovada' ? 'bg-[#28A745]/10 text-[#28A745]' :
                                    req.status === 'Reprovada' || req.status === 'Indevida' ? 'bg-[#DC3545]/10 text-[#DC3545]' :
                                    'bg-[#F0AD4E]/10 text-[#F0AD4E]'
                                  }`}>{req.status}</span>
                                </div>
                                <p className="text-xs text-[#666] mb-1">Data: <span className="font-medium text-[#1A1A1A]">{format(new Date(req.date + 'T00:00:00'), 'dd/MM/yyyy')}</span> • {req.hours}h</p>
                                <div className="bg-[#F8F9FA] p-2 rounded text-xs text-[#666] border border-[#E5E5E5]">
                                  {req.justification}
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {activeDrawer === 'configuracoes' && (
                    <div className="space-y-6">
                      <div className="bg-white rounded-xl p-5 shadow-sm border border-[#E5E5E5] flex flex-col items-center">
                        <div className="w-24 h-24 rounded-full bg-[#003D5C] text-white flex flex-col items-center justify-center overflow-hidden shadow-inner mb-4">
                          {avatarPreview ? (
                            <img src={avatarPreview} alt="Perfil" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-4xl font-bold">{loggedUser?.displayName?.charAt(0)}</span>
                          )}
                        </div>
                        <h4 className="text-sm font-semibold text-[#1A1A1A] mb-1 text-center">Foto de Perfil</h4>
                        <p className="text-xs text-[#666666] mb-4 text-center">Adicione ou remova sua foto.</p>
                        
                        <div className="flex flex-col gap-3 w-full">
                          <label className="w-full py-2.5 bg-[#003D5C] text-white text-sm font-semibold rounded-xl hover:bg-[#004d75] cursor-pointer transition-colors flex items-center justify-center gap-2 shadow-sm">
                            <Upload className="w-4 h-4" /> Enviar Nova Foto
                            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                          </label>
                          {avatarPreview && (
                            <button
                              onClick={removeAvatar}
                              className="w-full py-2.5 bg-white border border-[#E5E5E5] text-[#DC3545] text-sm font-semibold rounded-xl hover:bg-red-50 cursor-pointer transition-colors flex items-center justify-center gap-2 shadow-sm"
                            >
                              <Trash2 className="w-4 h-4" /> Remover Foto
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* COMPENSATION MODAL */}
      {createPortal(
        <AnimatePresence>
          {showCompModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCompModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-[#003D5C]">Solicitar Compensação / Folga</h3>
                <button onClick={() => setShowCompModal(false)} className="text-[#666] hover:text-[#1A1A1A] cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              {/* Info cards */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-[#28A745]/10 rounded-xl p-3 text-center">
                  {(loggedUser as any)?.isReal ? (
                    <p className="text-xl font-bold text-[#28A745]">
                      {hourBank.balance?.balance_minutes >= 0 ? '+' : '-'}
                      {Math.floor(Math.abs(hourBank.balance?.balance_minutes || 0) / 60)}h
                    </p>
                  ) : (
                    <p className="text-xl font-bold text-[#28A745]">{getEmployeeHourBalance(loggedUser!.id) >= 0 ? '+' : '-'}{Math.floor(Math.abs(getEmployeeHourBalance(loggedUser!.id)) / 60)}h</p>
                  )}
                  <p className="text-[11px] text-[#666]">Saldo disponível</p>
                </div>
                <div className="bg-[#F8F9FA] rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-[#1A1A1A]">0h</p>
                  <p className="text-[11px] text-[#666]">Horas negativas</p>
                </div>
              </div>

              {/* Mini Calendar */}
              <div className="border border-[#E5E5E5] rounded-xl p-4 mb-5">
                <div className="flex items-center justify-between mb-3">
                  <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }} className="p-1 hover:bg-[#F8F9FA] rounded cursor-pointer"><ChevronLeft className="w-4 h-4 text-[#666]" /></button>
                  <span className="text-sm font-semibold text-[#003D5C] capitalize">{format(new Date(calYear, calMonth), 'MMMM yyyy', { locale: ptBR })}</span>
                  <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }} className="p-1 hover:bg-[#F8F9FA] rounded cursor-pointer"><ChevronRight className="w-4 h-4 text-[#666]" /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center">
                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (<span key={i} className="text-[10px] font-semibold text-[#999] py-1">{d}</span>))}
                  {Array.from({ length: firstDayOfWeek }).map((_, i) => (<span key={`e${i}`} />))}
                  {calDays.map(d => {
                    const isWeekend = weekends.includes(d);
                    return (
                      <button key={d} className={`w-8 h-8 rounded-lg text-xs font-medium transition-all cursor-pointer mx-auto flex items-center justify-center ${isToday(d) ? 'bg-[#003D5C] text-white' : isWeekend ? 'text-[#DC3545]/60' : 'text-[#1A1A1A] hover:bg-[#F0F0F0]'}`}>
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Form fields */}
              <div className="space-y-4">
                {/* Tipo de Solicitação */}
                <div className="flex gap-2 p-1 bg-[#F8F9FA] border border-[#E5E5E5] rounded-xl mb-2">
                  <button
                    onClick={() => setCompType('mesmo_dia')}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                      compType === 'mesmo_dia' ? 'bg-white text-[#003D5C] shadow-sm' : 'text-[#666] hover:text-[#1A1A1A]'
                    }`}
                  >
                    No mesmo dia
                  </button>
                  <button
                    onClick={() => setCompType('futura')}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                      compType === 'futura' ? 'bg-white text-[#003D5C] shadow-sm' : 'text-[#666] hover:text-[#1A1A1A]'
                    }`}
                  >
                    Folga futura
                  </button>
                </div>
                
                <p className="text-xs text-[#666] bg-[#003D5C]/5 p-2 rounded border border-[#003D5C]/10 mb-4">
                  {compType === 'mesmo_dia' 
                    ? 'Use esta opção quando quiser compensar horas no próprio dia de trabalho.' 
                    : 'Use esta opção quando quiser solicitar uma folga para uma data específica.'}
                </p>

                {compType === 'futura' && (
                  <div>
                    <label className="block text-sm font-medium text-[#003D5C] mb-1.5">Data da Folga</label>
                    <input type="date" value={compDate} onChange={e => setCompDate(e.target.value)} className={modalInputClass} />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-[#003D5C] mb-1.5">Horas a {compType === 'mesmo_dia' ? 'compensar' : 'descontar'}</label>
                  <input type="number" value={compHours} onChange={e => setCompHours(e.target.value)} placeholder="Ex: 8" className={modalInputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#003D5C] mb-1.5">Justificativa</label>
                  <textarea value={compJustification} onChange={e => setCompJustification(e.target.value)} placeholder="Motivo da solicitação..." className="w-full min-h-[70px] p-3 bg-[#F8F9FA] border-[1.5px] border-[#E5E5E5] rounded-[10px] text-sm text-[#1A1A1A] placeholder:text-[#999] focus:border-[#8BABC7] outline-none transition-all resize-vertical" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-5">
                <button onClick={() => setShowCompModal(false)} className="h-10 px-5 border border-[#E5E5E5] text-[#666] rounded-lg text-sm font-medium hover:bg-[#F8F9FA] cursor-pointer">Cancelar</button>
                <motion.button whileTap={{ scale: 0.98 }} onClick={handleCompSubmit} className="h-10 px-5 bg-[#7C9DB5] text-white rounded-lg text-sm font-semibold hover:brightness-110 cursor-pointer">Enviar Solicitação</motion.button>
              </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* OVERTIME MODAL */}
      {createPortal(
        <AnimatePresence>
          {showOvertimeModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowOvertimeModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-[#003D5C]">Solicitar Hora Extra</h3>
                <button onClick={() => setShowOvertimeModal(false)} className="text-[#666] hover:text-[#1A1A1A] cursor-pointer"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#003D5C] mb-1.5">Data</label>
                  <input type="date" value={otDate} onChange={e => setOtDate(e.target.value)} className={modalInputClass} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[#003D5C] mb-1.5">Horas</label>
                    <input type="number" min="0" value={otHoursNum} onChange={e => setOtHoursNum(e.target.value)} placeholder="Ex: 1" className={modalInputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#003D5C] mb-1.5">Minutos</label>
                    <input type="number" min="0" max="59" value={otMinsNum} onChange={e => setOtMinsNum(e.target.value)} placeholder="Ex: 30" className={modalInputClass} />
                  </div>
                </div>
                <p className="text-[10px] text-[#666] mt-1">* Acima de 1h45 será classificado como Plantão Extra.</p>
                <div>
                  <label className="block text-sm font-medium text-[#003D5C] mb-1.5">Justificativa</label>
                  <textarea value={otJustification} onChange={e => setOtJustification(e.target.value)} placeholder="Motivo da hora extra..." className="w-full min-h-[70px] p-3 bg-[#F8F9FA] border-[1.5px] border-[#E5E5E5] rounded-[10px] text-sm text-[#1A1A1A] placeholder:text-[#999] focus:border-[#8BABC7] outline-none transition-all resize-vertical" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-5">
                <button onClick={() => setShowOvertimeModal(false)} className="h-10 px-5 border border-[#E5E5E5] text-[#666] rounded-lg text-sm font-medium hover:bg-[#F8F9FA] cursor-pointer">Cancelar</button>
                <motion.button whileTap={{ scale: 0.98 }} onClick={handleOtSubmit} className="h-10 px-5 bg-[#8BABC7] text-white rounded-lg text-sm font-semibold hover:brightness-110 cursor-pointer">Enviar Solicitação</motion.button>
              </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Change Password Modal */}
      {createPortal(
        <AnimatePresence>
          {showPasswordChangeModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#1B325F]/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white rounded-xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden">
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-[#1B325F]">Crie sua Nova Senha</h3>
                  <p className="text-sm text-[#7C9DB5] mt-1">Por segurança, crie uma nova senha antes de continuar.</p>
                </div>
                
                <div className="space-y-4 mb-8">
                  <div>
                    <label className="block text-sm font-medium text-[#1B325F] mb-1">Senha Temporária Atual</label>
                    <input type="password" value={senha} readOnly disabled className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 font-mono outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1B325F] mb-1">Nova Senha</label>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#13A89E] focus:border-transparent transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1B325F] mb-1">Confirmar Nova Senha</label>
                    <input type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} placeholder="Digite novamente a nova senha" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#13A89E] focus:border-transparent transition-all" />
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button onClick={handleLogout} className="px-5 py-2.5 text-[#4A6478] font-medium hover:bg-gray-50 rounded-lg transition-colors cursor-pointer">Cancelar / Sair</button>
                  <button onClick={handlePasswordChange} disabled={isChangingPassword || !newPassword || !confirmNewPassword} className="bg-[#13A89E] hover:bg-[#13A89E]/90 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-all flex items-center gap-2 cursor-pointer">
                    {isChangingPassword ? 'Salvando...' : 'Salvar Senha'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default TabletPonto;

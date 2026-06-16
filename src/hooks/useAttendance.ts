import { useState, useCallback } from 'react';
import { attendanceService, getOpenOvernightAttendanceRecords, type AttendancePayload } from '@/services/attendanceService';
import { useToast } from '@/context/ToastContext';

export function useAttendance() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const refreshTodayRecords = useCallback(async (employeeId: string, schedule?: any) => {
    try {
      setLoading(true);
      setError(null);
      let data = await attendanceService.getTodayAttendanceRecords(employeeId);
      
      if (schedule && schedule.work_schedules?.crosses_midnight) {
         const openJourney = await getOpenOvernightAttendanceRecords(employeeId, schedule);
         if (openJourney && openJourney.length > 0) {
            // Se encontrou jornada aberta, mescla os registros para a máquina de estados funcionar
            const merged = [...openJourney];
            data.forEach(d => {
               if (!merged.find(m => m.id === d.id)) merged.push(d);
            });
            data = merged.sort((a, b) => new Date(a.punched_at || a.created_at).getTime() - new Date(b.punched_at || b.created_at).getTime());
         }
      }

      setRecords(data || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  // O estado visual pode ser inferido pelo botão
  const isJourneyComplete = records.some(r => r.punch_type === 'SAIDA');
  
  const registerPunch = async (payload: AttendancePayload, expectedNextPunchType?: string) => {
    if (submitting) return null;
    
    // Only block if it is a normal ENTRY/LUNCH/EXIT, allow EXTRA punches
    if (isJourneyComplete && payload.punch_type !== 'ENTRADA_EXTRA' && payload.punch_type !== 'SAIDA_EXTRA') {
      addToast('Sua jornada já foi finalizada hoje.', 'info');
      return null;
    }

    if (expectedNextPunchType && expectedNextPunchType !== payload.punch_type) {
      addToast('Ação inválida para o estado atual da jornada. Atualize a página e tente novamente.', 'error');
      return null;
    }
    
    // Remoção da trava de duplicidade estrita porque agora o colaborador
    // pode ter múltiplos SAIDA_ALMOCO e RETORNO_ALMOCO.
    // A trava no BD (se houver unique index) já faz o controle necessário, 
    // mas se for SAIDA_ALMOCO e o último já for SAIDA_ALMOCO, bloqueamos.
    
    const sortedRecords = [...records].sort((a, b) => new Date(a.punched_at || a.created_at).getTime() - new Date(b.punched_at || b.created_at).getTime());
    const lastRecord = sortedRecords.length > 0 ? sortedRecords[sortedRecords.length - 1] : null;

    if (lastRecord && lastRecord.punch_type === payload.punch_type) {
      addToast('Este ponto já foi registrado e está ativo.', 'error');
      return null;
    }
    if (payload.punch_type === 'ENTRADA' && records.some(r => r.punch_type === 'ENTRADA')) {
      addToast('A entrada já foi registrada hoje.', 'error');
      return null;
    }
    if (payload.punch_type === 'SAIDA' && records.some(r => r.punch_type === 'SAIDA')) {
      addToast('A saída já foi registrada hoje.', 'error');
      return null;
    }
    if (payload.punch_type === 'ENTRADA_EXTRA' && records.some(r => r.punch_type === 'ENTRADA_EXTRA')) {
      addToast('A entrada extra já foi registrada hoje.', 'error');
      return null;
    }
    if (payload.punch_type === 'SAIDA_EXTRA' && records.some(r => r.punch_type === 'SAIDA_EXTRA')) {
      addToast('A saída extra já foi registrada hoje.', 'error');
      return null;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      if (import.meta.env.DEV) console.log(`[DEV][PONTO] Iniciando registro:`, payload);
      if (import.meta.env.DEV) console.log(`[DEV][EXTRA] current action payload punch_type:`, payload.punch_type);
      if (import.meta.env.DEV) console.log(`[DEV][EXTRA] finalizado guard triggered:`, isJourneyComplete);
      if (import.meta.env.DEV) console.log(`[DEV][EXTRA] allow extra punch:`, (payload.punch_type === 'ENTRADA_EXTRA' || payload.punch_type === 'SAIDA_EXTRA'));
      if (import.meta.env.DEV) console.log(`[DEV][PONTO] Employee atual:`, payload.employee_id);
      if (import.meta.env.DEV) console.log(`[DEV][PONTO] Organization atual:`, payload.organization_id);
      if (import.meta.env.DEV) console.log(`[DEV][PONTO] Punch type:`, payload.punch_type);
      if (import.meta.env.DEV) console.log(`[DEV][PONTO] GPS validado:`, payload.latitude ? 'Sim' : 'Não');

      if (import.meta.env.DEV) console.log(`[DEV][PONTO] Inserindo attendance_records...`);
      const newRecord = await attendanceService.createAttendanceRecord(payload);
      if (import.meta.env.DEV) console.log(`[DEV][PONTO] attendance_records OK:`, newRecord.id);
      
      // Atualizar o histórico local buscando do servidor para garantir consistência
      try {
        // Podemos passar o schedule aqui se quisermos, mas a princípio o fetch configs vai chamar refresh novamente.
        await refreshTodayRecords(payload.employee_id);
      } catch (refetchErr) {
        if (import.meta.env.DEV) console.log(`[DEV][PONTO][ERRO] refreshTodayRecords falhou:`, refetchErr);
      }

      let message = 'Ponto registrado com sucesso.';
      switch(payload.punch_type) {
        case 'ENTRADA': message = 'Entrada registrada com sucesso.'; break;
        case 'SAIDA_ALMOCO': message = 'Saída para almoço registrada com sucesso.'; break;
        case 'RETORNO_ALMOCO': message = 'Retorno do almoço registrado com sucesso.'; break;
        case 'SAIDA': message = 'Saída registrada com sucesso.'; break;
        case 'ENTRADA_EXTRA': message = 'Entrada da jornada extra registrada com sucesso.'; break;
        case 'SAIDA_EXTRA': message = 'Saída da jornada extra registrada com sucesso.'; break;
      }
      
      addToast(message, 'success');
      return newRecord;
    } catch (err: any) {
      if (import.meta.env.DEV) console.error(`[DEV][PONTO][ERRO] createAttendanceRecord:`, err);
      
      // Tratar erro de banco caso a migration de unique index esteja aplicada
      if (err.message && err.message.includes('duplicate key value')) {
        const dupMsg = 'Este ponto já foi registrado hoje.';
        setError(dupMsg);
        addToast(dupMsg, 'error');
      } else {
        setError(err.message);
        addToast('Não foi possível registrar o ponto. Verifique sua conexão ou permissões e tente novamente.', 'error');
      }
      
      throw err; // Repassar o erro para a interface lidar e bloquear o sucesso visual
    } finally {
      setSubmitting(false);
    }
  };

  return {
    records,
    loading,
    submitting,
    error,
    refreshTodayRecords,
    registerPunch
  };
}

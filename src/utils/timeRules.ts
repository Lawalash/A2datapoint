import type { PunchType } from '@/types';

export interface TimeRules {
  entry_buffer_before_minutes: number;
  entry_buffer_after_minutes: number;
  lunch_start_buffer_before_minutes: number;
  lunch_start_buffer_after_minutes: number;
  lunch_return_buffer_before_minutes: number;
  lunch_return_buffer_after_minutes: number;
  exit_buffer_before_minutes: number;
  exit_buffer_after_minutes: number;
}

export interface WindowResult {
  isWithinWindow: boolean;
  message?: string;
  allowedStart?: string;
  allowedEnd?: string;
  isWarning?: boolean;
}

export function parseTimeToMinutes(time: string): number {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return (hours * 60) + minutes;
}

export function formatMinutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function getAllowedWindow(baseTime: string, beforeMinutes: number, afterMinutes: number, crossesMidnight: boolean = false) {
  let baseMinutes = parseTimeToMinutes(baseTime);
  
  const startMinutes = baseMinutes - beforeMinutes;
  let endMinutes = baseMinutes + afterMinutes;

  if (crossesMidnight) {
    endMinutes += 1440; // Adiciona 24 horas à janela de saída limite
  }

  return {
    startMinutes,
    endMinutes,
    startFormatted: formatMinutesToTime(startMinutes),
    endFormatted: formatMinutesToTime(endMinutes)
  };
}

export function validatePunchTimeWindow(
  punchType: PunchType,
  schedule: any,
  timeRules: TimeRules,
  currentTimeMinutes?: number,
  authorizedOvertimeMinutes: number = 0
): WindowResult {
  if (!schedule) return { isWithinWindow: false, message: 'Nenhuma escala ativa vinculada.' };

  const now = new Date();
  const currentMinutes = currentTimeMinutes ?? (now.getHours() * 60 + now.getMinutes());

  if (punchType === 'SAIDA_ALMOCO' || punchType === 'RETORNO_ALMOCO') {
    return { isWithinWindow: true }; // Almoço sem buffer
  }

  if (punchType === 'ENTRADA') {
    const baseTime = schedule.work_start_time || schedule.entryTime;
    if (!baseTime) return { isWithinWindow: true };
    const beforeMinutes = timeRules.entry_buffer_before_minutes || 0;
    
    const window = getAllowedWindow(baseTime, beforeMinutes, 0);
    // Pode bater a partir do limite inferior. Sem limite superior de bloqueio aqui (apenas na apuração gera atraso).
    if (currentMinutes < window.startMinutes) {
      return {
        isWithinWindow: false,
        message: `Entrada permitida a partir de ${window.startFormatted}.`,
        allowedStart: window.startFormatted
      };
    }
  }

  if (punchType === 'SAIDA') {
    const baseTime = schedule.work_end_time || schedule.exitTime;
    if (!baseTime) return { isWithinWindow: true };
    const afterMinutes = timeRules.exit_buffer_after_minutes || 0;
    const crossesMidnight = schedule.crosses_midnight === true;

    // Se é crossesMidnight e o usuário está batendo no dia seguinte, o currentTimeMinutes deve refletir o avanço do dia.
    // O TabletPonto enviará o currentMinutes já ajustado (+1440) se ele detectou que é uma continuação.
    
    const authorizedWindow = getAllowedWindow(baseTime, 0, afterMinutes + authorizedOvertimeMinutes, crossesMidnight);
    
    // Pode sair até o limite superior. Sem limite inferior de bloqueio (se sair antes gera débito).
    if (currentMinutes > authorizedWindow.endMinutes) {
      return {
        isWithinWindow: true,
        isWarning: true,
        message: "Saída fora da janela normal. O tempo excedente será enviado para análise do administrador.",
        allowedEnd: authorizedWindow.endFormatted
      };
    }
  }

  return { isWithinWindow: true };
}

export function getPunchWindowLabel(punchType: PunchType, schedule: any, timeRules: TimeRules, authorizedOvertimeMinutes: number = 0): string {
  if (!schedule) return '';

  if (punchType === 'ENTRADA') {
    const baseTime = schedule.work_start_time || schedule.entryTime;
    if (!baseTime) return '';
    const beforeMinutes = timeRules.entry_buffer_before_minutes || 0;
    const window = getAllowedWindow(baseTime, beforeMinutes, 0);
    return `Entrada permitida a partir de ${window.startFormatted}`;
  } 
  
  if (punchType === 'SAIDA') {
    const baseTime = schedule.work_end_time || schedule.exitTime;
    if (!baseTime) return '';
    const afterMinutes = timeRules.exit_buffer_after_minutes || 0;
    const crossesMidnight = schedule.crosses_midnight === true;
    
    const normalWindow = getAllowedWindow(baseTime, 0, afterMinutes, crossesMidnight);
    
    if (authorizedOvertimeMinutes > 0) {
      const authWindow = getAllowedWindow(baseTime, 0, afterMinutes + authorizedOvertimeMinutes, crossesMidnight);
      return `Saída normal até ${normalWindow.endFormatted} | Com HE autorizada até ${authWindow.endFormatted}`;
    }
    return `Saída permitida até ${normalWindow.endFormatted}`;
  }

  return ''; // Sem rótulos para almoço
}

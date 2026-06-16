import { parseISO, differenceInDays, startOfDay, getDaysInMonth } from 'date-fns';

export interface ScheduleSummary {
  totalWorkDays: number;
  totalOffDays: number;
  expectedWorkHours: number;
  calendar: {
    date: string; // YYYY-MM-DD
    isWorkDay: boolean;
    crossesMidnight: boolean;
  }[];
}

/**
 * Verifica se a escala cruza a meia-noite (saída <= entrada)
 */
export function doesScheduleCrossMidnight(startTime?: string | null, endTime?: string | null): boolean {
  if (!startTime || !endTime) return false;
  // Compara como string "HH:MM", que é lexicograficamente seguro e equivalente a parse de minutos
  return endTime <= startTime;
}

/**
 * Retorna se o dia atual é um dia de trabalho segundo o padrão ou ciclo
 */
export function isWorkDayByPattern(currentDateStr: string, schedule: any): boolean {
  if (!schedule) return false;

  const type = schedule.schedule_type || 'manual';

  // Fallback para escalas manuais
  if (type === 'manual') {
    const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const dateObj = new Date(currentDateStr + 'T12:00:00'); // Evita fuso no Parse
    const currentDayName = daysOfWeek[dateObj.getDay()];
    const workDays: string[] = schedule.work_days || [];
    return workDays.some(d => d.startsWith(currentDayName.substring(0, 3)));
  }

  // Lógica de Ciclos (12x36, 5x2, 6x1)
  if (!schedule.cycle_start_date || !schedule.cycle_work_days || !schedule.cycle_rest_days) {
    return false; // Escala automática mal configurada
  }

  const startDate = startOfDay(parseISO(schedule.cycle_start_date));
  const currentDate = startOfDay(parseISO(currentDateStr));

  const diffDays = differenceInDays(currentDate, startDate);

  if (diffDays < 0) {
    return false; // A data atual é antes do início do ciclo
  }

  const cycleLength = schedule.cycle_work_days + schedule.cycle_rest_days;
  const dayInCycle = diffDays % cycleLength;

  return dayInCycle < schedule.cycle_work_days;
}

/**
 * Calcula os dias de trabalho, folgas e as horas totais projetadas para um mês específico
 */
export function calculateMonthlyScheduleSummary(schedule: any, year: number, month: number): ScheduleSummary {
  const daysInMonth = getDaysInMonth(new Date(year, month - 1));
  let totalWorkDays = 0;
  let totalOffDays = 0;
  const calendar = [];

  const crossesMidnight = doesScheduleCrossMidnight(schedule.work_start_time, schedule.work_end_time);

  // Calcula horas do turno
  let shiftHours = 0;
  if (schedule.work_start_time && schedule.work_end_time) {
    const [startH, startM] = schedule.work_start_time.split(':').map(Number);
    const [endH, endM] = schedule.work_end_time.split(':').map(Number);
    
    let totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (totalMinutes <= 0) totalMinutes += 24 * 60; // Cruza meia-noite
    
    if (schedule.break_duration_minutes) {
      totalMinutes -= schedule.break_duration_minutes;
    }
    
    shiftHours = totalMinutes / 60;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isWork = isWorkDayByPattern(dateStr, schedule);
    
    if (isWork) {
      totalWorkDays++;
    } else {
      totalOffDays++;
    }

    calendar.push({
      date: dateStr,
      isWorkDay: isWork,
      crossesMidnight: isWork && crossesMidnight,
    });
  }

  return {
    totalWorkDays,
    totalOffDays,
    expectedWorkHours: totalWorkDays * shiftHours,
    calendar
  };
}

/**
 * Encontra a próxima data e hora de expediente a partir de uma data inicial.
 * Procura em até 60 dias para evitar loop infinito.
 */
export function getNextWorkDate(schedule: any, fromDateStr: string): { date: string, time: string, crossesMidnight: boolean } | null {
  if (!schedule) return null;

  const maxSearchDays = 60;
  const startDate = parseISO(fromDateStr);
  const time = schedule.work_start_time ? schedule.work_start_time.substring(0, 5) : '00:00';
  const crossesMidnight = doesScheduleCrossMidnight(schedule.work_start_time, schedule.work_end_time);

  // Começa a buscar a partir de amanhã (D+1)
  for (let i = 1; i <= maxSearchDays; i++) {
    const nextDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const nextDateStr = nextDate.toISOString().split('T')[0];
    
    if (isWorkDayByPattern(nextDateStr, schedule)) {
      return {
        date: nextDateStr,
        time,
        crossesMidnight
      };
    }
  }

  return null;
}

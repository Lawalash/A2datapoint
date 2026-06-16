
export interface JourneyCalculationParams {
  date: string;
  records: any[];
  schedule: any;
  timeRules: any; // used to log or validate if needed, but calculation uses exact times
  authorized_overtime_minutes?: number; // Regra 18: HE autorizada
}

export interface JourneyCalculationResult {
  expected_minutes: number;
  worked_minutes: number;
  break_minutes: number;
  delay_minutes: number;
  early_leave_minutes: number;
  overtime_minutes: number;
  balance_minutes: number;
  first_punch_at: string | null;
  last_punch_at: string | null;
  entry_time: string | null;
  lunch_out_time: string | null;
  lunch_return_time: string | null;
  exit_time: string | null;
  status: string;
  notes?: string;
  authorized_overtime_minutes?: number;
  realized_overtime_minutes?: number;
  unauthorized_overtime_minutes?: number;
  overtime_status?: string;
}

function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function extractTime(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toTimeString().substring(0, 5);
}

export function calculateBreakDurationMinutes(breakStartTime: string | null | undefined, breakEndTime: string | null | undefined): number {
  if (!breakStartTime || !breakEndTime) return 0;
  
  const startMin = timeToMinutes(breakStartTime);
  const endMin = timeToMinutes(breakEndTime);
  
  const duration = endMin - startMin;
  return duration > 0 ? duration : 0;
}

export function calculateConsumedBreakMinutes(records: any[]): number {
  const sortedRecords = [...records].sort((a, b) => new Date(a.punched_at || a.created_at).getTime() - new Date(b.punched_at || b.created_at).getTime());
  
  let consumedMinutes = 0;
  let currentLunchOut: Date | null = null;
  
  for (const r of sortedRecords) {
    if (r.punch_type === 'SAIDA_ALMOCO') {
      currentLunchOut = new Date(r.punched_at || r.created_at);
    } else if (r.punch_type === 'RETORNO_ALMOCO' && currentLunchOut) {
      const retDate = new Date(r.punched_at || r.created_at);
      consumedMinutes += Math.floor((retDate.getTime() - currentLunchOut.getTime()) / 60000);
      currentLunchOut = null;
    }
  }
  
  return consumedMinutes;
}

export function calculateCurrentOpenBreakMinutes(records: any[]): number {
  const sortedRecords = [...records].sort((a, b) => new Date(a.punched_at || a.created_at).getTime() - new Date(b.punched_at || b.created_at).getTime());
  
  let currentLunchOut: Date | null = null;
  for (const r of sortedRecords) {
    if (r.punch_type === 'SAIDA_ALMOCO') {
      currentLunchOut = new Date(r.punched_at || r.created_at);
    } else if (r.punch_type === 'RETORNO_ALMOCO') {
      currentLunchOut = null;
    }
  }
  
  if (!currentLunchOut) return 0;
  return Math.floor((new Date().getTime() - currentLunchOut.getTime()) / 60000);
}

export function determineNextPunchAction(records: any[], schedule: any, authorizedHeMinutes: number = 0): { nextPunchType: string, punchButtonText: string, hasOpenLunch: boolean } {
  const sortedRecords = [...records].sort((a, b) => new Date(a.punched_at || a.created_at).getTime() - new Date(b.punched_at || b.created_at).getTime());
  
  const hasEntry = sortedRecords.some(r => r.punch_type === 'ENTRADA');
  const hasFinalExit = sortedRecords.some(r => r.punch_type === 'SAIDA');
  
  // Calculate open lunch
  let hasOpenLunch = false;
  for (const r of sortedRecords) {
    if (r.punch_type === 'SAIDA_ALMOCO') hasOpenLunch = true;
    if (r.punch_type === 'RETORNO_ALMOCO') hasOpenLunch = false;
  }
  
  if (!hasEntry) {
    return { nextPunchType: 'ENTRADA', punchButtonText: 'Registrar Entrada', hasOpenLunch };
  }
  
  const hasExtraEntry = sortedRecords.some(r => r.punch_type === 'ENTRADA_EXTRA');
  const hasExtraExit = sortedRecords.some(r => r.punch_type === 'SAIDA_EXTRA');

  if (hasFinalExit) {
    if (hasExtraEntry && !hasExtraExit) {
      return { nextPunchType: 'SAIDA_EXTRA', punchButtonText: 'Encerrar Jornada Extra', hasOpenLunch: false };
    }
    if (hasExtraExit) {
      return { nextPunchType: 'FINALIZADO', punchButtonText: 'Jornada Finalizada', hasOpenLunch: false };
    }
    if (authorizedHeMinutes > 0) {
      return { nextPunchType: 'ENTRADA_EXTRA', punchButtonText: 'Iniciar Jornada Extra', hasOpenLunch: false };
    }
    return { nextPunchType: 'FINALIZADO', punchButtonText: 'Jornada Finalizada', hasOpenLunch: false };
  }
  
  if (hasOpenLunch) {
    return { nextPunchType: 'RETORNO_ALMOCO', punchButtonText: 'Retornar do Almoço', hasOpenLunch };
  }
  
  // If no open lunch, can be SAIDA_ALMOCO or SAIDA depending on consumed break
  const consumedLunchMinutes = calculateConsumedBreakMinutes(sortedRecords);
  let expectedLunchMinutes = 0;
  
  if (schedule?.work_schedules) {
    expectedLunchMinutes = calculateBreakDurationMinutes(schedule.work_schedules.break_start_time, schedule.work_schedules.break_end_time);
  }
  
  const canStillLunch = consumedLunchMinutes < expectedLunchMinutes;
  
  if (expectedLunchMinutes > 0 && canStillLunch) {
    return { nextPunchType: 'SAIDA_ALMOCO', punchButtonText: 'Sair para Almoço', hasOpenLunch };
  }
  
  return { nextPunchType: 'SAIDA', punchButtonText: 'Registrar Saída', hasOpenLunch };
}

export function calculateJourney(params: JourneyCalculationParams): JourneyCalculationResult {
  const { records, schedule } = params;

  console.log('[DEV] calculateJourney called', { records, schedule });

  // Defaults
  let expected_minutes = 480; // 8 hours fallback
  let expEntry = '08:00';
  let expLunchOut = '12:00';
  let expLunchRet = '13:00';
  let expExit = '17:00';

  if (schedule?.work_schedules) {
    const ws = schedule.work_schedules;
    expEntry = ws.work_start_time || '08:00';
    expLunchOut = ws.break_start_time || '12:00';
    expLunchRet = ws.break_end_time || '13:00';
    expExit = ws.work_end_time || '17:00';
    
    const lunchDurationMinutes = calculateBreakDurationMinutes(expLunchOut, expLunchRet);
    
    let rawExpected = timeToMinutes(expExit) - timeToMinutes(expEntry);
    if (rawExpected < 0) rawExpected += 24 * 60; // virada de dia
    expected_minutes = Math.max(0, rawExpected - lunchDurationMinutes);
  }

  const sortedRecords = [...records].sort((a, b) => new Date(a.punched_at || a.created_at).getTime() - new Date(b.punched_at || b.created_at).getTime());

  const entryRecord = sortedRecords.find(r => r.punch_type === 'ENTRADA');
  // SAIDA is the LAST SAIDA record just in case
  const exitRecord = [...sortedRecords].reverse().find(r => r.punch_type === 'SAIDA');

  const entryDate = entryRecord ? new Date(entryRecord.punched_at || entryRecord.created_at) : null;
  const exitDate = exitRecord ? new Date(exitRecord.punched_at || exitRecord.created_at) : null;

  const extraEntryRecord = sortedRecords.find(r => r.punch_type === 'ENTRADA_EXTRA');
  const extraExitRecord = sortedRecords.find(r => r.punch_type === 'SAIDA_EXTRA');

  const extraEntryDate = extraEntryRecord ? new Date(extraEntryRecord.punched_at || extraEntryRecord.created_at) : null;
  const extraExitDate = extraExitRecord ? new Date(extraExitRecord.punched_at || extraExitRecord.created_at) : null;

  // Compute multiple lunches
  let break_minutes = 0;
  let currentLunchOut: Date | null = null;
  let firstLunchOutDate: Date | null = null;
  let firstLunchRetDate: Date | null = null;

  for (const r of sortedRecords) {
    if (r.punch_type === 'SAIDA_ALMOCO') {
      const d = new Date(r.punched_at || r.created_at);
      if (!firstLunchOutDate) firstLunchOutDate = d;
      currentLunchOut = d;
    } else if (r.punch_type === 'RETORNO_ALMOCO' && currentLunchOut) {
      const retDate = new Date(r.punched_at || r.created_at);
      if (!firstLunchRetDate) firstLunchRetDate = retDate;
      break_minutes += Math.floor((retDate.getTime() - currentLunchOut.getTime()) / 60000);
      currentLunchOut = null;
    }
  }

  // Se tem SAIDA_ALMOCO sem retorno ainda, jornada fica em_andamento
  const hasOpenLunch = currentLunchOut !== null;

  const first_punch_at = entryDate ? entryDate.toISOString() : null;
  const last_punch_at = sortedRecords.length > 0 ? new Date(sortedRecords[sortedRecords.length - 1].punched_at || sortedRecords[sortedRecords.length - 1].created_at).toISOString() : null;

  const entry_time = extractTime(first_punch_at);
  const lunch_out_time = extractTime(firstLunchOutDate ? firstLunchOutDate.toISOString() : null);
  const lunch_return_time = extractTime(firstLunchRetDate ? firstLunchRetDate.toISOString() : null);
  const exit_time = extractTime(exitDate ? exitDate.toISOString() : null);

  const hasEntry = !!entryDate;
  const hasExit = !!exitDate;

  if (!hasEntry) {
    return {
      expected_minutes,
      worked_minutes: 0,
      break_minutes: 0,
      delay_minutes: 0,
      early_leave_minutes: 0,
      overtime_minutes: 0,
      balance_minutes: 0,
      first_punch_at,
      last_punch_at,
      entry_time,
      lunch_out_time,
      lunch_return_time,
      exit_time,
      status: 'falta'
    };
  }

  if (!hasExit || hasOpenLunch) {
    return {
      expected_minutes,
      worked_minutes: 0, // only finalized when exited
      break_minutes,
      delay_minutes: 0,
      early_leave_minutes: 0,
      overtime_minutes: 0,
      balance_minutes: 0,
      first_punch_at,
      last_punch_at,
      entry_time,
      lunch_out_time,
      lunch_return_time,
      exit_time,
      status: hasOpenLunch ? 'em_pausa' : 'em_andamento'
    };
  }

  // Jornada Completa Finalizada
  const entryMin = entryDate.getHours() * 60 + entryDate.getMinutes();
  const exitMin = exitDate.getHours() * 60 + exitDate.getMinutes();
  const expEntryMin = timeToMinutes(expEntry);
  const expExitMin = timeToMinutes(expExit);

  // Não gera hora extra por chegar antes (chegar 15:55 pro exp 16:05 -> entry virtual = 16:05)
  // Mas gera atraso se chegar depois
  const actualEntryMin = Math.max(expEntryMin, entryMin);
  
  // A saída é literal
  const actualExitMin = exitMin;

  const total_worked = (actualExitMin - actualEntryMin) - break_minutes;
  
  let extra_worked_minutes = 0;
  if (extraEntryDate && extraExitDate) {
     const eMin = extraEntryDate.getHours() * 60 + extraEntryDate.getMinutes();
     const exMin = extraExitDate.getHours() * 60 + extraExitDate.getMinutes();
     extra_worked_minutes = Math.max(0, exMin - eMin);
     if (exMin < eMin) {
        extra_worked_minutes = Math.max(0, (exMin + 24*60) - eMin);
     }
  }

  const worked_minutes = Math.max(0, total_worked) + extra_worked_minutes;

  const actual_balance = worked_minutes - expected_minutes;

  let delay_minutes = 0;
  let total_overtime = 0;
  let early_leave_minutes = 0;

  if (actual_balance < 0) {
    delay_minutes = Math.abs(actual_balance); // engloba atraso de entrada, almoço longo ou saída antecipada
    if (actualExitMin < expExitMin) {
      early_leave_minutes = expExitMin - actualExitMin;
    }
  } else if (actual_balance > 0) {
    total_overtime = actual_balance;
  }

  const exitBuffer = params.timeRules?.exit_buffer_after_minutes || 0;
  const normalExitLimit = expExitMin + exitBuffer;
  let actualOvertimeAfterBuffer = 0;
  if (actualExitMin > normalExitLimit) {
    actualOvertimeAfterBuffer = actualExitMin - normalExitLimit;
  }

  const authorized_overtime = params.authorized_overtime_minutes || 0;
  let realized_overtime = 0;
  let unauthorized_overtime = 0;
  let overtime_status = 'nenhuma';

  if (actualOvertimeAfterBuffer > 0 || extra_worked_minutes > 0) {
     const totalRawOvertime = actualOvertimeAfterBuffer + extra_worked_minutes;
     realized_overtime = Math.min(totalRawOvertime, authorized_overtime);
     unauthorized_overtime = Math.max(0, totalRawOvertime - authorized_overtime);
     
     if (authorized_overtime > 0) {
       if (realized_overtime > 0 && unauthorized_overtime > 0) {
          overtime_status = 'mista';
       } else if (realized_overtime >= authorized_overtime) {
          overtime_status = 'realizada';
       } else if (realized_overtime > 0) {
          overtime_status = 'parcial';
       } else {
          overtime_status = 'nao_realizada';
       }
     } else {
       overtime_status = 'indevida';
     }
  } else if (authorized_overtime > 0) {
     overtime_status = 'nao_realizada';
  }

  // O balance_minutes final que vai para o ledger DEVE incluir apenas a HE realizada! (se positivo)
  // Se for negativo, mantém o original.
  const balance_minutes = actual_balance > 0 ? realized_overtime : actual_balance;

  let status = 'normal';
  if (actual_balance < 0) {
    status = early_leave_minutes > 0 ? 'saida_antecipada' : 'atraso';
  } else if (actual_balance > 0) {
    status = 'hora_extra';
  }

  // Criar bloco de notas JSON
  let notes: string | undefined;
  if (authorized_overtime > 0 || total_overtime > 0) {
    notes = JSON.stringify({
      authorized_overtime_minutes: authorized_overtime,
      realized_overtime_minutes: realized_overtime,
      unauthorized_overtime_minutes: unauthorized_overtime,
      overtime_status: overtime_status
    });
  }

  const result: JourneyCalculationResult = {
    expected_minutes,
    worked_minutes,
    break_minutes,
    delay_minutes,
    early_leave_minutes,
    overtime_minutes: total_overtime,
    balance_minutes,
    first_punch_at,
    last_punch_at,
    entry_time,
    lunch_out_time,
    lunch_return_time,
    exit_time,
    status,
    notes,
    authorized_overtime_minutes: authorized_overtime,
    realized_overtime_minutes: realized_overtime,
    unauthorized_overtime_minutes: unauthorized_overtime,
    overtime_status
  };

  console.log('[DEV] calculateJourney result', result);
  return result;
}

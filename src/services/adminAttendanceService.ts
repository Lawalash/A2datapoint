import { supabase } from '../lib/supabase';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AttendanceRecord = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AttendancePhoto = any;

export interface AdminAttendanceFilters {
  startDate: string;
  endDate: string;
  employeeId?: string;
  employeeStatus?: 'ativos' | 'inativos' | 'todos';
  photoStatus?: 'todos' | 'uploaded' | 'pending' | 'not_required' | 'removed';
  searchQuery?: string;
}

export interface AttendanceGroup {
  employee_id: string;
  server_date: string;
  employee_name: string;
  employee_matricula: string;
  is_overnight?: boolean;
  end_date?: string;
  extraBreaks: number;
  punches: {
    [key: string]: {
      record: AttendanceRecord;
      photo?: AttendancePhoto;
    }
  };
  all_records: AttendanceRecord[];
}

export const adminAttendanceService = {
  async fetchAdminAttendanceRecords(orgId: string, filters: AdminAttendanceFilters) {
    if (!orgId) throw new Error('Organização não definida.');

    let query = supabase
      .from('attendance_records')
      .select(`
        *,
        employees!inner (
          id,
          full_name,
          matricula,
          is_active
        ),
        work_schedules (
          name,
          schedule_type,
          crosses_midnight,
          work_start_time,
          work_end_time
        ),
        attendance_photos (*)
      `)
      .eq('organization_id', orgId)
      .gte('server_date', filters.startDate)
      .lte('server_date', filters.endDate)
      .order('server_date', { ascending: false })
      .order('punched_at', { ascending: true });

    if (filters.employeeId) {
      query = query.eq('employee_id', filters.employeeId);
    }

    if (filters.photoStatus && filters.photoStatus !== 'todos') {
      query = query.eq('photo_status', filters.photoStatus);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    let records = data || [];

    // Filtro em memória para employeeStatus (pois dependemos da relação employees)
    if (filters.employeeStatus && filters.employeeStatus !== 'todos') {
      const isActive = filters.employeeStatus === 'ativos';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      records = records.filter((r: any) => r.employees?.is_active === isActive);
    }

    return records;
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  groupAttendanceByEmployeeAndDate(records: any[]): AttendanceGroup[] {
    const map = new Map<string, AttendanceGroup>();

    // Ordenar registros por employee_id e tempo (created_at fallback)
    const sortedRecords = [...records].sort((a, b) => {
      if (a.employee_id !== b.employee_id) return a.employee_id.localeCompare(b.employee_id);
      return new Date(a.punched_at || a.created_at).getTime() - new Date(b.punched_at || b.created_at).getTime();
    });

    if (import.meta.env.DEV) console.log(`[DEV][ADMIN_OVERNIGHT] raw records: ${sortedRecords.length}`);

    // Estado da jornada corrente por colaborador
    const activeJourneys = new Map<string, {
      operational_date: string;
      is_overnight: boolean;
      groupKey: string;
    }>();

    sortedRecords.forEach(record => {
      const empId = record.employee_id;
      
      if (record.punch_type === 'ENTRADA') {
        const opDate = record.server_date;

        const jKey = `${empId}_${opDate}_${new Date(record.punched_at || record.created_at).getTime()}`;
        
        activeJourneys.set(empId, {
          operational_date: opDate,
          is_overnight: false,
          groupKey: jKey
        });

        if (import.meta.env.DEV) console.log(`[DEV][ADMIN_OVERNIGHT] started journey ${jKey}`);

        map.set(jKey, {
          employee_id: empId,
          server_date: opDate,
          employee_name: record.employees?.full_name || 'Desconhecido',
          employee_matricula: record.employees?.matricula || '-',
          is_overnight: false,
          extraBreaks: 0,
          punches: {},
          all_records: []
        });
      }

      let active = activeJourneys.get(empId);

      // Se for EXTRA, tentar localizar o grupo original da mesma data operacional
      if (!active && (record.punch_type === 'ENTRADA_EXTRA' || record.punch_type === 'SAIDA_EXTRA')) {
         const matchingGroup = Array.from(map.values()).reverse().find(g => g.employee_id === empId && g.server_date === record.server_date);
         if (matchingGroup) {
            const matchingKey = Array.from(map.keys()).find(k => map.get(k) === matchingGroup);
            if (matchingKey) {
               active = { operational_date: matchingGroup.server_date, is_overnight: matchingGroup.is_overnight || false, groupKey: matchingKey };
               activeJourneys.set(empId, active);
            }
         }
      }

      // Se achou um evento sem ENTRADA prévia, cria uma jornada avulsa
      if (!active) {
        const fallbackKey = `${empId}_${record.server_date}_fallback_${record.id}`;
        map.set(fallbackKey, {
          employee_id: empId,
          server_date: record.server_date,
          employee_name: record.employees?.full_name || 'Desconhecido',
          employee_matricula: record.employees?.matricula || '-',
          is_overnight: false,
          extraBreaks: 0,
          punches: {},
          all_records: []
        });
        active = {
          operational_date: record.server_date,
          is_overnight: false,
          groupKey: fallbackKey
        };
        // Não setamos no activeJourneys para não capturar eventos futuros indevidamente? 
        // Não, se é uma saída/almoço isolada, melhor não prender a próxima saída.
      } else {
        if (import.meta.env.DEV) console.log(`[DEV][ADMIN_OVERNIGHT] appended event ${record.punch_type} to ${active.groupKey}`);
      }

      const group = map.get(active.groupKey)!;
      group.all_records.push(record);

      if (record.server_date !== group.server_date) {
         group.is_overnight = true;
         group.end_date = record.server_date;
      }
      // Se houver crosses_midnight explícito no registro, também forçar
      if (record.work_schedules?.crosses_midnight === true) {
         group.is_overnight = true;
      }

      const photo = record.attendance_photos && record.attendance_photos.length > 0
        ? record.attendance_photos.find((p: any) => p.attendance_record_id === record.id)
        : undefined;

      if (record.punch_type === 'SAIDA_ALMOCO' && group.punches['SAIDA_ALMOCO']) {
         group.extraBreaks += 1;
         return; 
      }

      group.punches[record.punch_type] = { record, photo };

      // Limpa rastreio para fechar jornada corrente e liberar próxima Entrada, mas SAIDA_EXTRA fecha o bloco extra.
      if (record.punch_type === 'SAIDA' || record.punch_type === 'SAIDA_EXTRA') {
        if (import.meta.env.DEV) console.log(`[DEV][ADMIN_OVERNIGHT] closed journey ${active.groupKey}`);
        activeJourneys.delete(empId);
      }
    });

    const result = Array.from(map.values());
    result.forEach(g => {
       if (import.meta.env.DEV) console.log(`[DEV][ADMIN_OVERNIGHT] operational_date ${g.server_date}, visual_date_range ${g.server_date} -> ${g.end_date || g.server_date}`);
    });
    result.sort((a, b) => new Date(b.server_date).getTime() - new Date(a.server_date).getTime());
    return result;
  },

  async getPhotoSignedUrl(storagePath: string, recordId?: string, photoStatus?: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from('attendance-photos')
      .createSignedUrl(storagePath, 60); // Válido por 60 segundos

    if (error) {
      if (import.meta.env.DEV) {
        console.error('[DEV][EVIDENCIA] erro ao gerar signed URL', {
          attendance_record_id: recordId,
          photo_status: photoStatus,
          storage_path: storagePath,
          erro: error
        });
      }
      throw error;
    }

    return data.signedUrl;
  },

  async getScheduleDetailsForAttendanceDay(orgId: string, employeeId: string, serverDate: string, scheduleId?: string) {
    if (import.meta.env.DEV) {
      console.log(`[DEV] getScheduleDetailsForAttendanceDay: employeeId=${employeeId}, serverDate=${serverDate}, records_scheduleId=${scheduleId}`);
    }

    // 1. Tentar com o scheduleId dos registros (attendance_records)
    if (scheduleId) {
      const { data, error } = await supabase
        .from('work_schedules')
        .select('*')
        .eq('id', scheduleId)
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .single();
      
      if (!error && data) {
        if (import.meta.env.DEV) console.log('[DEV] Escala encontrada via attendance_records');
        return data;
      }
    }

    // 2. Tentar buscar o schedule_id no sumário do dia (attendance_daily_summaries)
    const { data: summaryData, error: summaryErr } = await supabase
      .from('attendance_daily_summaries')
      .select('schedule_id')
      .eq('organization_id', orgId)
      .eq('employee_id', employeeId)
      .eq('server_date', serverDate)
      .is('deleted_at', null)
      .maybeSingle();

    if (!summaryErr && summaryData?.schedule_id) {
      if (import.meta.env.DEV) console.log(`[DEV] schedule_id encontrado no summary: ${summaryData.schedule_id}`);
      const { data, error } = await supabase
        .from('work_schedules')
        .select('*')
        .eq('id', summaryData.schedule_id)
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .single();

      if (!error && data) {
        if (import.meta.env.DEV) console.log('[DEV] Escala encontrada via attendance_daily_summaries');
        return data;
      }
    }

    // 3. Tentar fallback histórico pela tabela employee_schedules na data da jornada
    const { data: empSchedule, error: empError } = await supabase
      .from('employee_schedules')
      .select('schedule_id, work_schedules(*)')
      .eq('organization_id', orgId)
      .eq('employee_id', employeeId)
      .lte('starts_at', serverDate)
      .or(`ends_at.is.null,ends_at.gte.${serverDate}`)
      .order('starts_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (empError) {
      if (import.meta.env.DEV) console.error('[DEV] Erro no fallback employee_schedules:', empError);
      throw empError;
    }
    
    if (empSchedule && empSchedule.work_schedules) {
      if (import.meta.env.DEV) console.log('[DEV] Escala encontrada via fallback employee_schedules');
      if (Array.isArray(empSchedule.work_schedules)) {
        return empSchedule.work_schedules[0];
      }
      return empSchedule.work_schedules;
    }

    if (import.meta.env.DEV) console.log('[DEV] Nenhuma escala encontrada para o dia');
    return null;
  }
};

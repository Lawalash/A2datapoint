import { supabase } from '@/lib/supabase';
import type { PunchType } from '@/types';
import { getLocalOperationDate, getLocalOperationYear, getLocalOperationMonth, getLocalOperationDay } from '@/utils/dateUtils';

export interface AttendancePayload {
  organization_id: string;
  employee_id: string;
  schedule_id?: string | null;
  punch_type: PunchType;
  latitude?: number | null;
  longitude?: number | null;
  gps_accuracy?: number | null;
  distance_from_base_meters?: number | null;
  is_within_radius?: boolean | null;
  device_info?: string | null;
  user_agent?: string | null;
  photo_required?: boolean;
  photo_status?: string;
}

export const attendanceService = {
  /**
   * Busca os registros reais de ponto do colaborador logado para a data atual (do servidor/banco).
   */
  async getTodayAttendanceRecords(employeeId: string) {
    const today = getLocalOperationDate();
    
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('server_date', today)
      .is('deleted_at', null)
      .order('punched_at', { ascending: true });

    if (error) {
      console.error('Erro ao buscar attendance_records:', error);
      throw new Error('Falha ao buscar registros de ponto de hoje.');
    }

    return data || [];
  },

  /**
   * Cria um registro textual de ponto em attendance_records.
   */
  async createAttendanceRecord(payload: AttendancePayload) {
    const { error, data } = await supabase
      .from('attendance_records')
      .insert({
        organization_id: payload.organization_id,
        employee_id: payload.employee_id,
        schedule_id: payload.schedule_id || null,
        punch_type: payload.punch_type,
        latitude: payload.latitude,
        longitude: payload.longitude,
        gps_accuracy: payload.gps_accuracy,
        distance_from_base_meters: payload.distance_from_base_meters,
        is_within_radius: payload.is_within_radius,
        photo_required: payload.photo_required ?? false,
        photo_status: payload.photo_status ?? 'not_required',
        device_info: payload.device_info,
        user_agent: payload.user_agent,
        status: 'normal'
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase RLS/Insert Error:', error);
      throw new Error(error.message || 'Erro de permissão ou falha ao inserir o ponto.');
    }

    return data;
  },

  /**
   * Faz o upload da foto para o bucket 'attendance-photos' e atualiza o banco via RPC.
   */
  async uploadAttendancePhoto(
    recordId: string, 
    organizationId: string, 
    employeeId: string, 
    punchType: string,
    imageBlob: Blob
  ) {
    // Path: {organization_id}/{employee_id}/{yyyy}/{mm}/{dd}/{attendance_record_id}_{punch_type}.webp
    const yyyy = getLocalOperationYear();
    const mm = getLocalOperationMonth();
    const dd = getLocalOperationDay();
    const fileName = `${recordId}_${punchType}.webp`;
    const storagePath = `${organizationId}/${employeeId}/${yyyy}/${mm}/${dd}/${fileName}`;

    if (import.meta.env.DEV) console.log(`[DEV][PONTO] Upload Storage iniciado:`, storagePath);
    // 1. Upload
    const { error: uploadError } = await supabase.storage
      .from('attendance-photos')
      .upload(storagePath, imageBlob, {
        contentType: 'image/webp',
        upsert: false
      });

    if (uploadError) {
      if (import.meta.env.DEV) console.error(`[DEV][PONTO][ERRO] Upload Storage:`, uploadError);
      throw new Error('Falha no upload da imagem da câmera.');
    }
    if (import.meta.env.DEV) console.log(`[DEV][PONTO] Upload Storage OK`);

    // 2. Insert metadata in attendance_photos
    const { error: metadataError } = await supabase
      .from('attendance_photos')
      .insert({
        organization_id: organizationId,
        employee_id: employeeId,
        attendance_record_id: recordId,
        storage_path: storagePath,
        file_name: fileName,
        file_size_bytes: imageBlob.size,
        mime_type: 'image/webp',
        description: `Colaborador: ${employeeId} | Tipo: ${punchType} | Data: ${yyyy}-${mm}-${dd}`
      });

    if (metadataError) {
      if (import.meta.env.DEV) console.error(`[DEV][PONTO][ERRO] Insert attendance_photos:`, metadataError);
      throw new Error('Foto anexada, mas falha ao salvar vínculo no banco.');
    }
    if (import.meta.env.DEV) console.log(`[DEV][PONTO] Insert attendance_photos OK`);

    // 3. Mark uploaded via secure RPC
    const { error: rpcError } = await supabase.rpc('mark_attendance_photo_uploaded', {
      p_record_id: recordId,
      p_photo_path: storagePath
    });

    if (rpcError) {
      if (import.meta.env.DEV) console.error(`[DEV][PONTO][ERRO] RPC mark_attendance_photo_uploaded:`, rpcError);
      throw new Error('Foto salva, mas falha ao atualizar o status do ponto.');
    }
    if (import.meta.env.DEV) console.log(`[DEV][PONTO] RPC mark photo OK`);

    return storagePath;
  }
};

export async function getOpenOvernightAttendanceRecords(employeeId: string, schedule: any) {
  if (!schedule || !schedule.work_schedules || !schedule.work_schedules.crosses_midnight) {
     return null;
  }

  if (import.meta.env.DEV) console.log('[DEV][OVERNIGHT] checking open overnight journey');
  if (import.meta.env.DEV) console.log('[DEV][OVERNIGHT] schedule.crosses_midnight is true');

  const today = getLocalOperationDate();
  const yesterdayDate = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
  const yesterday = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('employee_id', employeeId)
    .in('server_date', [yesterday, today])
    .is('deleted_at', null)
    .order('punched_at', { ascending: true });

  if (error || !data) return null;

  if (import.meta.env.DEV) console.log(`[DEV][OVERNIGHT] yesterday and today records: ${data.length}`);

  // Encontrar a última ENTRADA
  let lastEntryIndex = -1;
  for (let i = data.length - 1; i >= 0; i--) {
     if (data[i].punch_type === 'ENTRADA') {
        lastEntryIndex = i;
        break;
     }
  }

  if (lastEntryIndex === -1) {
     if (import.meta.env.DEV) console.log('[DEV][OVERNIGHT] last entry not found');
     return null;
  }

  const lastEntry = data[lastEntryIndex];
  if (import.meta.env.DEV) console.log(`[DEV][OVERNIGHT] last entry found: ${lastEntry.punched_at}`);

  // Verificar se existe SAIDA posterior a esta ENTRADA
  let hasFinalExit = false;
  for (let i = lastEntryIndex + 1; i < data.length; i++) {
     if (data[i].punch_type === 'SAIDA') {
        hasFinalExit = true;
        break;
     }
  }

  if (import.meta.env.DEV) console.log(`[DEV][OVERNIGHT] has final exit after entry: ${hasFinalExit}`);

  if (!hasFinalExit) {
     if (import.meta.env.DEV) console.log('[DEV][OVERNIGHT] open overnight detected true');
     // Retornar a jornada a partir da última ENTRADA
     return data.slice(lastEntryIndex);
  }

  if (import.meta.env.DEV) console.log('[DEV][OVERNIGHT] open overnight detected false');
  return null;
}


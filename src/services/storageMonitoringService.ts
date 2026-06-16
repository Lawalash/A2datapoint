import { supabase } from '@/lib/supabase';

export interface PhotoMonitorStats {
  totalCount: number;
  totalSizeBytes: number;
  uploadedCount: number;
  pendingCount: number;
  failedCount: number;
  avgSizeBytes: number;
  maxSizeBytes: number;
}

export interface EmployeePhotoStats {
  employeeId: string;
  matricula: string;
  fullName: string;
  photoCount: number;
  totalSizeBytes: number;
  lastPhotoAt: string | null;
}

export interface LatestPhotoInfo {
  id: string;
  employeeId: string;
  matricula: string;
  fullName: string;
  createdAt: string;
  punchType: string;
  sizeBytes: number;
  status: string;
}

export interface StorageMonitoringData {
  stats: PhotoMonitorStats;
  byEmployee: EmployeePhotoStats[];
  latestPhotos: LatestPhotoInfo[];
}

export const storageMonitoringService = {
  async getMonitoringData(organizationId: string): Promise<StorageMonitoringData> {
    // 1. Fetch attendance_photos and related punch_type/status
    const { data: photos, error: photosErr } = await supabase
      .from('attendance_photos')
      .select(`
        id, 
        employee_id, 
        created_at, 
        file_size_bytes, 
        attendance_records (
          punch_type,
          photo_status
        )
      `)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (photosErr) throw photosErr;

    // 2. Fetch employees for mapping
    const { data: employees, error: empErr } = await supabase
      .from('employees')
      .select('id, matricula, full_name')
      .eq('organization_id', organizationId);

    if (empErr) throw empErr;

    const employeeMap = new Map<string, any>();
    employees?.forEach(e => employeeMap.set(e.id, e));

    // Calculate overall stats
    let totalCount = 0;
    let totalSizeBytes = 0;
    let uploadedCount = 0;
    let pendingCount = 0;
    let failedCount = 0;
    let maxSizeBytes = 0;

    // Group by employee
    const empStatsMap = new Map<string, EmployeePhotoStats>();

    photos?.forEach(p => {
      totalCount++;
      const size = p.file_size_bytes || 0;
      totalSizeBytes += size;
      if (size > maxSizeBytes) maxSizeBytes = size;

      // Extract from related record
      const record = Array.isArray(p.attendance_records) ? p.attendance_records[0] : p.attendance_records;
      const status = record?.photo_status || 'uploaded'; // Default to uploaded if it exists in photos table
      
      if (status === 'uploaded') uploadedCount++;
      else if (status === 'pending') pendingCount++;
      else if (status === 'failed') failedCount++;

      if (!empStatsMap.has(p.employee_id)) {
        const emp = employeeMap.get(p.employee_id);
        empStatsMap.set(p.employee_id, {
          employeeId: p.employee_id,
          matricula: emp?.matricula || 'Desconhecida',
          fullName: emp?.full_name || 'Desconhecido',
          photoCount: 0,
          totalSizeBytes: 0,
          lastPhotoAt: p.created_at
        });
      }
      const eStats = empStatsMap.get(p.employee_id)!;
      eStats.photoCount++;
      eStats.totalSizeBytes += size;
    });

    const avgSizeBytes = totalCount > 0 ? totalSizeBytes / totalCount : 0;

    const byEmployee = Array.from(empStatsMap.values()).sort((a, b) => b.totalSizeBytes - a.totalSizeBytes);

    const latestPhotos: LatestPhotoInfo[] = (photos || []).slice(0, 10).map(p => {
      const record = Array.isArray(p.attendance_records) ? p.attendance_records[0] : p.attendance_records;
      const punchType = record?.punch_type || 'Desconhecido';
      const status = record?.photo_status || 'uploaded';
      const emp = employeeMap.get(p.employee_id);
      
      return {
        id: p.id,
        employeeId: p.employee_id,
        matricula: emp?.matricula || 'Desconhecida',
        fullName: emp?.full_name || 'Desconhecido',
        createdAt: p.created_at,
        punchType: punchType,
        sizeBytes: p.file_size_bytes || 0,
        status: status
      };
    });

    // Check attendance_records directly for 'pending' photo_status where photo_required is true
    // In case there are records that don't have an attendance_photo row yet
    const { data: recordsPending, error: recErr } = await supabase
      .from('attendance_records')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('photo_required', true)
      .eq('photo_status', 'pending');

    if (!recErr && recordsPending) {
      // If there are pending records without a photo row, we might want to add them to pending count
      // But typically a photo row is created with 'pending' status initially. Let's just use it as an extra check.
      // We will rely on attendance_photos for the primary count, but if records say there are pending, we adjust:
      const diff = recordsPending.length - pendingCount;
      if (diff > 0) {
        pendingCount += diff;
      }
    }

    return {
      stats: {
        totalCount,
        totalSizeBytes,
        uploadedCount,
        pendingCount,
        failedCount,
        avgSizeBytes,
        maxSizeBytes
      },
      byEmployee,
      latestPhotos
    };
  },

  async cleanupAttendanceEvidence(): Promise<{ success: boolean; removed: number; bytesFreed: number }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Não autenticado');

    const { data, error } = await supabase.functions.invoke('cleanup-attendance-evidence', {
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (error) {
      console.error('Edge Function Error:', error);
      throw new Error(error.message || 'Erro ao comunicar com a função de limpeza.');
    }

    if (data && data.error) {
      throw new Error(data.error);
    }

    return data as { success: boolean; removed: number; bytesFreed: number };
  }
};

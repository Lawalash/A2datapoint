import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminAttendanceService } from '../services/adminAttendanceService';
import type { AdminAttendanceFilters, AttendanceGroup } from '../services/adminAttendanceService';

import { getLocalOperationDate } from '../utils/dateUtils';

export function useAdminAttendance() {
  const { user } = useAuth();
  const orgId = (user as any)?.originalEmployee?.organization_id;

  const todayStr = getLocalOperationDate();

  const [filters, setFilters] = useState<AdminAttendanceFilters>({
    startDate: todayStr,
    endDate: todayStr,
    employeeStatus: 'todos',
    photoStatus: 'todos',
    searchQuery: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groupedRecords, setGroupedRecords] = useState<AttendanceGroup[]>([]);
  const [rawRecordsCount, setRawRecordsCount] = useState(0);

  const fetchRecords = useCallback(async () => {
    if (!orgId) return;

    // Validação básica
    if (filters.startDate > filters.endDate) {
      setError('A data inicial não pode ser maior que a data final.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      let records = await adminAttendanceService.fetchAdminAttendanceRecords(orgId, filters);
      setRawRecordsCount(records.length);
      
      // Aplicar filtro de busca por nome/matrícula/cargo (client-side)
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        records = records.filter((r: any) => {
          const emp = r.employees;
          if (!emp) return false;
          return (
            (emp.full_name && emp.full_name.toLowerCase().includes(query)) ||
            (emp.matricula && emp.matricula.toLowerCase().includes(query))
          );
        });
      }

      const grouped = adminAttendanceService.groupAttendanceByEmployeeAndDate(records);
      setGroupedRecords(grouped);
    } catch (err: any) {
      console.error('Error fetching admin attendance records:', err);
      setError(err.message || 'Erro ao carregar o histórico de pontos.');
    } finally {
      setLoading(false);
    }
  }, [orgId, filters]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const updateFilters = (newFilters: Partial<AdminAttendanceFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({
      startDate: todayStr,
      endDate: todayStr,
      employeeStatus: 'todos',
      photoStatus: 'todos',
      searchQuery: ''
    });
  };

  const getSignedUrl = useCallback(async (storagePath: string, recordId?: string, photoStatus?: string) => {
    return await adminAttendanceService.getPhotoSignedUrl(storagePath, recordId, photoStatus);
  }, []);

  return {
    filters,
    updateFilters,
    clearFilters,
    groupedRecords,
    rawRecordsCount,
    loading,
    error,
    refetch: fetchRecords,
    getSignedUrl
  };
}

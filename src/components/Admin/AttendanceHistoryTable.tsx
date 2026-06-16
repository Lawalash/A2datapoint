import React, { useState } from 'react';
import { useAdminAttendance } from '../../hooks/useAdminAttendance';
import { format, parseISO } from 'date-fns';
import { Search, MapPin, Camera, AlertCircle, Loader2, Calendar, User, Filter, Trash2 } from 'lucide-react';
import PhotoEvidenceModal from './PhotoEvidenceModal';
import ScheduleDetailsModal from './ScheduleDetailsModal';

interface Props {
  adminAttendance: ReturnType<typeof useAdminAttendance>;
}

const AttendanceHistoryTable: React.FC<Props> = ({ adminAttendance }) => {
  const {
    filters,
    updateFilters,
    clearFilters,
    groupedRecords,
    rawRecordsCount,
    loading,
    error,
    refetch
  } = adminAttendance;

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    recordId?: string;
    storagePath: string | null;
    employeeName: string;
    employeeMatricula: string;
    punchType: string;
    punchTime: string;
    punchDate: string;
    latitude: number | null;
    longitude: number | null;
    distanceMeters: number | null;
    photoStatus: string | null;
  }>({
    isOpen: false,
    storagePath: null,
    employeeName: '',
    employeeMatricula: '',
    punchType: '',
    punchTime: '',
    punchDate: '',
    latitude: null,
    longitude: null,
    distanceMeters: null,
    photoStatus: null,
  });

  const [scheduleModalState, setScheduleModalState] = useState<{
    isOpen: boolean;
    employeeId: string;
    employeeName: string;
    employeeMatricula: string;
    serverDate: string;
    scheduleId?: string;
    punchIn?: string | null;
    punchLunchOut?: string | null;
    punchLunchReturn?: string | null;
    punchOut?: string | null;
    extraBreaks: number;
    records: any[];
  }>({
    isOpen: false,
    employeeId: '',
    employeeName: '',
    employeeMatricula: '',
    serverDate: '',
    scheduleId: undefined,
    extraBreaks: 0,
    records: [],
  });

  const handleOpenPhoto = (group: any, punchType: string) => {
    const punch = group.punches[punchType];
    if (!punch) return;
    
    setModalState({
      isOpen: true,
      recordId: punch.record.id,
      storagePath: punch.photo?.storage_path || punch.record.photo_path || null,
      employeeName: group.employee_name,
      employeeMatricula: group.employee_matricula,
      punchType: punchType,
      punchTime: format(parseISO(punch.record.punched_at), 'HH:mm'),
      punchDate: format(parseISO(group.server_date), 'dd/MM/yyyy'),
      latitude: punch.record.latitude,
      longitude: punch.record.longitude,
      distanceMeters: punch.record.distance_from_base_meters,
      photoStatus: punch.record.photo_status,
    });
  };

  const renderPunchCell = (group: any, punchType: string) => {
    const punch = group.punches[punchType];
    
    if (!punch) {
      return <div className="text-[#A0A0A0] text-sm">—</div>;
    }

    const time = punch.record.server_time ? punch.record.server_time.substring(0, 5) : format(parseISO(punch.record.punched_at || punch.record.created_at), 'HH:mm');
    const hasPhoto = punch.record.photo_status === 'uploaded';
    const isRemoved = punch.record.photo_status === 'removed';
    const photoNotRequired = punch.record.photo_status === 'not_required';
    const isWithinRadius = punch.record.is_within_radius;
    const gpsNotRequired = !punch.record.latitude && punchType.includes('ALMOCO');

    return (
      <div className="flex flex-col gap-1.5">
        <span className="font-semibold text-[#1A1A1A]">{time}</span>
        
        {/* GPS Badge */}
        <div className="flex items-center gap-1">
          {gpsNotRequired ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#E5E5E5] text-[#666666]">
              <MapPin className="w-3 h-3" /> Não exigido
            </span>
          ) : isWithinRadius ? (
            <a 
              href={`https://maps.google.com/?q=${punch.record.latitude},${punch.record.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#28A745]/10 text-[#28A745] hover:bg-[#28A745]/20 transition-colors"
              title="Abrir no mapa"
            >
              <MapPin className="w-3 h-3" /> No raio
            </a>
          ) : (
            <a 
              href={`https://maps.google.com/?q=${punch.record.latitude},${punch.record.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#DC3545]/10 text-[#DC3545] hover:bg-[#DC3545]/20 transition-colors"
              title="Abrir no mapa"
            >
              <MapPin className="w-3 h-3" /> Fora do raio
            </a>
          )}
        </div>

        {/* Photo Action */}
        <div>
          {photoNotRequired ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#666666]">
              <Camera className="w-3 h-3" /> Não exigida
            </span>
          ) : isRemoved ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-[#E5E5E5] text-[#666666] border border-[#CCCCCC]">
              <Trash2 className="w-3 h-3" /> Foto removida do armazenamento
            </span>
          ) : hasPhoto ? (
            <button
              onClick={() => handleOpenPhoto(group, punchType)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-[#003D5C] text-white hover:bg-[#002D44] transition-colors cursor-pointer"
            >
              <Camera className="w-3 h-3" /> Ver foto
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#DC3545]">
              <AlertCircle className="w-3 h-3" /> Pendente
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderStatus = (group: any) => {
    const hasEntrada = !!group.punches['ENTRADA'];
    const hasSaida = !!group.punches['SAIDA'];
    
    const hasExtraEntrada = !!group.punches['ENTRADA_EXTRA'];
    const hasExtraSaida = !!group.punches['SAIDA_EXTRA'];
    
    if (hasEntrada && hasSaida) {
      if (hasExtraEntrada && !hasExtraSaida) {
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#8A2BE2]/15 text-[#8A2BE2]">
            Extra Inc.
          </span>
        );
      }
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#28A745]/15 text-[#28A745]">
          Completo
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F0AD4E]/15 text-[#F0AD4E]">
        Incompleto
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 mt-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h3 className="text-lg font-semibold text-[#003D5C]">
            Histórico Real de Pontos
          </h3>
          <p className="text-sm text-[#666666]">
            Visualização de registros autenticados via GPS e captura de evidência visual.
          </p>
        </div>
        
        <button 
          onClick={refetch}
          className="px-4 py-2 bg-[#F8F9FA] hover:bg-[#E5E5E5] text-[#003D5C] rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Atualizar Dados
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-[#F8F9FA] p-4 rounded-xl mb-6 flex flex-col md:flex-row flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-[#666666] uppercase mb-1 flex items-center gap-1">
            <Search className="w-3 h-3" /> Buscar Colaborador
          </label>
          <input 
            type="text"
            placeholder="Nome ou matrícula"
            value={filters.searchQuery || ''}
            onChange={(e) => updateFilters({ searchQuery: e.target.value })}
            className="w-full bg-white border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-[#7C9DB5] focus:ring-2 focus:ring-[#7C9DB5]/20"
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-semibold text-[#666666] uppercase mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Data Inicial
          </label>
          <input 
            type="date" 
            value={filters.startDate}
            onChange={(e) => updateFilters({ startDate: e.target.value })}
            className="w-full bg-white border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-[#7C9DB5] focus:ring-2 focus:ring-[#7C9DB5]/20"
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-semibold text-[#666666] uppercase mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Data Final
          </label>
          <input 
            type="date" 
            value={filters.endDate}
            onChange={(e) => updateFilters({ endDate: e.target.value })}
            className="w-full bg-white border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-[#7C9DB5] focus:ring-2 focus:ring-[#7C9DB5]/20"
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-semibold text-[#666666] uppercase mb-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Status Colab.
          </label>
          <select 
            value={filters.employeeStatus}
            onChange={(e) => updateFilters({ employeeStatus: e.target.value as any })}
            className="w-full bg-white border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-[#7C9DB5] focus:ring-2 focus:ring-[#7C9DB5]/20"
          >
            <option value="todos">Todos</option>
            <option value="ativos">Ativos</option>
            <option value="inativos">Inativos</option>
          </select>
        </div>
        <div className="w-auto flex gap-2">
          <button 
            onClick={clearFilters}
            className="px-4 py-2 bg-white border border-[#E5E5E5] hover:bg-[#F0F0F0] text-[#666666] rounded-lg text-sm font-semibold transition-colors cursor-pointer"
          >
            Limpar
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-[#DC3545]/10 text-[#DC3545] p-4 rounded-xl mb-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {loading && !groupedRecords.length && (
        <div className="flex flex-col items-center justify-center py-12 text-[#7C9DB5]">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <p className="font-medium">Carregando histórico real...</p>
        </div>
      )}

      {!loading && groupedRecords.length === 0 && !error && (
        <div className="text-center py-12 border-2 border-dashed border-[#E5E5E5] rounded-xl">
          <Calendar className="w-12 h-12 text-[#C8D8E4] mx-auto mb-3" />
          <p className="text-[#666666] font-medium">Nenhum ponto encontrado para o período selecionado.</p>
          <p className="text-sm text-[#A0A0A0] mt-1">Tente ajustar as datas ou remover filtros.</p>
        </div>
      )}

      {groupedRecords.length > 0 && (
        <div className="overflow-x-auto">
          <p className="text-xs text-[#666666] mb-3 font-medium">
            Mostrando {groupedRecords.length} jornadas consolidadas ({rawRecordsCount} registros brutos).
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8F9FA] text-[#003D5C] text-xs font-semibold uppercase border-b-2 border-[#E5E5E5]">
                <th className="text-left px-2 py-2 min-w-[100px]">Data</th>
                <th className="text-left px-2 py-2 min-w-[180px]">Colaborador</th>
                <th className="text-left px-2 py-2 min-w-[130px]">Entrada</th>
                <th className="text-left px-2 py-2 min-w-[130px]">Saída Almoço</th>
                <th className="text-left px-2 py-2 min-w-[130px]">Ret. Almoço</th>
                <th className="text-left px-2 py-2 min-w-[130px]">Saída</th>
                <th className="text-left px-2 py-2 min-w-[100px]">Escala</th>
                <th className="text-left px-2 py-2 min-w-[100px]">Status</th>
              </tr>
            </thead>
            <tbody>
              {groupedRecords.map((group, idx) => (
                <tr key={idx} className="border-b border-[#F0F0F0] hover:bg-[#F8FAFC]">
                  <td className="px-2 py-2 align-top">
                    <span className="font-semibold text-[#1A1A1A] block">
                      {group.is_overnight && group.end_date ? (
                        <>
                          {format(parseISO(group.server_date), 'dd/MM/yyyy')} <span className="text-[#A0A0A0] mx-1">&rarr;</span> {format(parseISO(group.end_date), 'dd/MM/yyyy')}
                        </>
                      ) : (
                        format(parseISO(group.server_date), 'dd/MM/yyyy')
                      )}
                    </span>
                    {(group.punches['ENTRADA_EXTRA'] || group.punches['SAIDA_EXTRA']) && (
                       <span className="mt-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#8A2BE2]/10 text-[#8A2BE2] uppercase">
                         + Jornada Extra
                       </span>
                    )}
                    {group.is_overnight && (
                      <span className="block mt-1 text-[10px] font-semibold bg-[#6F42C1]/10 text-[#6F42C1] px-2 py-0.5 rounded-full whitespace-nowrap">
                        Plantão Noturno
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2 align-top">
                    <div className="flex flex-col">
                      <span className="font-semibold text-[#1A1A1A]">{group.employee_name}</span>
                      <span className="text-xs text-[#7C9DB5] flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3" /> Matrícula: {group.employee_matricula}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-2 align-top">{renderPunchCell(group, 'ENTRADA')}</td>
                  <td className="px-2 py-2 align-top">{renderPunchCell(group, 'SAIDA_ALMOCO')}</td>
                  <td className="px-2 py-2 align-top">
                    {renderPunchCell(group, 'RETORNO_ALMOCO')}
                    {group.extraBreaks > 0 && (
                      <span className="inline-block mt-2 text-[10px] font-semibold bg-[#F0AD4E]/10 text-[#F0AD4E] px-2 py-0.5 rounded-full">
                        +{group.extraBreaks} pausa{group.extraBreaks > 1 ? 's' : ''}
                      </span>
                    )}
                  </td>
                  <td className="px-1 py-1 align-top">{renderPunchCell(group, 'SAIDA')}</td>
                  <td className="px-1 py-1 align-top">
                    <button
                      onClick={() => {
                        const sId = group.punches['ENTRADA']?.record.schedule_id || group.punches['SAIDA']?.record.schedule_id;
                        const inTime = group.punches['ENTRADA']?.record.server_time ? group.punches['ENTRADA'].record.server_time.substring(0, 5) : (group.punches['ENTRADA']?.record.punched_at ? format(parseISO(group.punches['ENTRADA'].record.punched_at), 'HH:mm') : null);
                        const lOutTime = group.punches['SAIDA_ALMOCO']?.record.server_time ? group.punches['SAIDA_ALMOCO'].record.server_time.substring(0, 5) : (group.punches['SAIDA_ALMOCO']?.record.punched_at ? format(parseISO(group.punches['SAIDA_ALMOCO'].record.punched_at), 'HH:mm') : null);
                        const lRetTime = group.punches['RETORNO_ALMOCO']?.record.server_time ? group.punches['RETORNO_ALMOCO'].record.server_time.substring(0, 5) : (group.punches['RETORNO_ALMOCO']?.record.punched_at ? format(parseISO(group.punches['RETORNO_ALMOCO'].record.punched_at), 'HH:mm') : null);
                        const outTime = group.punches['SAIDA']?.record.server_time ? group.punches['SAIDA'].record.server_time.substring(0, 5) : (group.punches['SAIDA']?.record.punched_at ? format(parseISO(group.punches['SAIDA'].record.punched_at), 'HH:mm') : null);
                        
                        setScheduleModalState({
                          isOpen: true,
                          employeeId: group.employee_id,
                          employeeName: group.employee_name,
                          employeeMatricula: group.employee_matricula,
                          serverDate: group.server_date,
                          scheduleId: sId,
                          punchIn: inTime,
                          punchLunchOut: lOutTime,
                          punchLunchReturn: lRetTime,
                          punchOut: outTime,
                          extraBreaks: group.extraBreaks,
                          records: group.all_records
                        });
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#003D5C]/10 text-[#003D5C] hover:bg-[#003D5C]/20 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Calendar className="w-3 h-3" /> Ver escala
                    </button>
                  </td>
                  <td className="px-4 py-4 align-top">{renderStatus(group)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PhotoEvidenceModal 
        isOpen={modalState.isOpen}
        onClose={() => setModalState((prev: any) => ({ ...prev, isOpen: false }))}
        recordId={modalState.recordId}
        storagePath={modalState.storagePath || ''}
        employeeName={modalState.employeeName}
        employeeMatricula={modalState.employeeMatricula}
        punchType={modalState.punchType}
        punchTime={modalState.punchTime}
        punchDate={modalState.punchDate}
        latitude={modalState.latitude}
        longitude={modalState.longitude}
        distanceMeters={modalState.distanceMeters}
        photoStatus={modalState.photoStatus}
      />

      <ScheduleDetailsModal
        isOpen={scheduleModalState.isOpen}
        onClose={() => setScheduleModalState((prev) => ({ ...prev, isOpen: false }))}
        employeeId={scheduleModalState.employeeId}
        employeeName={scheduleModalState.employeeName}
        employeeMatricula={scheduleModalState.employeeMatricula}
        serverDate={scheduleModalState.serverDate}
        scheduleId={scheduleModalState.scheduleId}
        punchIn={scheduleModalState.punchIn}
        punchLunchOut={scheduleModalState.punchLunchOut}
        punchLunchReturn={scheduleModalState.punchLunchReturn}
        punchOut={scheduleModalState.punchOut}
        extraBreaks={scheduleModalState.extraBreaks}
        records={scheduleModalState.records}
      />
    </div>
  );
};

export default AttendanceHistoryTable;

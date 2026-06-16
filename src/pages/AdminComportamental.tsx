import React, { useState } from 'react';
import { motion } from 'framer-motion';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import KPICard from '@/components/KPICard';
import AttendanceHistoryTable from '../components/Admin/AttendanceHistoryTable';
import { useAdminAttendance } from '../hooks/useAdminAttendance';
import { useAdminRequests } from '../hooks/useAdminRequests';
import { useAdminHourBank } from '../hooks/useAdminHourBank';
import type { AdminEmployeeRequest } from '../services/adminRequestsService';
import { Camera, ClipboardCheck, Clock, UserCheck, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { format } from 'date-fns';
import { TimeReportTab } from '../components/Admin/TimeReportTab';
import { OperationalAlertsTab } from '../components/Admin/OperationalAlertsTab';

const AdminComportamental: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [filterStatus, setFilterStatus] = useState('Todas');
  
  // Tabs State
  const [activeTab, setActiveTab] = useState<'kpis' | 'sinalizacoes' | 'solicitacoes' | 'extrato' | 'historico' | 'relatorios'>('kpis');
  
  // Real Hooks
  const orgId = (user as any)?.originalEmployee?.organization_id || (user as any)?.organization_id;
  const { requests: adminRequests, loading: adminRequestsLoading, error: adminRequestsError, approveRequest, rejectRequest } = useAdminRequests(orgId, user?.id);
  const hourBank = useAdminHourBank(orgId);

  // Filtros Avançados - Solicitações
  const [reqSearch, setReqSearch] = useState('');
  const [reqStartDate, setReqStartDate] = useState('');
  const [reqEndDate, setReqEndDate] = useState('');
  const [reqType, setReqType] = useState('Todos');
  const [reqMinHours, setReqMinHours] = useState('');
  const [reqMaxHours, setReqMaxHours] = useState('');

  // Filtros Avançados - Extrato Banco de Horas
  const [txSearch, setTxSearch] = useState('');
  const [txStartDate, setTxStartDate] = useState('');
  const [txEndDate, setTxEndDate] = useState('');
  const [txType, setTxType] = useState('Todos');
  const [txOrigin, setTxOrigin] = useState('Todas');
  
  // Modal State - Requests
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<'approve' | 'reject' | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<AdminEmployeeRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  // Modal State - Manual Adjustment
  const [adjModalOpen, setAdjModalOpen] = useState(false);
  const [adjEmployeeId, setAdjEmployeeId] = useState('');
  const [adjDirection, setAdjDirection] = useState<'credit' | 'debit'>('credit');
  const [adjDate, setAdjDate] = useState(new Date().toISOString().split('T')[0]);
  const [adjHours, setAdjHours] = useState('');
  const [adjDescription, setAdjDescription] = useState('');

  const adminAttendance = useAdminAttendance();
  const { groupedRecords, rawRecordsCount } = adminAttendance;

  // Calculando KPIs Reais (baseado nos registros já filtrados, padrão dia atual)
  const onDutyReal = groupedRecords.filter(g => g.punches['ENTRADA'] && !g.punches['SAIDA']).length;
  const jornadasCompletas = groupedRecords.filter(g => g.punches['ENTRADA'] && g.punches['SAIDA_ALMOCO'] && g.punches['RETORNO_ALMOCO'] && g.punches['SAIDA']).length;
  
  let fotosPendentes = 0;
  groupedRecords.forEach(g => {
    Object.values(g.punches).forEach(p => {
      if (p.record.photo_required && p.record.photo_status === 'pending') fotosPendentes++;
    });
  });

  const openModal = (req: AdminEmployeeRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(req);
    setModalAction(action);
    setAdminNotes('');
    setModalOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedRequest || !modalAction) return;

    let success = false;
    if (modalAction === 'approve') {
      success = await approveRequest(selectedRequest, adminNotes);
    } else {
      success = await rejectRequest(selectedRequest.id, adminNotes);
    }

    if (success) {
      setModalOpen(false);
      setSelectedRequest(null);
      setModalAction(null);
      setAdminNotes('');
    }
  };

  const handleCreateAdjustment = async () => {
    if (!adjEmployeeId) { addToast('Selecione um colaborador.', 'error'); return; }
    if (!adjDate) { addToast('Selecione a data.', 'error'); return; }
    const hoursNum = parseFloat(adjHours);
    if (isNaN(hoursNum) || hoursNum <= 0) { addToast('Informe uma quantidade de horas válida (maior que 0).', 'error'); return; }
    if (!adjDescription || adjDescription.length < 5) { addToast('Informe uma justificativa de pelo menos 5 caracteres.', 'error'); return; }

    const success = await hourBank.createManualAdjustment({
      employee_id: adjEmployeeId,
      transaction_date: adjDate,
      direction: adjDirection,
      minutes: Math.round(hoursNum * 60),
      description: adjDescription
    });

    if (success) {
      addToast('Ajuste manual criado com sucesso.', 'success');
      setAdjModalOpen(false);
      setAdjEmployeeId('');
      setAdjDirection('credit');
      setAdjDate(new Date().toISOString().split('T')[0]);
      setAdjHours('');
      setAdjDescription('');
    }
  };

  const statusFilters = ['Todas', 'Pendentes', 'Aprovadas', 'Reprovadas', 'Canceladas'];

  const statusFilterMap: Record<string, string> = {
    'Pendentes': 'pendente',
    'Aprovadas': 'aprovada',
    'Reprovadas': 'reprovada',
    'Canceladas': 'cancelada',
  };

  const employeesListMap = new Map();
  adminRequests.forEach(r => { if (r.employees) employeesListMap.set(r.employees.id, r.employees); });
  hourBank.transactions.forEach(t => { if (t.employees) employeesListMap.set(t.employees.id, t.employees); });
  const employeesList = Array.from(employeesListMap.values()).sort((a, b) => a.full_name.localeCompare(b.full_name));

  let baseFilteredRequests = filterStatus === 'Todas'
    ? adminRequests
    : adminRequests.filter(r => r.status === statusFilterMap[filterStatus]);

  if (reqSearch) {
    baseFilteredRequests = baseFilteredRequests.filter(r => 
      r.employees?.full_name.toLowerCase().includes(reqSearch.toLowerCase()) || 
      r.employees?.matricula.includes(reqSearch)
    );
  }
  if (reqStartDate) {
    baseFilteredRequests = baseFilteredRequests.filter(r => r.target_date && r.target_date >= reqStartDate);
  }
  if (reqEndDate) {
    baseFilteredRequests = baseFilteredRequests.filter(r => r.target_date && r.target_date <= reqEndDate);
  }
  if (reqType !== 'Todos') {
    const typeMap: Record<string, string> = {
      'Hora Extra': 'hora_extra',
      'Compensação': 'compensacao',
      'Folga': 'folga',
      'Ajuste de Ponto': 'ajuste_ponto',
      'Abono': 'abono'
    };
    baseFilteredRequests = baseFilteredRequests.filter(r => r.request_type === typeMap[reqType]);
  }
  if (reqMinHours) {
    const minMins = parseFloat(reqMinHours) * 60;
    baseFilteredRequests = baseFilteredRequests.filter(r => r.minutes_requested && r.minutes_requested >= minMins);
  }
  if (reqMaxHours) {
    const maxMins = parseFloat(reqMaxHours) * 60;
    baseFilteredRequests = baseFilteredRequests.filter(r => r.minutes_requested && r.minutes_requested <= maxMins);
  }

  const filteredRequests = baseFilteredRequests;

  const clearReqFilters = () => {
    setReqSearch('');
    setReqStartDate('');
    setReqEndDate('');
    setReqType('Todos');
    setReqMinHours('');
    setReqMaxHours('');
  };

  let filteredTx = hourBank.transactions;
  if (txSearch) {
    filteredTx = filteredTx.filter(t => 
      t.employees?.full_name.toLowerCase().includes(txSearch.toLowerCase()) || 
      t.employees?.matricula.includes(txSearch)
    );
  }
  if (txStartDate) {
    filteredTx = filteredTx.filter(t => t.transaction_date >= txStartDate);
  }
  if (txEndDate) {
    filteredTx = filteredTx.filter(t => t.transaction_date <= txEndDate);
  }
  if (txType !== 'Todos') {
    filteredTx = filteredTx.filter(t => t.direction === (txType === 'Crédito' ? 'credit' : 'debit'));
  }
  if (txOrigin !== 'Todas') {
    const originMap: Record<string, string> = {
      'Apuração diária': 'daily_summary',
      'Solicitação aprovada': 'request_approval',
      'Ajuste manual': 'manual_adjustment',
      'Correção': 'correction',
      'Saldo inicial': 'initial_balance',
      'HE Indevida pendente': 'unauthorized_overtime_pending',
      'Resolução de Alerta': 'alert_resolution'
    };
    filteredTx = filteredTx.filter(t => t.source_type === originMap[txOrigin]);
  }

  const clearTxFilters = () => {
    setTxSearch(''); setTxStartDate(''); setTxEndDate(''); setTxType('Todos'); setTxOrigin('Todas');
  };

  const totalCredits = filteredTx.filter(t => t.direction === 'credit' && t.source_type !== 'unauthorized_overtime_pending').reduce((acc, t) => acc + t.minutes, 0);
  const totalDebits = filteredTx.filter(t => t.direction === 'debit' && t.source_type !== 'unauthorized_overtime_pending').reduce((acc, t) => acc + t.minutes, 0);
  const netBalance = totalCredits - totalDebits;
  const uniqueEmployees = new Set(filteredTx.map(t => t.employee_id)).size;

  return (
    <AuthenticatedLayout requiredRole="Administrador" pageTitle="Gestão Comportamental">
      {/* TABS NAVIGATION */}
      <div className="bg-white rounded-2xl shadow-sm p-2 mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('kpis')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer flex-1 min-w-[150px] ${
            activeTab === 'kpis' ? 'bg-[#003D5C] text-white' : 'bg-transparent text-[#666] hover:bg-[#F8F9FA]'
          }`}
        >
          KPIs de Acompanhamento
        </button>
        <button
          onClick={() => setActiveTab('sinalizacoes')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer flex-1 min-w-[150px] ${
            activeTab === 'sinalizacoes' ? 'bg-[#003D5C] text-white' : 'bg-transparent text-[#666] hover:bg-[#F8F9FA]'
          }`}
        >
          Sinalizações
        </button>
        <button
          onClick={() => setActiveTab('solicitacoes')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer flex-1 min-w-[150px] ${
            activeTab === 'solicitacoes' ? 'bg-[#003D5C] text-white' : 'bg-transparent text-[#666] hover:bg-[#F8F9FA]'
          }`}
        >
          Solicitações
        </button>
        <button
          onClick={() => setActiveTab('extrato')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer flex-1 min-w-[150px] ${
            activeTab === 'extrato' ? 'bg-[#003D5C] text-white' : 'bg-transparent text-[#666] hover:bg-[#F8F9FA]'
          }`}
        >
          Extrato Banco de Horas
        </button>
        <button
          onClick={() => setActiveTab('historico')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer flex-1 min-w-[150px] ${
            activeTab === 'historico' ? 'bg-[#003D5C] text-white' : 'bg-transparent text-[#666] hover:bg-[#F8F9FA]'
          }`}
        >
          Histórico Real
        </button>
        <button
          onClick={() => setActiveTab('relatorios')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer flex-1 min-w-[150px] ${
            activeTab === 'relatorios' ? 'bg-[#003D5C] text-white' : 'bg-transparent text-[#666] hover:bg-[#F8F9FA]'
          }`}
        >
          Relatórios
        </button>
      </div>

      {/* KPIs */}
      {activeTab === 'kpis' && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
        >
          <KPICard label="Em Serviço (Real)" value={onDutyReal} icon={UserCheck} color="#28A745" delay={0} />
          <KPICard label="Jornadas Completas" value={jornadasCompletas} icon={ClipboardCheck} color="#7C9DB5" delay={0.1} />
          <KPICard label="Registros (Batidas)" value={rawRecordsCount} icon={Clock} color="#003D5C" delay={0.2} />
          <div title="Fotos pendentes são registros que exigiam foto, mas ainda não tiveram upload concluído.">
            <KPICard label="Fotos Pendentes" value={fotosPendentes} icon={Camera} color={fotosPendentes > 0 ? "#DC3545" : "#28A745"} delay={0.3} />
          </div>
        </motion.div>
      )}

      {/* Overtime Requests Table */}
      {activeTab === 'solicitacoes' && (
        <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white rounded-2xl shadow-sm p-6 mb-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-[#003D5C]">
            Solicitações de Ponto / Horas
            <span className="ml-2 bg-[#003D5C] text-white text-xs px-2 py-0.5 rounded-full">
              {adminRequests.length}
            </span>
          </h3>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {statusFilters.map(filter => (
            <button
              key={filter}
              onClick={() => setFilterStatus(filter)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
                filterStatus === filter
                  ? 'bg-[#003D5C] text-white'
                  : 'bg-[#F8F9FA] text-[#666666] hover:bg-[#E5E5E5]'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
        {/* Advanced Filters */}
        <div className="bg-[#F8F9FA] p-4 rounded-xl border border-[#E5E5E5] mb-4 text-sm flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-[#003D5C] mb-1 uppercase tracking-wider">Buscar Colaborador</label>
            <input type="text" value={reqSearch} onChange={e => setReqSearch(e.target.value)} placeholder="Nome ou matrícula..." className="w-full h-9 px-3 bg-white border border-[#E5E5E5] rounded-md focus:border-[#003D5C] outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#003D5C] mb-1 uppercase tracking-wider">Período</label>
            <div className="flex items-center gap-2">
              <input type="date" value={reqStartDate} onChange={e => setReqStartDate(e.target.value)} className="w-32 h-9 px-2 bg-white border border-[#E5E5E5] rounded-md focus:border-[#003D5C] outline-none" />
              <span className="text-[#666]">até</span>
              <input type="date" value={reqEndDate} onChange={e => setReqEndDate(e.target.value)} className="w-32 h-9 px-2 bg-white border border-[#E5E5E5] rounded-md focus:border-[#003D5C] outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#003D5C] mb-1 uppercase tracking-wider">Tipo</label>
            <select value={reqType} onChange={e => setReqType(e.target.value)} className="h-9 px-3 bg-white border border-[#E5E5E5] rounded-md focus:border-[#003D5C] outline-none cursor-pointer">
              {['Todos', 'Hora Extra', 'Compensação', 'Folga', 'Ajuste de Ponto', 'Abono'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <div>
              <label className="block text-xs font-semibold text-[#003D5C] mb-1 uppercase tracking-wider">Horas Mín</label>
              <input type="number" value={reqMinHours} onChange={e => setReqMinHours(e.target.value)} placeholder="Ex: 1" className="w-20 h-9 px-2 bg-white border border-[#E5E5E5] rounded-md focus:border-[#003D5C] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#003D5C] mb-1 uppercase tracking-wider">Horas Máx</label>
              <input type="number" value={reqMaxHours} onChange={e => setReqMaxHours(e.target.value)} placeholder="Ex: 8" className="w-20 h-9 px-2 bg-white border border-[#E5E5E5] rounded-md focus:border-[#003D5C] outline-none" />
            </div>
          </div>
          <button onClick={clearReqFilters} className="h-9 px-4 bg-white border border-[#DC3545] text-[#DC3545] rounded-md font-semibold hover:bg-[#DC3545]/10 transition-colors cursor-pointer text-xs uppercase tracking-wider">
            Limpar
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8F9FA] text-[#003D5C] text-xs font-semibold uppercase border-b-2 border-[#E5E5E5]">
                <th className="text-left px-4 py-3">Colaborador</th>
                <th className="text-left px-4 py-3">Tipo</th>
                <th className="text-left px-4 py-3">Justificativa</th>
                <th className="text-left px-4 py-3">Horas</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {adminRequestsLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#666666]">Carregando solicitações...</td>
                </tr>
              ) : adminRequestsError ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#DC3545]">Não foi possível carregar solicitações.</td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#666666]">Nenhuma solicitação com este filtro.</td>
                </tr>
              ) : (
                filteredRequests.map(req => (
                  <tr key={req.id} className="border-b border-[#F0F0F0] hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3">
                      <p className="text-[#1A1A1A] font-medium">{req.employees?.full_name}</p>
                      <p className="text-xs text-[#666]">Matrícula: {req.employees?.matricula}</p>
                    </td>
                    <td className="px-4 py-3 text-[#666666] uppercase font-medium text-xs tracking-wider">
                      {req.request_type.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[#666666] text-xs max-w-[200px] truncate" title={req.justification}>
                        {req.justification}
                      </p>
                      {req.admin_notes && (
                        <p className="text-[#13A89E] text-[10px] mt-1 italic">Nota: {req.admin_notes}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#1A1A1A] text-sm">
                      <p className="font-medium">
                        {req.target_date ? format(new Date(req.target_date + 'T00:00:00'), 'dd/MM/yyyy') : '-'}
                      </p>
                      {req.minutes_requested ? (
                        <p className="text-xs text-[#666] mt-0.5 font-mono">
                          {Math.floor(req.minutes_requested / 60)}h{req.minutes_requested % 60 > 0 ? `${req.minutes_requested % 60}m` : ''}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        req.status === 'aprovada' ? 'bg-[#28A745]/15 text-[#28A745]' :
                        req.status === 'reprovada' || req.status === 'cancelada' ? 'bg-[#DC3545]/15 text-[#DC3545]' :
                        'bg-[#F0AD4E]/15 text-[#F0AD4E]'
                      }`}>
                        {req.status === 'aprovada' && req.request_type === 'hora_extra' ? 'autorizada' : req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {req.status === 'pendente' ? (
                          <>
                            <button
                              onClick={() => openModal(req, 'approve')}
                              className="w-8 h-8 rounded-md border border-[#28A745] text-[#28A745] flex items-center justify-center hover:bg-[#28A745] hover:text-white transition-all cursor-pointer"
                              title={req.request_type === 'hora_extra' ? 'Autorizar' : 'Aprovar'}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openModal(req, 'reject')}
                              className="w-8 h-8 rounded-md border border-[#DC3545] text-[#DC3545] flex items-center justify-center hover:bg-[#DC3545] hover:text-white transition-all cursor-pointer"
                              title="Reprovar"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] font-medium text-[#999]">Sem ações</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        </motion.div>
      )}
      {/* Sinalizações Operacionais */}
      {activeTab === 'sinalizacoes' && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <OperationalAlertsTab />
        </motion.div>
      )}

      {/* Extrato Banco de Horas */}
      {activeTab === 'extrato' && (
        <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="bg-white rounded-2xl shadow-sm p-6 mb-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-[#003D5C]">
            Extrato de Banco de Horas
            <span className="ml-2 bg-[#003D5C] text-white text-xs px-2 py-0.5 rounded-full">
              {filteredTx.length}
            </span>
          </h3>
          <button onClick={() => setAdjModalOpen(true)} className="px-4 py-2 bg-[#003D5C] text-white rounded-md text-sm font-semibold hover:bg-[#1B325F] transition-colors shadow-sm cursor-pointer">
            Novo Ajuste Manual
          </button>
        </div>

        {/* Hour Bank KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="bg-[#F8F9FA] p-3 rounded-xl border border-[#E5E5E5] text-center">
            <p className="text-xl font-bold text-[#28A745]">+{Math.floor(totalCredits/60)}h{totalCredits%60}m</p>
            <p className="text-[10px] text-[#666] uppercase tracking-wider font-semibold">Créditos</p>
          </div>
          <div className="bg-[#F8F9FA] p-3 rounded-xl border border-[#E5E5E5] text-center">
            <p className="text-xl font-bold text-[#DC3545]">-{Math.floor(totalDebits/60)}h{totalDebits%60}m</p>
            <p className="text-[10px] text-[#666] uppercase tracking-wider font-semibold">Débitos</p>
          </div>
          <div className="bg-[#F8F9FA] p-3 rounded-xl border border-[#E5E5E5] text-center">
            <p className={`text-xl font-bold ${netBalance >= 0 ? 'text-[#28A745]' : 'text-[#DC3545]'}`}>
              {netBalance >= 0 ? '+' : '-'}{Math.floor(Math.abs(netBalance)/60)}h{Math.abs(netBalance)%60}m
            </p>
            <p className="text-[10px] text-[#666] uppercase tracking-wider font-semibold">Saldo Líquido</p>
          </div>
          <div className="bg-[#F8F9FA] p-3 rounded-xl border border-[#E5E5E5] text-center">
            <p className="text-xl font-bold text-[#1A1A1A]">{uniqueEmployees}</p>
            <p className="text-[10px] text-[#666] uppercase tracking-wider font-semibold">Colaboradores</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[#F8F9FA] p-4 rounded-xl border border-[#E5E5E5] mb-4 text-sm flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-[#003D5C] mb-1 uppercase tracking-wider">Buscar Colaborador</label>
            <input type="text" value={txSearch} onChange={e => setTxSearch(e.target.value)} placeholder="Nome ou matrícula..." className="w-full h-9 px-3 bg-white border border-[#E5E5E5] rounded-md focus:border-[#003D5C] outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#003D5C] mb-1 uppercase tracking-wider">Período</label>
            <div className="flex items-center gap-2">
              <input type="date" value={txStartDate} onChange={e => setTxStartDate(e.target.value)} className="w-32 h-9 px-2 bg-white border border-[#E5E5E5] rounded-md focus:border-[#003D5C] outline-none" />
              <span className="text-[#666]">até</span>
              <input type="date" value={txEndDate} onChange={e => setTxEndDate(e.target.value)} className="w-32 h-9 px-2 bg-white border border-[#E5E5E5] rounded-md focus:border-[#003D5C] outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#003D5C] mb-1 uppercase tracking-wider">Tipo</label>
            <select value={txType} onChange={e => setTxType(e.target.value)} className="h-9 px-3 bg-white border border-[#E5E5E5] rounded-md focus:border-[#003D5C] outline-none cursor-pointer">
              {['Todos', 'Crédito', 'Débito'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#003D5C] mb-1 uppercase tracking-wider">Origem</label>
            <select value={txOrigin} onChange={e => setTxOrigin(e.target.value)} className="w-full h-9 px-2 bg-white border border-[#E5E5E5] rounded-md focus:border-[#003D5C] outline-none">
              {['Todas', 'Apuração diária', 'Solicitação aprovada', 'Ajuste manual', 'Resolução de Alerta', 'HE Indevida pendente'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button onClick={clearTxFilters} className="h-9 px-4 bg-white border border-[#DC3545] text-[#DC3545] rounded-md font-semibold hover:bg-[#DC3545]/10 transition-colors cursor-pointer text-xs uppercase tracking-wider">
            Limpar
          </button>
        </div>

        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#F8F9FA] z-10 shadow-sm">
              <tr className="text-[#003D5C] text-xs font-semibold uppercase border-b-2 border-[#E5E5E5]">
                <th className="text-left px-4 py-3">Data</th>
                <th className="text-left px-4 py-3">Colaborador</th>
                <th className="text-left px-4 py-3">Origem</th>
                <th className="text-left px-4 py-3">Descrição</th>
                <th className="px-4 py-3 text-right">Minutos</th>
                <th className="px-4 py-3 text-center">Auditoria</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              {hourBank.loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#666666]">Carregando transações...</td>
                </tr>
              ) : hourBank.error ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#DC3545]">Erro: {hourBank.error}</td>
                </tr>
              ) : filteredTx.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#666666]">Sem movimentações no período selecionado.</td>
                </tr>
              ) : (
                filteredTx.map(tx => (
                  <tr key={tx.id} className="border-b border-[#F0F0F0] hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 font-medium text-[#1A1A1A]">
                      {format(new Date(tx.transaction_date + 'T00:00:00'), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[#1A1A1A] font-medium">{tx.employees?.full_name}</p>
                      <p className="text-xs text-[#666]">Matrícula: {tx.employees?.matricula}</p>
                    </td>
                    <td className="px-4 py-3 text-[#666666] text-xs">
                      {tx.source_type === 'daily_summary' ? 'Apuração diária' :
                       tx.source_type === 'request_approval' ? 'Solicitação aprovada' :
                       tx.source_type === 'manual_adjustment' ? 'Ajuste manual' :
                       tx.source_type === 'correction' ? 'Correção' :
                       tx.source_type === 'initial_balance' ? 'Saldo inicial' :
                       tx.source_type === 'unauthorized_overtime_pending' ? 'HE Indevida pendente' :
                       tx.source_type === 'alert_resolution' ? 'Resolução de Alerta' : tx.source_type}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#666] max-w-[200px] truncate" title={tx.description || ''}>
                      {tx.description || '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {tx.source_type === 'unauthorized_overtime_pending' ? (
                        <span className="text-[#D9822B] font-bold">+{Math.floor(tx.minutes/60)}h{tx.minutes%60}m</span>
                      ) : (
                        <span className={tx.direction === 'credit' ? 'text-[#28A745]' : 'text-[#DC3545]'}>
                          {tx.direction === 'credit' ? '+' : '-'}{Math.floor(tx.minutes/60)}h{tx.minutes%60}m
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {tx.source_type === 'unauthorized_overtime_pending' && (
                        <span className="bg-[#D9822B]/10 text-[#D9822B] px-2 py-1 rounded text-[10px] font-bold uppercase">Pendente</span>
                      )}
                      {tx.source_type === 'alert_resolution' && (
                        <span className="bg-[#28A745]/10 text-[#28A745] px-2 py-1 rounded text-[10px] font-bold uppercase">Resolvido</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        </motion.div>
      )}

      {/* Histórico Real de Pontos */}
      {activeTab === 'historico' && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <AttendanceHistoryTable adminAttendance={adminAttendance} />
        </motion.div>
      )}

      {/* Modal de Aprovação / Reprovação */}
      {modalOpen && selectedRequest && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className={`text-lg font-bold mb-4 ${modalAction === 'approve' ? 'text-[#28A745]' : 'text-[#DC3545]'}`}>
              {modalAction === 'approve' ? (selectedRequest.request_type === 'hora_extra' ? 'Confirmar Autorização' : 'Confirmar Aprovação') : 'Confirmar Reprovação'}
            </h3>

            <div className="bg-[#F8F9FA] rounded-xl p-4 mb-5 text-sm space-y-2 border border-[#E5E5E5]">
              <p><span className="text-[#666] font-medium">Colaborador:</span> <span className="font-semibold">{selectedRequest.employees?.full_name}</span></p>
              <p><span className="text-[#666] font-medium">Tipo:</span> <span className="uppercase font-medium text-xs">{selectedRequest.request_type.replace('_', ' ')}</span></p>
              <p><span className="text-[#666] font-medium">Data Alvo:</span> {selectedRequest.target_date ? format(new Date(selectedRequest.target_date + 'T00:00:00'), 'dd/MM/yyyy') : '-'}</p>
              {selectedRequest.minutes_requested && (
                <p><span className="text-[#666] font-medium">Horas Solicitadas:</span> {Math.floor(selectedRequest.minutes_requested / 60)}h{selectedRequest.minutes_requested % 60 > 0 ? `${selectedRequest.minutes_requested % 60}m` : ''}</p>
              )}
              {selectedRequest.justification && (
                <div className="mt-2 pt-2 border-t border-[#E5E5E5]">
                  <span className="text-[#666] font-medium block mb-1">Justificativa Original:</span>
                  <p className="text-[#1A1A1A] italic">{selectedRequest.justification}</p>
                </div>
              )}
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                Observação Administrativa (opcional)
              </label>
              <textarea
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
                placeholder="Ex: Aprovado conforme combinado..."
                className="w-full p-3 bg-[#F8F9FA] border border-[#E5E5E5] rounded-xl text-sm focus:border-[#13A89E] outline-none min-h-[80px]"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setModalOpen(false)}
                className="px-5 py-2 rounded-lg text-sm font-medium text-[#666] hover:bg-[#F8F9FA] border border-[#E5E5E5] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmAction}
                className={`px-5 py-2 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2 ${
                  modalAction === 'approve' ? 'bg-[#28A745] hover:bg-green-700' : 'bg-[#DC3545] hover:bg-red-700'
                }`}
              >
                {modalAction === 'approve' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {modalAction === 'approve' ? (selectedRequest.request_type === 'hora_extra' ? 'Autorizar Solicitação' : 'Aprovar Solicitação') : 'Reprovar Solicitação'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal de Ajuste Manual */}
      {adjModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-[#003D5C] mb-4">Novo Ajuste Manual</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Colaborador *</label>
                <select value={adjEmployeeId} onChange={e => setAdjEmployeeId(e.target.value)} className="w-full h-10 px-3 bg-[#F8F9FA] border border-[#E5E5E5] rounded-md text-sm text-[#1A1A1A] focus:border-[#003D5C] outline-none">
                  <option value="">Selecione um colaborador</option>
                  {employeesList.map(e => <option key={e.id} value={e.id}>{e.full_name} ({e.matricula})</option>)}
                </select>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Tipo *</label>
                  <select value={adjDirection} onChange={e => setAdjDirection(e.target.value as any)} className="w-full h-10 px-3 bg-[#F8F9FA] border border-[#E5E5E5] rounded-md text-sm text-[#1A1A1A] focus:border-[#003D5C] outline-none">
                    <option value="credit">Crédito (+)</option>
                    <option value="debit">Débito (-)</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Data *</label>
                  <input type="date" value={adjDate} onChange={e => setAdjDate(e.target.value)} className="w-full h-10 px-3 bg-[#F8F9FA] border border-[#E5E5E5] rounded-md text-sm text-[#1A1A1A] focus:border-[#003D5C] outline-none" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Horas * <span className="text-xs text-[#666] font-normal">(Ex: 1 = 1h, 0.5 = 30m)</span></label>
                <input type="number" step="0.1" value={adjHours} onChange={e => setAdjHours(e.target.value)} placeholder="0.0" className="w-full h-10 px-3 bg-[#F8F9FA] border border-[#E5E5E5] rounded-md text-sm text-[#1A1A1A] focus:border-[#003D5C] outline-none" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Justificativa *</label>
                <textarea value={adjDescription} onChange={e => setAdjDescription(e.target.value)} placeholder="Informe o motivo do ajuste manual..." className="w-full h-20 p-3 bg-[#F8F9FA] border border-[#E5E5E5] rounded-md text-sm text-[#1A1A1A] focus:border-[#003D5C] outline-none resize-none" />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setAdjModalOpen(false)} disabled={hourBank.creating} className="px-4 py-2 border border-[#E5E5E5] text-[#666] rounded-md font-medium hover:bg-[#F8F9FA] transition-colors cursor-pointer text-sm">
                Cancelar
              </button>
              <button onClick={handleCreateAdjustment} disabled={hourBank.creating} className="px-4 py-2 bg-[#003D5C] text-white rounded-md font-medium hover:bg-[#1B325F] transition-colors cursor-pointer text-sm disabled:opacity-50">
                {hourBank.creating ? 'Salvando...' : 'Salvar Ajuste'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {/* RELATÓRIOS */}
      {activeTab === 'relatorios' && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="h-full print:transform-none print:m-0 print:p-0 print:h-auto">
          <TimeReportTab />
        </motion.div>
      )}
    </AuthenticatedLayout>
  );
};

export default AdminComportamental;

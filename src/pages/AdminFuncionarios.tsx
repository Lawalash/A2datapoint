import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/context/ToastContext';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { UsersRound, Plus, Ban, Play, KeyRound, X, Loader2, Info, Settings2, Search, Edit2 } from 'lucide-react';
import { useEmployees } from '@/hooks/useEmployees';
import { employeesService } from '@/services/employeesService';
import { useEmployeeTimeRules } from '@/hooks/useEmployeeTimeRules';
import { useOrganizationSettings } from '@/hooks/useOrganizationSettings';
import { useAuth } from '@/context/AuthContext';


const AdminFuncionarios: React.FC = () => {
  const { addToast } = useToast();
  const { employees, activeEmployees, loading, error, createEmployee, updateEmployee, deactivateEmployee, reactivateEmployee, generateNextMatricula } = useEmployees();
  
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [newName, setNewName] = useState('');
  const [newCargo, setNewCargo] = useState('Enfermeiro');
  const [newRole, setNewRole] = useState<'Master' | 'Administrador' | 'Colaborador'>('Colaborador');
  const { user: currentUser } = useAuth();
  const isMaster = currentUser?.role === 'Master';
  const [nextMatricula, setNextMatricula] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Modal de Exibição de Senha Temporária
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [tempPasswordData, setTempPasswordData] = useState<{name: string, email: string, password: string, matricula?: string} | null>(null);
  const [isProcessingAccess, setIsProcessingAccess] = useState<string | null>(null); // employeeId being processed

  // Time Rules
  const { appSettings } = useOrganizationSettings();
  const { getRule, saveRule, removeRule } = useEmployeeTimeRules();
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [selectedEmpRule, setSelectedEmpRule] = useState<any>(null);
  const [isIndividualRule, setIsIndividualRule] = useState(false);

  const [bufEntryBefore, setBufEntryBefore] = useState('');
  const [bufExitAfter, setBufExitAfter] = useState('');

  // Cache para exibir no badge
  const [empRulesMap, setEmpRulesMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Carregar em background quais tem regra individual (simplificado: faríamos uma query em lote, mas como não temos hook pra lote, vamos buscar um a um pros ativos ou adaptar)
    // Para simplificar o MVP, vamos iterar nos employees e checar, ou apenas não exibir o badge inicialmente até o modal abrir.
    // O requisito pede pra mostrar a tag. Vamos fazer um check em background.
    const checkRules = async () => {
      const map: Record<string, boolean> = {};
      for (const emp of activeEmployees) {
        try {
          const rule = await getRule(emp.id);
          if (rule) map[emp.id] = true;
        } catch(e) {}
      }
      setEmpRulesMap(map);
    };
    if (activeEmployees.length > 0) {
      checkRules();
    }
  }, [activeEmployees, getRule]);

  const handleOpenRuleModal = async (emp: any) => {
    setSelectedEmpRule(emp);
    const rule = await getRule(emp.id);
    if (rule) {
      setIsIndividualRule(true);
      setBufEntryBefore(rule.entry_buffer_before_minutes?.toString());
      setBufExitAfter(rule.exit_buffer_after_minutes?.toString());
    } else {
      setIsIndividualRule(false);
      setBufEntryBefore(appSettings?.entry_buffer_before_minutes?.toString() || '15');
      setBufExitAfter(appSettings?.exit_buffer_after_minutes?.toString() || '15');
    }
    setShowRuleModal(true);
  };

  const handleSaveRule = async () => {
    if (!selectedEmpRule) return;
    setIsSubmitting(true);
    const success = await saveRule({
      organization_id: selectedEmpRule.organization_id,
      employee_id: selectedEmpRule.id,
      is_active: true,
      entry_buffer_before_minutes: parseInt(bufEntryBefore) || 0,
      entry_buffer_after_minutes: 0,
      lunch_start_buffer_before_minutes: 0,
      lunch_start_buffer_after_minutes: 0,
      lunch_return_buffer_before_minutes: 0,
      lunch_return_buffer_after_minutes: 0,
      exit_buffer_before_minutes: 0,
      exit_buffer_after_minutes: parseInt(bufExitAfter) || 0,
    });
    if (success) {
      setEmpRulesMap(prev => ({...prev, [selectedEmpRule.id]: true}));
      setShowRuleModal(false);
    }
    setIsSubmitting(false);
  };

  const handleRemoveRule = async () => {
    if (!selectedEmpRule) return;
    setIsSubmitting(true);
    const success = await removeRule(selectedEmpRule.id);
    if (success) {
      setEmpRulesMap(prev => ({...prev, [selectedEmpRule.id]: false}));
      setShowRuleModal(false);
    }
    setIsSubmitting(false);
  };

  const inputClass = "w-full h-11 px-4 bg-[#F8F9FA] border-[1.5px] border-[#E5E5E5] rounded-[10px] text-sm text-[#1B325F] placeholder:text-[#999] focus:border-[#13A89E] focus:ring-[3px] focus:ring-[#13A89E]/25 outline-none transition-all";


  useEffect(() => {
    if (showModal) {
      generateNextMatricula().then(setNextMatricula);
    }
  }, [showModal, generateNextMatricula]);

  const handleAdd = async () => {
    if (!newName) {
      addToast('Preencha o nome do funcionário', 'error');
      return;
    }
    if (!nextMatricula) {
      addToast('Matrícula não foi gerada. Feche e tente novamente.', 'error');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await createEmployee({
        matricula: nextMatricula,
        full_name: newName,
        role: newRole,
        cargo: newCargo,
        is_active: true
      });
      setShowModal(false);
      setNewName('');
      setNewCargo('Enfermeiro');
      setNewRole('Colaborador');
    } catch (err) {
      // Error is handled in hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja inativar o colaborador ${name}? Ele perderá acesso ao sistema, mas seus históricos de ponto e escalas serão mantidos.`)) {
      await deactivateEmployee(id);
    }
  };

  const handleReactivate = async (id: string, name: string) => {
    if (confirm(`Deseja reativar o colaborador ${name}? Ele voltará a ter acesso operacional caso já possua credenciais.`)) {
      await reactivateEmployee(id);
    }
  };

  const handleEditOpen = (emp: any) => {
    setSelectedEmployee(emp);
    setNewName(emp.full_name);
    setNewCargo(emp.cargo);
    setNewRole(emp.role);
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (!newName) {
      addToast('Preencha o nome do funcionário', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await updateEmployee(selectedEmployee.id, {
        full_name: newName,
        cargo: newCargo,
        role: newRole,
      });
      setShowEditModal(false);
      setSelectedEmployee(null);
      setNewName('');
      setNewCargo('Enfermeiro');
      setNewRole('Colaborador');
    } catch (err) {
      // Error is handled in hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const canViewEmployee = (currentUser: any, _targetEmployee: any) => {
    if (!currentUser) return false;
    if (currentUser.role === 'Master') return true;
    if (currentUser.role === 'Administrador') {
      return true; // Administrador pode ver, mas não editar Master (regra atual)
    }
    return false;
  };

  const canManageEmployee = (currentUser: any, targetEmployee: any) => {
    if (!currentUser) return false;
    if (currentUser.role === 'Master') {
      // Evitar auto-inativação
      return currentUser.id !== targetEmployee.id;
    }
    if (currentUser.role === 'Administrador') {
      return targetEmployee.role !== 'Master';
    }
    return false;
  };

  const visibleEmployees = employees.filter(emp => canViewEmployee(currentUser, emp));

  const filteredEmployees = visibleEmployees.filter(emp => {
    if (filter === 'active' && !emp.is_active) return false;
    if (filter === 'inactive' && emp.is_active) return false;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = emp.full_name?.toLowerCase().includes(q);
      const matchMatricula = emp.matricula?.toLowerCase().includes(q);
      const matchCargo = emp.cargo?.toLowerCase().includes(q);
      if (!matchName && !matchMatricula && !matchCargo) return false;
    }
    
    return true;
  });



  const handleResetPassword = async (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja resetar a senha de ${name}?`)) {
      setIsProcessingAccess(id);
      try {
        const { email, temporary_password, matricula } = await employeesService.resetEmployeePassword(id);
        setTempPasswordData({ name, email, password: temporary_password, matricula });
        setShowPasswordModal(true);
      } catch (err: any) {
        addToast(err.message || 'Erro ao resetar senha', 'error');
      } finally {
        setIsProcessingAccess(null);
      }
    }
  };

  const handleActivateAccess = async (id: string, name: string) => {
    setIsProcessingAccess(id);
    try {
      const { email, temporary_password, matricula } = await employeesService.activateEmployeeAccess(id);
      setTempPasswordData({ name, email, password: temporary_password, matricula });
      setShowPasswordModal(true);
      // Aqui idealmente recarregariamos os employees pra atualizar a tag "Vinculado", 
      // ou atualiza o state no hook local. Pra MVP, uma msg Toast e F5 basta, mas o hook pode fazer o fetch.
      addToast('Acesso ativado com sucesso! Atualize a página se necessário.', 'success');
    } catch (err: any) {
      addToast(err.message || 'Erro ao ativar acesso', 'error');
    } finally {
      setIsProcessingAccess(null);
    }
  };

  if (loading && employees.length === 0) {
    return (
      <AuthenticatedLayout requiredRole="Administrador" pageTitle="Funcionários">
        <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-[#13A89E]" /></div>
      </AuthenticatedLayout>
    );
  }

  if (error) {
    return (
      <AuthenticatedLayout requiredRole="Administrador" pageTitle="Funcionários">
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout requiredRole="Administrador" pageTitle="Funcionários">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header Action */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#13A89E]/10 flex items-center justify-center">
              <UsersRound className="w-5 h-5 text-[#13A89E]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#1B325F]">Equipe</h2>
              <p className="text-sm text-[#7C9DB5]">{filteredEmployees.filter(e => e.is_active).length} ativos</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'all' ? 'bg-white text-[#1B325F] shadow-sm' : 'text-[#7C9DB5] hover:text-[#1B325F]'}`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilter('active')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'active' ? 'bg-white text-[#1B325F] shadow-sm' : 'text-[#7C9DB5] hover:text-[#1B325F]'}`}
              >
                Ativos
              </button>
              <button
                onClick={() => setFilter('inactive')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'inactive' ? 'bg-white text-[#1B325F] shadow-sm' : 'text-[#7C9DB5] hover:text-[#1B325F]'}`}
              >
                Inativos
              </button>
            </div>
            <button 
              onClick={() => {
                setNewName('');
                setNewCargo('Enfermeiro');
                setShowModal(true);
              }}
              className="w-full sm:w-auto bg-[#13A89E] hover:bg-[#13A89E]/90 text-white px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium shadow-sm hover:shadow"
            >
              <Plus className="w-5 h-5" />
              Cadastrar
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
          <Search className="w-5 h-5 text-[#7C9DB5]" />
          <input
            type="text"
            placeholder="Buscar por nome, matrícula ou cargo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent outline-none text-[#1B325F] placeholder-[#999] text-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#4A6478]">
              <thead className="bg-[#F8FAFC] text-[#1B325F] uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">Matrícula</th>
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4">Cargo/Função</th>
                  <th className="px-6 py-4">Acesso (App)</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEmployees.map(user => (
                  <tr key={user.id} className="hover:bg-[#F8FAFC]/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-[#1B325F]">{user.matricula}</td>
                    <td className="px-6 py-4 font-medium text-[#1B325F]">{user.full_name}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-[#4A6478]">{user.cargo}</span>
                        <span className="text-[10px] text-[#7C9DB5] uppercase">{user.role}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {!user.auth_user_id ? (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100" title="Acesso real ainda não vinculado.">
                          <Info className="w-3 h-3" />
                          Pendente
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                          Acesso ativo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          user.is_active ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
                        }`}>
                          {user.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                        {user.is_active && (
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${empRulesMap[user.id] ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-gray-100 text-gray-500'}`}>
                            {empRulesMap[user.id] ? 'Regra Individual' : 'Regra Global'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {isProcessingAccess === user.id ? (
                          <Loader2 className="w-5 h-5 animate-spin text-[#13A89E] mr-2" />
                        ) : user.is_active && !user.auth_user_id ? (
                           <button 
                             onClick={() => handleActivateAccess(user.id, user.full_name)}
                             className="px-3 py-1.5 text-xs font-medium bg-[#13A89E]/10 text-[#13A89E] hover:bg-[#13A89E] hover:text-white rounded transition-colors"
                             title="Criar credenciais no Supabase"
                           >
                             Ativar acesso
                           </button>
                        ) : null}

                        {user.is_active && canManageEmployee(currentUser, user) && (
                          <button 
                            onClick={() => handleEditOpen(user)}
                            className="p-2 text-[#7C9DB5] hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar dados"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}

                        {user.is_active && (
                          <button 
                            onClick={() => handleOpenRuleModal(user)}
                            className="p-2 text-[#7C9DB5] hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Configurar tolerância"
                          >
                            <Settings2 className="w-4 h-4" />
                          </button>
                        )}

                        {user.auth_user_id && user.is_active && canManageEmployee(currentUser, user) && (
                          <button 
                            onClick={() => handleResetPassword(user.id, user.full_name)}
                            className="p-2 text-[#7C9DB5] hover:text-[#13A89E] hover:bg-[#13A89E]/10 rounded-lg transition-colors"
                            title="Resetar Senha"
                            disabled={isProcessingAccess === user.id}
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                        )}
                        {canManageEmployee(currentUser, user) && user.is_active ? (
                          <button 
                            onClick={() => handleDeactivate(user.id, user.full_name)}
                            className="p-2 text-[#7C9DB5] hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Inativar Colaborador"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        ) : canManageEmployee(currentUser, user) && !user.is_active ? (
                          <button 
                            onClick={() => handleReactivate(user.id, user.full_name)}
                            className="p-2 text-[#7C9DB5] hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Reativar Colaborador"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredEmployees.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-[#7C9DB5]">
                      Nenhum funcionário encontrado neste filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Modal */}
        {createPortal(
          <AnimatePresence>
            {showModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#1B325F]/40 backdrop-blur-sm"
                onClick={() => setShowModal(false)}
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white rounded-xl shadow-xl w-full max-w-md relative z-10 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-xl font-semibold text-[#1B325F]">Novo Funcionário</h3>
                      <p className="text-sm text-[#7C9DB5] mt-1">
                        Preencha os dados do novo colaborador.
                      </p>
                    </div>
                    <button 
                      onClick={() => setShowModal(false)}
                      className="text-[#7C9DB5] hover:text-[#1B325F] transition-colors p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[#1B325F] mb-1">
                        Nome Completo
                      </label>
                      <input 
                        type="text" 
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#13A89E] focus:border-transparent transition-all"
                        placeholder="Ex: Ana Silva"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#1B325F] mb-1">
                          Matrícula (Gerada)
                        </label>
                        <input 
                          type="text" 
                          value={nextMatricula}
                          readOnly
                          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 font-mono focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#1B325F] mb-1">
                          Perfil de Acesso
                        </label>
                        <select 
                          value={newRole}
                          onChange={(e: any) => setNewRole(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#13A89E] focus:border-transparent transition-all"
                        >
                          <option value="Colaborador">Colaborador</option>
                          {isMaster && <option value="Administrador">Administrador</option>}
                          {isMaster && <option value="Master">Master</option>}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#1B325F] mb-1">
                        Cargo/Função
                      </label>
                      <input 
                        type="text" 
                        value={newCargo}
                        onChange={(e) => setNewCargo(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#13A89E] focus:border-transparent transition-all"
                        placeholder="Ex: Cuidador, Técnica, Limpeza..."
                      />
                    </div>

                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 flex gap-2">
                      <Info className="w-5 h-5 text-amber-600 shrink-0" />
                      <p className="text-xs text-amber-700">
                        Após cadastrar, o acesso não estará ativo imediatamente. Você precisará clicar em "Ativar Acesso" na lista para gerar a senha.
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end gap-3">
                    <button
                      onClick={() => setShowModal(false)}
                      className="px-5 py-2.5 text-[#4A6478] font-medium hover:bg-gray-50 rounded-lg transition-colors"
                      disabled={isSubmitting}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleAdd}
                      disabled={isSubmitting || !newName}
                      className="bg-[#13A89E] hover:bg-[#13A89E]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium shadow-sm hover:shadow transition-all flex items-center gap-2"
                    >
                      {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      Cadastrar
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
          </AnimatePresence>,
          document.body
        )}

        {/* Temporary Password Modal */}
        {createPortal(
          <AnimatePresence>
            {showPasswordModal && tempPasswordData && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#1B325F]/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white rounded-xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden"
              >
                <div className="p-6 text-center">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <KeyRound className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-[#1B325F] mb-1">Credenciais Geradas</h3>
                  <p className="text-sm text-[#7C9DB5] mb-6">
                    Acesso configurado para <strong>{tempPasswordData.name}</strong>.
                  </p>
                  
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-left space-y-3 mb-6">
                    <div>
                      <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Matrícula (Para Login)</span>
                      <code className="block bg-white border border-gray-200 px-3 py-2 rounded text-sm text-[#1B325F] font-mono font-bold">
                        {tempPasswordData.matricula}
                      </code>
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Senha Temporária</span>
                      <code className="block bg-white border border-gray-200 px-3 py-2 rounded text-lg text-emerald-600 font-bold font-mono tracking-widest text-center">
                        {tempPasswordData.password}
                      </code>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 text-left flex gap-3 mb-6">
                    <Info className="w-6 h-6 text-amber-600 shrink-0" />
                    <p className="text-xs text-amber-700 font-medium">
                      Entregue a matrícula e a senha temporária ao colaborador. No primeiro acesso, ele será obrigado a criar uma nova senha.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`Matrícula: ${tempPasswordData.matricula}\nSenha temporária: ${tempPasswordData.password}`);
                      addToast('Copiado para a área de transferência!', 'success');
                      setShowPasswordModal(false);
                    }}
                    className="w-full bg-[#1B325F] hover:bg-[#132446] text-white px-6 py-3 rounded-lg font-semibold shadow-sm hover:shadow transition-all"
                  >
                    Copiar e Fechar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
          </AnimatePresence>,
          document.body
        )}

        {/* Modal de Regra de Horário Individual */}
        {createPortal(
          <AnimatePresence>
            {showRuleModal && selectedEmpRule && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#1B325F]/40 backdrop-blur-sm"
                onClick={() => setShowRuleModal(false)}
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white rounded-xl shadow-xl w-full max-w-2xl relative z-10 overflow-hidden"
              >
                <div className="p-6 max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-xl font-semibold text-[#1B325F]">Regra de tolerância do colaborador</h3>
                      <p className="text-sm text-[#7C9DB5] mt-1">
                        {selectedEmpRule.full_name} ({selectedEmpRule.matricula}) - {selectedEmpRule.cargo}
                      </p>
                      <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${isIndividualRule ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-gray-100 text-gray-600'}`}>
                        Status atual: {isIndividualRule ? 'Regra individual ativa' : 'Utilizando regra global'}
                      </span>
                    </div>
                    <button 
                      onClick={() => setShowRuleModal(false)}
                      className="text-[#7C9DB5] hover:text-[#1B325F] transition-colors p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 border border-[#E5E5E5] rounded-xl bg-[#F8F9FA]">
                        <h4 className="text-sm font-bold text-[#1B325F] mb-1">BUFFER ENTRADA</h4>
                        <p className="text-xs text-[#666666] mb-4">Permite que o colaborador registre a entrada X minutos antes do início da escala.</p>
                        <label className="block text-sm font-medium text-[#1B325F] mb-1.5">Minutos antes da entrada</label>
                        <input type="number" value={bufEntryBefore} onChange={e => setBufEntryBefore(e.target.value)} className={inputClass} />
                      </div>
                      <div className="p-4 border border-[#E5E5E5] rounded-xl bg-[#F8F9FA]">
                        <h4 className="text-sm font-bold text-[#1B325F] mb-1">BUFFER SAÍDA</h4>
                        <p className="text-xs text-[#666666] mb-4">Permite que o colaborador registre a saída X minutos depois do fim da escala.</p>
                        <label className="block text-sm font-medium text-[#1B325F] mb-1.5">Minutos depois da saída</label>
                        <input type="number" value={bufExitAfter} onChange={e => setBufExitAfter(e.target.value)} className={inputClass} />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-100">
                      <button 
                        onClick={() => setShowRuleModal(false)}
                        className="px-5 py-2.5 rounded-lg font-medium text-[#4A6478] hover:bg-gray-100 transition-colors"
                      >
                        Cancelar
                      </button>
                      {isIndividualRule && (
                        <button 
                          onClick={handleRemoveRule}
                          disabled={isSubmitting}
                          className="px-5 py-2.5 rounded-lg font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                        >
                          {isSubmitting ? 'Removendo...' : 'Voltar para regra global'}
                        </button>
                      )}
                      <button 
                        onClick={handleSaveRule}
                        disabled={isSubmitting}
                        className="px-5 py-2.5 rounded-lg font-medium bg-[#13A89E] hover:bg-[#13A89E]/90 text-white transition-colors"
                      >
                        {isSubmitting ? 'Salvando...' : 'Salvar regra individual'}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
          </AnimatePresence>,
          document.body
        )}
        {/* Edit Modal */}
        {createPortal(
          <AnimatePresence>
            {showEditModal && selectedEmployee && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#1B325F]/40 backdrop-blur-sm"
                onClick={() => setShowEditModal(false)}
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white rounded-xl shadow-xl w-full max-w-md relative z-10 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-xl font-semibold text-[#1B325F]">Editar Funcionário</h3>
                      <p className="text-sm text-[#7C9DB5] mt-1">
                        Atualize os dados básicos do colaborador.
                      </p>
                    </div>
                    <button 
                      onClick={() => setShowEditModal(false)}
                      className="text-[#7C9DB5] hover:text-[#1B325F] transition-colors p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[#1B325F] mb-1">
                        Nome Completo
                      </label>
                      <input 
                        type="text" 
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#13A89E] focus:border-transparent transition-all"
                        placeholder="Ex: Ana Silva"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#1B325F] mb-1">
                          Matrícula
                        </label>
                        <input 
                          type="text" 
                          value={selectedEmployee.matricula}
                          readOnly
                          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 font-mono focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#1B325F] mb-1">
                          Perfil de Acesso
                        </label>
                        <select 
                          value={newRole}
                          onChange={(e: any) => setNewRole(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#13A89E] focus:border-transparent transition-all"
                          disabled={!isMaster && selectedEmployee.role === 'Master'}
                        >
                          <option value="Colaborador">Colaborador</option>
                          {isMaster && <option value="Administrador">Administrador</option>}
                          {isMaster && <option value="Master">Master</option>}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#1B325F] mb-1">
                        Cargo/Função
                      </label>
                      <input 
                        type="text" 
                        value={newCargo}
                        onChange={(e) => setNewCargo(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#13A89E] focus:border-transparent transition-all"
                        placeholder="Ex: Cuidador, Técnica, Limpeza..."
                      />
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end gap-3">
                    <button
                      onClick={() => setShowEditModal(false)}
                      className="px-5 py-2.5 text-[#4A6478] font-medium hover:bg-gray-50 rounded-lg transition-colors"
                      disabled={isSubmitting}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleEditSave}
                      disabled={isSubmitting || !newName}
                      className="bg-[#13A89E] hover:bg-[#13A89E]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium shadow-sm hover:shadow transition-all flex items-center gap-2"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit2 className="w-4 h-4" />}
                      Salvar Alterações
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
          </AnimatePresence>,
          document.body
        )}
      </div>
    </AuthenticatedLayout>
  );
};

export default AdminFuncionarios;

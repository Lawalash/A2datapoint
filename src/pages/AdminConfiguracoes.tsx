import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/context/ToastContext';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { Building, MapPin, Camera, Loader2, ShieldAlert, Upload, Trash2, Key } from 'lucide-react';
import { useOrganizationSettings } from '@/hooks/useOrganizationSettings';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { loadProfileAvatar, saveProfileAvatar, removeProfileAvatar as removeProfileAvatarUtil } from '@/utils/avatarUtils';

import StorageMonitoringPanel from '@/components/Admin/StorageMonitoringPanel';

type Tab = 'identificacao' | 'tolerancia' | 'geofencing' | 'politicas' | 'seguranca' | 'armazenamento';

const AdminConfiguracoes: React.FC = () => {
  const { addToast } = useToast();
  const { organization, appSettings, loading, error, saveSettings } = useOrganizationSettings();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('identificacao');

  // Organization states
  const [instName, setInstName] = useState('');
  const [instAddress, setInstAddress] = useState('');
  const [instLat, setInstLat] = useState('');
  const [instLng, setInstLng] = useState('');
  const [instRadius, setInstRadius] = useState('');

  // App Settings states
  const [reqGeo, setReqGeo] = useState(false);
  const [reqPhotoIn, setReqPhotoIn] = useState(false);
  const [reqPhotoOut, setReqPhotoOut] = useState(false);
  const [reqPhotoLunch, setReqPhotoLunch] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState('');
  const [enableLink, setEnableLink] = useState(false);

  // Time Buffers states
  const [entryBufBefore, setEntryBufBefore] = useState('');
  const [exitBufAfter, setExitBufAfter] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Password Reset States
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [newPwd, setNewPwd] = useState('');
  const [confirmNewPwd, setConfirmNewPwd] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (organization) {
      setInstName(organization.name || '');
      setInstAddress(organization.address || '');
      setInstLat(organization.base_latitude?.toString() || '');
      setInstLng(organization.base_longitude?.toString() || '');
      setInstRadius(organization.allowed_radius_meters?.toString() || '');
    }
    if (appSettings) {
      setReqGeo(appSettings.require_geolocation || false);
      setReqPhotoIn(appSettings.require_photo_entry || false);
      setReqPhotoOut(appSettings.require_photo_exit || false);
      setReqPhotoLunch(appSettings.require_photo_lunch || false);
      setGpsAccuracy(appSettings.max_gps_accuracy_meters?.toString() || '');
      setEnableLink(appSettings.point_access_enabled || false);

      setEntryBufBefore(appSettings.entry_buffer_before_minutes?.toString() || '15');
      setExitBufAfter(appSettings.exit_buffer_after_minutes?.toString() || '15');
    }
  }, [organization, appSettings]);

  useEffect(() => {
    if (!user?.id) return;
    const savedAvatar = loadProfileAvatar(user.id);
    if (savedAvatar) {
      setAvatarPreview(savedAvatar);
    }
  }, [user]);

  const inputClass = "w-full h-11 px-4 bg-[#F8F9FA] border-[1.5px] border-[#E5E5E5] rounded-[10px] text-sm text-[#1B325F] placeholder:text-[#999] focus:border-[#13A89E] focus:ring-[3px] focus:ring-[#13A89E]/25 outline-none transition-all";

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user?.id) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setAvatarPreview(base64);
        saveProfileAvatar(user.id, base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAvatar = () => {
    if (!user?.id) return;
    setAvatarPreview(null);
    removeProfileAvatarUtil(user.id);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveSettings(
        {
          name: instName,
          address: instAddress,
          base_latitude: parseFloat(instLat) || 0,
          base_longitude: parseFloat(instLng) || 0,
          allowed_radius_meters: parseInt(instRadius) || 100,
        },
        {
          require_geolocation: reqGeo,
          require_photo_entry: reqPhotoIn,
          require_photo_exit: reqPhotoOut,
          require_photo_lunch: reqPhotoLunch,
          max_gps_accuracy_meters: parseInt(gpsAccuracy) || 50,
          point_access_enabled: enableLink,
          entry_buffer_before_minutes: parseInt(entryBufBefore) || 0,
          entry_buffer_after_minutes: 0,
          exit_buffer_before_minutes: 0,
          exit_buffer_after_minutes: parseInt(exitBufAfter) || 0,
          lunch_start_buffer_before_minutes: 0,
          lunch_start_buffer_after_minutes: 0,
          lunch_return_buffer_before_minutes: 0,
          lunch_return_buffer_after_minutes: 0,
        }
      );
    } catch (err) {
      // toast is handled in hook
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd.length < 6) {
      addToast('A senha deve ter no mínimo 6 caracteres.', 'error');
      return;
    }
    if (newPwd !== confirmNewPwd) {
      addToast('As senhas não coincidem.', 'error');
      return;
    }

    setIsResetting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) {
        if (error.message.includes('session')) {
          addToast('Sua sessão precisa ser renovada. Saia e entre novamente para alterar a senha.', 'error');
        } else {
          addToast(error.message, 'error');
        }
      } else {
        addToast('Senha alterada com sucesso.', 'success');
        setShowPwdModal(false);
        setNewPwd('');
        setConfirmNewPwd('');
      }
    } catch (err: any) {
      addToast(err.message || 'Erro ao alterar senha', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  if (loading && !organization) {
    return (
      <AuthenticatedLayout requiredRole="Administrador" pageTitle="Configurações">
        <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-[#13A89E]" /></div>
      </AuthenticatedLayout>
    );
  }

  if (error) {
    return (
      <AuthenticatedLayout requiredRole="Administrador" pageTitle="Configurações">
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
      </AuthenticatedLayout>
    );
  }

  const tabs = [
    { id: 'identificacao', label: 'Identificação' },
    { id: 'tolerancia', label: 'Tolerâncias' },
    { id: 'geofencing', label: 'Geofencing' },
    { id: 'politicas', label: 'Políticas' },
    { id: 'seguranca', label: 'Segurança Admin' },
    { id: 'armazenamento', label: 'Armazenamento' },
  ];

  return (
    <AuthenticatedLayout requiredRole="Administrador" pageTitle="Configurações">
      <div className="max-w-4xl mx-auto pb-24">
        
        {/* Tabs */}
        <div className="mb-6 flex overflow-x-auto pb-2 hide-scrollbar">
          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-[#E5E5E5] w-max">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-[#13A89E] text-white shadow-md'
                    : 'text-[#666666] hover:bg-[#F8F9FA] hover:text-[#1A1A1A]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {activeTab === 'identificacao' && (
              <motion.div
                key="identificacao"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#13A89E]/10 flex items-center justify-center">
                    <Building className="w-5 h-5 text-[#13A89E]" />
                  </div>
                  <h3 className="text-base font-semibold text-[#1B325F]">Identificação da Base</h3>
                </div>

                {/* Profile Picture Upload */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-6">
                  <div className="w-20 h-20 rounded-2xl bg-[#003D5C] text-white flex flex-col items-center justify-center overflow-hidden flex-shrink-0 shadow-inner">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Admin" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-bold">{user?.displayName?.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#1B325F] mb-1">Foto de Perfil do Administrador</h4>
                    <p className="text-xs text-[#666666] mb-3">Sua foto aparecerá no menu lateral.</p>
                    <div className="flex gap-2">
                      <label className="px-3 py-1.5 bg-white border border-[#E5E5E5] text-[#1A1A1A] text-xs font-medium rounded-lg hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm">
                        <Upload className="w-3.5 h-3.5" /> Enviar Foto
                        <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                      </label>
                      {avatarPreview && (
                        <button
                          onClick={removeAvatar}
                          className="px-3 py-1.5 bg-white border border-[#E5E5E5] text-[#DC3545] text-xs font-medium rounded-lg hover:bg-red-50 cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remover
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-sm font-medium text-[#1B325F] mb-1.5">Nome da Unidade / ILPI</label>
                    <input type="text" value={instName} onChange={e => setInstName(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1B325F] mb-1.5">Endereço Físico</label>
                    <input type="text" value={instAddress} onChange={e => setInstAddress(e.target.value)} className={inputClass} />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'tolerancia' && (
              <motion.div
                key="tolerancia"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#13A89E]/10 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-[#13A89E]" />
                  </div>
                  <h3 className="text-base font-semibold text-[#1B325F]">Regras de Tolerância de Ponto</h3>
                </div>

                <div className="space-y-6">
                  {/* Card 1 — Entrada */}
                  <div className="p-4 border border-[#E5E5E5] rounded-xl bg-[#F8F9FA]">
                    <h4 className="text-sm font-bold text-[#1B325F] mb-1">BUFFER ENTRADA</h4>
                    <p className="text-xs text-[#666666] mb-4">Permite que o colaborador registre a entrada X minutos antes do início da escala.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#1B325F] mb-1.5">Minutos antes da entrada</label>
                        <input type="number" value={entryBufBefore} onChange={e => setEntryBufBefore(e.target.value)} className={inputClass} placeholder="10" />
                      </div>
                    </div>
                  </div>

                  {/* Card 2 — Saída */}
                  <div className="p-4 border border-[#E5E5E5] rounded-xl bg-[#F8F9FA]">
                    <h4 className="text-sm font-bold text-[#1B325F] mb-1">BUFFER SAÍDA</h4>
                    <p className="text-xs text-[#666666] mb-4">Permite que o colaborador registre a saída X minutos depois do fim da escala.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#1B325F] mb-1.5">Minutos depois da saída</label>
                        <input type="number" value={exitBufAfter} onChange={e => setExitBufAfter(e.target.value)} className={inputClass} placeholder="9" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'geofencing' && (
              <motion.div
                key="geofencing"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#13A89E]/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-[#13A89E]" />
                  </div>
                  <h3 className="text-base font-semibold text-[#1B325F]">Cerca Virtual (Geofencing)</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1B325F] mb-1.5">Latitude Base</label>
                    <input type="number" step="any" value={instLat} onChange={e => setInstLat(e.target.value)} className={inputClass} placeholder="-23.5505" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1B325F] mb-1.5">Longitude Base</label>
                    <input type="number" step="any" value={instLng} onChange={e => setInstLng(e.target.value)} className={inputClass} placeholder="-46.6333" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1B325F] mb-1.5">Raio Permitido (metros)</label>
                    <input type="number" value={instRadius} onChange={e => setInstRadius(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1B325F] mb-1.5">Precisão Máxima GPS (m)</label>
                    <input type="number" value={gpsAccuracy} onChange={e => setGpsAccuracy(e.target.value)} className={inputClass} />
                  </div>
                </div>

                <label className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                  <input type="checkbox" checked={reqGeo} onChange={e => setReqGeo(e.target.checked)} className="w-4 h-4 text-[#13A89E] rounded border-gray-300 focus:ring-[#13A89E]" />
                  <span className="text-sm font-medium text-[#1B325F]">Exigir Geolocalização Ativa no Check-in</span>
                </label>
              </motion.div>
            )}

            {activeTab === 'politicas' && (
              <motion.div
                key="politicas"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#13A89E]/10 flex items-center justify-center">
                    <Camera className="w-5 h-5 text-[#13A89E]" />
                  </div>
                  <h3 className="text-base font-semibold text-[#1B325F]">Políticas de Segurança e Evidências</h3>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input type="checkbox" checked={reqPhotoIn} onChange={e => setReqPhotoIn(e.target.checked)} className="w-4 h-4 text-[#13A89E] rounded border-gray-300 focus:ring-[#13A89E]" />
                    <span className="text-sm font-medium text-[#1B325F]">Exigir Selfie na Entrada</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input type="checkbox" checked={reqPhotoOut} onChange={e => setReqPhotoOut(e.target.checked)} className="w-4 h-4 text-[#13A89E] rounded border-gray-300 focus:ring-[#13A89E]" />
                    <span className="text-sm font-medium text-[#1B325F]">Exigir Selfie na Saída</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input type="checkbox" checked={reqPhotoLunch} onChange={e => setReqPhotoLunch(e.target.checked)} className="w-4 h-4 text-[#13A89E] rounded border-gray-300 focus:ring-[#13A89E]" />
                    <span className="text-sm font-medium text-[#1B325F]">Exigir Selfie nas Pausas (Almoço)</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input type="checkbox" checked={enableLink} onChange={e => setEnableLink(e.target.checked)} className="w-4 h-4 text-[#13A89E] rounded border-gray-300 focus:ring-[#13A89E]" />
                    <span className="text-sm font-medium text-[#1B325F]">Habilitar Acesso Rápido por Link URL</span>
                  </label>
                </div>
              </motion.div>
            )}

            {activeTab === 'seguranca' && (
              <motion.div
                key="seguranca"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5 text-amber-600" />
                  </div>
                  <h3 className="text-base font-semibold text-[#1B325F]">Segurança Admin</h3>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 text-sm text-[#4A6478] space-y-2">
                  <p className="font-semibold">Status de Autenticação em Duas Etapas (TOTP):</p>
                  {user?.mfaStatus === 'verified' && (
                    <div className="flex flex-col">
                      <span className="text-[#13A89E] font-bold">● MFA ativo e verificado nesta sessão (AAL2)</span>
                    </div>
                  )}
                  {user?.mfaStatus === 'pending_challenge' && (
                    <div className="flex flex-col">
                      <span className="text-amber-600 font-bold">● MFA ativo, mas pendente de verificação (AAL1)</span>
                    </div>
                  )}
                  {user?.mfaStatus === 'needs_enrollment' && (
                    <div className="flex flex-col">
                      <span className="text-[#DC3545] font-bold">● MFA pendente de configuração</span>
                    </div>
                  )}
                  {user?.mfaStatus === 'error' && (
                    <div className="flex flex-col">
                      <span className="text-[#DC3545] font-bold">● Erro ao checar MFA (verifique o Supabase Dashboard)</span>
                    </div>
                  )}
                  <p className="mt-4 text-xs text-gray-500 pt-2 border-t border-gray-200">
                    Se perder acesso ao aplicativo autenticador, solicite reset manual ao suporte técnico responsável pelo Supabase. O auto-reset de MFA está desabilitado por segurança.
                  </p>
                </div>

                <div className="mt-4 flex gap-3 flex-wrap">
                  {user?.mfaStatus === 'needs_enrollment' && (
                    <button
                      onClick={() => window.location.href = '/admin/mfa-setup'}
                      className="px-4 py-2 bg-[#13A89E] text-white rounded-lg text-sm font-medium hover:bg-[#0F8A82] transition-colors"
                    >
                      Configurar MFA
                    </button>
                  )}
                  {user?.mfaStatus === 'verified' && (
                    <button
                      disabled
                      className="px-4 py-2 bg-[#13A89E]/20 text-[#13A89E] rounded-lg text-sm font-medium cursor-not-allowed"
                    >
                      MFA Configurado
                    </button>
                  )}
                  <button
                    onClick={() => setShowPwdModal(true)}
                    className="px-4 py-2 bg-white border border-[#E5E5E5] text-[#1B325F] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <Key className="w-4 h-4" /> Alterar minha senha
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'armazenamento' && (
              <motion.div
                key="armazenamento"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6"
              >
                <StorageMonitoringPanel />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Save Button */}
        <div className="flex justify-end mt-6 pb-6">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={isSaving}
            className="h-12 px-8 bg-[#1B325F] text-white rounded-xl text-sm font-semibold shadow-lg shadow-[#1B325F]/20 hover:bg-[#1B325F]/90 transition-all cursor-pointer flex items-center gap-2"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar Todas as Configurações
          </motion.button>
        </div>
      </div>

      {/* Password Reset Modal */}
      <AnimatePresence>
        {showPwdModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-[#E5E5E5] flex items-center justify-between bg-gray-50">
                <h3 className="text-lg font-bold text-[#1B325F] flex items-center gap-2">
                  <Key className="w-5 h-5 text-[#13A89E]" /> Redefinir minha senha
                </h3>
              </div>
              <form onSubmit={handlePasswordReset} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1B325F] mb-1.5">Nova Senha</label>
                  <input
                    type="password"
                    value={newPwd}
                    onChange={e => setNewPwd(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1B325F] mb-1.5">Confirmar Nova Senha</label>
                  <input
                    type="password"
                    value={confirmNewPwd}
                    onChange={e => setConfirmNewPwd(e.target.value)}
                    placeholder="Repita a senha"
                    className={inputClass}
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-[#E5E5E5] mt-6">
                  <button
                    type="button"
                    onClick={() => setShowPwdModal(false)}
                    className="flex-1 py-2.5 bg-white border border-[#E5E5E5] text-[#666666] rounded-xl font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting || !newPwd || !confirmNewPwd}
                    className="flex-1 py-2.5 bg-[#13A89E] hover:bg-[#0F8A82] text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    {isResetting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AuthenticatedLayout>
  );
};

export default AdminConfiguracoes;

import { useState, useCallback, useEffect } from 'react';
import { settingsService, type AppSettingsPayload, type OrganizationPayload } from '@/services/settingsService';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';

export function useOrganizationSettings() {
  const [organization, setOrganization] = useState<any | null>(null);
  const [appSettings, setAppSettings] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const { addToast } = useToast();

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Não autenticado');

      // Descobrir a org do admin logado
      const { data: adminEmployee, error: adminErr } = await supabase
        .from('employees')
        .select('organization_id')
        .eq('auth_user_id', session.user.id)
        .single();
      
      if (adminErr) throw adminErr;
      const orgId = adminEmployee.organization_id;
      setOrganizationId(orgId);

      const { organization: orgData, appSettings: appData } = await settingsService.getFullSettings(orgId);
      setOrganization(orgData);
      setAppSettings(appData);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSettings = async (
    orgPayload: Partial<OrganizationPayload>,
    appPayload: Partial<AppSettingsPayload>
  ) => {
    try {
      if (!organizationId) throw new Error('Organization ID não encontrado');
      setLoading(true);
      
      await Promise.all([
        settingsService.updateOrganization(organizationId, orgPayload),
        settingsService.updateAppSettings(organizationId, appPayload)
      ]);

      addToast('Configurações salvas com sucesso!', 'success');
      await fetchSettings();
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Erro ao salvar configurações', 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    organization,
    appSettings,
    loading,
    error,
    saveSettings,
    refetch: fetchSettings
  };
}

import { supabase } from '@/lib/supabase';

export interface AppSettingsPayload {
  require_geolocation: boolean;
  require_photo_entry: boolean;
  require_photo_exit: boolean;
  require_photo_lunch: boolean;
  max_gps_accuracy_meters: number;
  default_allowed_radius_meters: number;
  mfa_required_for_admin: boolean;
  point_access_enabled: boolean;
  entry_buffer_before_minutes: number;
  entry_buffer_after_minutes: number;
  exit_buffer_before_minutes: number;
  exit_buffer_after_minutes: number;
  lunch_start_buffer_before_minutes: number;
  lunch_start_buffer_after_minutes: number;
  lunch_return_buffer_before_minutes: number;
  lunch_return_buffer_after_minutes: number;
}

export interface OrganizationPayload {
  name: string;
  address: string;
  base_latitude: number;
  base_longitude: number;
  allowed_radius_meters: number;
}

export const settingsService = {
  async getOrganizationSettings(organizationId: string) {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateOrganization(organizationId: string, payload: Partial<OrganizationPayload>) {
    const { data, error } = await supabase
      .from('organizations')
      .update(payload)
      .eq('id', organizationId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getAppSettings(organizationId: string) {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // Ignorar erro de not found se for tratar depois
    return data;
  },

  async updateAppSettings(organizationId: string, payload: Partial<AppSettingsPayload>) {
    // Upsert ou Update? Como a org_id é PK ou Unique, um Update normal já basta, mas precisa garantir que existe
    const { data, error } = await supabase
      .from('app_settings')
      .update(payload)
      .eq('organization_id', organizationId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getFullSettings(organizationId: string) {
    const [orgData, appData] = await Promise.all([
      this.getOrganizationSettings(organizationId),
      this.getAppSettings(organizationId).catch(() => null)
    ]);
    return { organization: orgData, appSettings: appData };
  }
};

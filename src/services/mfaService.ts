import { supabase } from '../lib/supabase';

export interface MfaFactor {
  id: string;
  factor_type: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export const mfaService = {
  async getAuthenticatorAssuranceLevel() {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) {
      throw error;
    }
    return data;
  },

  async listMfaFactors(): Promise<MfaFactor[]> {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      throw error;
    }
    return data.totp || [];
  },

  async unenrollFactor(factorId: string) {
    const { data, error } = await supabase.auth.mfa.unenroll({
      factorId
    });
    if (error) {
      throw error;
    }
    return data;
  },

  async enrollTotpFactor() {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp'
    });
    if (error) {
      throw error;
    }
    return data;
  },

  async challengeTotp(factorId: string) {
    const { data, error } = await supabase.auth.mfa.challenge({
      factorId
    });
    if (error) {
      throw error;
    }
    return data;
  },

  async verifyTotpEnrollment(factorId: string, challengeId: string, code: string) {
    const { data, error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code
    });
    if (error) {
      throw error;
    }
    return data;
  },

  async challengeAndVerifyTotp(factorId: string, code: string) {
    const challenge = await this.challengeTotp(factorId);
    
    const { data, error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code
    });

    if (error) {
      throw error;
    }
    return data;
  },

  async isAdminMfaVerified(): Promise<boolean> {
    const aal = await this.getAuthenticatorAssuranceLevel();
    return aal?.currentLevel === 'aal2';
  }
};

import React, { useState } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { mfaService } from '../../services/mfaService';
import { useAuth } from '../../context/AuthContext';

export const MfaChallengeModal: React.FC = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { logout, updateUser } = useAuth();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;
    
    setLoading(true);
    setError(null);
    try {
      const factors = await mfaService.listMfaFactors();
      if (factors.length === 0) throw new Error('Nenhum fator MFA encontrado.');
      
      const totpFactor = factors[0];
      await mfaService.challengeAndVerifyTotp(totpFactor.id, code);
      
      // Success: elevate assurance level
      updateUser({ mfaStatus: 'verified' });
      // Reload page to refresh routing and components naturally
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('expired')) {
        setError('Código expirado. Gere uma nova verificação no app.');
      } else {
        setError('Código inválido. Verifique o Microsoft Authenticator e tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(val);
    setError(null);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        >
          <div className="px-6 py-6 border-b border-[#E5E5E5] flex flex-col items-center bg-[#F8F9FA] text-center">
            <div className="w-12 h-12 bg-[#003D5C]/10 rounded-full flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6 text-[#003D5C]" />
            </div>
            <h3 className="text-xl font-bold text-[#003D5C]">Confirmação de segurança</h3>
            <p className="text-sm text-[#666666] mt-2">
              Digite o código do Microsoft Authenticator para acessar o painel administrativo.
            </p>
          </div>

          <form onSubmit={handleVerify} className="p-6">
            <div className="mb-6">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={code}
                onChange={handleCodeChange}
                placeholder="000000"
                className="w-full text-center text-3xl font-mono tracking-[0.5em] py-4 bg-[#F8F9FA] border border-[#E5E5E5] rounded-xl text-[#1A1A1A] outline-none focus:border-[#7C9DB5] focus:ring-2 focus:ring-[#7C9DB5]/20 placeholder-[#CCCCCC]"
                autoFocus
              />
              {error && (
                <p className="text-[#DC3545] text-xs font-medium text-center mt-3 bg-[#DC3545]/10 py-2 px-3 rounded-lg">
                  {error}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={code.length !== 6 || loading}
                className="w-full bg-[#13A89E] hover:bg-[#0F8A82] disabled:bg-[#13A89E]/50 text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verificar'}
              </button>
              
              <button
                type="button"
                onClick={logout}
                className="w-full bg-white border border-[#E5E5E5] hover:bg-[#F8F9FA] text-[#666666] font-semibold py-3 px-4 rounded-xl transition-colors"
              >
                Sair
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { ShieldCheck, Loader2, Smartphone, AlertCircle, Copy, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { mfaService } from '../services/mfaService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

type SetupStep = 'session_check' | 'list_factors' | 'unenroll_unverified' | 'enroll_totp' | 'challenge_totp';

interface SetupError {
  step: SetupStep;
  message: string;
  status?: number;
  factorId?: string;
  originalError?: any;
}

const AdminMfaSetup: React.FC = () => {
  const { user, isAuthenticated, isLoading, logout, updateUser } = useAuth();
  const { addToast } = useToast();
  
  const [setupLoading, setSetupLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Preparando código de segurança...');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [errorObj, setErrorObj] = useState<SetupError | null>(null);
  
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);

  const hasStartedEnrollmentRef = useRef(false);

  const initializeMfa = async () => {
    try {
      setSetupLoading(true);
      setErrorObj(null);
      
      setLoadingMessage('Validando sessão...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (!session || sessionError) {
        throw { step: 'session_check', message: 'Sessão inválida ou expirada. Volte para o login.', originalError: sessionError };
      }

      setLoadingMessage('Consultando fatores MFA...');
      let factors;
      try {
        factors = await mfaService.listMfaFactors();
      } catch (err: any) {
        throw { step: 'list_factors', message: err.message, status: err.status, originalError: err };
      }
      
      // If there's a verified factor, user shouldn't be here (or needs to go to challenge)
      const verifiedFactor = factors.find(f => f.status === 'verified');
      if (verifiedFactor) {
        updateUser({ mfaStatus: 'pending_challenge' });
        return;
      }

      // Unenroll any existing unverified factors to start fresh
      const unverifiedFactors = factors.filter(f => f.status === 'unverified');
      if (unverifiedFactors.length > 0) {
        setLoadingMessage('Limpando configuração MFA pendente...');
        for (const factor of unverifiedFactors) {
          try {
            await mfaService.unenrollFactor(factor.id);
            if (import.meta.env.DEV) {
              console.log(`[MFA] Unenrolled stuck unverified factor: ${factor.id}`);
            }
          } catch (unenrollErr: any) {
            if (import.meta.env.DEV) {
              console.error('[MFA Unenroll Error]', {
                factorId: factor.id,
                message: unenrollErr?.message,
                status: unenrollErr?.status,
                name: unenrollErr?.name,
                fullError: unenrollErr,
              });
            }
            throw { step: 'unenroll_unverified', factorId: factor.id, message: unenrollErr.message, status: unenrollErr.status, originalError: unenrollErr };
          }
        }

        // Verify unenrollment succeeded
        try {
          const checkFactors = await mfaService.listMfaFactors();
          if (checkFactors.some(f => f.status === 'unverified')) {
            throw new Error('Falha ao limpar todos os fatores unverified. O Supabase ainda os retorna.');
          }
        } catch (checkErr: any) {
          if (checkErr.step) throw checkErr;
          throw { step: 'unenroll_unverified', message: checkErr.message, status: checkErr.status, originalError: checkErr };
        }
      }

      // Create new enrollment
      setLoadingMessage('Gerando QR Code seguro...');
      let enrollment;
      try {
        const { data, error } = await supabase.auth.mfa.enroll({
          factorType: 'totp',
          friendlyName: `A2 DataPoint Admin ${Date.now()}`
        });
        if (error) throw error;
        enrollment = data;
      } catch (enrollErr: any) {
        throw { step: 'enroll_totp', message: enrollErr.message, status: enrollErr.status, originalError: enrollErr };
      }

      setFactorId(enrollment.id);
      setQrCodeData(enrollment.totp.qr_code);
      setSecret(enrollment.totp.secret);
      
      // Initiating challenge right after enrollment to get a challengeId for verification
      try {
        const challenge = await mfaService.challengeTotp(enrollment.id);
        setChallengeId(challenge.id);
      } catch (chalErr: any) {
        throw { step: 'challenge_totp', factorId: enrollment.id, message: chalErr.message, status: chalErr.status, originalError: chalErr };
      }

      setSetupLoading(false);
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error('[MFA Setup Error Detailed]', err);
      }
      
      const setupErr = err.step ? (err as SetupError) : {
        step: 'enroll_totp' as SetupStep,
        message: err.message || 'Erro desconhecido.',
        status: err.status,
        originalError: err
      };
      
      setErrorObj(setupErr);
      setSetupLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.role === 'Administrador' && user.mfaStatus === 'needs_enrollment' && !hasStartedEnrollmentRef.current) {
      hasStartedEnrollmentRef.current = true;
      initializeMfa();
    }
  }, [isLoading, isAuthenticated, user]);

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'Administrador') return <Navigate to="/login" replace />;
  
  if (user.mfaStatus === 'verified' || user.mfaStatus === 'pending_challenge') {
    return <Navigate to="/admin" replace />;
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6 || !factorId || !challengeId) return;

    setVerifyLoading(true);
    setErrorObj(null);
    try {
      await mfaService.verifyTotpEnrollment(factorId, challengeId, code);
      addToast('MFA configurado com sucesso.', 'success');
      updateUser({ mfaStatus: 'verified' });
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error('[MFA Verify Error]', err.message, err);
      }
      setErrorObj({
        step: 'challenge_totp',
        message: 'Código inválido. Verifique o Microsoft Authenticator e tente novamente.',
        originalError: err
      });
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(val);
    setErrorObj(null);
  };

  const copySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const renderQrCode = () => {
    if (!qrCodeData) return null;
    
    // Some supabase versions return data uri, others return raw svg
    if (qrCodeData.startsWith('data:image')) {
      return <img src={qrCodeData} alt="QR Code" className="w-full h-full object-contain" />;
    } else if (qrCodeData.startsWith('<svg')) {
      return <div className="w-full h-full [&>svg]:w-full [&>svg]:h-full object-contain" dangerouslySetInnerHTML={{ __html: qrCodeData }} />;
    }
    
    return <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-xs text-center p-2 break-all">Formato de QR Code desconhecido</div>;
  };

  const handleRetry = () => {
    hasStartedEnrollmentRef.current = false;
    setQrCodeData(null);
    setSecret(null);
    setFactorId(null);
    setChallengeId(null);
    setCode('');
    initializeMfa();
  };

  const getFriendlyErrorMessage = (err: SetupError | null) => {
    if (!err) return null;
    if (err.step === 'session_check') return 'Sessão inválida ou expirada. Volte para o login.';
    if (err.step === 'unenroll_unverified') return 'Falha ao remover configuração MFA pendente. Tente novamente.';
    if (err.message?.includes('disabled') || err.status === 403) return 'MFA pode não estar habilitado no Supabase Dashboard (Auth > Providers > TOTP).';
    if (err.message?.includes('already enrolled')) return 'Encontramos uma configuração MFA pendente. Clique em tentar novamente.';
    return 'Não foi possível iniciar a configuração MFA. Tente novamente.';
  };

  return (
    <div className="min-h-screen bg-[#E5E5E5] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row min-h-[500px]">
        
        {/* Left Side: Info */}
        <div className="w-full md:w-5/12 bg-[#003D5C] p-8 text-white flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-6">
              <ShieldCheck className="w-6 h-6 text-[#13A89E]" />
            </div>
            <h2 className="text-2xl font-bold mb-4 leading-tight">Configurar autenticação<br/>em duas etapas</h2>
            <p className="text-white/80 text-sm leading-relaxed mb-6">
              Use o Microsoft Authenticator ou outro app compatível. Esta etapa é obrigatória para proteger as informações sensíveis da plataforma.
            </p>
          </div>
          <div className="bg-black/20 p-5 rounded-xl border border-white/10">
            <p className="text-xs text-white/70 font-medium uppercase mb-3 flex items-center gap-2">
              <Smartphone className="w-4 h-4" /> Passo a Passo
            </p>
            <ul className="text-sm text-white/90 space-y-3 list-decimal list-inside">
              <li>Abra o aplicativo autenticador.</li>
              <li>Escaneie o QR Code ao lado.</li>
              <li>Insira o código de 6 dígitos gerado.</li>
            </ul>
          </div>
        </div>

        {/* Right Side: Setup */}
        <div className="w-full md:w-7/12 p-8 bg-white flex flex-col items-center justify-center relative">
          {setupLoading ? (
            <div className="flex flex-col items-center text-[#666666]">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-[#13A89E]" />
              <p className="text-sm font-medium">{loadingMessage}</p>
            </div>
          ) : errorObj && !qrCodeData ? (
            <div className="flex flex-col items-center text-center max-w-sm w-full">
              <AlertCircle className="w-12 h-12 text-[#DC3545] mb-3" />
              <p className="text-[#1A1A1A] font-semibold mb-2 text-lg">Ops! Algo deu errado.</p>
              <p className="text-sm text-[#666666] mb-6">{getFriendlyErrorMessage(errorObj)}</p>
              
              {import.meta.env.DEV && (
                <div className="w-full bg-[#F8F9FA] border border-[#E5E5E5] rounded p-3 mb-6 text-left shadow-inner">
                  <p className="text-xs text-[#DC3545] font-semibold uppercase mb-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Detalhe Técnico (DEV)
                  </p>
                  <p className="text-[11px] text-[#666666] font-mono whitespace-pre-wrap break-all mb-1">
                    <strong className="text-[#1A1A1A]">Etapa:</strong> {errorObj.step}
                  </p>
                  {errorObj.factorId && (
                    <p className="text-[11px] text-[#666666] font-mono break-all mb-1">
                      <strong className="text-[#1A1A1A]">Factor ID:</strong> {errorObj.factorId}
                    </p>
                  )}
                  <p className="text-[11px] text-[#666666] font-mono whitespace-pre-wrap break-all">
                    <strong className="text-[#1A1A1A]">Detalhe:</strong> {errorObj.message}
                  </p>
                </div>
              )}

              <div className="flex flex-col w-full gap-3 mt-auto">
                <button
                  onClick={handleRetry}
                  className="w-full bg-[#13A89E] hover:bg-[#0F8A82] text-white font-semibold py-2.5 px-6 rounded-xl transition-colors flex items-center justify-center"
                >
                  Tentar novamente
                </button>
                <button
                  onClick={logout}
                  className="w-full bg-white border border-[#E5E5E5] hover:bg-[#F8F9FA] text-[#666666] font-semibold py-2.5 px-6 rounded-xl transition-colors"
                >
                  Voltar para Login
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-sm flex flex-col items-center">
              <div className="bg-white p-4 rounded-2xl border-2 border-[#E5E5E5] mb-6 w-full flex flex-col items-center shadow-sm">
                <div className="w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center overflow-hidden mb-4">
                  {renderQrCode()}
                </div>
                
                {secret && (
                  <div className="w-full bg-[#F8F9FA] rounded-lg p-3 border border-[#E5E5E5] flex items-center justify-between">
                    <div className="overflow-hidden flex-1 mr-2">
                      <p className="text-[10px] text-[#666666] font-semibold uppercase mb-0.5">Chave Manual</p>
                      <code className="text-xs text-[#1A1A1A] font-mono truncate block selection:bg-[#13A89E] selection:text-white">
                        {secret}
                      </code>
                    </div>
                    <button 
                      onClick={copySecret}
                      type="button"
                      className="w-8 h-8 rounded bg-white border border-[#E5E5E5] flex items-center justify-center text-[#666666] hover:bg-[#E5E5E5] transition-colors shrink-0"
                      title="Copiar código"
                    >
                      {copied ? <Check className="w-4 h-4 text-[#13A89E]" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>

              <form onSubmit={handleVerify} className="w-full flex flex-col items-center">
                <div className="w-full mb-6">
                  <label className="block text-sm font-medium text-[#003D5C] mb-2 text-center">
                    Digite o código gerado no app
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={code}
                    onChange={handleCodeChange}
                    placeholder="000 000"
                    className="w-full text-center text-3xl font-mono tracking-[0.2em] py-3 bg-white border-2 border-[#E5E5E5] rounded-xl text-[#1A1A1A] outline-none focus:border-[#7C9DB5] focus:ring-4 focus:ring-[#7C9DB5]/20 transition-all placeholder:text-[#CCCCCC]"
                  />
                  {errorObj && (
                    <p className="text-[#DC3545] text-xs font-medium text-center mt-3 bg-[#DC3545]/10 py-2 px-3 rounded-lg">
                      {errorObj.message}
                    </p>
                  )}
                </div>

                <div className="w-full flex flex-col gap-3">
                  <button
                    type="submit"
                    disabled={code.length !== 6 || verifyLoading}
                    className="w-full bg-[#13A89E] hover:bg-[#0F8A82] disabled:bg-[#13A89E]/50 disabled:cursor-not-allowed text-white font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center shadow-lg shadow-[#13A89E]/20"
                  >
                    {verifyLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verificar e ativar MFA'}
                  </button>
                  <button
                    type="button"
                    onClick={logout}
                    className="w-full bg-transparent text-[#666666] hover:text-[#1A1A1A] font-semibold py-2 px-4 rounded-xl transition-colors text-sm"
                  >
                    Cancelar e sair
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminMfaSetup;

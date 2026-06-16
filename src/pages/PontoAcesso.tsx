import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/context/ToastContext';

const PontoAcesso: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    // TODO Fase 3/4: substituir token mockado por token real no backend/Supabase
    if (token === 'a2dp-aconchego-2026') {
      addToast('Acesso via link aprovado (Mock)', 'success');
      navigate('/ponto', { replace: true });
    } else {
      addToast('Link de acesso inválido ou expirado', 'error');
      navigate('/login', { replace: true });
    }
  }, [token, navigate, addToast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#E5E5E5]">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-8 h-8 border-4 border-[#003D5C] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[#666] text-sm">Validando acesso...</p>
      </div>
    </div>
  );
};

export default PontoAcesso;

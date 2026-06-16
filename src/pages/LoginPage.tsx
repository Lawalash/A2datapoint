import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { motion } from 'framer-motion';
import { Cross, Eye, EyeOff, Loader2 } from 'lucide-react';
import { PRODUCT_MODE, currentBranding } from '@/config/productConfig';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!username || !password) {
      addToast('Preencha login e senha', 'error');
      return;
    }
    setLoading(true);
    try {
      const loggedInUser = await login(username, password);
      setLoading(false);
      if (loggedInUser) {
        const route = loggedInUser.route || (PRODUCT_MODE === 'A2_DATAPOINT' ? '/ponto' : '/admin');
        navigate(route);
      }
    } catch (err: any) {
      setLoading(false);
      setShake(true);
      addToast(err.message || 'Credenciais inválidas', 'error');
      setTimeout(() => setShake(false), 600);
    }
  };

  const quickLogin = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #E5E5E5 0%, #D4DFE8 100%)' }}
    >
      {/* Decorative circles */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#7C9DB5]/10 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#8BABC7]/8 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10"
      >
        <motion.div
          animate={shake ? { x: [0, -8, 8, -6, 6, -4, 4, 0] } : {}}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-[20px] shadow-lg p-10 lg:p-12 w-[420px] max-w-[90vw]"
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Cross className="w-8 h-8 text-[#003D5C]" />
              <span className="text-[28px] font-bold text-[#003D5C]">{currentBranding.namePrimary}</span>
              <span className="text-[28px] font-bold text-[#7C9DB5]">{currentBranding.nameSecondary}</span>
            </div>
            <p className="text-sm text-[#8BABC7] tracking-[4px] uppercase">{currentBranding.subtitle}</p>
            <div className="w-10 h-0.5 bg-[#003D5C] mx-auto mt-4 mb-4" />
            <h2 className="text-lg font-semibold text-[#1A1A1A]">
              {PRODUCT_MODE === 'A2_DATAPOINT' ? 'Acesso administrativo' : 'Sistema de Gestão Integrada'}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#003D5C] mb-1.5">
                {PRODUCT_MODE === 'A2_DATAPOINT' ? 'Login ou matrícula' : 'Login'}
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Digite seu login"
                className="w-full h-12 px-4 bg-[#F8F9FA] border-[1.5px] border-[#E5E5E5] rounded-[10px] text-[15px] text-[#1A1A1A] placeholder:text-[#999] focus:border-[#8BABC7] focus:ring-[3px] focus:ring-[#8BABC7]/25 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#003D5C] mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="w-full h-12 px-4 pr-12 bg-[#F8F9FA] border-[1.5px] border-[#E5E5E5] rounded-[10px] text-[15px] text-[#1A1A1A] placeholder:text-[#999] focus:border-[#8BABC7] focus:ring-[3px] focus:ring-[#8BABC7]/25 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8BABC7] hover:text-[#003D5C] transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              className="w-full h-[52px] bg-[#003D5C] text-white rounded-[10px] text-[15px] font-semibold hover:bg-[#004d75] active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar no Sistema'
              )}
            </motion.button>
          </form>

          {PRODUCT_MODE !== 'A2_DATAPOINT' ? (
            <>
              <p className="text-center text-xs text-[#666666]/60 mt-6">
                Perfis disponíveis: admin | enfermchefe | enfermeiro
              </p>
              <div className="flex justify-center gap-4 mt-4">
                {[
                  { label: 'Admin', user: 'admin', pass: 'admin' },
                  { label: 'Chefe', user: 'enfermchefe', pass: 'enfermchefe' },
                  { label: 'Enfermeiro', user: 'enfermeiro', pass: 'enfermeiro' },
                ].map(demo => (
                  <button
                    key={demo.user}
                    type="button"
                    onClick={() => quickLogin(demo.user, demo.pass)}
                    className="text-xs text-[#7C9DB5] hover:text-[#003D5C] underline transition-colors cursor-pointer"
                  >
                    {demo.label}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LoginPage;

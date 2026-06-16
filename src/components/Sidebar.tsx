import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, HeartPulse, Users, FileText, Settings,
  ClipboardList, Bell, PlusCircle, LogOut, Cross, Menu, X,
  BedDouble, UsersRound, Fingerprint, Clock, Calendar, ChevronLeft, ChevronRight
} from 'lucide-react';
import type { UserRole } from '@/types';
import { PRODUCT_MODE, currentBranding } from '@/config/productConfig';
import { loadProfileAvatar } from '@/utils/avatarUtils';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  separator?: boolean;
}

const navConfig: Record<UserRole, NavItem[]> = {
  'Administrador': [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { label: 'Acomp. Clínico', icon: HeartPulse, path: '/admin/clinico' },
    { label: 'Gestão Comp.', icon: Users, path: '/admin/comportamental' },
    { label: 'Pacientes', icon: BedDouble, path: '/admin/pacientes' },
    { label: 'Funcionários', icon: UsersRound, path: '/admin/funcionarios' },
    { label: 'Escalas', icon: Calendar, path: '/admin/escalas' },
    { label: 'Relatórios', icon: FileText, path: '/admin/relatorios' },
    { label: 'Configurações', icon: Settings, path: '/admin/configuracoes' },
  ],
  'Master': [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { label: 'Acomp. Clínico', icon: HeartPulse, path: '/admin/clinico' },
    { label: 'Gestão Comp.', icon: Users, path: '/admin/comportamental' },
    { label: 'Pacientes', icon: BedDouble, path: '/admin/pacientes' },
    { label: 'Funcionários', icon: UsersRound, path: '/admin/funcionarios' },
    { label: 'Escalas', icon: Calendar, path: '/admin/escalas' },
    { label: 'Relatórios', icon: FileText, path: '/admin/relatorios' },
    { label: 'Configurações', icon: Settings, path: '/admin/configuracoes' },
  ],
  'Enfermeira Chefe': [
    { label: 'Acompanhamento', icon: HeartPulse, path: '/enfermeira-chefe' },
    { label: 'Pacientes', icon: BedDouble, path: '/enfermeira-chefe/pacientes' },
    { label: 'Registros', icon: ClipboardList, path: '/enfermeira-chefe/registros' },
    { label: 'Alertas', icon: Bell, path: '/enfermeira-chefe/alertas' },
    { label: 'Relatórios', icon: FileText, path: '/enfermeira-chefe/relatorios' },
    { label: 'Meu Ponto', icon: Clock, path: '/enfermeira-chefe/meu-ponto' },
    { label: 'Bater Ponto', icon: Fingerprint, path: '/ponto-tablet', separator: true },
  ],
  'Enfermeiro': [
    { label: 'Novo Registro', icon: PlusCircle, path: '/enfermeiro' },
    { label: 'Pacientes', icon: Users, path: '/enfermeiro/pacientes' },
    { label: 'Meu Ponto', icon: Clock, path: '/enfermeiro/meu-ponto' },
    { label: 'Bater Ponto', icon: Fingerprint, path: '/ponto-tablet', separator: true },
  ],
  'ASG': [
    { label: 'Bater Ponto', icon: Fingerprint, path: '/ponto-tablet' },
  ],
  'Colaborador': [
    { label: 'Bater Ponto', icon: Fingerprint, path: '/ponto' },
    { label: 'Meu Ponto', icon: Clock, path: '/meu-ponto', separator: true },
  ],
};

interface SidebarProps {
  isCollapsed?: boolean;
  toggleCollapse?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed = false, toggleCollapse }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    
    const loadAvatar = () => {
      let url = null;
      if (user.id) {
        url = loadProfileAvatar(user.id);
      }
      setAvatarUrl(url);
    };

    loadAvatar();

    const handleAvatarUpdate = () => loadAvatar();
    window.addEventListener('avatarUpdated', handleAvatarUpdate);
    return () => window.removeEventListener('avatarUpdated', handleAvatarUpdate);
  }, [user]);

  if (!user) return null;

  let navItems = navConfig[user.role] || [];
  
  if (PRODUCT_MODE === 'A2_DATAPOINT') {
    if (user.role === 'Administrador' || user.role === 'Master') {
      navItems = navItems.filter(item => 
        ['Gestão Comp.', 'Funcionários', 'Escalas', 'Configurações'].includes(item.label)
      );
    } else if (user.role === 'Enfermeira Chefe' || user.role === 'Enfermeiro') {
      navItems = navItems.filter(item => 
        ['Meu Ponto', 'Bater Ponto'].includes(item.label)
      );
    } else if (user.role === 'Colaborador') {
      navItems = navItems.filter(item => item.label === 'Bater Ponto');
    }
  }

  // Bottom nav: first 5 items max (for mobile)
  const bottomNavItems = navItems.filter(i => !i.separator).slice(0, 5);

  const handleNavClick = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const isActive = (path: string) => {
    if (path === '/admin' || path === '/enfermeira-chefe' || path === '/enfermeiro') {
      return location.pathname === path && !location.search;
    }
    return location.pathname === path;
  };

  return (
    <>
      {/* ═══════════ DESKTOP SIDEBAR (lg+) ═══════════ */}
      <aside translate="no" className={`notranslate hidden lg:flex fixed left-0 top-0 h-screen bg-[#003D5C] z-40 flex-col overflow-visible transition-all duration-300 ${isCollapsed ? 'w-[80px]' : 'w-[260px]'}`}>
        
        {/* Toggle Button */}
        {toggleCollapse && (
          <button 
            onClick={toggleCollapse} 
            className="absolute -right-3 top-[50%] -translate-y-1/2 bg-white border border-[#E5E5E5] rounded-full p-1 text-[#003D5C] shadow-md hover:bg-gray-50 z-50 transition-transform cursor-pointer"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}

        {/* Logo */}
        <div className={`h-16 flex items-center px-4 border-b border-white/10 ${isCollapsed ? 'justify-center' : 'gap-2'}`}>
          <Cross className="w-7 h-7 text-[#7C9DB5] flex-shrink-0" />
          <div className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
            <span className="text-white text-lg font-bold">{currentBranding.sidebarTitle}</span>
            <span className="text-[#7C9DB5] text-xs block tracking-[3px] uppercase">{currentBranding.sidebarSubtitle}</span>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <React.Fragment key={item.label}>
              {item.separator && <div className="my-3 mx-2 border-t border-white/10" />}
              <button
                onClick={() => handleNavClick(item.path)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                  isActive(item.path)
                    ? 'bg-[#8BABC7]/25 text-white border-l-[3px] border-[#8BABC7]'
                    : 'text-white/70 hover:bg-[#8BABC7]/15 hover:text-white border-l-[3px] border-transparent'
                } ${isCollapsed ? 'justify-center px-0' : 'px-3'}`}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive(item.path) ? 'text-[#8BABC7]' : ''}`} />
                {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </button>
            </React.Fragment>
          ))}
        </nav>

        {/* User profile */}
        <div className="border-t border-white/10 p-3">
          <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center flex-col' : 'px-2'}`}>
            <div title={isCollapsed ? `${user.displayName}\n${user.role} / ${user.cargo || ''}` : undefined}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Perfil" className="w-10 h-10 rounded-lg object-cover bg-white flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-[#7C9DB5] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {user.displayName.charAt(0)}
                </div>
              )}
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden flex-1 min-w-0" title={`${user.displayName}\n${user.role} / ${user.cargo || ''}`}>
                <p className="text-white text-sm font-medium truncate">{user.displayName}</p>
                <p className="text-white/50 text-xs truncate">{user.cargo ? `${user.role} / ${user.cargo}` : user.role}</p>
              </div>
            )}
            <button onClick={logout} className={`text-white/50 hover:text-white transition-colors p-1 cursor-pointer ${isCollapsed ? 'mt-1' : ''}`} title="Sair">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ═══════════ MOBILE/TABLET: TOP HEADER BAR ═══════════ */}
      <header translate="no" className="notranslate lg:hidden fixed top-0 left-0 right-0 h-14 bg-[#003D5C] z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Cross className="w-6 h-6 text-[#7C9DB5]" />
          <span className="text-white text-base font-bold">{currentBranding.sidebarTitle}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/70 text-xs font-medium hidden sm:inline">{user.displayName}</span>
          {(user.role === 'Administrador' || user.role === 'Master') ? (
            <button
              onClick={logout}
              className="text-white/80 p-1.5 rounded-lg hover:bg-[#DC3545]/20 hover:text-[#DC3545] cursor-pointer transition-colors"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-white p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
        </div>
      </header>

      {/* Mobile full menu overlay */}
      <AnimatePresence>
        {mobileMenuOpen && user.role !== 'Administrador' && user.role !== 'Master' && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/40 z-[45]"
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="lg:hidden fixed top-14 left-0 right-0 bg-[#003D5C] z-[46] rounded-b-2xl shadow-xl max-h-[70vh] overflow-y-auto"
            >
              <nav className="py-2 px-3 space-y-1">
                {navItems.map(item => (
                  <React.Fragment key={item.label}>
                    {item.separator && <div className="my-2 mx-2 border-t border-white/10" />}
                    <button
                      onClick={() => handleNavClick(item.path)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium cursor-pointer ${
                        isActive(item.path)
                          ? 'bg-[#8BABC7]/25 text-white'
                          : 'text-white/70 hover:bg-[#8BABC7]/15 hover:text-white'
                      }`}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {item.label}
                    </button>
                  </React.Fragment>
                ))}
              </nav>
              {/* Logout */}
              <div className="border-t border-white/10 p-3">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-[#DC3545]/80 hover:bg-[#DC3545]/10 cursor-pointer"
                >
                  <LogOut className="w-5 h-5" /> Sair
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══════════ MOBILE/TABLET: BOTTOM NAV BAR ═══════════ */}
      <nav translate="no" className="notranslate lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-[#E5E5E5] z-40 flex items-center justify-around px-1 safe-bottom">
        {bottomNavItems.map(item => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg min-w-[56px] cursor-pointer transition-all ${
                active ? 'text-[#003D5C]' : 'text-[#999] hover:text-[#666]'
              }`}
            >
              <item.icon className={`w-5 h-5 ${active ? 'text-[#003D5C]' : ''}`} />
              <span className="text-[10px] font-medium leading-tight text-center">{item.label.length > 10 ? item.label.slice(0, 10) + '.' : item.label}</span>
              {active && <div className="w-4 h-0.5 bg-[#003D5C] rounded-full mt-0.5" />}
            </button>
          );
        })}
      </nav>
    </>
  );
};

export default Sidebar;

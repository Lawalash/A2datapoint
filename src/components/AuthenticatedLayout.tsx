import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/types';
import Sidebar from './Sidebar';
import Header from './Header';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { MfaChallengeModal } from './Auth/MfaChallengeModal';
import { ErrorBoundary } from './ErrorBoundary';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
  requiredRole: UserRole;
  pageTitle: string;
}

const AuthenticatedLayout: React.FC<AuthenticatedLayoutProps> = ({
  children,
  requiredRole,
  pageTitle,
}) => {
  const { isAuthenticated, user, hasRole, isLoading } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('a2datapoint:sidebarCollapsed') === 'true');

  const toggleSidebar = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem('a2datapoint:sidebarCollapsed', String(next));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#E5E5E5] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-[#13A89E] animate-spin mb-4" />
          <p className="text-[#1B325F] font-medium animate-pulse">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasRole(requiredRole)) {
    return <Navigate to={user?.route || '/login'} replace />;
  }

  // Se for admin ou master, verificar MFA
  if (user?.role === 'Administrador' || user?.role === 'Master') {
    if (user.mfaStatus === 'needs_enrollment') {
      return <Navigate to="/admin/mfa-setup" replace />;
    }
    
    // Se precisa de desafio, exibimos o modal por cima de tudo
    if (user.mfaStatus === 'pending_challenge') {
      return (
        <div className="min-h-screen bg-[#E5E5E5] flex items-center justify-center">
          <MfaChallengeModal />
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-[#E5E5E5] print:min-h-0 print:bg-white">
      <div className="print:hidden">
        <Sidebar isCollapsed={isCollapsed} toggleCollapse={toggleSidebar} />
      </div>
      {/* Desktop: offset by sidebar width. Mobile: offset by top header + title bar */}
      <div className={`transition-all duration-300 ${isCollapsed ? 'lg:ml-[80px]' : 'lg:ml-[260px]'} print:m-0 print:transition-none`}>
        <div className="print:hidden sticky top-0 z-40">
          <Header title={pageTitle} />
        </div>
        {/* Desktop: no pt needed since header is sticky. Mobile: pt-[108px] (top bar 56px + sub-header ~52px). Bottom pb-20 for bottom nav on mobile */}
        <main translate="no" className="notranslate pt-[108px] lg:pt-0 pb-20 lg:pb-0 min-h-screen print:p-0 print:min-h-0 print:block">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="p-4 sm:p-6 lg:p-8 print:p-0 print:m-0 print:transform-none"
          >
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default AuthenticatedLayout;

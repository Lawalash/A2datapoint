import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { DataPointMockProvider } from '@/context/DataPointMockContext';
import LoginPage from '@/pages/LoginPage';
import TabletPonto from '@/pages/TabletPonto';
import PontoAcesso from '@/pages/PontoAcesso';
import AdminDashboard from '@/pages/AdminDashboard';
import AdminClinico from '@/pages/AdminClinico';
import AdminComportamental from '@/pages/AdminComportamental';
import AdminPacientes from '@/pages/AdminPacientes';
import AdminFuncionarios from '@/pages/AdminFuncionarios';
import AdminEscalas from '@/pages/AdminEscalas';
import AdminConfiguracoes from '@/pages/AdminConfiguracoes';
import AdminRelatorios from '@/pages/AdminRelatorios';
import AdminMfaSetup from '@/pages/AdminMfaSetup';
import HeadNurseDashboard from '@/pages/HeadNurseDashboard';
import HeadNursePacientes from '@/pages/HeadNursePacientes';
import HeadNurseRegistros from '@/pages/HeadNurseRegistros';
import HeadNurseAlertas from '@/pages/HeadNurseAlertas';
import HeadNurseRelatorios from '@/pages/HeadNurseRelatorios';
import NurseDashboard from '@/pages/NurseDashboard';
import NursePacientes from '@/pages/NursePacientes';
import MeuPonto from '@/pages/MeuPonto';
import { PRODUCT_MODE } from '@/config/productConfig';

// Helper component for conditional routes
const ConditionalRoute: React.FC<{
  element: React.ReactNode;
  allowedModes: ('A2_DATAPOINT' | 'A2_FORM_FULL')[];
  fallbackPath: string;
}> = ({ element, allowedModes, fallbackPath }) => {
  if (allowedModes.includes(PRODUCT_MODE)) {
    return <>{element}</>;
  }
  return <Navigate to={fallbackPath} replace />;
};

const App: React.FC = () => {
  return (
    <DataPointMockProvider>
      <AuthProvider>
        <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/ponto" element={<TabletPonto />} />
            <Route path="/ponto-tablet" element={<Navigate to="/ponto" replace />} />
            <Route path="/acesso-ponto/:token" element={<PontoAcesso />} />

            {/* Admin */}
            <Route path="/admin" element={
              PRODUCT_MODE === 'A2_DATAPOINT' 
                ? <Navigate to="/admin/comportamental" replace /> 
                : <AdminDashboard />
            } />
            <Route path="/admin/mfa-setup" element={<AdminMfaSetup />} />
            <Route path="/admin/clinico" element={<ConditionalRoute element={<AdminClinico />} allowedModes={['A2_FORM_FULL']} fallbackPath="/admin/comportamental" />} />
            <Route path="/admin/comportamental" element={<AdminComportamental />} />
            <Route path="/admin/pacientes" element={<ConditionalRoute element={<AdminPacientes />} allowedModes={['A2_FORM_FULL']} fallbackPath="/admin/comportamental" />} />
            <Route path="/admin/funcionarios" element={<AdminFuncionarios />} />
            <Route path="/admin/escalas" element={<AdminEscalas />} />
            <Route path="/admin/configuracoes" element={<AdminConfiguracoes />} />
            <Route path="/admin/relatorios" element={<ConditionalRoute element={<AdminRelatorios />} allowedModes={['A2_FORM_FULL']} fallbackPath="/admin/comportamental" />} />

            {/* Enfermeira Chefe */}
            <Route path="/enfermeira-chefe" element={<ConditionalRoute element={<HeadNurseDashboard />} allowedModes={['A2_FORM_FULL']} fallbackPath="/login" />} />
            <Route path="/enfermeira-chefe/pacientes" element={<ConditionalRoute element={<HeadNursePacientes />} allowedModes={['A2_FORM_FULL']} fallbackPath="/login" />} />
            <Route path="/enfermeira-chefe/registros" element={<ConditionalRoute element={<HeadNurseRegistros />} allowedModes={['A2_FORM_FULL']} fallbackPath="/login" />} />
            <Route path="/enfermeira-chefe/alertas" element={<ConditionalRoute element={<HeadNurseAlertas />} allowedModes={['A2_FORM_FULL']} fallbackPath="/login" />} />
            <Route path="/enfermeira-chefe/relatorios" element={<ConditionalRoute element={<HeadNurseRelatorios />} allowedModes={['A2_FORM_FULL']} fallbackPath="/login" />} />
            <Route path="/enfermeira-chefe/meu-ponto" element={<MeuPonto requiredRole="Enfermeira Chefe" pageTitle="Meu Ponto" />} />

            {/* Enfermeiro */}
            <Route path="/enfermeiro" element={<ConditionalRoute element={<NurseDashboard />} allowedModes={['A2_FORM_FULL']} fallbackPath="/login" />} />
            <Route path="/enfermeiro/pacientes" element={<ConditionalRoute element={<NursePacientes />} allowedModes={['A2_FORM_FULL']} fallbackPath="/login" />} />
            <Route path="/enfermeiro/meu-ponto" element={<MeuPonto requiredRole="Enfermeiro" pageTitle="Meu Ponto" />} />

            {/* Colaborador */}
            <Route path="/meu-ponto" element={
              PRODUCT_MODE === 'A2_DATAPOINT' 
                ? <Navigate to="/ponto" replace />
                : <MeuPonto requiredRole="Colaborador" pageTitle="Meu Ponto" />
            } />

            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
    </DataPointMockProvider>
  );
};

export default App;

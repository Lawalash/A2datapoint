// src/App.tsx
import { useStore } from '@/hooks/useStore'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { AdminDashboard } from '@/sections/admin/AdminDashboard'
import { UserManagement } from '@/sections/admin/UserManagement'
import { ShiftManagement } from '@/sections/admin/ShiftManagement'
import { Monitoring } from '@/sections/admin/Monitoring'
import { OvertimeApproval } from '@/sections/admin/OvertimeApproval'
import { Reports } from '@/sections/admin/Reports'
import { Storage } from '@/sections/admin/Storage'
import { EmployeeLogin } from '@/sections/employee/Login'
import { FirstAccess } from '@/sections/employee/FirstAccess'
import { EmployeeDashboard } from '@/sections/employee/Dashboard'
import { Toaster } from '@/components/ui/sonner'
import { Fingerprint } from 'lucide-react'

// ── Componente de carregamento ──────────────────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f2d5c] to-[#1a4080] flex flex-col items-center justify-center">
      <div className="text-center">
        <div className="w-20 h-20 bg-[#00b4d8]/20 border-2 border-[#00b4d8]/30 rounded-3xl flex items-center justify-center mx-auto mb-6 animate-pulse">
          <Fingerprint className="w-10 h-10 text-[#00b4d8]" />
        </div>
        <p className="text-white/60 text-sm tracking-widest uppercase">A2data</p>
        <p className="text-[#00b4d8] font-black text-2xl tracking-[0.15em] uppercase">POINT</p>
        <div className="flex justify-center gap-1.5 mt-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-[#00b4d8]/40 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Admin view router ───────────────────────────────────────────
function AdminRouter() {
  const adminView = useStore((s) => s.adminView)

  const view = {
    dashboard: <AdminDashboard />,
    users: <UserManagement />,
    shifts: <ShiftManagement />,
    monitoring: <Monitoring />,
    overtime: <OvertimeApproval />,
    reports: <Reports />,
    storage: <Storage />,
  }[adminView] ?? <AdminDashboard />

  return <AdminLayout>{view}</AdminLayout>
}

// ── App root ────────────────────────────────────────────────────
function App() {
  const { currentView, isAuthLoading } = useStore()

  if (isAuthLoading) {
    return <LoadingScreen />
  }

  // Employee views: wrapped in mobile container
  if (currentView === 'login' || currentView === 'first-access' || currentView === 'employee-dashboard') {
    return (
      <>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div
            className="w-full bg-white shadow-2xl overflow-hidden"
            style={{
              maxWidth: '430px',
              minHeight: '100dvh',
            }}
          >
            {currentView === 'login' && <EmployeeLogin />}
            {currentView === 'first-access' && <FirstAccess />}
            {currentView === 'employee-dashboard' && <EmployeeDashboard />}
          </div>
        </div>
        <Toaster position="top-center" richColors />
      </>
    )
  }

  // Admin view: full layout
  if (currentView === 'admin') {
    return (
      <>
        <AdminRouter />
        <Toaster position="top-right" richColors />
      </>
    )
  }

  return <LoadingScreen />
}

export default App
// src/components/layouts/AdminLayout.tsx
import { useState } from 'react'
import { useStore } from '@/hooks/useStore'
import type { AdminView } from '@/types'
import {
  LayoutDashboard,
  Users,
  Calendar,
  BarChart3,
  Clock,
  FileText,
  HardDrive,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface NavItem {
  id: AdminView
  label: string
  shortLabel: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { currentUser, adminView, navigateAdmin, logout, getPendingOvertimeCount } = useStore()
  const pendingHE = getPendingOvertimeCount()

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      shortLabel: 'Home',
      icon: LayoutDashboard,
    },
    {
      id: 'users',
      label: 'Gestão de Utilizadores',
      shortLabel: 'Utilizadores',
      icon: Users,
    },
    {
      id: 'shifts',
      label: 'Gestão de Escalas',
      shortLabel: 'Escalas',
      icon: Calendar,
    },
    {
      id: 'monitoring',
      label: 'Monitoramento',
      shortLabel: 'Monitor',
      icon: BarChart3,
    },
    {
      id: 'overtime',
      label: 'Aprovação de HE',
      shortLabel: 'HE',
      icon: Clock,
      badge: pendingHE || undefined,
    },
    {
      id: 'reports',
      label: 'Relatórios',
      shortLabel: 'Relatórios',
      icon: FileText,
    },
    {
      id: 'storage',
      label: 'Armazenamento',
      shortLabel: 'Storage',
      icon: HardDrive,
    },
  ]

  const handleNavigate = (view: AdminView) => {
    navigateAdmin(view)
    setSidebarOpen(false)
  }

  return (
    <div className="flex h-screen bg-[#f0f4f8] overflow-hidden">
      {/* ── SIDEBAR DESKTOP ────────────────────────────────────── */}
      <aside
        className={cn(
          'hidden lg:flex flex-col w-64 bg-[#0f2d5c] text-white shrink-0',
          'border-r border-[#1e3a5f]'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
          <div className="w-9 h-9 bg-[#00b4d8] rounded-lg flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm tracking-wide text-white leading-none">A2data</p>
            <p className="font-bold text-base tracking-widest text-[#00b4d8] leading-none mt-0.5">POINT</p>
          </div>
        </div>

        {/* User info */}
        <div className="px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-3 bg-white/10 rounded-xl px-3 py-2.5">
            <div className="w-8 h-8 rounded-full bg-[#00b4d8]/30 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-[#00b4d8]">
                {currentUser?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{currentUser?.name}</p>
              <p className="text-xs text-white/50">Administrador</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = adminView === item.id
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-[#00b4d8] text-white shadow-lg shadow-[#00b4d8]/20'
                    : 'text-white/60 hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon className="w-4.5 h-4.5 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge ? (
                  <Badge className="bg-[#ef476f] text-white text-xs h-5 min-w-5 px-1.5">
                    {item.badge}
                  </Badge>
                ) : isActive ? (
                  <ChevronRight className="w-4 h-4 opacity-70" />
                ) : null}
              </button>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Terminar Sessão</span>
          </button>
        </div>
      </aside>

      {/* ── MOBILE SIDEBAR OVERLAY ──────────────────────────────── */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />

          {/* Drawer */}
          <aside className="relative z-10 w-72 bg-[#0f2d5c] h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#00b4d8] rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-bold text-xs text-white">A2data</p>
                  <p className="font-bold text-sm text-[#00b4d8] tracking-widest">POINT</p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User */}
            <div className="px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-3 bg-white/10 rounded-xl px-3 py-2.5">
                <div className="w-8 h-8 rounded-full bg-[#00b4d8]/30 flex items-center justify-center">
                  <span className="text-xs font-bold text-[#00b4d8]">
                    {currentUser?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">{currentUser?.name}</p>
                  <p className="text-xs text-white/50">Administrador</p>
                </div>
              </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = adminView === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                      isActive
                        ? 'bg-[#00b4d8] text-white'
                        : 'text-white/60 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <Icon className="w-4.5 h-4.5 shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge ? (
                      <Badge className="bg-[#ef476f] text-white text-xs h-5 px-1.5">
                        {item.badge}
                      </Badge>
                    ) : null}
                  </button>
                )
              })}
            </nav>

            <div className="p-3 border-t border-white/10">
              <button
                onClick={() => logout()}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Terminar Sessão</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── MAIN CONTENT ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar (mobile only) */}
        <header className="lg:hidden flex items-center justify-between bg-[#0f2d5c] px-4 py-3 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-9 h-9 flex items-center justify-center text-white/80 hover:text-white rounded-lg hover:bg-white/10"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <span className="font-bold text-xs text-white">A2data</span>
              <span className="font-bold text-sm text-[#00b4d8] tracking-widest ml-0.5">POINT</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pendingHE > 0 && (
              <Badge className="bg-[#ef476f] text-white">{pendingHE} HE</Badge>
            )}
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        {/* ── BOTTOM NAV (mobile only) ─────────────────────────── */}
        <nav className="lg:hidden flex items-center bg-white border-t border-gray-200 shrink-0 safe-area-pb">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon
            const isActive = adminView === item.id
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center py-2 px-1 gap-0.5 relative',
                  isActive ? 'text-[#00b4d8]' : 'text-gray-400'
                )}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {item.badge ? (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#ef476f] rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  ) : null}
                </div>
                <span className="text-[9px] font-medium truncate w-full text-center">
                  {item.shortLabel}
                </span>
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#00b4d8] rounded-full" />
                )}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from 'react-query'
import { useAuth } from '../../contexts/AuthContext'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  CreditCard,
  UserCheck,
  Package,
  Store,
  BarChart2,
  BarChart3,
  Scale,
  Settings,
  Menu,
  LogOut,
  Wallet,
  Database,
  Coins,
  GitCompare,
  Banknote,
  Clock,
  Bell,
  ShoppingCart,
} from 'lucide-react'
import { useMyTaskCount } from '@/hooks/useTasks'

interface NavItem {
  label: string
  to: string
  icon: React.ReactNode
  end?: boolean
  badge?: React.ReactNode
}

interface NavGroup {
  title: string
  items: NavItem[]
}

function useNavGroups(): NavGroup[] {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { data: taskCount = 0 } = useMyTaskCount(user?.id)

  const taskBadge =
    taskCount > 0 ? (
      <span
        style={{
          marginLeft: 'auto',
          background: 'var(--color-danger)',
          color: '#fff',
          borderRadius: 'var(--radius-full)',
          fontSize: 10,
          fontWeight: 700,
          padding: '1px 6px',
          minWidth: 18,
          textAlign: 'center',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {taskCount > 99 ? '99+' : taskCount}
      </span>
    ) : undefined

  return [
    {
      title: 'Core',
      items: [
        {
          label: t('nav.dashboard'),
          to: '/',
          icon: <LayoutDashboard size={16} />,
          end: true,
        },
        { label: t('employees.title'), to: '/users', icon: <Users size={16} /> },
        {
          label: t('nav.tasks'),
          to: '/tasks',
          icon: <CheckSquare size={16} />,
          badge: taskBadge,
        },
        { label: t('nav.settings'), to: '/settings', icon: <Settings size={16} /> },
        { label: 'Alert Manager', to: '/settings/alerts', icon: <Bell size={16} /> },
        { label: 'POS', to: '/pos', icon: <ShoppingCart size={16} /> },
      ],
    },
    {
      title: 'Reports',
      items: [
        { label: 'Reports Hub', to: '/reports', icon: <BarChart2 size={16} /> },
        { label: 'P&L Report', to: '/reports/pl', icon: <BarChart3 size={16} /> },
        { label: 'Daily Sales Summary', to: '/reports/daily-sales', icon: <Scale size={16} /> },
        {
          label: 'Sales Reconciliation',
          to: '/reports/reconciliation',
          icon: <GitCompare size={16} />,
        },
        {
          label: 'Cash Discrepancy',
          to: '/reports/cash-discrepancy',
          icon: <Banknote size={16} />,
        },
        { label: 'Shift Cash Report', to: '/reports/shift-cash', icon: <Clock size={16} /> },
      ],
    },
    {
      title: 'Owner',
      items: [
        { label: 'Vendor Payments', to: '/owner/vendor-payments', icon: <CreditCard size={16} /> },
        {
          label: 'Post-paid Customers',
          to: '/owner/postpaid-customers',
          icon: <UserCheck size={16} />,
        },
        { label: 'Item Master', to: '/owner/item-master', icon: <Package size={16} /> },
        { label: 'Vendor Master', to: '/vendors', icon: <Store size={16} /> },
        { label: 'Expenses', to: '/owner/expenses', icon: <Wallet size={16} /> },
        { label: 'Data Entry', to: '/owner/data-entry', icon: <Database size={16} /> },
        { label: 'Supervisor Float', to: '/owner/supervisor-float', icon: <Coins size={16} /> },
      ],
    },
  ]
}

// ─── Sidebar nav item styling ────────────────────────────────────────────────

const navItemBase: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '8px 12px',
  borderRadius: 'var(--radius-md)',
  fontFamily: 'var(--font-body)',
  fontSize: '14px',
  fontWeight: 500,
  textDecoration: 'none',
  transition: 'background var(--transition-fast), color var(--transition-fast)',
  width: '100%',
  cursor: 'pointer',
  border: 'none',
  background: 'none',
  textAlign: 'left',
  position: 'relative' as const,
}

const navItemDefault: React.CSSProperties = {
  color: 'var(--gray-700)',
}

const navItemActive: React.CSSProperties = {
  background: 'var(--brand-primary-subtle)',
  color: 'var(--brand-primary)',
  fontWeight: 600,
  borderLeft: '3px solid var(--brand-primary)',
  paddingLeft: '9px', // compensate 3px left border
}

// ─── SidebarContent ──────────────────────────────────────────────────────────

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const navGroups = useNavGroups()

  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?'

  const handleLogout = async () => {
    qc.cancelQueries()
    qc.clear()
    try {
      await logout()
    } catch {
      localStorage.clear()
    } finally {
      navigate('/login')
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--brand-surface)',
      }}
    >
      {/* ── Brand header ── */}
      <div
        style={{
          padding: '20px 16px 16px',
          borderBottom: 'var(--border-default)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Logo mark */}
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #C67C4E 0%, #E07B39 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: '16px',
            }}
          >
            ☕
          </div>
          <div>
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--gray-900)',
                margin: 0,
                lineHeight: '1.2',
              }}
            >
              {t('app.name')}
            </p>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '11px',
                color: 'var(--gray-500)',
                margin: 0,
              }}
            >
              Unlimited Food Works
            </p>
          </div>
        </div>
      </div>

      {/* ── Nav groups ── */}
      <ScrollArea style={{ flex: 1, paddingTop: '8px', paddingBottom: '8px' }}>
        {navGroups.map((group) => (
          <div key={group.title} style={{ marginBottom: '8px' }}>
            {/* Group label */}
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '10px',
                fontWeight: 600,
                color: 'var(--gray-400)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                margin: '16px 20px 4px',
              }}
            >
              {group.title}
            </p>

            {/* Nav items */}
            <div style={{ padding: '0 8px' }}>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onClose}
                  style={({ isActive }) => ({
                    ...navItemBase,
                    ...(isActive ? navItemActive : navItemDefault),
                  })}
                >
                  {({ isActive }) => (
                    <>
                      <span
                        style={{
                          color: isActive ? 'var(--brand-primary)' : 'var(--gray-500)',
                          display: 'flex',
                          alignItems: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {item.icon}
                      </span>
                      {item.label}
                      {item.badge}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </ScrollArea>

      {/* ── User footer ── */}
      <div
        style={{
          borderTop: 'var(--border-default)',
          padding: 'var(--space-3)',
        }}
      >
        {/* User info row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: '8px 12px',
            marginBottom: 'var(--space-1)',
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--brand-primary-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--brand-primary)',
              }}
            >
              {initials}
            </span>
          </div>
          {/* Name + role */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--gray-900)',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user?.full_name}
            </p>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '12px',
                color: 'var(--gray-500)',
                margin: 0,
                textTransform: 'capitalize',
              }}
            >
              {user?.role}
            </p>
          </div>
        </div>

        {/* Logout button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start gap-2"
          style={{
            color: 'var(--gray-600)',
            fontFamily: 'var(--font-body)',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--color-danger)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--gray-600)'
          }}
        >
          <LogOut size={16} />
          {t('auth.logout')}
        </Button>
      </div>
    </div>
  )
}

// ─── OwnerLayout ─────────────────────────────────────────────────────────────

interface OwnerLayoutProps {
  children: React.ReactNode
}

export default function OwnerLayout({ children }: OwnerLayoutProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const { t } = useTranslation()

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--brand-bg)' }}>
      {/* ── Desktop sidebar ── */}
      <aside
        data-testid="owner-sidebar"
        style={{
          width: 'var(--sidebar-width)',
          flexShrink: 0,
          background: 'var(--brand-surface)',
          borderRight: 'var(--border-default)',
          height: '100vh',
          position: 'sticky',
          top: 0,
          flexDirection: 'column',
        }}
        className="hidden lg:flex"
      >
        <SidebarContent />
      </aside>

      {/* ── Mobile: top bar + Sheet drawer ── */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        {/* Mobile top bar — hidden on lg+ */}
        <header
          className="lg:hidden"
          style={{
            height: 'var(--header-height)',
            background: 'var(--brand-surface)',
            borderBottom: 'var(--border-default)',
            boxShadow: 'var(--shadow-xs)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 var(--space-4)',
            gap: 'var(--space-3)',
            position: 'sticky',
            top: 0,
            zIndex: 40,
          }}
        >
          {/* Hamburger */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="Open navigation"
                data-testid="sidebar-hamburger"
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--gray-700)',
                  transition: 'background var(--transition-fast)',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--gray-100)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.background = 'none'
                }}
              >
                <Menu size={20} />
              </button>
            </SheetTrigger>
            <SheetContent
              side="left"
              style={{
                width: 'var(--sidebar-width)',
                padding: 0,
              }}
            >
              <SidebarContent onClose={() => setSheetOpen(false)} />
            </SheetContent>
          </Sheet>

          {/* Center brand */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #C67C4E 0%, #E07B39 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
              }}
            >
              ☕
            </div>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--gray-900)',
              }}
            >
              {t('app.name')}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto' }}>{children}</main>
      </div>
    </div>
  )
}

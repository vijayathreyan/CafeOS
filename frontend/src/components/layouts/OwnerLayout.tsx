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
  ShoppingCart,
  Users,
  CheckSquare,
  TrendingUp,
  CalendarDays,
  Wallet,
  Receipt,
  CreditCard,
  Banknote,
  BarChart2,
  GitCompare,
  AlertTriangle,
  Clock,
  Droplets,
  TrendingDown,
  Trash2,
  PieChart,
  Bell,
  Archive,
  Package,
  Truck,
  Settings,
  BellRing,
  Menu,
  LogOut,
} from 'lucide-react'
import { useMyTaskCount } from '@/hooks/useTasks'
import { useUnacknowledgedRedCount } from '@/hooks/useCashDiscrepancy'

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

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
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
        flexShrink: 0,
      }}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

function useNavGroups(): NavGroup[] {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { data: taskCount = 0 } = useMyTaskCount(user?.id)
  const { data: discrepancyCount = 0 } = useUnacknowledgedRedCount(!!user)

  return [
    {
      title: 'Core',
      items: [
        {
          label: 'Dashboard',
          to: '/dashboard',
          icon: <LayoutDashboard size={16} />,
          end: true,
        },
        {
          label: 'POS Billing',
          to: '/pos',
          icon: <ShoppingCart size={16} />,
        },
      ],
    },
    {
      title: 'People',
      items: [
        {
          label: t('employees.title'),
          to: '/employees',
          icon: <Users size={16} />,
        },
        {
          label: t('nav.tasks'),
          to: '/tasks',
          icon: <CheckSquare size={16} />,
          badge: <CountBadge count={taskCount} />,
        },
      ],
    },
    {
      title: 'Financials',
      items: [
        { label: 'P&L Report', to: '/reports/pl', icon: <TrendingUp size={16} /> },
        {
          label: 'Daily Sales Summary',
          to: '/reports/daily-sales',
          icon: <CalendarDays size={16} />,
        },
        { label: 'Vendor Payments', to: '/vendor-payments', icon: <Wallet size={16} /> },
        { label: 'Expenses', to: '/expenses', icon: <Receipt size={16} /> },
        { label: 'Post-paid Customers', to: '/postpaid-customers', icon: <CreditCard size={16} /> },
        { label: 'Supervisor Float', to: '/supervisor-float', icon: <Banknote size={16} /> },
      ],
    },
    {
      title: 'Reports',
      items: [
        { label: 'Reports Hub', to: '/reports', icon: <BarChart2 size={16} />, end: true },
        {
          label: 'Sales Reconciliation',
          to: '/reports/reconciliation',
          icon: <GitCompare size={16} />,
        },
        {
          label: 'Cash Discrepancy',
          to: '/reports/cash-discrepancy',
          icon: <AlertTriangle size={16} />,
          badge: <CountBadge count={discrepancyCount} />,
        },
        { label: 'Shift Cash Report', to: '/reports/shift-cash', icon: <Clock size={16} /> },
        { label: 'Milk Report', to: '/reports/milk', icon: <Droplets size={16} /> },
        {
          label: 'Consumption Report',
          to: '/reports/consumption',
          icon: <TrendingDown size={16} />,
        },
        { label: 'Wastage Report', to: '/reports/wastage', icon: <Trash2 size={16} /> },
        { label: 'Expense Report', to: '/reports/expense-report', icon: <PieChart size={16} /> },
        { label: 'Alert Log', to: '/reports/alert-log', icon: <Bell size={16} /> },
        { label: 'Month End Stock', to: '/reports/month-end-stock', icon: <Archive size={16} /> },
      ],
    },
    {
      title: 'Inventory',
      items: [
        { label: 'Item Master', to: '/item-master', icon: <Package size={16} /> },
        { label: 'Vendor Master', to: '/vendor-master', icon: <Truck size={16} /> },
      ],
    },
    {
      title: 'Settings',
      items: [
        { label: 'Admin Settings', to: '/settings', icon: <Settings size={16} />, end: true },
        { label: 'Alert Manager', to: '/settings/alerts', icon: <BellRing size={16} /> },
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

  const roleLabel =
    user?.role === 'owner' ? 'Owner' : user?.role === 'supervisor' ? 'Supervisor' : 'Staff'

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
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
          <div key={group.title} style={{ marginBottom: '4px' }}>
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
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.label}
                      </span>
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
          flexShrink: 0,
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
              width: '36px',
              height: '36px',
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
            <span
              style={{
                display: 'inline-block',
                fontFamily: 'var(--font-body)',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--brand-primary)',
                background: 'var(--brand-primary-subtle)',
                borderRadius: 'var(--radius-full)',
                padding: '1px 8px',
                marginTop: '2px',
              }}
            >
              {roleLabel}
            </span>
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
          width: '240px',
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
              style={{ width: '240px', padding: 0 }}
              className="p-0 w-full sm:w-[240px]"
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

import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  BarChart3,
  Handshake,
  CheckSquare,
  Settings,
  Receipt,
  Scale,
  List,
  CreditCard,
  Banknote,
  type LucideIcon,
} from 'lucide-react'
import PageContainer from '@/components/layouts/PageContainer'
import PageHeader from '@/components/layouts/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'

interface DashCard {
  title: string
  subtitle: string
  path: string
  Icon: LucideIcon
  ready: boolean
  phase?: string
}

export default function OwnerDashboard() {
  const navigate = useNavigate()
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const cards: DashCard[] = [
    {
      title: 'Users & Employees',
      subtitle: 'Manage staff accounts',
      path: '/users',
      Icon: Users,
      ready: true,
    },
    {
      title: 'Reports',
      subtitle: 'Sales, P&L, Reconciliation',
      path: '/reports',
      Icon: BarChart3,
      ready: false,
      phase: 'Phase 7–9',
    },
    {
      title: 'Data Entry',
      subtitle: 'UPI, Swiggy, Zomato payouts',
      path: '/owner/data-entry',
      Icon: CreditCard,
      ready: true,
    },
    {
      title: 'Expenses',
      subtitle: 'Bills, maintenance, HO expenses',
      path: '/owner/expenses',
      Icon: Receipt,
      ready: true,
    },
    {
      title: 'Vasanth Float',
      subtitle: 'Supervisor cash float balance',
      path: '/owner/vasanth-float',
      Icon: Banknote,
      ready: true,
    },
    {
      title: 'Vendor Master',
      subtitle: 'Manage suppliers and items',
      path: '/vendors',
      Icon: Handshake,
      ready: true,
    },
    {
      title: 'Item Master',
      subtitle: 'Manage items across all modules',
      path: '/owner/item-master',
      Icon: List,
      ready: true,
    },
    {
      title: 'Vendor Payments',
      subtitle: 'Mon/Thu cycles and monthly payments',
      path: '/owner/vendor-payments',
      Icon: Handshake,
      ready: true,
    },
    {
      title: 'Post-Paid Customers',
      subtitle: 'Credit sales and outstanding balances',
      path: '/owner/postpaid-customers',
      Icon: CreditCard,
      ready: true,
    },
    {
      title: 'Tasks',
      subtitle: 'Assign and track tasks',
      path: '/tasks',
      Icon: CheckSquare,
      ready: true,
    },
    {
      title: 'Stock Configuration',
      subtitle: 'Weight per unit settings',
      path: '/owner/stock-config',
      Icon: Scale,
      ready: true,
    },
    {
      title: 'Admin Settings',
      subtitle: 'Configure all modules',
      path: '/settings',
      Icon: Settings,
      ready: false,
      phase: 'Phase 11',
    },
    {
      title: 'POS / Billing',
      subtitle: 'Shop billing system',
      path: '/pos',
      Icon: Receipt,
      ready: false,
      phase: 'Phase 12',
    },
  ]

  return (
    <PageContainer>
      <PageHeader title="Owner Dashboard" subtitle={`${today} · Unlimited Food Works`} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(({ title, subtitle, path, Icon, ready, phase }) => (
          <div
            key={path}
            onClick={() => ready && navigate(path)}
            style={{
              background: 'var(--brand-surface)',
              border: 'var(--border-default)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-sm)',
              padding: 'var(--space-5)',
              cursor: ready ? 'pointer' : 'default',
              opacity: ready ? 1 : 0.55,
              transition: 'all var(--transition-base)',
            }}
            onMouseEnter={
              ready
                ? (e) => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.boxShadow = 'var(--shadow-md)'
                    el.style.transform = 'translateY(-2px)'
                    el.style.borderColor = 'var(--brand-primary)'
                  }
                : undefined
            }
            onMouseLeave={
              ready
                ? (e) => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.boxShadow = 'var(--shadow-sm)'
                    el.style.transform = 'translateY(0)'
                    el.style.borderColor = 'var(--gray-200)'
                  }
                : undefined
            }
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--gray-100)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 'var(--space-3)',
              }}
            >
              <Icon size={20} style={{ color: 'var(--gray-700)' }} />
            </div>
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-base)',
                fontWeight: 'var(--font-semibold)',
                color: 'var(--gray-900)',
                margin: 0,
              }}
            >
              {title}
            </h3>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-sm)',
                color: 'var(--gray-500)',
                marginTop: 'var(--space-1)',
                marginBottom: 0,
              }}
            >
              {subtitle}
            </p>
            {!ready && phase && (
              <div style={{ marginTop: 'var(--space-2)' }}>
                <StatusBadge status="inactive" label={phase} size="sm" />
              </div>
            )}
          </div>
        ))}
      </div>
    </PageContainer>
  )
}

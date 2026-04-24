import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Milk,
  TrendingDown,
  Trash2,
  Receipt,
  BarChart3,
  Scale,
  type LucideIcon,
} from 'lucide-react'
import PageContainer from '@/components/layouts/PageContainer'
import PageHeader from '@/components/layouts/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'

interface ReportCard {
  title: string
  subtitle: string
  path: string
  Icon: LucideIcon
  ready: boolean
  phase?: string
}

const REPORT_CARDS: ReportCard[] = [
  {
    title: 'Month End Stock',
    subtitle: 'Closing stock submissions and history',
    path: '/owner/reports/month-end-stock',
    Icon: BookOpen,
    ready: true,
  },
  {
    title: 'Milk Report',
    subtitle: 'Daily coffee and tea milk consumption',
    path: '/owner/reports/milk',
    Icon: Milk,
    ready: true,
  },
  {
    title: 'Consumption Report',
    subtitle: 'Stock usage per item per day',
    path: '/owner/reports/consumption',
    Icon: TrendingDown,
    ready: true,
  },
  {
    title: 'Wastage Report',
    subtitle: 'Snack wastage and complimentary by item',
    path: '/owner/reports/wastage',
    Icon: Trash2,
    ready: true,
  },
  {
    title: 'Expense Report',
    subtitle: 'Daily cash expenses by category',
    path: '/owner/reports/expenses',
    Icon: Receipt,
    ready: true,
  },
  {
    title: 'Monthly P&L',
    subtitle: 'Fully automated profit and loss statement',
    path: '/owner/reports/pl',
    Icon: BarChart3,
    ready: false,
    phase: 'Phase 8',
  },
  {
    title: 'Daily Sales Summary',
    subtitle: 'Cash, UPI, delivery and reconciliation',
    path: '/owner/reports/daily-sales',
    Icon: Scale,
    ready: false,
    phase: 'Phase 8',
  },
]

export default function ReportsHub() {
  const navigate = useNavigate()

  return (
    <PageContainer>
      <PageHeader
        title="Reports"
        subtitle="Operational and financial reports — Unlimited Food Works"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORT_CARDS.map(({ title, subtitle, path, Icon, ready, phase }) => (
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
                background: ready ? 'var(--brand-primary-subtle)' : 'var(--gray-100)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 'var(--space-3)',
              }}
            >
              <Icon
                size={20}
                style={{ color: ready ? 'var(--brand-primary)' : 'var(--gray-500)' }}
              />
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

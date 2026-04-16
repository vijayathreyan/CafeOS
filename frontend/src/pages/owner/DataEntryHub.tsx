import React from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, Truck, Users } from 'lucide-react'
import PageContainer from '@/components/layouts/PageContainer'
import PageHeader from '@/components/layouts/PageHeader'

const tiles = [
  {
    title: 'UPI Entry',
    subtitle: 'Weekly PhonePe / GPay / Paytm totals',
    path: '/owner/upi-entry',
    Icon: CreditCard,
  },
  {
    title: 'Delivery Payouts',
    subtitle: 'Swiggy & Zomato payout entries',
    path: '/owner/delivery-payouts',
    Icon: Truck,
  },
  {
    title: 'Salary Entry',
    subtitle: 'Monthly staff salary for P&L',
    path: '/owner/salary-entry',
    Icon: Users,
  },
]

export default function DataEntryHub() {
  const navigate = useNavigate()

  return (
    <PageContainer data-testid="data-entry-hub">
      <PageHeader title="Data Entry" subtitle="UPI, Swiggy, Zomato payouts" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {tiles.map(({ title, subtitle, path, Icon }) => (
          <div
            key={path}
            onClick={() => navigate(path)}
            data-testid={`tile-${title.toLowerCase().replace(/\s+/g, '-')}`}
            style={{
              background: 'var(--brand-surface)',
              border: 'var(--border-default)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-sm)',
              padding: 'var(--space-5)',
              cursor: 'pointer',
              transition: 'all var(--transition-base)',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLDivElement
              el.style.boxShadow = 'var(--shadow-md)'
              el.style.transform = 'translateY(-2px)'
              el.style.borderColor = 'var(--brand-primary)'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLDivElement
              el.style.boxShadow = 'var(--shadow-sm)'
              el.style.transform = 'translateY(0)'
              el.style.borderColor = 'var(--gray-200)'
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--brand-primary-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 'var(--space-3)',
              }}
            >
              <Icon size={24} style={{ color: 'var(--brand-primary)' }} />
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
          </div>
        ))}
      </div>
    </PageContainer>
  )
}

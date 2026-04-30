import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Receipt, Eye, Banknote } from 'lucide-react'
import PageContainer from '@/components/layouts/PageContainer'
import PageHeader from '@/components/layouts/PageHeader'
import SectionCard from '@/components/ui/SectionCard'

const tiles = [
  {
    title: 'View HO Expenses',
    subtitle: "Supervisor's bill-wise expense submissions",
    path: '/owner/ho-expenses',
    Icon: Eye,
  },
  {
    title: 'Manual Expenses',
    subtitle: 'Bills, maintenance, capital purchases',
    path: '/owner/manual-expenses',
    Icon: Receipt,
  },
  {
    title: 'Cash Deposits',
    subtitle: 'Full history of all bank deposits',
    path: '/owner/deposits',
    Icon: Banknote,
  },
]

export default function OwnerExpensesHub() {
  const navigate = useNavigate()

  return (
    <PageContainer data-testid="expenses-hub">
      <PageHeader title="Expenses" subtitle="Bills, maintenance, HO expenses" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {tiles.map(({ title, subtitle, path, Icon }) => (
          <SectionCard
            key={path}
            onClick={() => navigate(path)}
            hoverable
            className="cursor-pointer"
            data-testid={`tile-${title.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-warning-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 'var(--space-3)',
              }}
            >
              <Icon size={24} style={{ color: 'var(--color-warning)' }} />
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
          </SectionCard>
        ))}
      </div>
    </PageContainer>
  )
}

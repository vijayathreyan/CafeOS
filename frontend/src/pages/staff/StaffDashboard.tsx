import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Package, Wallet, ClipboardList, Phone } from 'lucide-react'
import PageContainer from '@/components/layouts/PageContainer'
import PageHeader from '@/components/layouts/PageHeader'
import SectionCard from '@/components/ui/SectionCard'

export default function StaffDashboard() {
  const { t } = useTranslation()
  const { user, activeBranch } = useAuth()
  const navigate = useNavigate()
  const branch = activeBranch || user?.branch_access[0]
  const firstName = user?.full_name?.split(' ')[0]
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <PageContainer>
      <PageHeader
        title={`Good morning, ${firstName}`}
        subtitle={`${today}${branch ? ` · ${t(`branch.${branch}`)}` : ''}`}
      />

      {/* Today's Shift CTA */}
      <SectionCard className="mb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--font-semibold)',
                color: 'var(--gray-900)',
                margin: 0,
              }}
            >
              Today&apos;s Shift
            </h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)', marginTop: '2px' }}>
              Fill in your shift details
            </p>
          </div>
          <Button
            onClick={() => navigate('/shift')}
            className="w-full sm:w-auto"
            style={{ gap: '6px' }}
          >
            <ClipboardList size={16} />
            Open Shift
          </Button>
        </div>
      </SectionCard>

      {/* Quick actions grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <SectionCard
          padding="compact"
          hoverable
          onClick={() => navigate('/stock-entry')}
          className="cursor-pointer"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--brand-primary-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Package size={20} style={{ color: 'var(--brand-primary)' }} />
            </div>
            <div>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontWeight: 500,
                  fontSize: 'var(--text-sm)',
                  color: 'var(--gray-900)',
                  margin: 0,
                }}
              >
                Stock Levels
              </p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)' }}>
                Enter today&apos;s stock
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          padding="compact"
          hoverable
          onClick={() => navigate('/expense-entry')}
          className="cursor-pointer"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-success-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Wallet size={20} style={{ color: 'var(--color-success)' }} />
            </div>
            <div>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontWeight: 500,
                  fontSize: 'var(--text-sm)',
                  color: 'var(--gray-900)',
                  margin: 0,
                }}
              >
                Cash Expenses
              </p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)' }}>
                Record today&apos;s expenses
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Service contacts */}
      <SectionCard title="Service Contacts">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[
            { label: 'Gas (Anand)', phone: '9942082233' },
            { label: 'Coffee Machine Repair', phone: null },
            { label: 'Electrician', phone: null },
          ].map(({ label, phone }) => (
            <div
              key={label}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-700)' }}>{label}</span>
              {phone ? (
                <a
                  href={`tel:${phone}`}
                  style={{
                    fontSize: 'var(--text-sm)',
                    fontWeight: 500,
                    color: 'var(--brand-primary)',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Phone size={12} />
                  {phone}
                </a>
              ) : (
                <span
                  style={{
                    fontSize: 'var(--text-sm)',
                    color: 'var(--gray-400)',
                    fontStyle: 'italic',
                  }}
                >
                  Contact Owner
                </span>
              )}
            </div>
          ))}
        </div>
      </SectionCard>
    </PageContainer>
  )
}

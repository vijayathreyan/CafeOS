import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useAlertLog } from '@/hooks/useAlertLog'
import PageContainer from '@/components/layouts/PageContainer'
import PageHeader from '@/components/layouts/PageHeader'
import SectionCard from '@/components/ui/SectionCard'
import { TableSkeleton } from '@/components/ui/LoadingSkeletons'
import EmptyState from '@/components/ui/EmptyState'
import { Bell } from 'lucide-react'

const STATUS_COLOR: Record<string, string> = {
  sent: 'var(--color-success)',
  failed: 'var(--color-danger)',
  pending: 'var(--color-warning)',
}

export default function AlertLogReport() {
  const { user } = useAuth()
  const today = new Date().toISOString().slice(0, 10)
  const thirtyDaysAgo = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
  })()

  const [fromDate, setFromDate] = useState(thirtyDaysAgo)
  const [toDate, setToDate] = useState(today)

  const { data: logs, isLoading, error, refetch } = useAlertLog(!!user, fromDate, toDate)

  return (
    <PageContainer>
      <PageHeader title="Alert Log" subtitle="WhatsApp alert delivery history" />

      {/* Filters */}
      <SectionCard title="Filters" padding="compact">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                color: 'var(--gray-600)',
                display: 'block',
                marginBottom: 4,
              }}
            >
              From
            </label>
            <input
              type="date"
              value={fromDate}
              max={toDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                border: 'var(--border-default)',
                borderRadius: 'var(--radius-md)',
                padding: '6px 10px',
                color: 'var(--gray-700)',
                background: 'var(--brand-surface)',
              }}
            />
          </div>
          <div>
            <label
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                color: 'var(--gray-600)',
                display: 'block',
                marginBottom: 4,
              }}
            >
              To
            </label>
            <input
              type="date"
              value={toDate}
              min={fromDate}
              max={today}
              onChange={(e) => setToDate(e.target.value)}
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                border: 'var(--border-default)',
                borderRadius: 'var(--radius-md)',
                padding: '6px 10px',
                color: 'var(--gray-700)',
                background: 'var(--brand-surface)',
              }}
            />
          </div>
        </div>
      </SectionCard>

      {/* Table */}
      <div style={{ marginTop: 'var(--space-4)' }}>
        {isLoading ? (
          <TableSkeleton cols={5} />
        ) : error ? (
          <SectionCard>
            <p
              style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-danger)' }}
            >
              Could not load alert log.{' '}
              <button
                onClick={() => refetch()}
                style={{
                  color: 'var(--brand-primary)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                }}
              >
                Retry
              </button>
            </p>
          </SectionCard>
        ) : !logs?.length ? (
          <EmptyState
            icon={Bell}
            title="No alerts found"
            description="No WhatsApp alerts were sent in this date range."
          />
        ) : (
          <SectionCard padding="none">
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr
                    style={{ borderBottom: 'var(--border-strong)', background: 'var(--gray-50)' }}
                  >
                    {['Date & Time', 'Trigger', 'Recipient', 'Message', 'Status'].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '10px 16px',
                          textAlign: 'left',
                          fontWeight: 600,
                          color: 'var(--gray-700)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, idx) => (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: 'var(--border-default)',
                        background: idx % 2 === 0 ? 'transparent' : 'var(--gray-50)',
                      }}
                    >
                      <td
                        style={{
                          padding: '10px 16px',
                          whiteSpace: 'nowrap',
                          color: 'var(--gray-600)',
                        }}
                      >
                        {new Date(log.created_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <code
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 11,
                            background: 'var(--gray-100)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '2px 6px',
                            color: 'var(--gray-700)',
                          }}
                        >
                          {log.trigger_event}
                        </code>
                      </td>
                      <td
                        style={{
                          padding: '10px 16px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: 12,
                          color: 'var(--gray-600)',
                        }}
                      >
                        {log.recipient_phone ?? '—'}
                      </td>
                      <td
                        style={{
                          padding: '10px 16px',
                          maxWidth: 260,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: 'var(--gray-700)',
                        }}
                        title={log.message_sent ?? undefined}
                      >
                        {log.message_sent ?? '—'}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: 11,
                            fontWeight: 600,
                            color: STATUS_COLOR[log.delivery_status] ?? 'var(--gray-500)',
                            background:
                              log.delivery_status === 'sent'
                                ? 'rgba(52,168,83,0.1)'
                                : log.delivery_status === 'failed'
                                  ? 'rgba(217,48,37,0.1)'
                                  : 'rgba(242,153,0,0.12)',
                            borderRadius: 'var(--radius-full)',
                            padding: '2px 8px',
                            textTransform: 'capitalize',
                          }}
                        >
                          {log.delivery_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}
      </div>
    </PageContainer>
  )
}

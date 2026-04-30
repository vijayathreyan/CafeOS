import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { ArrowLeft, AlertTriangle, FileSearch } from 'lucide-react'
import PageContainer from '@/components/layouts/PageContainer'
import PageHeader from '@/components/layouts/PageHeader'
import SectionCard from '@/components/ui/SectionCard'
import KPICard from '@/components/ui/KPICard'
import StatusBadge from '@/components/ui/StatusBadge'
import AmountDisplay from '@/components/ui/AmountDisplay'
import { TableSkeleton } from '@/components/ui/LoadingSkeletons'
import EmptyState from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import {
  useCashDiscrepancy,
  useAcknowledgeDiscrepancy,
  useUnacknowledgedRedCount,
} from '@/hooks/useCashDiscrepancy'
import type { AlertLevel } from '@/types/phase9'
import { fmtRs, fmtDate } from '@/types/phase9'
import { useToast } from '@/hooks/use-toast'

function alertStatusProps(level: AlertLevel): {
  status: 'success' | 'warning' | 'danger'
  label: string
} {
  switch (level) {
    case 'green':
      return { status: 'success', label: 'OK' }
    case 'amber':
      return { status: 'warning', label: 'Review' }
    case 'red':
      return { status: 'danger', label: 'Alert' }
  }
}

const tdStyle: React.CSSProperties = {
  padding: '11px 14px',
  fontFamily: 'var(--font-body)',
  fontSize: '13px',
  color: 'var(--gray-800)',
  verticalAlign: 'middle',
  borderBottom: 'var(--border-default)',
}

const thStyle: React.CSSProperties = {
  padding: '10px 14px',
  fontFamily: 'var(--font-body)',
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--gray-600)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  background: 'var(--gray-50)',
  borderBottom: 'var(--border-strong)',
  textAlign: 'left',
}

export default function CashDiscrepancyReport() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [branch, setBranch] = useState<'KR' | 'C2' | 'all'>('all')
  const [staffFilter, setStaffFilter] = useState('')

  // Default: current month
  const now = new Date()
  const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const defaultTo = now.toISOString().slice(0, 10)
  const [fromDate, setFromDate] = useState(defaultFrom)
  const [toDate, setToDate] = useState(defaultTo)

  const { data: records = [], isLoading } = useCashDiscrepancy(branch, fromDate, toDate, !!user)
  const { data: unackedCount = 0 } = useUnacknowledgedRedCount(!!user)
  const acknowledge = useAcknowledgeDiscrepancy()

  if (user?.role !== 'owner') {
    navigate('/dashboard')
    return null
  }

  const filtered = staffFilter
    ? records.filter((r) => r.staff_name?.toLowerCase().includes(staffFilter.toLowerCase()))
    : records

  const staffNames = [...new Set(records.map((r) => r.staff_name).filter(Boolean))] as string[]

  const totalShort = filtered
    .filter((r) => r.difference < 0)
    .reduce((s, r) => s + Math.abs(r.difference), 0)
  const totalOver = filtered.filter((r) => r.difference > 0).reduce((s, r) => s + r.difference, 0)
  const netVariance = totalOver - totalShort
  const unackedFlags = filtered.filter((r) => r.alert_level === 'red' && !r.acknowledged).length

  // Chart data — discrepancy per staff
  const staffChartData = staffNames.map((name) => {
    const staffRecs = filtered.filter((r) => r.staff_name === name)
    const total = staffRecs.reduce((s, r) => s + r.difference, 0)
    return { name, discrepancy: total }
  })

  const handleAcknowledge = async (id: string) => {
    try {
      await acknowledge.mutateAsync({ id, acknowledgedBy: user!.full_name })
      toast({ title: 'Acknowledged', description: 'Discrepancy marked as acknowledged.' })
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed',
        variant: 'destructive',
      })
    }
  }

  return (
    <PageContainer data-testid="cash-discrepancy-page">
      <PageHeader
        title="Cash Discrepancy Report"
        subtitle="Shift cash shortages and overages — POS data from Phase 12"
        action={
          <Button variant="outline" size="sm" onClick={() => navigate('/reports')}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Reports
          </Button>
        }
      />

      {unackedCount > 0 && (
        <SectionCard status="danger" className="mb-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <p style={{ fontSize: 14, color: 'var(--color-danger)', fontWeight: 500 }}>
              {unackedCount} unacknowledged red flag{unackedCount !== 1 ? 's' : ''} require your
              attention.
            </p>
          </div>
        </SectionCard>
      )}

      {/* Controls */}
      <SectionCard className="mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Branch selector */}
          <div className="flex gap-2" data-testid="branch-selector">
            {(['all', 'KR', 'C2'] as const).map((b) => (
              <button
                key={b}
                onClick={() => setBranch(b)}
                data-testid={`branch-${b.toLowerCase()}`}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: 'var(--border-default)',
                  background: branch === b ? 'var(--brand-primary)' : 'transparent',
                  color: branch === b ? '#fff' : 'var(--gray-700)',
                  fontWeight: 500,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {b === 'all' ? 'All Branches' : b === 'KR' ? 'Kaappi Ready' : 'Coffee Mate C2'}
              </button>
            ))}
          </div>

          {/* Date range */}
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              data-testid="from-date"
              style={{
                padding: '6px 10px',
                borderRadius: 'var(--radius-md)',
                border: 'var(--border-default)',
                fontSize: 13,
              }}
            />
            <span style={{ color: 'var(--gray-400)', fontSize: 13 }}>to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              data-testid="to-date"
              style={{
                padding: '6px 10px',
                borderRadius: 'var(--radius-md)',
                border: 'var(--border-default)',
                fontSize: 13,
              }}
            />
          </div>

          {/* Staff filter */}
          {staffNames.length > 0 && (
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              data-testid="staff-filter"
              style={{
                padding: '6px 10px',
                borderRadius: 'var(--radius-md)',
                border: 'var(--border-default)',
                fontSize: 13,
                background: 'white',
              }}
            >
              <option value="">All Staff</option>
              {staffNames.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          )}
        </div>
      </SectionCard>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KPICard title="Total Short" value={fmtRs(totalShort)} status="danger" />
        <KPICard title="Total Over" value={fmtRs(totalOver)} status="success" />
        <KPICard
          title="Net Variance"
          value={`${netVariance >= 0 ? '+' : ''}${fmtRs(netVariance)}`}
          status={Math.abs(netVariance) > 200 ? 'warning' : 'none'}
        />
        <KPICard
          title="Unacknowledged Flags"
          value={String(unackedFlags)}
          status={unackedFlags > 0 ? 'danger' : 'none'}
          data-testid="unacked-badge"
        />
      </div>

      {/* Data table */}
      <SectionCard title="Discrepancy Records" className="mb-4">
        {isLoading ? (
          <TableSkeleton cols={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FileSearch}
            title="No discrepancy records"
            description="Cash discrepancy data will be available after POS goes live in Phase 12."
          />
        ) : (
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {[
                    'Date',
                    'Shift',
                    'Staff',
                    'Expected',
                    'Declared',
                    'Difference',
                    'Alert',
                    'Acknowledged',
                  ].map((h) => (
                    <th key={h} style={thStyle}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const { status, label } = alertStatusProps(r.alert_level)
                  return (
                    <tr key={r.id}>
                      <td style={tdStyle}>{r.shift_date ? fmtDate(r.shift_date) : '—'}</td>
                      <td style={tdStyle}>Shift {r.shift_number}</td>
                      <td style={tdStyle}>{r.staff_name ?? '—'}</td>
                      <td style={tdStyle}>
                        {r.expected_cash != null ? (
                          <AmountDisplay amount={r.expected_cash} size="sm" />
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={tdStyle}>
                        <AmountDisplay amount={r.declared_cash} size="sm" />
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          color:
                            r.difference < 0
                              ? 'var(--color-danger)'
                              : r.difference > 0
                                ? 'var(--color-success)'
                                : 'var(--gray-600)',
                          fontWeight: 500,
                        }}
                      >
                        {r.difference > 0 ? '+' : ''}
                        {fmtRs(r.difference)}
                      </td>
                      <td style={tdStyle}>
                        <StatusBadge status={status} label={label} size="sm" />
                      </td>
                      <td style={tdStyle}>
                        {r.acknowledged ? (
                          <span style={{ color: 'var(--color-success)', fontSize: 12 }}>
                            ✓ {r.acknowledged_by ?? 'Owner'}
                          </span>
                        ) : r.alert_level === 'red' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAcknowledge(r.id)}
                            disabled={acknowledge.isLoading}
                            data-testid={`acknowledge-btn-${r.id}`}
                          >
                            Acknowledge
                          </Button>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Staff discrepancy chart */}
      {staffChartData.length > 0 && (
        <SectionCard title="Discrepancy by Staff" className="mb-4" data-testid="staff-chart">
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={staffChartData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Tooltip formatter={(v: any) => fmtRs(Number(v))} />
                <Bar dataKey="discrepancy" radius={[4, 4, 0, 0]}>
                  {staffChartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.discrepancy >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      )}
    </PageContainer>
  )
}

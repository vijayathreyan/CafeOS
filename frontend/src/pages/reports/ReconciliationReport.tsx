import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { ArrowLeft, Play, ChevronDown, ChevronRight, FileSearch } from 'lucide-react'
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
import { useReconciliationResults, useRunBatchReconciliation } from '@/hooks/useReconciliation'
import type { ReconciliationResult, ReconciliationStatus } from '@/types/phase9'
import { fmtRs, fmtDate } from '@/types/phase9'
import { useToast } from '@/hooks/use-toast'

// ─── Status badge mapping ─────────────────────────────────────────────────────

function statusProps(s: ReconciliationStatus): {
  status: 'success' | 'warning' | 'danger' | 'inactive'
  label: string
} {
  switch (s) {
    case 'reconciled':
      return { status: 'success', label: 'Reconciled' }
    case 'amber':
      return { status: 'warning', label: 'Investigate' }
    case 'red':
      return { status: 'danger', label: 'Urgent' }
    default:
      return { status: 'inactive', label: 'Pending' }
  }
}

// ─── Drill-down row ───────────────────────────────────────────────────────────

function DrillDownRow({ result }: { result: ReconciliationResult }) {
  const [open, setOpen] = useState(false)
  const { status, label } = statusProps(result.status)
  const breakdown = result.item_breakdown ?? []

  return (
    <>
      <tr
        style={{ borderBottom: 'var(--border-default)', cursor: 'pointer' }}
        onClick={() => setOpen((v) => !v)}
      >
        <td style={tdStyle}>{fmtDate(result.entry_date)}</td>
        <td style={{ ...tdStyle, textAlign: 'right' }}>
          <AmountDisplay amount={result.predicted_sales} size="sm" />
        </td>
        <td style={{ ...tdStyle, textAlign: 'right' }}>
          <AmountDisplay amount={result.reported_sales} size="sm" />
        </td>
        <td
          style={{
            ...tdStyle,
            textAlign: 'right',
            color:
              result.difference > 0
                ? 'var(--color-success)'
                : result.difference < 0
                  ? 'var(--color-danger)'
                  : 'var(--gray-600)',
          }}
        >
          {result.difference > 0 ? '+' : ''}
          {fmtRs(result.difference)}
        </td>
        <td style={tdStyle}>
          <StatusBadge status={status} label={label} size="sm" />
          {result.status === 'pending' && (
            <span
              title="UPI not yet entered"
              style={{ marginLeft: 4, fontSize: 11, color: 'var(--gray-400)' }}
            >
              (UPI pending)
            </span>
          )}
        </td>
        <td style={{ ...tdStyle, textAlign: 'center' }}>
          {breakdown.length > 0 ? (
            open ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )
          ) : (
            '—'
          )}
        </td>
      </tr>
      {open && breakdown.length > 0 && (
        <tr>
          <td colSpan={6} style={{ padding: '0 16px 12px', background: 'var(--gray-50)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {['Item', 'Method', 'Qty', 'Revenue'].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left',
                        padding: '6px 8px',
                        color: 'var(--gray-500)',
                        fontWeight: 600,
                        fontSize: 11,
                        textTransform: 'uppercase',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {breakdown.map((p, i) => (
                  <tr key={i}>
                    <td style={{ padding: '4px 8px', color: 'var(--gray-800)' }}>{p.itemName}</td>
                    <td
                      style={{ padding: '4px 8px', color: 'var(--gray-500)', fontStyle: 'italic' }}
                    >
                      {p.method}
                    </td>
                    <td style={{ padding: '4px 8px', color: 'var(--gray-700)' }}>
                      {p.predictedQty}
                    </td>
                    <td style={{ padding: '4px 8px' }}>
                      <AmountDisplay amount={p.predictedRevenue} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  )
}

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontFamily: 'var(--font-body)',
  fontSize: '13px',
  color: 'var(--gray-800)',
  verticalAlign: 'middle',
}

const thStyle: React.CSSProperties = {
  padding: '10px 16px',
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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReconciliationReport() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [branch, setBranch] = useState<'KR' | 'C2'>('KR')
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))

  const { data: results = [], isLoading } = useReconciliationResults(branch, month, !!user)
  const runBatch = useRunBatchReconciliation()

  if (user?.role !== 'owner') {
    navigate('/dashboard')
    return null
  }

  const totalPredicted = results.reduce((s, r) => s + Number(r.predicted_sales), 0)
  const totalReported = results.reduce((s, r) => s + Number(r.reported_sales), 0)
  const totalGap = totalPredicted - totalReported
  const daysFlagged = results.filter((r) => r.status === 'amber' || r.status === 'red').length

  const chartData = results.map((r) => ({
    date: fmtDate(r.entry_date),
    Predicted: Number(r.predicted_sales),
    Reported: Number(r.reported_sales),
  }))

  const handleRunReconciliation = async () => {
    try {
      await runBatch.mutateAsync({ branch, month })
      toast({ title: 'Reconciliation complete', description: `${branch} — ${month}` })
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed',
        variant: 'destructive',
      })
    }
  }

  return (
    <PageContainer data-testid="reconciliation-page">
      <PageHeader
        title="Sales Reconciliation"
        subtitle="Predicted vs reported sales — all 10 prediction methods"
        action={
          <div className="flex gap-2 items-center">
            <Button variant="outline" size="sm" onClick={() => navigate('/reports')}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Reports
            </Button>
            <Button
              onClick={handleRunReconciliation}
              disabled={runBatch.isLoading}
              data-testid="run-reconciliation-btn"
            >
              <Play className="w-4 h-4 mr-1.5" />
              {runBatch.isLoading ? 'Running…' : 'Run Reconciliation'}
            </Button>
          </div>
        }
      />

      {/* Controls */}
      <SectionCard className="mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Branch selector */}
          <div className="flex gap-2" data-testid="branch-selector">
            {(['KR', 'C2'] as const).map((b) => (
              <button
                key={b}
                onClick={() => setBranch(b)}
                data-testid={`branch-${b.toLowerCase()}`}
                style={{
                  padding: '6px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: 'var(--border-default)',
                  background: branch === b ? 'var(--brand-primary)' : 'transparent',
                  color: branch === b ? '#fff' : 'var(--gray-700)',
                  fontWeight: 500,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {b === 'KR' ? 'Kaappi Ready' : 'Coffee Mate C2'}
              </button>
            ))}
          </div>

          {/* Month picker */}
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            data-testid="month-picker"
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius-md)',
              border: 'var(--border-default)',
              fontSize: 13,
              color: 'var(--gray-800)',
              background: 'white',
            }}
          />
        </div>
      </SectionCard>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4" data-testid="kpi-row">
        <KPICard title="Total Predicted" value={fmtRs(totalPredicted)} status="info" />
        <KPICard title="Total Reported" value={fmtRs(totalReported)} status="success" />
        <KPICard
          title="Total Gap"
          value={fmtRs(Math.abs(totalGap))}
          status={
            Math.abs(totalGap) > 500 ? 'danger' : Math.abs(totalGap) > 200 ? 'warning' : 'none'
          }
        />
        <KPICard
          title="Days Flagged"
          value={String(daysFlagged)}
          status={daysFlagged > 0 ? 'warning' : 'none'}
        />
      </div>

      {/* Data table */}
      <SectionCard title="Daily Reconciliation" className="mb-4">
        {isLoading ? (
          <TableSkeleton cols={6} />
        ) : results.length === 0 ? (
          <EmptyState
            icon={FileSearch}
            title="No reconciliation data"
            description="Click 'Run Reconciliation' to calculate for this month."
          />
        ) : (
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Date', 'Predicted Sales', 'Reported Sales', 'Difference', 'Status', ''].map(
                    (h) => (
                      <th
                        key={h}
                        style={{
                          ...thStyle,
                          textAlign: h === 'Date' || h === '' || h === 'Status' ? 'left' : 'right',
                        }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <DrillDownRow key={r.entry_date} result={r} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Trend chart */}
      {chartData.length > 0 && (
        <SectionCard
          title="Monthly Trend — Predicted vs Reported"
          className="mb-4"
          data-testid="trend-chart"
        >
          <div className="recharts-wrapper" style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: 'var(--gray-500)' }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 11, fill: 'var(--gray-500)' }} />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => fmtRs(Number(value))}
                  contentStyle={{ fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="Predicted"
                  stroke="var(--brand-primary)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="Reported"
                  stroke="var(--color-success)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      )}
    </PageContainer>
  )
}

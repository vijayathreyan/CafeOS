import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { checkScheduledAlerts } from '../../lib/scheduledAlerts'
import {
  BarChart,
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts'
import { AlertTriangle, Clock, RefreshCw, CheckCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import PageContainer from '@/components/layouts/PageContainer'
import PageHeader from '@/components/layouts/PageHeader'
import SectionCard from '@/components/ui/SectionCard'
import KPICard from '@/components/ui/KPICard'
import AmountDisplay from '@/components/ui/AmountDisplay'
import { Button } from '@/components/ui/button'
import { useDashboardLiveTotals } from '@/hooks/useDashboardLiveTotals'
import { useBranchOperationsStatus } from '@/hooks/useBranchOperationsStatus'
import { useIntradaySales } from '@/hooks/useIntradaySales'
import { useWeeklySalesTrend } from '@/hooks/useWeeklySalesTrend'
import { useActiveAlerts, useAcknowledgeAlert } from '@/hooks/useActiveAlerts'
import { useTopItemsThisWeek } from '@/hooks/useTopItemsThisWeek'
import { useVendorPaymentsDue } from '@/hooks/useVendorPaymentsDue'
import { useTasks } from '@/hooks/useTasks'
import { usePostPaidBalances } from '@/hooks/usePostPaidCustomers'
import { useReconciliationResults } from '@/hooks/useReconciliation'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function getMondayOfCurrentWeek(): string {
  const today = new Date()
  const dayOfWeek = (today.getDay() + 6) % 7
  const monday = new Date(today)
  monday.setDate(today.getDate() - dayOfWeek)
  return monday.toISOString().slice(0, 10)
}

function minutesAgo(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 60000)
}

function fmtTime(isoStr: string | null): string {
  if (!isoStr) return '—'
  return new Date(isoStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

function fmtRs(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

// ─── Loading skeleton for each section ───────────────────────────────────────

function SectionSkeleton({ height = 120 }: { height?: number }) {
  return (
    <div
      style={{
        background: 'var(--brand-surface)',
        border: 'var(--border-default)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-sm)',
        padding: 'var(--space-4)',
        height,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-3 w-64" />
    </div>
  )
}

function SectionError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <SectionCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <AlertTriangle size={16} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            color: 'var(--gray-600)',
            flex: 1,
          }}
        >
          {message}
        </span>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw size={12} style={{ marginRight: 4 }} /> Retry
          </Button>
        )}
      </div>
    </SectionCard>
  )
}

// ─── Section A — Live Today Strip ─────────────────────────────────────────────

function BranchLiveCard({ branch, date }: { branch: 'KR' | 'C2'; date: string }) {
  const { data, isLoading, error, refetch } = useDashboardLiveTotals(branch, date)
  const branchColor = branch === 'KR' ? '#1A73E8' : '#34A853'
  const branchBg = branch === 'KR' ? '#E8F0FE' : '#E6F4EA'
  const branchLabel = branch === 'KR' ? 'Kaappi Ready' : 'Coffee Mate C2'

  if (isLoading) return <SectionSkeleton height={200} />
  if (error)
    return (
      <SectionError message={`Could not load ${branchLabel} live data`} onRetry={() => refetch()} />
    )
  if (!data) return null

  const lastBillMins = data.lastBillTime ? minutesAgo(data.lastBillTime) : null
  const lastBillColor =
    lastBillMins === null
      ? 'var(--gray-500)'
      : lastBillMins < 30
        ? 'var(--color-success)'
        : lastBillMins < 60
          ? 'var(--color-warning)'
          : 'var(--color-danger)'

  return (
    <div
      data-testid={`live-card-${branch.toLowerCase()}`}
      style={{
        background: 'var(--brand-surface)',
        border: 'var(--border-default)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-sm)',
        padding: 'var(--space-4)',
        borderTop: `3px solid ${branchColor}`,
      }}
    >
      {/* Branch chip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: branchBg,
            color: branchColor,
            borderRadius: 'var(--radius-full)',
            padding: '2px 10px',
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {branch}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            color: data.isShiftOpen ? 'var(--color-success)' : 'var(--color-danger)',
            fontWeight: 500,
          }}
        >
          {data.isShiftOpen ? `Shift open since ${fmtTime(data.shiftOpenSince)}` : 'No shift open'}
        </span>
      </div>

      {/* Total sales */}
      <div style={{ marginBottom: 10 }}>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--gray-600)',
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            margin: '0 0 4px',
          }}
        >
          Total Sales Today
        </p>
        <AmountDisplay amount={data.totalSales} size="xl" />
      </div>

      {/* Payment mode breakdown */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
        {[
          { label: 'Cash', value: data.cashTotal },
          { label: 'UPI', value: data.upiTotal },
          { label: 'Post-paid', value: data.postpaidTotal },
          { label: 'Delivery', value: data.deliveryTotal },
        ].map(({ label, value }) => (
          <div key={label} style={{ minWidth: 64 }}>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 11,
                color: 'var(--gray-500)',
                margin: '0 0 2px',
              }}
            >
              {label}
            </p>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--gray-800)',
                margin: 0,
              }}
            >
              ₹{fmtRs(value)}
            </p>
          </div>
        ))}
      </div>

      {/* Bills count + last bill */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--gray-600)' }}>
          {data.billCount} bill{data.billCount !== 1 ? 's' : ''} today
        </span>
        {lastBillMins !== null && (
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              color: lastBillColor,
              fontWeight: 500,
            }}
          >
            Last bill {lastBillMins} min ago
          </span>
        )}
      </div>
    </div>
  )
}

function SectionA({ date }: { date: string }) {
  return (
    <div data-testid="section-live-today">
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 16,
          fontWeight: 600,
          color: 'var(--gray-900)',
          margin: '0 0 12px',
        }}
      >
        Live Today
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <BranchLiveCard branch="KR" date={date} />
        <BranchLiveCard branch="C2" date={date} />
      </div>
    </div>
  )
}

// ─── Section B — Money at a Glance ───────────────────────────────────────────

function TodayVsLastWeekChart({ date }: { date: string }) {
  const weekStart = getMondayOfCurrentWeek()
  const { data, isLoading, error } = useWeeklySalesTrend(weekStart)

  if (isLoading) return <Skeleton className="h-32 w-full" />
  if (error)
    return <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>Chart unavailable</span>

  const today = data?.find((d) => d.date === date)
  const chartData = [
    {
      name: 'KR',
      'Last Week': today?.kr_prev ?? 0,
      Today: today?.kr_total ?? 0,
    },
    {
      name: 'C2',
      'Last Week': today?.c2_prev ?? 0,
      Today: today?.c2_total ?? 0,
    },
  ]

  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={chartData} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis
          tick={{ fontSize: 11 }}
          width={50}
          tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
        />
        <Tooltip formatter={(v) => [`₹${fmtRs(Number(v))}`, undefined]} />
        <Bar dataKey="Last Week" fill="var(--gray-300)" radius={[2, 2, 0, 0]} maxBarSize={32} />
        <Bar dataKey="Today" fill="var(--brand-primary)" radius={[2, 2, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function PostPaidCard({ session }: { session: boolean }) {
  const { data, isLoading, error } = usePostPaidBalances(session)

  if (isLoading) return <SectionSkeleton height={160} />
  if (error) return <SectionError message="Could not load post-paid balances" />

  const outstanding = data?.filter((b) => b.outstanding > 0) ?? []
  const totalOutstanding = outstanding.reduce((s, b) => s + b.outstanding, 0)

  if (totalOutstanding === 0) {
    return (
      <SectionCard title="Post-Paid Outstanding" data-testid="postpaid-outstanding-card">
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-success)' }}
        >
          <CheckCircle size={16} />
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500 }}>
            All settled ✓
          </span>
        </div>
      </SectionCard>
    )
  }

  return (
    <SectionCard
      title="Post-Paid Outstanding"
      action={
        <Link
          to="/postpaid-customers"
          style={{ fontSize: 12, color: 'var(--brand-primary)', textDecoration: 'none' }}
        >
          View All
        </Link>
      }
      data-testid="postpaid-outstanding-card"
    >
      <div style={{ marginBottom: 12 }}>
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            color: 'var(--gray-500)',
            display: 'block',
            marginBottom: 4,
          }}
        >
          Total Outstanding
        </span>
        <AmountDisplay amount={totalOutstanding} size="lg" variant="negative" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {outstanding.map((b) => {
          const daysSince = b.days_since_payment ?? 0
          return (
            <div
              key={b.customer.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 0',
                borderBottom: 'var(--border-default)',
                background: daysSince > 30 ? 'rgba(217,48,37,0.04)' : 'transparent',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  color: daysSince > 30 ? 'var(--color-danger)' : 'var(--gray-700)',
                }}
              >
                {b.customer.name}
              </span>
              <div style={{ textAlign: 'right' }}>
                <AmountDisplay amount={b.outstanding} size="sm" variant="negative" />
                <span
                  style={{
                    display: 'block',
                    fontFamily: 'var(--font-body)',
                    fontSize: 11,
                    color: 'var(--gray-500)',
                  }}
                >
                  {daysSince}d ago
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}

function SectionB({ date, session }: { date: string; session: boolean }) {
  return (
    <div data-testid="section-money-glance">
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 16,
          fontWeight: 600,
          color: 'var(--gray-900)',
          margin: '0 0 12px',
        }}
      >
        Money at a Glance
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 2 — Today vs Last Week */}
        <SectionCard title="Today vs Same Day Last Week" data-testid="today-vs-lastweek-card">
          <TodayVsLastWeekChart date={date} />
        </SectionCard>

        {/* Card 3 — Post-Paid Outstanding */}
        <PostPaidCard session={session} />

        {/* Cash flow placeholder — requires denomination data */}
        <SectionCard title="Cash Flow" data-testid="cash-flow-card">
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--gray-500)' }}>
            Cash deposit and float data shown here when available.
          </p>
          <Link
            to="/owner/deposits"
            style={{
              fontSize: 12,
              color: 'var(--brand-primary)',
              textDecoration: 'none',
              display: 'block',
              marginTop: 8,
            }}
          >
            View Cash Deposits →
          </Link>
          <Link
            to="/supervisor-float"
            style={{
              fontSize: 12,
              color: 'var(--brand-primary)',
              textDecoration: 'none',
              display: 'block',
              marginTop: 4,
            }}
          >
            View Supervisor Float →
          </Link>
        </SectionCard>
      </div>
    </div>
  )
}

// ─── Section C — Branch Operations Status ────────────────────────────────────

function BranchOpsCard({ branch, date }: { branch: 'KR' | 'C2'; date: string }) {
  const { data, isLoading, error, refetch } = useBranchOperationsStatus(branch, date)
  const branchLabel = branch === 'KR' ? 'Kaappi Ready' : 'Coffee Mate C2'

  if (isLoading) return <SectionSkeleton height={220} />
  if (error)
    return (
      <SectionError message={`Could not load ${branchLabel} status`} onRetry={() => refetch()} />
    )
  if (!data) return null

  const rows: { label: string; value: React.ReactNode; color: string }[] = [
    {
      label: 'Shift',
      color: data.shiftOpen ? 'var(--color-success)' : 'var(--color-danger)',
      value: data.shiftOpen ? `Open since ${fmtTime(data.shiftOpenSince)}` : 'Not started',
    },
    {
      label: 'Data Entry',
      color: data.dataEntryStarted ? 'var(--color-success)' : 'var(--color-warning)',
      value: data.dataEntryStarted ? 'Started' : 'Not started',
    },
    {
      label: 'Month End Stock',
      color:
        data.monthEndStockStatus === 'submitted'
          ? 'var(--color-success)'
          : data.monthEndStockStatus === 'overdue'
            ? 'var(--color-danger)'
            : 'var(--color-warning)',
      value:
        data.monthEndStockStatus === 'submitted'
          ? 'Submitted ✓'
          : data.monthEndStockStatus === 'overdue'
            ? 'Overdue'
            : data.monthEndDaysLeft !== null
              ? `Due in ${data.monthEndDaysLeft} days`
              : 'Pending',
    },
    {
      label: 'Last Deposit',
      color: data.hasDepositToday ? 'var(--color-success)' : 'var(--color-warning)',
      value: data.hasDepositToday
        ? `Today ${fmtTime(data.lastDepositTime)}`
        : data.lastDepositTime
          ? `${minutesAgo(data.lastDepositTime)} min ago`
          : 'None today',
    },
    {
      label: 'Reconciliation',
      color:
        data.reconciliationStatus === 'clean'
          ? 'var(--color-success)'
          : data.reconciliationStatus === 'amber'
            ? 'var(--color-warning)'
            : data.reconciliationStatus === 'red'
              ? 'var(--color-danger)'
              : 'var(--gray-400)',
      value:
        data.reconciliationStatus === 'clean'
          ? 'Clean'
          : data.reconciliationStatus === 'amber'
            ? 'Amber gap'
            : data.reconciliationStatus === 'red'
              ? 'Red gap'
              : data.reconciliationStatus === 'pending'
                ? 'Pending'
                : 'No data',
    },
  ]

  return (
    <SectionCard
      title={branchLabel}
      description={new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
      })}
      data-testid={`branch-ops-${branch.toLowerCase()}`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map(({ label, value, color }) => (
          <div
            key={label}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span
              style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--gray-600)' }}
            >
              {label}
            </span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color }}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

function SectionC({ date }: { date: string }) {
  return (
    <div data-testid="section-branch-ops">
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 16,
          fontWeight: 600,
          color: 'var(--gray-900)',
          margin: '0 0 12px',
        }}
      >
        Branch Operations Status
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <BranchOpsCard branch="KR" date={date} />
        <BranchOpsCard branch="C2" date={date} />
      </div>
    </div>
  )
}

// ─── Section D — Active Alerts ────────────────────────────────────────────────

function SectionD({ user }: { user: { id: string; full_name?: string } | null }) {
  const { data: alerts, isLoading, error } = useActiveAlerts()
  const acknowledge = useAcknowledgeAlert()
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  if (isLoading || error || !alerts) return null

  const visible = alerts.filter((a) => !dismissed.has(a.id)).slice(0, 5)
  if (visible.length === 0) return null

  return (
    <div data-testid="section-active-alerts">
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 16,
          fontWeight: 600,
          color: 'var(--gray-900)',
          margin: '0 0 12px',
        }}
      >
        Active Alerts
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visible.map((alert) => {
          const isRed = alert.level === 'red'
          return (
            <div
              key={alert.id}
              style={{
                background: isRed ? 'rgba(217,48,37,0.06)' : 'rgba(242,153,0,0.06)',
                border: `1px solid ${isRed ? 'rgba(217,48,37,0.3)' : 'rgba(242,153,0,0.4)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                transition: 'opacity 0.3s',
              }}
            >
              <AlertTriangle
                size={16}
                style={{
                  color: isRed ? 'var(--color-danger)' : 'var(--color-warning)',
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    display: 'inline-block',
                    fontFamily: 'var(--font-body)',
                    fontSize: 11,
                    fontWeight: 600,
                    color: isRed ? 'var(--color-danger)' : 'var(--color-warning)',
                    background: isRed ? 'rgba(217,48,37,0.1)' : 'rgba(242,153,0,0.15)',
                    borderRadius: 'var(--radius-full)',
                    padding: '1px 8px',
                    marginBottom: 4,
                  }}
                >
                  {alert.branch}
                </span>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 13,
                    color: 'var(--gray-800)',
                    margin: 0,
                  }}
                >
                  {alert.message}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 11,
                    color: 'var(--gray-500)',
                    margin: '2px 0 0',
                  }}
                >
                  {new Date(alert.createdAt).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  acknowledge.mutate(
                    { id: alert.id, acknowledgedBy: user?.full_name ?? 'Owner' },
                    { onSuccess: () => setDismissed((prev) => new Set([...prev, alert.id])) }
                  )
                }}
                disabled={acknowledge.isLoading}
                style={{ flexShrink: 0 }}
              >
                Acknowledge
              </Button>
            </div>
          )
        })}
        {alerts.length > 5 && (
          <Link
            to="/reports/cash-discrepancy"
            style={{
              fontSize: 13,
              color: 'var(--brand-primary)',
              textDecoration: 'none',
              textAlign: 'right',
            }}
          >
            View All {alerts.length} Alerts →
          </Link>
        )}
      </div>
    </div>
  )
}

// ─── Section E — This Week Sales Trend ───────────────────────────────────────

function SectionE() {
  const weekStart = getMondayOfCurrentWeek()
  const today = todayISO()
  const { data, isLoading, error, refetch } = useWeeklySalesTrend(weekStart)

  if (isLoading) return <SectionSkeleton height={280} />
  if (error) return <SectionError message="Could not load weekly trend" onRetry={() => refetch()} />
  if (!data) return null

  const weekTotal = data.reduce((s, d) => s + d.combined, 0)
  const krTotal = data.reduce((s, d) => s + d.kr_total, 0)
  const c2Total = data.reduce((s, d) => s + d.c2_total, 0)
  const prevWeekTotal = data.reduce((s, d) => s + d.combined_prev, 0)

  const chartData = data.map((d) => ({
    ...d,
    fill: d.date === today ? 0.9 : 0.6,
  }))

  return (
    <SectionCard
      title="This Week Sales Trend"
      description={`Week of ${new Date(weekStart + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`}
      data-testid="section-weekly-trend"
    >
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
          <XAxis dataKey="dayLabel" tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 11 }}
            width={52}
            tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
          />
          <Tooltip
            formatter={(v, name) => [`₹${fmtRs(Number(v))}`, String(name)]}
            labelFormatter={(label) => `${label}`}
          />
          <Legend />
          <Bar
            dataKey="kr_total"
            name="KR"
            stackId="branch"
            fill="var(--brand-primary)"
            radius={[2, 2, 0, 0]}
          />
          <Bar dataKey="c2_total" name="C2" stackId="branch" fill="#34A853" radius={[2, 2, 0, 0]} />
          <Line
            dataKey="combined"
            name="Combined"
            stroke="var(--color-warning)"
            strokeWidth={2}
            dot={{ r: 3 }}
            strokeDasharray="4 2"
          />
        </ComposedChart>
      </ResponsiveContainer>
      {/* Summary totals */}
      <div
        style={{
          display: 'flex',
          gap: 24,
          flexWrap: 'wrap',
          marginTop: 12,
          paddingTop: 12,
          borderTop: 'var(--border-default)',
        }}
      >
        {[
          { label: 'KR This Week', value: krTotal, color: 'var(--brand-primary)' },
          { label: 'C2 This Week', value: c2Total, color: '#34A853' },
          { label: 'Combined', value: weekTotal },
          { label: 'Prev Week', value: prevWeekTotal, muted: true },
        ].map(({ label, value, muted }) => (
          <div key={label}>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 11,
                color: 'var(--gray-500)',
                margin: '0 0 2px',
              }}
            >
              {label}
            </p>
            <AmountDisplay amount={value} size="sm" variant={muted ? 'muted' : 'default'} />
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

// ─── Section F — Intraday Sales Chart ────────────────────────────────────────

function SectionF() {
  const today = todayISO()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const [selectedDate, setSelectedDate] = useState(today)
  const [branchFilter, setBranchFilter] = useState<'KR' | 'C2' | 'both'>('both')
  const isToday = selectedDate === today

  const { data, isLoading, error, refetch } = useIntradaySales(branchFilter, selectedDate)

  if (error)
    return <SectionError message="Could not load intraday sales" onRetry={() => refetch()} />

  const hourLabels: string[] = []
  for (let h = 6; h <= 23; h++) {
    hourLabels.push(h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`)
  }

  const chartData = (data ?? []).map((slot, i) => ({
    hour: hourLabels[i],
    KR: slot.kr_total,
    C2: slot.c2_total,
    total: slot.total,
    count: slot.count,
  }))

  // Avg and peak
  const nonZero = chartData.filter((d) => d.total > 0)
  const avg = nonZero.length > 0 ? nonZero.reduce((s, d) => s + d.total, 0) / nonZero.length : 0
  const peak =
    nonZero.length > 0 ? nonZero.reduce((a, b) => (b.total > a.total ? b : a), nonZero[0]) : null
  const quietest =
    nonZero.length > 1 ? nonZero.reduce((a, b) => (b.total < a.total ? b : a), nonZero[0]) : null
  const totalBills = chartData.reduce((s, d) => s + d.count, 0)
  const totalRevenue = chartData.reduce((s, d) => s + d.total, 0)
  const avgPerBill = totalBills > 0 ? totalRevenue / totalBills : 0

  return (
    <SectionCard data-testid="section-intraday">
      {/* Controls row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ flex: 1 }}>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--gray-900)',
              margin: 0,
            }}
          >
            Sales by Hour
          </h3>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              color: 'var(--gray-500)',
              margin: '2px 0 0',
            }}
          >
            {isToday
              ? 'Today — Live (updates every 60 seconds)'
              : `${new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} — Historical`}
          </p>
        </div>

        {/* Branch toggle */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['KR', 'C2', 'both'] as const).map((b) => (
            <Button
              key={b}
              variant={branchFilter === b ? 'default' : 'outline'}
              size="sm"
              onClick={() => setBranchFilter(b)}
              data-testid={`intraday-branch-${b.toLowerCase()}`}
            >
              {b === 'both' ? 'Both' : b}
            </Button>
          ))}
        </div>

        {/* Date picker */}
        <input
          type="date"
          value={selectedDate}
          max={today}
          onChange={(e) => setSelectedDate(e.target.value || today)}
          data-testid="intraday-date-picker"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            border: 'var(--border-default)',
            borderRadius: 'var(--radius-md)',
            padding: '5px 10px',
            color: 'var(--gray-700)',
            background: 'var(--brand-surface)',
            cursor: 'pointer',
          }}
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <>
          <div data-testid="intraday-chart">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={1} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  width={52}
                  tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
                />
                <Tooltip
                  formatter={(v, name) => [`₹${fmtRs(Number(v))}`, String(name)]}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0]?.payload
                    return (
                      <div
                        style={{
                          background: 'white',
                          border: '1px solid var(--gray-200)',
                          borderRadius: 8,
                          padding: '8px 12px',
                          fontSize: 12,
                        }}
                      >
                        <p style={{ margin: '0 0 4px', fontWeight: 600 }}>{label}</p>
                        {branchFilter === 'both' ? (
                          <>
                            <p style={{ margin: '2px 0', color: 'var(--brand-primary)' }}>
                              KR: ₹{fmtRs(d?.KR ?? 0)}
                            </p>
                            <p style={{ margin: '2px 0', color: '#34A853' }}>
                              C2: ₹{fmtRs(d?.C2 ?? 0)}
                            </p>
                          </>
                        ) : (
                          <p style={{ margin: '2px 0' }}>₹{fmtRs(d?.total ?? 0)}</p>
                        )}
                        <p style={{ margin: '2px 0', color: 'var(--gray-500)' }}>
                          {d?.count ?? 0} bills
                        </p>
                      </div>
                    )
                  }}
                />
                {branchFilter === 'both' ? (
                  <>
                    <Bar dataKey="KR" fill="var(--brand-primary)" stackId="s" />
                    <Bar dataKey="C2" fill="#34A853" stackId="s" />
                  </>
                ) : (
                  <Bar
                    dataKey="total"
                    fill={branchFilter === 'KR' ? 'var(--brand-primary)' : '#34A853'}
                  />
                )}
                {avg > 0 && (
                  <ReferenceLine
                    y={avg}
                    stroke="var(--gray-400)"
                    strokeDasharray="6 3"
                    label={{
                      value: 'Avg',
                      position: 'right',
                      fontSize: 10,
                      fill: 'var(--gray-500)',
                    }}
                  />
                )}
                {peak && (
                  <ReferenceLine
                    x={peak.hour}
                    stroke="transparent"
                    label={{
                      value: 'Peak',
                      position: 'top',
                      fontSize: 10,
                      fill: 'var(--color-warning)',
                    }}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Summary strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ marginTop: 16 }}>
            <KPICard
              title="Busiest Hour"
              value={peak ? `${peak.hour} · ₹${fmtRs(peak.total)}` : '—'}
            />
            <KPICard
              title="Quietest Hour"
              value={quietest ? `${quietest.hour} · ₹${fmtRs(quietest.total)}` : '—'}
            />
            <KPICard title="Total Bills" value={totalBills} />
            <KPICard title="Avg per Bill" value={`₹${fmtRs(avgPerBill)}`} />
          </div>
        </>
      )}
    </SectionCard>
  )
}

// ─── Section G — Top Items This Week ────────────────────────────────────────

function SectionG() {
  const [branchFilter, setBranchFilter] = useState<'KR' | 'C2' | 'combined'>('combined')
  const { data, isLoading, error, refetch } = useTopItemsThisWeek(branchFilter)

  return (
    <SectionCard
      title="Top Items This Week"
      action={
        <Link
          to="/reports/reconciliation"
          style={{ fontSize: 12, color: 'var(--brand-primary)', textDecoration: 'none' }}
        >
          Full Report →
        </Link>
      }
      data-testid="section-top-items"
    >
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {(['KR', 'C2', 'combined'] as const).map((b) => (
          <Button
            key={b}
            variant={branchFilter === b ? 'default' : 'outline'}
            size="sm"
            onClick={() => setBranchFilter(b)}
          >
            {b === 'combined' ? 'Combined' : b}
          </Button>
        ))}
      </div>
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : error ? (
        <SectionError message="Could not load top items" onRetry={() => refetch()} />
      ) : !data?.length ? (
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--gray-500)' }}>
          No POS billing data yet
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {data.map((item) => (
            <div
              key={item.item_name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '6px 0',
                borderBottom: 'var(--border-default)',
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: 'var(--gray-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--gray-600)',
                  flexShrink: 0,
                }}
              >
                {item.rank}
              </span>
              <span
                style={{
                  flex: 1,
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  color: 'var(--gray-800)',
                }}
              >
                {item.item_name}
              </span>
              <AmountDisplay amount={item.total_revenue} size="sm" />
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 11,
                  color: 'var(--gray-500)',
                  minWidth: 48,
                  textAlign: 'right',
                }}
              >
                {item.bill_count} bills
              </span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

// ─── Section H — Vendor Payments Due ─────────────────────────────────────────

function SectionH() {
  const { data, isLoading, error, refetch } = useVendorPaymentsDue()

  return (
    <SectionCard
      title="Vendor Payments Due"
      action={
        <Link
          to="/vendor-payments"
          style={{ fontSize: 12, color: 'var(--brand-primary)', textDecoration: 'none' }}
        >
          Vendor Payments →
        </Link>
      }
      data-testid="section-vendor-due"
    >
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : error ? (
        <SectionError message="Could not load vendor payments" onRetry={() => refetch()} />
      ) : !data?.length ? (
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-success)' }}
        >
          <CheckCircle size={16} />
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500 }}>
            No payments due this week ✓
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {data.map((v) => (
            <div
              key={v.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 0',
                borderBottom: 'var(--border-default)',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  color: 'var(--gray-800)',
                  flex: 1,
                }}
              >
                {v.vendorName}
              </span>
              {v.amount !== null && (
                <span style={{ marginRight: 8 }}>
                  <AmountDisplay amount={v.amount} size="sm" />
                </span>
              )}
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 11,
                  fontWeight: 600,
                  color:
                    v.status === 'overdue'
                      ? 'var(--color-danger)'
                      : v.status === 'due_today'
                        ? 'var(--color-warning)'
                        : 'var(--brand-primary)',
                  background:
                    v.status === 'overdue'
                      ? 'rgba(217,48,37,0.1)'
                      : v.status === 'due_today'
                        ? 'rgba(242,153,0,0.12)'
                        : 'var(--brand-primary-subtle)',
                  borderRadius: 'var(--radius-full)',
                  padding: '2px 8px',
                }}
              >
                {v.status === 'overdue'
                  ? 'Overdue'
                  : v.status === 'due_today'
                    ? 'Due Today'
                    : new Date(v.cycleEnd + 'T00:00:00').toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                      })}
              </span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

// ─── Section I — Tasks Summary ────────────────────────────────────────────────

function SectionI({ user }: { user: { id: string; role?: string } | null }) {
  const { data: tasks, isLoading, error } = useTasks(user as Parameters<typeof useTasks>[0])
  const today = todayISO()

  if (isLoading) return <SectionSkeleton height={160} />
  if (error) return <SectionError message="Could not load tasks" />

  const pending = tasks?.filter((t) => t.status !== 'done') ?? []
  const overdue = pending
    .filter((t) => t.due_date && t.due_date < today)
    .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))
    .slice(0, 3)

  const countByPriority = {
    high: pending.filter((t) => t.priority === 'high').length,
    normal: pending.filter((t) => t.priority === 'normal').length,
    low: pending.filter((t) => t.priority === 'low').length,
  }

  return (
    <SectionCard
      title="Tasks Summary"
      action={
        <Link
          to="/tasks"
          style={{ fontSize: 12, color: 'var(--brand-primary)', textDecoration: 'none' }}
        >
          View All Tasks →
        </Link>
      }
      data-testid="section-tasks"
    >
      {/* Priority counts */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        {[
          { label: 'High', count: countByPriority.high, color: 'var(--color-danger)' },
          { label: 'Normal', count: countByPriority.normal, color: 'var(--color-warning)' },
          { label: 'Low', count: countByPriority.low, color: 'var(--gray-500)' },
        ].map(({ label, count, color }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 22,
                fontWeight: 700,
                color,
                margin: 0,
              }}
            >
              {count}
            </p>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 11,
                color: 'var(--gray-500)',
                margin: 0,
              }}
            >
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Overdue list */}
      {overdue.length > 0 && (
        <div>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--color-danger)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              margin: '0 0 6px',
            }}
          >
            Overdue
          </p>
          {overdue.map((task) => {
            const daysLate = Math.floor(
              (new Date().getTime() - new Date(task.due_date! + 'T00:00:00').getTime()) / 86400000
            )
            return (
              <div
                key={task.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  padding: '6px 0',
                  borderBottom: 'var(--border-default)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 13,
                      color: 'var(--gray-800)',
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {task.title}
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 11,
                      color: 'var(--gray-500)',
                      margin: 0,
                    }}
                  >
                    {task.assigned_to_emp?.full_name ?? 'Unassigned'}
                  </p>
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 11,
                    color: 'var(--color-danger)',
                    flexShrink: 0,
                    marginLeft: 8,
                  }}
                >
                  {daysLate}d late
                </span>
              </div>
            )
          })}
        </div>
      )}
    </SectionCard>
  )
}

// ─── Section J — Reconciliation Week View ────────────────────────────────────

type ReconStatus = 'green' | 'amber' | 'red' | 'pending' | 'none'

function DotRow({
  branch,
  weekStart,
  reconMap,
}: {
  branch: 'KR' | 'C2'
  weekStart: string
  reconMap: Record<string, Record<string, ReconStatus>>
}) {
  const branchColor = branch === 'KR' ? 'var(--brand-primary)' : '#34A853'
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const today = todayISO()

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          fontWeight: 700,
          color: branchColor,
          width: 24,
          flexShrink: 0,
        }}
      >
        {branch}
      </span>
      {days.map((dayLabel, i) => {
        const date = new Date(weekStart + 'T00:00:00')
        date.setDate(date.getDate() + i)
        const dateStr = date.toISOString().slice(0, 10)
        const status: ReconStatus = reconMap[branch]?.[dateStr] ?? 'none'
        const isFuture = dateStr > today

        const dotColor = isFuture
          ? 'transparent'
          : status === 'green'
            ? 'var(--color-success)'
            : status === 'amber'
              ? 'var(--color-warning)'
              : status === 'red'
                ? 'var(--color-danger)'
                : status === 'pending'
                  ? 'var(--gray-300)'
                  : 'transparent'

        const dotBorder = isFuture
          ? '1px dashed var(--gray-200)'
          : status === 'none'
            ? '2px solid var(--gray-300)'
            : 'none'

        return (
          <div
            key={i}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: dotColor,
                border: dotBorder,
              }}
            />
            <span
              style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray-400)' }}
            >
              {dayLabel}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function SectionJ() {
  const weekStart = getMondayOfCurrentWeek()
  const weekEnd = new Date(weekStart + 'T00:00:00')
  weekEnd.setDate(weekEnd.getDate() + 6)
  const weekEndStr = weekEnd.toISOString().slice(0, 10)
  const currentMonth = weekStart.slice(0, 7)

  const krRecon = useReconciliationResults('KR', currentMonth, true)
  const c2Recon = useReconciliationResults('C2', currentMonth, true)

  const reconMap: Record<string, Record<string, ReconStatus>> = { KR: {}, C2: {} }

  for (const r of krRecon.data ?? []) {
    if (r.entry_date >= weekStart && r.entry_date <= weekEndStr) {
      const s = r.status
      reconMap.KR[r.entry_date] =
        s === 'reconciled' ? 'green' : s === 'amber' ? 'amber' : s === 'red' ? 'red' : 'pending'
    }
  }
  for (const r of c2Recon.data ?? []) {
    if (r.entry_date >= weekStart && r.entry_date <= weekEndStr) {
      const s = r.status
      reconMap.C2[r.entry_date] =
        s === 'reconciled' ? 'green' : s === 'amber' ? 'amber' : s === 'red' ? 'red' : 'pending'
    }
  }

  const isLoading = krRecon.isLoading || c2Recon.isLoading

  return (
    <SectionCard
      title="Reconciliation This Week"
      action={
        <Link
          to="/reports/reconciliation"
          style={{ fontSize: 12, color: 'var(--brand-primary)', textDecoration: 'none' }}
        >
          Full Report →
        </Link>
      }
      data-testid="section-reconciliation-week"
    >
      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <DotRow branch="KR" weekStart={weekStart} reconMap={reconMap} />
          <DotRow branch="C2" weekStart={weekStart} reconMap={reconMap} />
          {/* Legend */}
          <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
            {[
              { color: 'var(--color-success)', label: 'Clean' },
              { color: 'var(--color-warning)', label: 'Amber' },
              { color: 'var(--color-danger)', label: 'Red' },
              { color: 'var(--gray-300)', label: 'Pending' },
              { color: 'transparent', border: '2px solid var(--gray-300)', label: 'No data' },
            ].map(({ color, border, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div
                  style={{ width: 10, height: 10, borderRadius: '50%', background: color, border }}
                />
                <span
                  style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--gray-500)' }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  )
}

// ─── Updated At stamp ─────────────────────────────────────────────────────────

function UpdatedAt({ dataUpdatedAt }: { dataUpdatedAt: number }) {
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    const id = setInterval(() => forceUpdate((n) => n + 1), 30000)
    return () => clearInterval(id)
  }, [])

  const mins = Math.floor((new Date().getTime() - dataUpdatedAt) / 60000)
  const isStale = mins >= 3

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <Clock size={12} style={{ color: isStale ? 'var(--color-warning)' : 'var(--gray-400)' }} />
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 12,
          color: isStale ? 'var(--color-warning)' : 'var(--gray-500)',
        }}
      >
        Updated {mins === 0 ? 'just now' : `${mins} min${mins !== 1 ? 's' : ''} ago`}
      </span>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function OwnerDashboard() {
  const { user } = useAuth()
  const today = todayISO()

  // Use live totals for the update timestamp
  const krLive = useDashboardLiveTotals('KR', today)

  useEffect(() => {
    checkScheduledAlerts()
  }, [])

  const subtitle = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <PageContainer>
      <PageHeader
        title="Owner Dashboard"
        subtitle={`${subtitle} · Unlimited Food Works`}
        action={
          krLive.dataUpdatedAt ? <UpdatedAt dataUpdatedAt={krLive.dataUpdatedAt} /> : undefined
        }
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {/* Section A — Live Today */}
        <SectionA date={today} />

        {/* Section B — Money at a Glance */}
        <SectionB date={today} session={!!user} />

        {/* Section C — Branch Operations Status */}
        <SectionC date={today} />

        {/* Section D — Active Alerts (hidden if none) */}
        <SectionD user={user} />

        {/* Section E — This Week Sales Trend */}
        <SectionE />

        {/* Section F — Intraday Sales Chart */}
        <SectionF />

        {/* Sections G + H in 2 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SectionG />
          <SectionH />
        </div>

        {/* Sections I + J in 2 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SectionI user={user} />
          <SectionJ />
        </div>
      </div>
    </PageContainer>
  )
}

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { ArrowLeft, ChevronDown, ChevronRight, AlertTriangle, FileSearch } from 'lucide-react'
import PageContainer from '@/components/layouts/PageContainer'
import PageHeader from '@/components/layouts/PageHeader'
import SectionCard from '@/components/ui/SectionCard'
import AmountDisplay from '@/components/ui/AmountDisplay'
import { TableSkeleton } from '@/components/ui/LoadingSkeletons'
import EmptyState from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useQuery } from 'react-query'
import { supabase } from '@/lib/supabase'
import { fmtRs, fmtDate, monthStart, monthEnd } from '@/types/phase9'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CashEntryRow {
  shift_number: number
  denom_500: number
  denom_200: number
  denom_100: number
  denom_50: number
  denom_20: number
  denom_10: number
}

interface DayRow {
  date: string
  shift1: CashEntryRow | null
  shift2: CashEntryRow | null
  upi: number | null
  expenses: number
  deposited: number
}

function shiftTotal(s: CashEntryRow | null): number {
  if (!s) return 0
  return (
    s.denom_500 * 500 +
    s.denom_200 * 200 +
    s.denom_100 * 100 +
    s.denom_50 * 50 +
    s.denom_20 * 20 +
    s.denom_10 * 10
  )
}

// ─── Denomination table ───────────────────────────────────────────────────────

function DenomTable({ s }: { s: CashEntryRow }) {
  const denoms = [500, 200, 100, 50, 20, 10] as const
  const keys = ['denom_500', 'denom_200', 'denom_100', 'denom_50', 'denom_20', 'denom_10'] as const
  return (
    <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {denoms.map((d) => (
            <th
              key={d}
              style={{
                padding: '3px 8px',
                color: 'var(--gray-500)',
                textAlign: 'right',
                fontWeight: 600,
              }}
            >
              ₹{d}
            </th>
          ))}
          <th
            style={{
              padding: '3px 8px',
              color: 'var(--gray-700)',
              textAlign: 'right',
              fontWeight: 600,
            }}
          >
            Total
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          {keys.map((k, i) => (
            <td
              key={k}
              style={{ padding: '3px 8px', textAlign: 'right', color: 'var(--gray-700)' }}
            >
              {s[k]} × ₹{denoms[i]}
            </td>
          ))}
          <td
            style={{
              padding: '3px 8px',
              textAlign: 'right',
              fontWeight: 600,
              color: 'var(--gray-900)',
            }}
          >
            {fmtRs(shiftTotal(s))}
          </td>
        </tr>
      </tbody>
    </table>
  )
}

// ─── Expandable day row ───────────────────────────────────────────────────────

function DayShiftRow({ row }: { row: DayRow }) {
  const [open, setOpen] = useState(false)
  const totalCash = shiftTotal(row.shift1) + shiftTotal(row.shift2)
  const netExpected = totalCash + (row.upi ?? 0) - row.expenses
  const mismatch = row.deposited > 0 && Math.abs(netExpected - row.deposited) > 50

  return (
    <>
      <tr
        style={{ borderBottom: 'var(--border-default)', cursor: 'pointer' }}
        onClick={() => setOpen((v) => !v)}
      >
        <td style={tdStyle}>{fmtDate(row.date)}</td>
        <td style={tdStyle}>
          <AmountDisplay amount={shiftTotal(row.shift1)} size="sm" />
        </td>
        <td style={tdStyle}>
          <AmountDisplay amount={shiftTotal(row.shift2)} size="sm" />
        </td>
        <td style={{ ...tdStyle, fontWeight: 600 }}>
          <AmountDisplay amount={totalCash} size="sm" />
        </td>
        <td style={tdStyle}>
          {row.upi != null ? <AmountDisplay amount={row.upi} size="sm" /> : '—'}
        </td>
        <td style={{ ...tdStyle, color: 'var(--color-danger)' }}>
          {row.expenses > 0 ? fmtRs(row.expenses) : '—'}
        </td>
        <td style={tdStyle}>
          <AmountDisplay amount={row.deposited} size="sm" />
          {mismatch && (
            <AlertTriangle
              size={14}
              style={{ color: 'var(--color-warning)', marginLeft: 4 }}
              aria-label="Mismatch"
            />
          )}
        </td>
        <td style={{ ...tdStyle, textAlign: 'center' }}>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={8} style={{ padding: '12px 16px', background: 'var(--gray-50)' }}>
            <div className="space-y-3">
              {row.shift1 && (
                <div>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--gray-600)',
                      marginBottom: 4,
                    }}
                  >
                    Shift 1 Denominations
                  </p>
                  <DenomTable s={row.shift1} />
                </div>
              )}
              {row.shift2 && (
                <div>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--gray-600)',
                      marginBottom: 4,
                    }}
                  >
                    Shift 2 Denominations
                  </p>
                  <DenomTable s={row.shift2} />
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

const tdStyle: React.CSSProperties = {
  padding: '11px 14px',
  fontFamily: 'var(--font-body)',
  fontSize: '13px',
  color: 'var(--gray-800)',
  verticalAlign: 'middle',
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

// ─── Data hook ────────────────────────────────────────────────────────────────

function useShiftCashData(branch: 'KR' | 'C2', month: string, session: boolean) {
  return useQuery<DayRow[]>(
    ['shift_cash_report', branch, month],
    async () => {
      const from = monthStart(month)
      const to = monthEnd(month)

      const { data: entries } = await supabase
        .from('daily_entries')
        .select('id, entry_date, shift_number')
        .eq('branch', branch)
        .gte('entry_date', from)
        .lte('entry_date', to)

      if (!entries || entries.length === 0) return []

      const ids = entries.map((e) => e.id)

      const [cashRes, upiRes, expRes, depRes] = await Promise.all([
        supabase
          .from('cash_entries')
          .select(
            'daily_entry_id, shift_number, denom_500, denom_200, denom_100, denom_50, denom_20, denom_10'
          )
          .in('daily_entry_id', ids),
        supabase
          .from('upi_entries')
          .select('entry_date, upi_total')
          .eq('branch', branch)
          .gte('entry_date', from)
          .lte('entry_date', to),
        supabase
          .from('expense_entries')
          .select('entry_date, amount')
          .eq('branch', branch)
          .gte('entry_date', from)
          .lte('entry_date', to),
        supabase
          .from('cash_deposits')
          .select('deposit_date, rows')
          .gte('deposit_date', from)
          .lte('deposit_date', to),
      ])

      const entryMap = new Map<string, (typeof entries)[0][]>()
      for (const e of entries) {
        const key = e.entry_date
        if (!entryMap.has(key)) entryMap.set(key, [])
        entryMap.get(key)!.push(e)
      }

      const cashMap = new Map<string, CashEntryRow>()
      for (const ce of cashRes.data ?? []) {
        const entry = entries.find((e) => e.id === ce.daily_entry_id)
        if (!entry) continue
        const key = `${entry.entry_date}:${ce.shift_number}`
        cashMap.set(key, ce as CashEntryRow)
      }

      const upiMap = new Map<string, number>(
        (upiRes.data ?? []).map((u) => [u.entry_date, Number(u.upi_total ?? 0)])
      )

      const expMap = new Map<string, number>()
      for (const ex of expRes.data ?? []) {
        expMap.set(ex.entry_date, (expMap.get(ex.entry_date) ?? 0) + Number(ex.amount))
      }

      const depMap = new Map<string, number>()
      for (const dep of depRes.data ?? []) {
        const rows = (dep.rows ?? []) as Array<{
          branch: string
          amount: number
          date_covered: string
        }>
        for (const r of rows) {
          if (r.branch === branch) {
            const key = r.date_covered ?? dep.deposit_date
            depMap.set(key, (depMap.get(key) ?? 0) + Number(r.amount))
          }
        }
      }

      const dates = [...new Set(entries.map((e) => e.entry_date))].sort()

      return dates.map((date) => ({
        date,
        shift1: cashMap.get(`${date}:1`) ?? null,
        shift2: cashMap.get(`${date}:2`) ?? null,
        upi: upiMap.has(date) ? upiMap.get(date)! : null,
        expenses: expMap.get(date) ?? 0,
        deposited: depMap.get(date) ?? 0,
      }))
    },
    { enabled: !!session, retry: 2, staleTime: 60000 }
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ShiftCashReport() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [branch, setBranch] = useState<'KR' | 'C2'>('KR')
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))

  const { data: rows = [], isLoading } = useShiftCashData(branch, month, !!user)

  if (user?.role !== 'owner') {
    navigate('/dashboard')
    return null
  }

  // Chart data — UPI% vs Cash% per day
  const chartData = rows.map((r) => {
    const totalCash = shiftTotal(r.shift1) + shiftTotal(r.shift2)
    const upi = r.upi ?? 0
    const total = totalCash + upi
    return {
      date: fmtDate(r.date),
      'Cash %': total > 0 ? Math.round((totalCash / total) * 100) : 0,
      'UPI %': total > 0 ? Math.round((upi / total) * 100) : 0,
    }
  })

  return (
    <PageContainer data-testid="shift-cash-page">
      <PageHeader
        title="Shift-Wise Cash Report"
        subtitle="Daily cash breakdown with denomination detail"
        action={
          <Button variant="outline" size="sm" onClick={() => navigate('/reports')}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Reports
          </Button>
        }
      />

      {/* Controls */}
      <SectionCard className="mb-4">
        <div className="flex flex-wrap gap-3 items-center">
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
                }}
              >
                {b === 'KR' ? 'Kaappi Ready' : 'Coffee Mate C2'}
              </button>
            ))}
          </div>
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
              background: 'white',
            }}
          />
        </div>
      </SectionCard>

      {/* Daily table */}
      <SectionCard title="Daily Cash by Shift" className="mb-4">
        {isLoading ? (
          <TableSkeleton cols={8} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={FileSearch}
            title="No cash data"
            description="No shift entries found for this month."
          />
        ) : (
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {[
                    'Date',
                    'Shift 1 Cash',
                    'Shift 2 Cash',
                    'Total Cash',
                    'UPI',
                    'Expenses (−)',
                    'Deposited',
                    '',
                  ].map((h) => (
                    <th key={h} style={thStyle}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <DayShiftRow key={r.date} row={r} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* UPI vs Cash trend chart */}
      {chartData.length > 0 && (
        <SectionCard
          title="UPI % vs Cash % — Daily Mix"
          className="mb-4"
          data-testid="upi-cash-chart"
        >
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} unit="%" />
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Tooltip formatter={(v: any) => `${Number(v)}%`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="Cash %"
                  fill="var(--color-warning)"
                  stackId="a"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="UPI %"
                  fill="var(--brand-primary)"
                  stackId="a"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      )}
    </PageContainer>
  )
}

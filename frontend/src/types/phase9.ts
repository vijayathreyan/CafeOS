// ─── Phase 9 — Sales Reconciliation + Cash Discrepancy ────────────────────────

export type ReconciliationStatus = 'pending' | 'reconciled' | 'amber' | 'red'
export type AlertLevel = 'green' | 'amber' | 'red'

export interface ItemPrediction {
  itemName: string
  predictedQty: number
  predictedRevenue: number
  method: string
}

export interface ReconciliationResult {
  id: string
  branch: 'KR' | 'C2'
  entry_date: string
  predicted_sales: number
  reported_sales: number
  difference: number
  status: ReconciliationStatus
  item_breakdown: ItemPrediction[] | null
  calculated_at: string | null
  created_at: string
}

export interface CashDiscrepancy {
  id: string
  branch: 'KR' | 'C2'
  shift_date: string | null
  shift_number: number
  staff_id: string | null
  staff_name: string | null
  expected_cash: number | null
  declared_cash: number
  difference: number
  alert_level: AlertLevel
  acknowledged: boolean
  acknowledged_by: string | null
  acknowledged_at: string | null
  created_at: string
}

export interface ShiftCashDayRow {
  date: string
  branch: 'KR' | 'C2'
  shift1_cash: number
  shift1_denoms: Record<string, number>
  shift2_cash: number
  shift2_denoms: Record<string, number>
  total_cash: number
  upi_total: number | null
  cash_expenses: number
  net_expected: number
  cash_deposited: number
  flag_mismatch: boolean
}

/** Format number as Indian ₹ string */
export function fmtRs(n: number): string {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

/** Convert YYYY-MM-DD to display format */
export function fmtDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  })
}

/** Returns first day of month as YYYY-MM-DD */
export function monthStart(ym: string): string {
  return `${ym}-01`
}

/** Returns last day of month as YYYY-MM-DD */
export function monthEnd(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return `${ym}-${String(last).padStart(2, '0')}`
}

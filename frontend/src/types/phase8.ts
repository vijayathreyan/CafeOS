// ─── Phase 8 — P&L Report + Daily Sales Summary ─────────────────────────────

export type PLBranch = 'KR' | 'C2' | 'Combined'

// ─── P&L Types ────────────────────────────────────────────────────────────────

export interface PLLineItem {
  label: string
  current: number
  previous: number
  variance: number
  isTotal?: boolean
  isCapital?: boolean
  isSub?: boolean
  note?: string
}

export interface PLSection {
  id: string
  title: string
  lines: PLLineItem[]
  total: number
  prevTotal: number
}

export interface PLReportData {
  sections: PLSection[]
  totalSales: number
  totalExpenses: number
  grossProfit: number
  capitalPurchases: PLLineItem[]
  prevTotalSales: number
  prevTotalExpenses: number
  prevGrossProfit: number
  hasFixedCostFallback: boolean
}

export interface PLMonthlyOverride {
  id: string
  branch: string
  month: string
  eb_bill_amount: number
  notes: string | null
  updated_by: string | null
  updated_at: string
}

// ─── Daily Sales Summary Types ───────────────────────────────────────────────

export interface DailySalesSummaryRow {
  date: string
  branch: string
  upi: number | null
  cash_expenses: number
  cash_in_hand: number
  iti: number | null
  ramco: number | null
  arun: number | null
  ajith: number | null
  total_postpaid: number
  sales_from_collection: number
  total_shop_sales: number
  billed_sales: null
  difference_amount: null
  cash_deposited: number | null
  remarks: string | null
}

export interface DailySalesSummaryTotals {
  upi: number
  cash_expenses: number
  cash_in_hand: number
  iti: number
  ramco: number
  arun: number
  ajith: number
  total_postpaid: number
  sales_from_collection: number
  total_shop_sales: number
  cash_deposited: number
  upi_days_with_data: number
  upi_days_missing: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format a month Date as 'YYYY-MM' */
export function monthToYYYYMM(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Format a month Date as 'YYYY-MM-01' (first day) */
export function monthToFirstDay(d: Date): string {
  return `${monthToYYYYMM(d)}-01`
}

/** Last day of month as 'YYYY-MM-DD' */
export function monthToLastDay(d: Date): string {
  const next = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return next.toISOString().split('T')[0]
}

/** Previous month as a Date (first of that month) */
export function prevMonthDate(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() - 1, 1)
}

/** All dates in a month as 'YYYY-MM-DD' strings */
export function datesInMonth(d: Date): string[] {
  const year = d.getFullYear()
  const month = d.getMonth()
  const count = new Date(year, month + 1, 0).getDate()
  return Array.from({ length: count }, (_, i) => {
    const dd = i + 1
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
  })
}

/** Format currency: ₹1,23,456.00 */
export function fmtInr(n: number): string {
  return (
    '₹' +
    Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  )
}

/** Display label for PLBranch */
export function plBranchLabel(b: PLBranch): string {
  if (b === 'KR') return 'Kaappi Ready'
  if (b === 'C2') return 'Coffee Mate C2'
  return 'Combined (KR + C2)'
}

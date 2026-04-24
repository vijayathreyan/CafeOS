// ─── Phase 7 — Reports ──────────────────────────────────────────────────────

export interface ReportFilters {
  from_date: string
  to_date: string
  branch: string // 'all' | 'KR' | 'C2'
}

export interface MilkReportRow {
  entry_date: string
  branch: string
  s1_coffee: number
  s1_tea: number
  s2_coffee: number
  s2_tea: number
  total_coffee: number
  total_tea: number
  grand_total: number
}

export interface ConsumptionReportRow {
  entry_date: string
  branch: string
  item_name: string
  unit: string | null
  opening_stock: number
  purchase: number
  closing_stock: number
  consumption: number
}

export interface WastageReportRow {
  entry_date: string
  branch: string
  item_name: string
  supplied: number
  sold: number
  wastage: number
  complimentary: number
  wastage_pct: number
}

export interface ExpenseReportRow {
  entry_date: string
  branch: string
  category: string
  amount: number
  is_gas: boolean
}

/** Returns today's date as YYYY-MM-DD */
export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

/** Returns the first day of the current month as YYYY-MM-DD */
export function firstOfMonthISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

/** Format a YYYY-MM-DD string to DD MMM YYYY */
export function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** Branch display label */
export function branchLabel(branch: string): string {
  return branch === 'KR' ? 'Kaappi Ready' : 'Coffee Mate C2'
}

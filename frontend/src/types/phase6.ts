// ─── Phase 6 — Month End Closing Stock ────────────────────────────────────────

export type MonthEndStockStatus = 'draft' | 'submitted'

export interface MonthEndStockEntry {
  id: string
  branch: string
  month: number
  year: number
  status: MonthEndStockStatus
  total_value: number
  submitted_by: string | null
  submitted_at: string | null
  created_at: string
  updated_at: string
}

export interface MonthEndStockItem {
  id: string
  month_end_stock_id: string
  item_name: string
  section: string | null
  unit: string | null
  open_units: number
  packed_units: number
  total_units: number
  rate_per_unit: number
  cost: number
  previous_month_rate: number | null
  rate_changed: boolean
  created_at: string
}

export interface MonthEndStockConfig {
  id: string
  item_name: string
  section: string
  unit: string
  sort_order: number
  active: boolean
  branch_kr: boolean
  branch_c2: boolean
}

/** Combined row shown in the entry table — config + saved values */
export interface StockItemRow {
  item_name: string
  section: string
  unit: string
  sort_order: number
  open_units: number
  packed_units: number
  rate_per_unit: number
  previous_month_rate: number | null
  is_adhoc: boolean
}

/** History record for the history table */
export interface MonthEndStockHistoryRecord {
  id: string
  branch: string
  month: number
  year: number
  status: MonthEndStockStatus
  total_value: number
  submitted_by_name: string | null
  submitted_at: string | null
  created_at: string
}

/** Payload for saving a draft or submitting */
export interface SaveMonthEndStockPayload {
  branch: string
  month: number
  year: number
  items: Array<{
    item_name: string
    section: string
    unit: string
    open_units: number
    packed_units: number
    rate_per_unit: number
    previous_month_rate: number | null
    rate_changed: boolean
  }>
  submitted_by?: string
}

/** Human-readable month name */
export function monthName(month: number): string {
  return new Date(2000, month - 1, 1).toLocaleString('en-IN', { month: 'long' })
}

/** Branch display label */
export function branchLabel(branch: string): string {
  return branch === 'KR' ? 'Kaappi Ready' : 'Coffee Mate C2'
}

/** Section constants */
export const STOCK_SECTIONS = [
  'Beverages & Cleaning',
  'Packaging & Ingredients',
  'Spices & Speciality',
] as const

export type StockSection = (typeof STOCK_SECTIONS)[number]

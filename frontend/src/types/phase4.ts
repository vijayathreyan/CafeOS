// ─── Phase 4 — Owner Entry Modules & Expenses ─────────────────────────────────

export type DeliveryPlatform = 'swiggy' | 'zomato'

export type ExpenseType =
  | 'kr_ho_bill'
  | 'eb_bill'
  | 'water_bill'
  | 'maintenance'
  | 'capital'
  | 'irregular'

/** Maps expense_type to P&L category string used in downstream reports. */
export const PL_CATEGORY_MAP: Record<ExpenseType, string> = {
  kr_ho_bill: 'raw_materials.kr_ho',
  eb_bill: 'bills_annual.eb_bill',
  water_bill: 'bills_annual.water_bill',
  maintenance: 'bills_annual.hk_misc_total',
  capital: 'capital_expenditure',
  irregular: 'bills_annual.hk_misc_total',
}

export const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  kr_ho_bill: 'KR HO Bill',
  eb_bill: 'EB Bill',
  water_bill: 'Water Bill',
  maintenance: 'Maintenance & Repairs',
  capital: 'Capital Purchase',
  irregular: 'Irregular',
}

export interface UPIEntry {
  id: string
  branch: 'KR' | 'C2'
  entry_date: string
  upi_total: number | null // null = not yet entered (shows —)
  notes: string | null
  entered_by: string | null
  created_at: string
}

export interface DeliveryPlatformEntry {
  id: string
  platform: DeliveryPlatform
  branch: 'KR' | 'C2'
  period_from: string
  period_to: string
  amount_credited: number
  bank_utr: string | null
  notes: string | null
  entered_by: string | null
  created_at: string
}

export interface CashDepositRow {
  branch: 'KR' | 'C2'
  date_covered: string
  amount: number
}

export interface CashDeposit {
  id: string
  deposit_date: string
  challan_photo_url: string | null
  bank_ref: string | null
  notes: string | null
  rows: CashDepositRow[]
  total_amount: number
  submitted_by: string | null
  created_at: string
}

export interface SupervisorExpense {
  id: string
  expense_date: string
  shop_name: string
  branch: 'KR' | 'C2'
  amount: number
  bill_photo_url: string | null
  submitted_by: string | null
  float_used: boolean
  created_at: string
}

export interface OwnerManualExpense {
  id: string
  expense_date: string
  branch: 'KR' | 'C2' | null // null = both branches
  expense_type: ExpenseType
  description: string
  amount: number
  receipt_photo_url: string | null
  pl_category: string | null
  entered_by: string | null
  created_at: string
}

export interface VasanthFloatTopup {
  id: string
  topup_date: string
  amount: number
  transfer_ref: string | null
  notes: string | null
  added_by: string | null
  running_balance_after: number
  created_at: string
}

export interface VasanthFloatBalance {
  id: string
  current_balance: number
  last_updated_at: string
}

export interface FloatTransaction {
  id: string
  date: string
  type: 'topup' | 'deduction'
  description: string
  amount: number
  running_balance: number
}

export interface PLSalaryEntry {
  id: string
  branch: 'KR' | 'C2'
  month_year: string // 'YYYY-MM'
  staff_name: string
  amount: number
  notes: string | null
  entered_by: string | null
  created_at: string
}

// Staff names hardcoded per branch (Phase 11 will make these configurable)
export const STAFF_BY_BRANCH: Record<'KR' | 'C2', string[]> = {
  KR: ['Kanchana', 'Parvathi', 'Vasanth (Supervisor)'],
  C2: ['Praveen', 'Silambarasan'],
}

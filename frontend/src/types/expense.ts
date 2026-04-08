/** A single row in the expense entry form */
export interface ExpenseFormRow {
  /** Client-side key for React list rendering */
  rowKey: string
  /** Category name (from fixed list or custom) */
  category: string
  /** Amount in rupees */
  amount: number
  /** Whether this is the Gas category (flows to P&L Gas Bill) */
  isGas: boolean
  /** True for standard (pre-filled) categories; false for ad-hoc added rows */
  isStandard: boolean
}

/** Record saved to the database (expense_entries table) */
export interface ExpenseEntryRecord {
  daily_entry_id: string
  category: string
  amount: number
  is_gas: boolean
  branch: string
  entry_date: string
  entered_by: string | null
  entered_by_role: string | null
}

/** Row returned from the database when loading existing entries */
export interface ExpenseEntryRow {
  id: string
  daily_entry_id: string
  category: string
  amount: number
  is_gas: boolean
  branch: string
  entry_date: string
}

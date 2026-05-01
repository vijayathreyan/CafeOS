// ─── Phase 11 — Admin Settings types ───────────────────────────────────────────

// ── Row types ──────────────────────────────────────────────────────────────────

export interface SnackItemConfig {
  id: string
  branch: string
  item_name: string
  item_name_tamil: string | null
  input_type: 'qty' | 'prepared'
  active: boolean
  sort_order: number
  created_at: string
}

export interface CashExpenseCategory {
  id: string
  branch: string
  category_name: string
  category_name_tamil: string | null
  gas_for_pl_gas_bill: boolean
  active: boolean
  sort_order: number
  created_at: string
}

export interface SupervisorExpenseCategory {
  id: string
  category_name: string
  flows_to_hk_misc: boolean
  active: boolean
  sort_order: number
  created_at: string
}

export interface ReconciliationConfig {
  id: string
  branch: string
  amber_threshold: number
  red_threshold: number
  cash_discrepancy_tolerance: number
  upi_drop_alert_percent: number
  wastage_alert_percent: number
  supervisor_deposit_history_count: number
  updated_at: string
}

export interface PLSalaryConfig {
  id: string
  staff_name: string
  branch: string
  active: boolean
  sort_order: number
  created_at: string
}

export interface ServiceContact {
  id: string
  service_type: string
  branch: string
  contact_name: string
  phone: string
  created_at: string
  updated_at: string
}

export interface POSItem {
  id: string
  name_en: string
  name_ta: string | null
  category_id: string | null
  selling_price: number
  active_kr: boolean
  active_c2: boolean
  image_url: string | null
  sort_order: number
  created_at: string
}

export interface POSCategory {
  id: string
  name_en: string
  name_ta: string | null
  active: boolean
  created_at: string
}

export interface FixedExpenseRow {
  id: string
  branch: string
  label: string
  annual_amount: number
  months_divisor: number
  monthly_amount: number
  active: boolean
  annual_basis: string | null
  updated_at: string
}

/**
 * Admin-facing config row for the month_end_stock_config table.
 * Note: uses branch_flag (TEXT) rather than the boolean branch_kr/branch_c2
 * flags used in the data-entry flow's MonthEndStockConfig type.
 */
export interface MonthEndStockConfigItem {
  id: string
  item_name: string
  unit: string | null
  branch_flag: string
  active: boolean
  sort_order: number
  section: string
}

// ── Mutation payload types ──────────────────────────────────────────────────────

export interface CreateSnackItemPayload {
  branch: string
  item_name: string
  item_name_tamil?: string
  input_type: 'qty' | 'prepared'
  sort_order: number
}

export type UpdateSnackItemPayload = { id: string } & Partial<
  CreateSnackItemPayload & { active: boolean }
>

export interface CreateCashExpenseCategoryPayload {
  branch: string
  category_name: string
  category_name_tamil?: string
  gas_for_pl_gas_bill: boolean
  sort_order: number
}

export type UpdateCashExpenseCategoryPayload = { id: string } & Partial<
  CreateCashExpenseCategoryPayload & { active: boolean }
>

export interface CreateSupervisorExpenseCategoryPayload {
  category_name: string
  flows_to_hk_misc: boolean
  sort_order: number
}

export type UpdateSupervisorExpenseCategoryPayload = { id: string } & Partial<
  CreateSupervisorExpenseCategoryPayload & { active: boolean }
>

export type UpdateReconciliationConfigPayload = { id: string } & Partial<
  Omit<ReconciliationConfig, 'id' | 'branch' | 'updated_at'>
>

export interface CreatePLSalaryConfigPayload {
  staff_name: string
  branch: string
  sort_order: number
}

export type UpdatePLSalaryConfigPayload = { id: string } & Partial<
  CreatePLSalaryConfigPayload & { active: boolean }
>

export interface CreateServiceContactPayload {
  service_type: string
  branch: string
  contact_name: string
  phone: string
}

export type UpdateServiceContactPayload = { id: string } & Partial<CreateServiceContactPayload>

export interface CreatePOSItemPayload {
  name_en: string
  name_ta?: string
  category_id?: string
  selling_price: number
  active_kr: boolean
  active_c2: boolean
  sort_order: number
}

export type UpdatePOSItemPayload = { id: string } & Partial<CreatePOSItemPayload>

export interface CreatePOSCategoryPayload {
  name_en: string
  name_ta?: string
}

export type UpdatePOSCategoryPayload = { id: string } & Partial<
  CreatePOSCategoryPayload & { active: boolean }
>

export interface CreateMonthEndStockConfigPayload {
  item_name: string
  unit?: string
  branch_flag: string
  sort_order: number
  section: string
}

export type UpdateMonthEndStockConfigPayload = { id: string } & Partial<
  CreateMonthEndStockConfigPayload & { active: boolean }
>

export interface UpdateFixedExpensePayload {
  id: string
  annual_amount: number
  annual_basis?: string
}

export interface CreatePostPaidCustomerPayload {
  name: string
  branch: string
}

export type UpdatePostPaidCustomerPayload = { id: string } & Partial<
  CreatePostPaidCustomerPayload & { active: boolean }
>

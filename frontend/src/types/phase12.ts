// ─── Phase 12 — POS Billing PWA types ───────────────────────────────────────

/** Payment modes matching the payment_mode ENUM in the database. */
export type PaymentMode =
  | 'cash'
  | 'upi'
  | 'postpaid'
  | 'swiggy'
  | 'zomato'
  | 'free_staff'
  | 'free_others'

export interface POSSession {
  id: string
  branch: string
  shift_number: number
  staff_id: string | null
  staff_name: string | null
  opened_at: string
  closed_at: string | null
  is_closed: boolean
  status: string
  declared_cash: number | null
  expected_cash: number | null
  cash_discrepancy: number | null
  discrepancy_alert_level: string | null
  created_at: string
}

export interface Bill {
  id: string
  branch: string
  pos_session_id: string | null
  staff_id: string | null
  staff_name: string | null
  bill_date: string
  bill_time: string
  total_amount: number
  payment_mode: PaymentMode
  postpaid_customer_id: string | null
  postpaid_customer_name: string | null
  delivery_platform: string | null
  comp_type: string | null
  created_at: string
}

export interface BillItem {
  id: string
  bill_id: string
  pos_item_id: string
  item_name: string
  quantity: number
  unit_price: number
  line_total: number
  created_at: string
}

/** In-memory line item for the current bill being built. */
export interface BillLineItem {
  itemId: string
  itemName: string
  itemNameTamil: string | null
  unitPrice: number
  quantity: number
}

export interface SaveBillPayload {
  session_id: string | null
  branch: string
  staff_id: string | null
  staff_name: string | null
  total_amount: number
  payment_mode: PaymentMode
  postpaid_customer_id?: string | null
  postpaid_customer_name?: string | null
  delivery_platform?: string | null
  comp_type?: string | null
  items: BillLineItemPayload[]
}

export interface BillLineItemPayload {
  pos_item_id: string
  item_name: string
  unit_price: number
  quantity: number
}

export interface ShiftBillCounts {
  cash: number
  upi: number
  postpaid: number
  complimentary: number
  delivery: number
}

export interface CashDenomination {
  value: number
  label: string
  count: number
}

export const DENOMINATION_LIST: Pick<CashDenomination, 'value' | 'label'>[] = [
  { value: 500, label: '₹500' },
  { value: 200, label: '₹200' },
  { value: 100, label: '₹100' },
  { value: 50, label: '₹50' },
  { value: 20, label: '₹20' },
  { value: 10, label: '₹10' },
]

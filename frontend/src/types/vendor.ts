// ─── Vendor Master Types ─────────────────────────────────────────────────────
// Shared across Vendor Onboarding, Vendor Profile, Vendor Payment modules.

export type PaymentCycleType = 'mon_thu' | 'fixed_dates' | 'prepaid' | 'same_day_cash'
export type PaymentMethod = 'bank_transfer' | 'upi' | 'cash' | 'cheque'
export type BusinessType = 'individual' | 'proprietor' | 'partnership' | 'company'
export type CalcType = 'auto' | 'manual'

export interface ItemMaster {
  id: string
  name_en: string
  name_ta: string | null
  item_type: string // 'vendor_supplied' | 'made_in_shop' | 'stock' | 'beverage'
  category: string | null
  branch_kr: boolean
  branch_c2: boolean
  unit: string
  active: boolean
  ml_per_serving: number | null
  created_at: string
}

export interface VendorItemRate {
  id: string
  vendor_item_id: string
  cost_price: number
  selling_price: number | null
  unit: string | null
  cost_price_per_gram: number | null
  effective_from: string
  effective_to: string | null
  notes: string | null
  created_at: string
}

export interface VendorItem {
  id: string
  vendor_id: string
  item_id: string
  branch: 'KR' | 'C2' | null // null = both branches
  calc_type: CalcType
  start_date: string
  end_date: string | null
  active: boolean
  item_master?: ItemMaster
  vendor_item_rates?: VendorItemRate[]
}

export interface VendorBankDetails {
  id: string
  vendor_id: string
  bank_name: string | null
  account_number: string | null // BYTEA, returned as base64 from PostgREST
  ifsc_code: string | null
  account_holder_name: string | null
  upi_id: string | null
  payment_preference: PaymentMethod | null
}

export interface Vendor {
  id: string
  vendor_code: string
  business_name: string
  contact_name: string | null
  whatsapp_number: string | null
  alternate_phone: string | null
  email: string | null
  address: string | null
  google_maps_url: string | null
  business_type: BusinessType | null
  gstin: string | null
  payment_cycle_type: PaymentCycleType
  fixed_cycle_dates: number[] | null
  is_prepaid: boolean
  is_same_day_cash: boolean
  active: boolean
  onboarded_date: string
  created_at: string
  vendor_bank_details?: VendorBankDetails | null
  vendor_items?: VendorItem[]
}

// ─── Form types ───────────────────────────────────────────────────────────────

export interface VendorItemFormRow {
  item_id: string
  branch_kr: boolean
  branch_c2: boolean
  calc_type: CalcType
  cost_price: number
  selling_price?: number
  unit: string
  effective_from: string
  notes?: string
}

export interface VendorFormValues {
  // Section 1 — Business
  business_name: string
  vendor_code?: string
  business_type?: BusinessType | ''
  gstin?: string
  active: boolean
  payment_cycle_type: PaymentCycleType
  is_prepaid: boolean
  is_same_day_cash: boolean
  // Section 2 — Contact
  contact_name: string
  whatsapp_number: string
  alternate_phone?: string
  email?: string
  address?: string
  google_maps_url?: string
  // Section 3 — Items
  items: VendorItemFormRow[]
  // Section 5 — Bank & Payment
  payment_preference?: PaymentMethod | ''
  bank_name?: string
  account_number?: string
  ifsc_code?: string
  account_holder_name?: string
  upi_id?: string
  payment_notes?: string
}

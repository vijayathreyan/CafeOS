// ─── Phase 5 — Vendor Payments & Post-Paid Customers ──────────────────────────

export type VendorCycleStatus = 'pending' | 'paid'
export type VendorSectionType = 'auto_calc' | 'manual_bill'

/** Which Mon/Thu sub-cycle a vendor belongs to. */
export type VendorCycleCategory =
  | 'mon_thu' // standard Mon/Thu weekly snack vendors
  | 'fixed_dates' // 1st/11th/21st monthly (Kalingaraj)
  | 'thursday_only' // Thu payment only (Sudheer, Rajeshwari)
  | 'prepaid' // prepaid before delivery (Swach Tea)

export interface VendorPaymentCycleLog {
  id: string
  vendor_id: string
  cycle_type: string | null
  cycle_start: string
  cycle_end: string
  status: VendorCycleStatus
  system_total: number | null
  vendor_bill_amount: number | null
  total_paid: number
  notes: string | null
  created_at: string
}

export interface VendorManualBill {
  id: string
  cycle_log_id: string | null
  vendor_id: string | null
  bill_date: string
  amount: number
  photo_url: string | null
  notes: string | null
  created_at: string
}

export interface VendorAutoCalcSnapshot {
  id: string
  cycle_log_id: string
  item_name: string
  qty_supplied: number | null
  rate: number | null
  rate_effective_date: string | null
  line_total: number | null
  owner_note: string | null
  created_at: string
}

export interface VendorPaymentRecord {
  id: string
  vendor_id: string
  cycle_log_id: string | null
  amount_paid: number
  payment_method: string | null
  notes: string | null
  paid_at: string
  paid_by: string | null
}

// ─── Post-Paid Customers ──────────────────────────────────────────────────────

export interface PostPaidCustomer {
  id: string
  name: string
  contact: string | null
  branch: 'KR' | 'C2'
  active: boolean
  created_at: string
}

export interface PostPaidPayment {
  id: string
  customer_id: string
  payment_date: string
  amount_received: number
  payment_method: string | null
  notes: string | null
  entered_by: string | null
  created_at: string
}

export interface PostPaidCreditEntry {
  id: string
  daily_entry_id: string
  customer_id: string | null
  customer_name: string
  shift1_amount: number
  shift2_amount: number
  daily_total: number
  created_at: string
}

export interface PostPaidBalance {
  customer: PostPaidCustomer
  total_credit: number
  total_paid: number
  outstanding: number
  last_payment_date: string | null
  days_since_payment: number | null
}

// ─── Mutation payloads ────────────────────────────────────────────────────────

export interface MarkVendorPaidPayload {
  cycle_log_id: string | null
  vendor_id: string
  cycle_start: string
  cycle_end: string
  cycle_type: string
  amount_paid: number
  payment_method: string
  notes: string
  paid_by: string
  system_total: number | null
  vendor_bill_amount: number | null
}

export interface AddVendorBillPayload {
  vendor_id: string
  cycle_log_id: string | null
  bill_date: string
  amount: number
  photo_url: string | null
  notes: string
}

export interface RecordPostPaidPaymentPayload {
  customer_id: string
  payment_date: string
  amount_received: number
  payment_method: string
  notes: string
  entered_by: string
}

// ─── Cycle date helpers (shared by hooks + page) ──────────────────────────────

export interface CyclePeriod {
  cycleStart: string // YYYY-MM-DD
  cycleEnd: string // YYYY-MM-DD
  paymentDate: string
  label: string // e.g. "Mon 13 Apr – Wed 15 Apr"
  isPaymentDay: boolean
}

/**
 * Returns the current Mon/Thu cycle period.
 * Thursday payment covers Mon–Wed of the same week.
 * Monday payment covers Thu–Sun of the previous week.
 * On other days, returns the most recently completed cycle.
 */
export function getMonThuCycle(today: Date): CyclePeriod {
  const day = today.getDay() // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat

  const fmt = (d: Date) => d.toISOString().split('T')[0]
  const label = (s: Date, e: Date) => {
    const opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }
    return `${s.toLocaleDateString('en-IN', opts)} – ${e.toLocaleDateString('en-IN', opts)}`
  }

  if (day === 4) {
    // Thursday: pay for Mon–Wed of this week
    const mon = new Date(today)
    mon.setDate(today.getDate() - 3)
    const wed = new Date(today)
    wed.setDate(today.getDate() - 1)
    return {
      cycleStart: fmt(mon),
      cycleEnd: fmt(wed),
      paymentDate: fmt(today),
      label: label(mon, wed),
      isPaymentDay: true,
    }
  }

  if (day === 1) {
    // Monday: pay for Thu–Sun of previous week
    const thu = new Date(today)
    thu.setDate(today.getDate() - 4)
    const sun = new Date(today)
    sun.setDate(today.getDate() - 1)
    return {
      cycleStart: fmt(thu),
      cycleEnd: fmt(sun),
      paymentDate: fmt(today),
      label: label(thu, sun),
      isPaymentDay: true,
    }
  }

  // Not a payment day — show the most recently completed cycle
  // Work backwards to find the last Mon or Thu
  if (day === 0) {
    // Sunday: most recent cycle was Thu→Sat (Mon payment yesterday isn't applicable)
    // Show Thu–Sat (last Thursday through yesterday)
    const thu = new Date(today)
    thu.setDate(today.getDate() - 3)
    const sat = new Date(today)
    sat.setDate(today.getDate() - 1)
    const mon = new Date(today)
    mon.setDate(today.getDate() + 1) // tomorrow
    return {
      cycleStart: fmt(thu),
      cycleEnd: fmt(sat),
      paymentDate: fmt(mon),
      label: label(thu, sat),
      isPaymentDay: false,
    }
  }

  if (day === 2) {
    // Tuesday: show Mon–yesterday (today is Tue, Mon was yesterday, cycle not ended yet)
    // Show previous Thu–Sun cycle
    const thu = new Date(today)
    thu.setDate(today.getDate() - 5)
    const sun = new Date(today)
    sun.setDate(today.getDate() - 2)
    const mon = new Date(today)
    mon.setDate(today.getDate() - 1)
    return {
      cycleStart: fmt(thu),
      cycleEnd: fmt(sun),
      paymentDate: fmt(mon),
      label: label(thu, sun),
      isPaymentDay: false,
    }
  }

  if (day === 3) {
    // Wednesday: Mon–Tue, payment tomorrow (Thu)
    const mon = new Date(today)
    mon.setDate(today.getDate() - 2)
    const tue = new Date(today)
    tue.setDate(today.getDate() - 1)
    const thu = new Date(today)
    thu.setDate(today.getDate() + 1)
    return {
      cycleStart: fmt(mon),
      cycleEnd: fmt(tue),
      paymentDate: fmt(thu),
      label: label(mon, tue),
      isPaymentDay: false,
    }
  }

  if (day === 5) {
    // Friday: show Mon–Wed (already paid Thu), next cycle ends Sun, paid Mon
    const thu = new Date(today)
    thu.setDate(today.getDate() - 1)
    const sun = new Date(today)
    sun.setDate(today.getDate() + 2)
    const mon = new Date(today)
    mon.setDate(today.getDate() + 3)
    return {
      cycleStart: fmt(thu),
      cycleEnd: fmt(sun),
      paymentDate: fmt(mon),
      label: label(thu, sun),
      isPaymentDay: false,
    }
  }

  // Saturday: same as Friday logic
  const thu = new Date(today)
  thu.setDate(today.getDate() - 2)
  const sun = new Date(today)
  sun.setDate(today.getDate() + 1)
  const mon = new Date(today)
  mon.setDate(today.getDate() + 2)
  return {
    cycleStart: fmt(thu),
    cycleEnd: fmt(sun),
    paymentDate: fmt(mon),
    label: label(thu, sun),
    isPaymentDay: false,
  }
}

/**
 * Returns the current fixed-date cycle period for Kalingaraj.
 * Cycles: 1st–10th (pay 11th), 11th–20th (pay 21st), 21st–end (pay 1st next month).
 */
export function getFixedDateCycle(today: Date): CyclePeriod {
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  const d = today.getDate()
  const year = today.getFullYear()
  const month = today.getMonth()

  const label = (s: Date, e: Date) => {
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
    return `${s.toLocaleDateString('en-IN', opts)} – ${e.toLocaleDateString('en-IN', opts)}`
  }

  if (d <= 10) {
    // Cycle: 21st of prev month → 10th of this month, payment on 11th
    const start = new Date(year, month - 1, 21)
    const end = new Date(year, month, 10)
    const payDate = new Date(year, month, 11)
    return {
      cycleStart: fmt(start),
      cycleEnd: fmt(end),
      paymentDate: fmt(payDate),
      label: label(start, end),
      isPaymentDay: d === 11,
    }
  } else if (d <= 20) {
    // Cycle: 11th → 20th, payment on 21st
    const start = new Date(year, month, 11)
    const end = new Date(year, month, 20)
    const payDate = new Date(year, month, 21)
    return {
      cycleStart: fmt(start),
      cycleEnd: fmt(end),
      paymentDate: fmt(payDate),
      label: label(start, end),
      isPaymentDay: d === 21,
    }
  } else {
    // Cycle: 21st → end of month, payment on 1st of next month
    const start = new Date(year, month, 21)
    const end = new Date(year, month + 1, 0) // last day of this month
    const payDate = new Date(year, month + 1, 1)
    return {
      cycleStart: fmt(start),
      cycleEnd: fmt(end),
      paymentDate: fmt(payDate),
      label: label(start, end),
      isPaymentDay: d === 1,
    }
  }
}

/**
 * Vendor names that belong to Section A (auto-calculated from daily entries).
 * Key: vendor business_name substring (case-insensitive match).
 */
export const SECTION_A_VENDORS = [
  'Kalingaraj',
  'Vada Vendor',
  'Siva Shankari',
  'Devi S',
  'Cothas',
  'Cookies',
  'Bisleri',
  'Sweet Corn',
  'Banana Cake',
  'Home Bakers',
]

/**
 * Vendor names that belong to Section B (manual WhatsApp bill entry).
 * These are checked FIRST — a vendor in Section B is excluded from Section A.
 */
export const SECTION_B_VENDORS = [
  'Momos',
  'Pioneer', // KR Franchisor / KR HO
]

import { useMutation, useQuery, useQueryClient } from 'react-query'
import { supabase } from '../lib/supabase'
import { sendAlertForTrigger } from '../lib/alertService'
import type {
  POSSession,
  Bill,
  SaveBillPayload,
  ShiftBillCounts,
  PaymentMode,
} from '../types/phase12'
import type { POSItem } from '../types/phase11'
import type { PostPaidCustomer } from '../types/phase5'

// ── Active session ────────────────────────────────────────────────────────────

/**
 * Returns the open pos_session for the given staff+branch, if any.
 */
export function useActiveSession(staffId: string | undefined, branch: string | undefined) {
  return useQuery<POSSession | null>(
    ['pos_active_session', staffId, branch],
    async () => {
      if (!staffId || !branch) return null
      const { data, error } = await supabase
        .from('pos_sessions')
        .select('*')
        .eq('staff_id', staffId)
        .eq('branch', branch)
        .eq('is_closed', false)
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return (data ?? null) as POSSession | null
    },
    { enabled: !!staffId && !!branch, retry: 2, staleTime: 10000 }
  )
}

/**
 * Opens a new shift (inserts a pos_sessions row).
 * Returns the new session row.
 */
export function useOpenSession() {
  const qc = useQueryClient()
  return useMutation(
    async (payload: {
      branch: string
      staff_id: string
      staff_name: string
    }): Promise<POSSession> => {
      const { data, error } = await supabase
        .from('pos_sessions')
        .insert({
          branch: payload.branch,
          staff_id: payload.staff_id,
          staff_name: payload.staff_name,
          shift_number: 1,
          opened_at: new Date().toISOString(),
          is_closed: false,
          status: 'open',
        })
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data as POSSession
    },
    {
      onSuccess: (_, vars) => {
        qc.invalidateQueries(['pos_active_session', vars.staff_id, vars.branch])
      },
    }
  )
}

// ── Session bills ─────────────────────────────────────────────────────────────

/**
 * Fetches all bills for a given session, used for shift-close summary.
 */
export function useSessionBills(sessionId: string | undefined) {
  return useQuery<Bill[]>(
    ['pos_session_bills', sessionId],
    async () => {
      if (!sessionId) return []
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('pos_session_id', sessionId)
        .order('bill_time', { ascending: true })
      if (error) throw new Error(error.message)
      return (data ?? []) as Bill[]
    },
    { enabled: !!sessionId, retry: 2, staleTime: 5000 }
  )
}

/**
 * Returns bill counts per payment-mode type for the shift-close Step 1 screen.
 */
export function useShiftBillCounts(sessionId: string | undefined): ShiftBillCounts {
  const { data: bills = [] } = useSessionBills(sessionId)
  return {
    cash: bills.filter((b) => b.payment_mode === 'cash').length,
    upi: bills.filter((b) => b.payment_mode === 'upi').length,
    postpaid: bills.filter((b) => b.payment_mode === 'postpaid').length,
    complimentary: bills.filter(
      (b) => b.payment_mode === 'free_staff' || b.payment_mode === 'free_others'
    ).length,
    delivery: bills.filter((b) => b.payment_mode === 'swiggy' || b.payment_mode === 'zomato')
      .length,
  }
}

// ── Save bill ─────────────────────────────────────────────────────────────────

/**
 * Saves a completed bill (bills + bill_items rows).
 * Auto-increments the postpaid_customer outstanding balance when mode = 'postpaid'.
 * Returns the new bill id.
 */
export function useSaveBill() {
  const qc = useQueryClient()
  return useMutation(
    async (payload: SaveBillPayload): Promise<string> => {
      // Insert bill row
      const { data: billRow, error: billErr } = await supabase
        .from('bills')
        .insert({
          branch: payload.branch,
          pos_session_id: payload.session_id,
          staff_id: payload.staff_id,
          staff_name: payload.staff_name,
          bill_date: new Date().toISOString().split('T')[0],
          bill_time: new Date().toISOString(),
          total_amount: payload.total_amount,
          payment_mode: payload.payment_mode,
          postpaid_customer_id: payload.postpaid_customer_id ?? null,
          postpaid_customer_name: payload.postpaid_customer_name ?? null,
          delivery_platform: payload.delivery_platform ?? null,
          comp_type: payload.comp_type ?? null,
        })
        .select('id')
        .single()
      if (billErr) throw new Error(billErr.message)
      const billId = (billRow as { id: string }).id

      // Insert bill_items
      if (payload.items.length > 0) {
        const { error: itemsErr } = await supabase.from('bill_items').insert(
          payload.items.map((it) => ({
            bill_id: billId,
            pos_item_id: it.pos_item_id,
            item_name: it.item_name,
            unit_price: it.unit_price,
            quantity: it.quantity,
          }))
        )
        if (itemsErr) throw new Error(itemsErr.message)
      }

      return billId
    },
    {
      onSuccess: (_, vars) => {
        qc.invalidateQueries(['pos_session_bills', vars.session_id])
        qc.invalidateQueries('postpaid_customers')
        qc.invalidateQueries('postpaid_balances')
      },
    }
  )
}

// ── Close session ─────────────────────────────────────────────────────────────

/**
 * Closes a pos_session:
 * 1. Computes expected_cash from all cash bills in the session.
 * 2. Saves declared_cash, expected_cash, discrepancy, alert_level to pos_sessions.
 * 3. Fires WhatsApp alert if amber/red.
 * Returns the closed session row.
 */
export function useCloseSession() {
  const qc = useQueryClient()
  return useMutation(
    async (payload: {
      sessionId: string
      branch: string
      staffId: string
      staffName: string
      declaredCash: number
    }): Promise<{ alertLevel: string; discrepancy: number }> => {
      // Compute expected cash from all cash bills in session
      const { data: cashBills, error: fetchErr } = await supabase
        .from('bills')
        .select('total_amount')
        .eq('pos_session_id', payload.sessionId)
        .eq('payment_mode', 'cash')
      if (fetchErr) throw new Error(fetchErr.message)

      const expectedCash = (cashBills ?? []).reduce((sum, b) => sum + Number(b.total_amount), 0)
      const discrepancy = expectedCash - payload.declaredCash

      // Determine alert level using reconciliation_config tolerances or defaults
      const { data: cfg } = await supabase
        .from('reconciliation_config')
        .select('cash_discrepancy_tolerance')
        .eq('branch', payload.branch)
        .maybeSingle()
      const tolerance = cfg ? Number(cfg.cash_discrepancy_tolerance) : 50
      const abs = Math.abs(discrepancy)
      const alertLevel = abs <= tolerance ? 'green' : abs <= 200 ? 'amber' : 'red'

      // Update pos_sessions
      const { error: updateErr } = await supabase
        .from('pos_sessions')
        .update({
          is_closed: true,
          status: 'closed',
          closed_at: new Date().toISOString(),
          declared_cash: payload.declaredCash,
          expected_cash: expectedCash,
          cash_discrepancy: discrepancy,
          discrepancy_alert_level: alertLevel,
        })
        .eq('id', payload.sessionId)
      if (updateErr) throw new Error(updateErr.message)

      // Insert cash_discrepancy record
      await supabase.from('cash_discrepancy').insert({
        pos_session_id: payload.sessionId,
        branch: payload.branch,
        shift_number: 1,
        staff_id: payload.staffId,
        staff_name: payload.staffName,
        pos_cash_total: expectedCash,
        declared_cash: payload.declaredCash,
        shift_date: new Date().toISOString().split('T')[0],
        alert_level: alertLevel,
      })

      // Fire alert if needed
      if (alertLevel === 'amber') {
        await sendAlertForTrigger('cash_discrepancy_amber', {
          branch: payload.branch,
          staff: payload.staffName,
          discrepancy: Math.abs(discrepancy).toFixed(0),
          direction: discrepancy > 0 ? 'SHORT' : 'OVER',
        })
      } else if (alertLevel === 'red') {
        await sendAlertForTrigger('cash_discrepancy_red', {
          branch: payload.branch,
          staff: payload.staffName,
          discrepancy: Math.abs(discrepancy).toFixed(0),
          direction: discrepancy > 0 ? 'SHORT' : 'OVER',
        })
      }

      return { alertLevel, discrepancy }
    },
    {
      onSuccess: (_, vars) => {
        // Don't invalidate pos_active_session here — POSBillingScreen must stay mounted
        // so ShiftCloseFlow can show the confirm step. Session cache refreshes when user
        // next navigates to /pos.
        qc.invalidateQueries(['pos_session_bills', vars.sessionId])
      },
    }
  )
}

// ── POS items for billing (branch-filtered) ───────────────────────────────────

/**
 * Fetches active POS-billable items for the current branch, caches to localStorage for offline.
 * Reads display data (name, price, branch flags, active) from item_master — the single source
 * of truth since the Phase 12B pos_items/item_master merge. `id` and `category_id` come from the
 * linked pos_items row so bill_items.pos_item_id (still FK'd to pos_items) stays valid — see
 * CONTEXT.md follow-up note on migrating that FK to item_master directly.
 */
export function usePOSItemsForBilling(branch: string | undefined) {
  return useQuery<POSItem[]>(
    ['pos_items_billing', branch],
    async () => {
      const col = branch === 'KR' ? 'branch_kr' : 'branch_c2'
      const { data: masterRows, error: masterErr } = await supabase
        .from('item_master')
        .select(
          'id, name_en, name_ta, selling_price, active, ml_per_serving, image_url, pos_sort_order, branch_kr, branch_c2'
        )
        .eq('used_in_pos_billing', true)
        .eq(col, true)
        .eq('active', true)
        .order('pos_sort_order', { ascending: true })
      if (masterErr) throw new Error(masterErr.message)

      const rows = masterRows ?? []
      let items: POSItem[] = []

      if (rows.length > 0) {
        const { data: linkedPosItems, error: posErr } = await supabase
          .from('pos_items')
          .select('id, item_id, category_id')
          .in(
            'item_id',
            rows.map((r) => r.id)
          )
        if (posErr) throw new Error(posErr.message)

        const posByItemId = new Map((linkedPosItems ?? []).map((p) => [p.item_id as string, p]))

        items = rows
          .map((r) => {
            const linked = posByItemId.get(r.id)
            if (!linked) return null
            return {
              id: linked.id,
              name_en: r.name_en,
              name_ta: r.name_ta,
              category_id: linked.category_id,
              selling_price: Number(r.selling_price),
              branch_kr: r.branch_kr,
              branch_c2: r.branch_c2,
              image_url: r.image_url,
              sort_order: r.pos_sort_order ?? 0,
              active: r.active,
              ml_per_serving: r.ml_per_serving,
              updated_at: null,
              created_at: '',
            } as POSItem
          })
          .filter((x): x is POSItem => x !== null)
      }

      // Cache for offline
      try {
        localStorage.setItem(`pos_items_cache_${branch}`, JSON.stringify(items))
      } catch {
        /* localStorage unavailable — skip cache */
      }
      return items
    },
    {
      enabled: !!branch,
      retry: 2,
      staleTime: 60000,
      placeholderData: () => {
        try {
          const cached = localStorage.getItem(`pos_items_cache_${branch}`)
          return cached ? (JSON.parse(cached) as POSItem[]) : undefined
        } catch {
          return undefined
        }
      },
    }
  )
}

// ── Post-paid customers for billing ──────────────────────────────────────────

/**
 * Returns active post-paid customers for the given branch.
 */
export function usePostPaidCustomersForBranch(branch: string | undefined) {
  return useQuery<PostPaidCustomer[]>(
    ['postpaid_customers_billing', branch],
    async () => {
      if (!branch) return []
      const { data, error } = await supabase
        .from('postpaid_customers')
        .select('*')
        .eq('branch', branch)
        .eq('active', true)
        .order('name', { ascending: true })
      if (error) throw new Error(error.message)
      return (data ?? []) as PostPaidCustomer[]
    },
    { enabled: !!branch, retry: 2, staleTime: 60000 }
  )
}

// ── Price history on price change ────────────────────────────────────────────

/**
 * Updates pos_item selling_price and inserts pos_item_price_history record.
 * Dual-writes the new price into the linked item_master row so POS billing
 * (which now reads price from item_master) reflects the change — until the
 * pos_item_price_history FK is migrated to item_master directly (see
 * CONTEXT.md follow-up note).
 */
export function useUpdatePOSItemPrice() {
  const qc = useQueryClient()
  return useMutation(
    async (payload: { itemId: string; oldPrice: number; newPrice: number; changedBy: string }) => {
      const { error: histErr } = await supabase.from('pos_item_price_history').insert({
        pos_item_id: payload.itemId,
        old_price: payload.oldPrice,
        new_price: payload.newPrice,
        effective_date: new Date().toISOString(),
        changed_by: payload.changedBy,
      })
      if (histErr) throw new Error(histErr.message)

      const { data: updatedPosItem, error: updateErr } = await supabase
        .from('pos_items')
        .update({ selling_price: payload.newPrice, updated_at: new Date().toISOString() })
        .eq('id', payload.itemId)
        .select('item_id')
        .single()
      if (updateErr) throw new Error(updateErr.message)

      if (updatedPosItem?.item_id) {
        const { error: masterErr } = await supabase
          .from('item_master')
          .update({ selling_price: payload.newPrice })
          .eq('id', updatedPosItem.item_id)
        if (masterErr) throw new Error(masterErr.message)
      }
    },
    {
      onSuccess: () => {
        qc.invalidateQueries('pos_items')
        qc.invalidateQueries('pos_items_billing')
        qc.invalidateQueries('item_master')
      },
    }
  )
}

// ── Offline bill queue helpers ────────────────────────────────────────────────

const POS_BILL_QUEUE_KEY = 'pos_bill_queue'

export interface QueuedBill {
  clientId: string
  payload: SaveBillPayload
  queuedAt: string
}

/** Adds a bill payload to the localStorage offline queue. */
export function enqueueBill(payload: SaveBillPayload): string {
  const clientId = crypto.randomUUID()
  const queue = getQueuedBills()
  queue.push({ clientId, payload, queuedAt: new Date().toISOString() })
  localStorage.setItem(POS_BILL_QUEUE_KEY, JSON.stringify(queue))
  return clientId
}

/** Returns all queued bills from localStorage. */
export function getQueuedBills(): QueuedBill[] {
  try {
    return JSON.parse(localStorage.getItem(POS_BILL_QUEUE_KEY) ?? '[]')
  } catch {
    return []
  }
}

/** Removes a queued bill by clientId after successful sync. */
export function dequeueBill(clientId: string) {
  const queue = getQueuedBills().filter((q) => q.clientId !== clientId)
  localStorage.setItem(POS_BILL_QUEUE_KEY, JSON.stringify(queue))
}

/** Clears the entire offline queue (after full sync). */
export function clearBillQueue() {
  localStorage.removeItem(POS_BILL_QUEUE_KEY)
}

/** Returns the count of offline-queued bills. */
export function getQueuedBillCount(): number {
  return getQueuedBills().length
}

// ── Daily POS summary for reports ────────────────────────────────────────────

/**
 * Returns aggregated POS bill totals for a given branch and date.
 * Used by Daily Sales Summary to fill "Billed Sales" column.
 */
export function usePOSDaySummary(branch: string, date: string) {
  return useQuery(
    ['pos_day_summary', branch, date],
    async () => {
      const { data, error } = await supabase
        .from('bills')
        .select('payment_mode, total_amount')
        .eq('branch', branch)
        .eq('bill_date', date)
      if (error) throw new Error(error.message)
      const bills = (data ?? []) as { payment_mode: PaymentMode; total_amount: number }[]

      const total = bills.reduce((s, b) => s + Number(b.total_amount), 0)
      const cash = bills
        .filter((b) => b.payment_mode === 'cash')
        .reduce((s, b) => s + Number(b.total_amount), 0)
      const upi = bills
        .filter((b) => b.payment_mode === 'upi')
        .reduce((s, b) => s + Number(b.total_amount), 0)
      const swiggy = bills
        .filter((b) => b.payment_mode === 'swiggy')
        .reduce((s, b) => s + Number(b.total_amount), 0)
      const zomato = bills
        .filter((b) => b.payment_mode === 'zomato')
        .reduce((s, b) => s + Number(b.total_amount), 0)
      const postpaid = bills
        .filter((b) => b.payment_mode === 'postpaid')
        .reduce((s, b) => s + Number(b.total_amount), 0)

      return { total, cash, upi, swiggy, zomato, postpaid, billCount: bills.length }
    },
    { enabled: !!branch && !!date, retry: 2, staleTime: 30000 }
  )
}

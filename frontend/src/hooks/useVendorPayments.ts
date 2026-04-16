import { useQuery, useMutation, useQueryClient } from 'react-query'
import { supabase } from '../lib/supabase'
import type {
  VendorPaymentCycleLog,
  VendorManualBill,
  VendorPaymentRecord,
  MarkVendorPaidPayload,
  AddVendorBillPayload,
} from '../types/phase5'

/**
 * Fetches vendor_payment_cycles_log entries overlapping a date range.
 * Used to determine paid/pending status for each vendor in the current cycle.
 *
 * @param cycleStart - Start date of the cycle (YYYY-MM-DD)
 * @param cycleEnd   - End date of the cycle (YYYY-MM-DD)
 * @param session    - Auth session guard
 */
export function useVendorCycleLogs(cycleStart: string, cycleEnd: string, session: boolean) {
  return useQuery<VendorPaymentCycleLog[]>(
    ['vendor_cycle_logs', cycleStart, cycleEnd],
    async () => {
      const { data, error } = await supabase
        .from('vendor_payment_cycles_log')
        .select('*')
        .gte('cycle_start', cycleStart)
        .lte('cycle_end', cycleEnd)
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as VendorPaymentCycleLog[]
    },
    { enabled: !!session && !!cycleStart && !!cycleEnd, retry: 2, staleTime: 30000 }
  )
}

/**
 * Fetches all manual bills for a vendor within a date range.
 * Used by Section B vendor cards to show pending bills for the cycle.
 *
 * @param vendorId   - Vendor UUID
 * @param cycleStart - Start date (YYYY-MM-DD)
 * @param cycleEnd   - End date (YYYY-MM-DD)
 * @param session    - Auth session guard
 */
export function useVendorManualBillsForCycle(
  vendorId: string | undefined,
  cycleStart: string,
  cycleEnd: string,
  session: boolean
) {
  return useQuery<VendorManualBill[]>(
    ['vendor_manual_bills_cycle', vendorId, cycleStart, cycleEnd],
    async () => {
      const { data, error } = await supabase
        .from('vendor_manual_bills')
        .select('*')
        .eq('vendor_id', vendorId as string)
        .gte('bill_date', cycleStart)
        .lte('bill_date', cycleEnd)
        .order('bill_date', { ascending: true })
      if (error) throw new Error(error.message)
      return (data ?? []) as VendorManualBill[]
    },
    { enabled: !!session && !!vendorId, retry: 2, staleTime: 30000 }
  )
}

/**
 * Fetches full payment history for a single vendor.
 * Returns cycle logs joined with payment records, ordered newest first.
 *
 * @param vendorId - Vendor UUID (undefined disables the query)
 * @param session  - Auth session guard
 */
export function useVendorPaymentHistory(vendorId: string | undefined, session: boolean) {
  return useQuery<{ cycles: VendorPaymentCycleLog[]; payments: VendorPaymentRecord[] }>(
    ['vendor_payment_history', vendorId],
    async () => {
      const [cyclesRes, paymentsRes] = await Promise.all([
        supabase
          .from('vendor_payment_cycles_log')
          .select('*')
          .eq('vendor_id', vendorId as string)
          .order('cycle_start', { ascending: false })
          .limit(24),
        supabase
          .from('vendor_payments')
          .select('*')
          .eq('vendor_id', vendorId as string)
          .order('paid_at', { ascending: false })
          .limit(24),
      ])
      if (cyclesRes.error) throw new Error(cyclesRes.error.message)
      if (paymentsRes.error) throw new Error(paymentsRes.error.message)
      return {
        cycles: (cyclesRes.data ?? []) as VendorPaymentCycleLog[],
        payments: (paymentsRes.data ?? []) as VendorPaymentRecord[],
      }
    },
    { enabled: !!session && !!vendorId, retry: 2, staleTime: 30000 }
  )
}

/**
 * Computes the auto-calculated total for a Section A vendor over a cycle period.
 * Queries snack_entries for snack vendors; milk_entries for Kalingaraj.
 * Returns line items (item_name, qty, rate, line_total) for display.
 *
 * @param vendorId   - Vendor UUID
 * @param cycleStart - Cycle start date
 * @param cycleEnd   - Cycle end date
 * @param session    - Auth session guard
 */
export function useVendorAutoTotal(
  vendorId: string | undefined,
  cycleStart: string,
  cycleEnd: string,
  session: boolean
) {
  return useQuery<{ item_name: string; qty: number; rate: number; line_total: number }[]>(
    ['vendor_auto_total', vendorId, cycleStart, cycleEnd],
    async () => {
      if (!vendorId) return []

      // 1. Get active vendor_items with item details and latest rate
      const { data: vendorItems, error: viErr } = await supabase
        .from('vendor_items')
        .select(
          `
          id,
          item_id,
          item_master ( id, name_en, unit ),
          vendor_item_rates ( cost_price, effective_from, effective_to )
        `
        )
        .eq('vendor_id', vendorId)
        .eq('active', true)

      if (viErr) throw new Error(viErr.message)
      if (!vendorItems || vendorItems.length === 0) return []

      const lines: { item_name: string; qty: number; rate: number; line_total: number }[] = []

      for (const vi of vendorItems) {
        // Pick the rate effective during the cycle period (most recent effective_from <= cycleEnd)
        const rates =
          (vi.vendor_item_rates as {
            cost_price: number
            effective_from: string
            effective_to: string | null
          }[]) ?? []
        const sortedRates = rates
          .filter((r) => r.effective_from <= cycleEnd)
          .sort((a, b) => (a.effective_from < b.effective_from ? 1 : -1))
        const rate = sortedRates[0]?.cost_price ?? 0

        const im = vi.item_master as unknown as { id: string; name_en: string; unit: string } | null
        if (!im) continue
        const itemName = im.name_en
        const itemId = vi.item_id as string

        // 2a. For Milk item: sum litres from milk_entries via daily_entries
        if (itemName === 'Milk') {
          // Get daily_entry_ids in the cycle period
          const { data: de } = await supabase
            .from('daily_entries')
            .select('id')
            .gte('entry_date', cycleStart)
            .lte('entry_date', cycleEnd)

          const deIds = (de ?? []).map((d) => d.id as string)
          if (deIds.length === 0) continue

          const { data: milkRows } = await supabase
            .from('milk_entries')
            .select('coffee_milk_litres, tea_milk_litres')
            .in('daily_entry_id', deIds)

          const totalLitres = (milkRows ?? []).reduce(
            (acc, r) => acc + (r.coffee_milk_litres as number) + (r.tea_milk_litres as number),
            0
          )

          if (totalLitres > 0) {
            lines.push({
              item_name: 'Milk',
              qty: Math.round(totalLitres * 100) / 100,
              rate,
              line_total: Math.round(totalLitres * rate * 100) / 100,
            })
          }
          continue
        }

        // 2b. For snack items: sum qty from snack_entries via daily_entries
        const { data: de2 } = await supabase
          .from('daily_entries')
          .select('id')
          .gte('entry_date', cycleStart)
          .lte('entry_date', cycleEnd)

        const deIds2 = (de2 ?? []).map((d) => d.id as string)
        if (deIds2.length === 0) continue

        const { data: snackRows } = await supabase
          .from('snack_entries')
          .select('qty, prepared')
          .eq('item_id', itemId)
          .in('daily_entry_id', deIds2)

        const totalQty = (snackRows ?? []).reduce(
          (acc, r) => acc + ((r.qty as number) || (r.prepared as number) || 0),
          0
        )

        if (totalQty > 0) {
          lines.push({
            item_name: itemName,
            qty: totalQty,
            rate,
            line_total: Math.round(totalQty * rate * 100) / 100,
          })
        }
      }

      return lines
    },
    { enabled: !!session && !!vendorId && !!cycleStart, retry: 2, staleTime: 60000 }
  )
}

/**
 * Mutation: creates or updates a cycle log and records the vendor payment.
 * Sets cycle log status to 'paid' and inserts a vendor_payments record.
 */
export function useMarkVendorPaid() {
  const qc = useQueryClient()

  return useMutation(
    async (payload: MarkVendorPaidPayload) => {
      let cycleLogId = payload.cycle_log_id

      if (!cycleLogId) {
        // Create a new cycle log
        const { data: cycleLog, error: logErr } = await supabase
          .from('vendor_payment_cycles_log')
          .insert({
            vendor_id: payload.vendor_id,
            cycle_start: payload.cycle_start,
            cycle_end: payload.cycle_end,
            cycle_type: payload.cycle_type,
            status: 'paid',
            system_total: payload.system_total,
            vendor_bill_amount: payload.vendor_bill_amount,
            total_paid: payload.amount_paid,
            notes: payload.notes || null,
          })
          .select('id')
          .single()
        if (logErr) throw new Error(logErr.message)
        cycleLogId = (cycleLog as { id: string }).id
      } else {
        // Update existing cycle log to paid
        const { error: updateErr } = await supabase
          .from('vendor_payment_cycles_log')
          .update({
            status: 'paid',
            vendor_bill_amount: payload.vendor_bill_amount,
            total_paid: payload.amount_paid,
            notes: payload.notes || null,
          })
          .eq('id', cycleLogId)
        if (updateErr) throw new Error(updateErr.message)
      }

      // Record the payment
      const { error: payErr } = await supabase.from('vendor_payments').insert({
        vendor_id: payload.vendor_id,
        cycle_log_id: cycleLogId,
        amount_paid: payload.amount_paid,
        payment_method: payload.payment_method as 'bank_transfer' | 'upi' | 'cash' | 'cheque',
        notes: payload.notes || null,
        paid_by: payload.paid_by || null,
      })
      if (payErr) throw new Error(payErr.message)
    },
    {
      onSuccess: () => {
        qc.invalidateQueries('vendor_cycle_logs')
        qc.invalidateQueries('vendor_payment_history')
        qc.invalidateQueries('vendor_manual_bills_cycle')
      },
    }
  )
}

/**
 * Mutation: adds a manual WhatsApp bill for a Section B vendor.
 * Creates the bill record and optionally updates the cycle log's system_total.
 */
export function useAddVendorBill() {
  const qc = useQueryClient()

  return useMutation(
    async (payload: AddVendorBillPayload) => {
      const { error } = await supabase.from('vendor_manual_bills').insert({
        vendor_id: payload.vendor_id,
        cycle_log_id: payload.cycle_log_id || null,
        bill_date: payload.bill_date,
        amount: payload.amount,
        photo_url: payload.photo_url || null,
        notes: payload.notes || null,
      })
      if (error) throw new Error(error.message)
    },
    {
      onSuccess: () => {
        qc.invalidateQueries('vendor_manual_bills_cycle')
        qc.invalidateQueries('vendor_cycle_logs')
      },
    }
  )
}

/**
 * Mutation: creates or updates the system_total on a cycle log.
 * Called when the owner reviews auto-calc totals and saves the snapshot.
 */
export function useUpsertCycleLog() {
  const qc = useQueryClient()

  return useMutation(
    async (payload: {
      vendor_id: string
      cycle_start: string
      cycle_end: string
      cycle_type: string
      system_total: number | null
      vendor_bill_amount: number | null
      notes: string | null
    }) => {
      // Check if a cycle log already exists for this vendor+period
      const { data: existing } = await supabase
        .from('vendor_payment_cycles_log')
        .select('id')
        .eq('vendor_id', payload.vendor_id)
        .eq('cycle_start', payload.cycle_start)
        .eq('cycle_end', payload.cycle_end)
        .maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from('vendor_payment_cycles_log')
          .update({
            system_total: payload.system_total,
            vendor_bill_amount: payload.vendor_bill_amount,
            notes: payload.notes,
          })
          .eq('id', (existing as { id: string }).id)
        if (error) throw new Error(error.message)
        return (existing as { id: string }).id
      } else {
        const { data, error } = await supabase
          .from('vendor_payment_cycles_log')
          .insert({
            vendor_id: payload.vendor_id,
            cycle_start: payload.cycle_start,
            cycle_end: payload.cycle_end,
            cycle_type: payload.cycle_type,
            status: 'pending',
            system_total: payload.system_total,
            vendor_bill_amount: payload.vendor_bill_amount,
            notes: payload.notes,
          })
          .select('id')
          .single()
        if (error) throw new Error(error.message)
        return (data as { id: string }).id
      }
    },
    {
      onSuccess: () => {
        qc.invalidateQueries('vendor_cycle_logs')
      },
    }
  )
}

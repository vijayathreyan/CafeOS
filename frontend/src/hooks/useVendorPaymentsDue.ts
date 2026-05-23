import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '../lib/supabase'

export interface VendorDue {
  id: string
  vendorId: string
  vendorName: string
  amount: number | null
  cycleEnd: string
  status: 'overdue' | 'due_today' | 'upcoming'
}

/**
 * Fetches vendor payment cycles that are pending and due within the next 3 days.
 * Shows overdue (past due), due today, and upcoming (next 3 days) payments.
 * Refetches every 5 minutes.
 */
export function useVendorPaymentsDue() {
  const today = new Date().toISOString().slice(0, 10)
  const threeDaysLater = new Date()
  threeDaysLater.setDate(threeDaysLater.getDate() + 3)
  const futureDateStr = threeDaysLater.toISOString().slice(0, 10)

  // Past 7 days for overdue
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const pastDateStr = sevenDaysAgo.toISOString().slice(0, 10)

  return useSupabaseQuery<VendorDue[]>(
    ['vendor_payments_due', today],
    async () => {
      const { data: cycles, error } = await supabase
        .from('vendor_payment_cycles_log')
        .select('id, vendor_id, cycle_end, vendor_bill_amount, system_total')
        .eq('status', 'pending')
        .gte('cycle_end', pastDateStr)
        .lte('cycle_end', futureDateStr)
        .order('cycle_end', { ascending: true })
        .limit(20)

      if (error) throw new Error(error.message)
      if (!cycles || cycles.length === 0) return []

      // Fetch vendor names
      const vendorIds = [...new Set(cycles.map((c) => c.vendor_id).filter(Boolean))]
      const { data: vendors } = await supabase
        .from('vendors')
        .select('id, name')
        .in('id', vendorIds)

      const vendorMap: Record<string, string> = {}
      for (const v of vendors ?? []) {
        vendorMap[v.id] = v.name
      }

      return cycles.map((cycle): VendorDue => {
        const amount = cycle.vendor_bill_amount ?? cycle.system_total ?? null
        const cycleEnd = cycle.cycle_end
        let status: VendorDue['status'] = 'upcoming'
        if (cycleEnd < today) status = 'overdue'
        else if (cycleEnd === today) status = 'due_today'

        return {
          id: cycle.id,
          vendorId: cycle.vendor_id,
          vendorName: vendorMap[cycle.vendor_id] ?? 'Unknown Vendor',
          amount,
          cycleEnd,
          status,
        }
      })
    },
    { retry: 2, staleTime: 60000, refetchInterval: 300000 }
  )
}

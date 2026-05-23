import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '../lib/supabase'

export interface LiveTotalsData {
  totalSales: number
  cashTotal: number
  upiTotal: number
  postpaidTotal: number
  deliveryTotal: number
  billCount: number
  lastBillTime: string | null
  isShiftOpen: boolean
  shiftOpenSince: string | null
}

/**
 * Real-time live totals for one branch for a given date.
 * Aggregates bills by payment mode and checks shift open status.
 * Refetches every 60 seconds for live dashboard updates.
 */
export function useDashboardLiveTotals(branch: 'KR' | 'C2', date: string) {
  return useSupabaseQuery<LiveTotalsData>(
    ['dashboard_live_totals', branch, date],
    async () => {
      const [billsRes, sessionRes] = await Promise.all([
        supabase
          .from('bills')
          .select('total_amount, payment_mode, created_at')
          .eq('branch', branch)
          .eq('bill_date', date),
        supabase
          .from('pos_sessions')
          .select('opened_at, is_closed')
          .eq('branch', branch)
          .eq('is_closed', false)
          .gte('opened_at', `${date}T00:00:00`)
          .lte('opened_at', `${date}T23:59:59`)
          .order('opened_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      const bills = billsRes.data ?? []

      let totalSales = 0
      let cashTotal = 0
      let upiTotal = 0
      let postpaidTotal = 0
      let deliveryTotal = 0
      let lastBillTime: string | null = null

      for (const bill of bills) {
        const amt = Number(bill.total_amount ?? 0)
        totalSales += amt
        const mode = bill.payment_mode as string
        if (mode === 'cash') cashTotal += amt
        else if (mode === 'upi') upiTotal += amt
        else if (mode === 'postpaid') postpaidTotal += amt
        else if (mode === 'swiggy' || mode === 'zomato') deliveryTotal += amt

        if (!lastBillTime || bill.created_at > lastBillTime) {
          lastBillTime = bill.created_at
        }
      }

      const session = sessionRes.data

      return {
        totalSales,
        cashTotal,
        upiTotal,
        postpaidTotal,
        deliveryTotal,
        billCount: bills.length,
        lastBillTime,
        isShiftOpen: !!session,
        shiftOpenSince: session?.opened_at ?? null,
      }
    },
    { retry: 2, staleTime: 30000, refetchInterval: 60000 }
  )
}

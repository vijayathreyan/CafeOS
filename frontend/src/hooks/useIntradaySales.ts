import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '../lib/supabase'

export interface IntradayHour {
  hour: number
  total: number
  count: number
  kr_total: number
  c2_total: number
}

/**
 * Fetches bills for a branch/date and groups by hour (6–23).
 * If date is today, refetches every 60 seconds.
 * If date is a past date, no auto-refresh (historical mode).
 */
export function useIntradaySales(branch: 'KR' | 'C2' | 'both', date: string) {
  const today = new Date().toISOString().slice(0, 10)
  const isToday = date === today

  return useSupabaseQuery<IntradayHour[]>(
    ['intraday_sales', branch, date],
    async () => {
      let q = supabase
        .from('bills')
        .select('total_amount, branch, bill_time, created_at')
        .eq('bill_date', date)

      if (branch !== 'both') {
        q = q.eq('branch', branch)
      }

      const { data, error } = await q
      if (error) throw new Error(error.message)

      // Build 18 hour slots: 6 through 23
      const slots: IntradayHour[] = []
      for (let h = 6; h <= 23; h++) {
        slots.push({ hour: h, total: 0, count: 0, kr_total: 0, c2_total: 0 })
      }

      for (const bill of data ?? []) {
        // Parse hour from bill_time (HH:MM:SS) or fall back to created_at
        let hour = 0
        if (bill.bill_time) {
          hour = parseInt(bill.bill_time.slice(0, 2), 10)
        } else if (bill.created_at) {
          hour = new Date(bill.created_at).getHours()
        }

        const slotIdx = hour - 6
        if (slotIdx >= 0 && slotIdx < 18) {
          const amt = Number(bill.total_amount ?? 0)
          slots[slotIdx].total += amt
          slots[slotIdx].count += 1
          if (bill.branch === 'KR') slots[slotIdx].kr_total += amt
          else if (bill.branch === 'C2') slots[slotIdx].c2_total += amt
        }
      }

      return slots
    },
    {
      retry: 2,
      staleTime: 30000,
      refetchInterval: isToday ? 60000 : false,
    }
  )
}

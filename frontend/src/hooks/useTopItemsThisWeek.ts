import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '../lib/supabase'

export interface TopItem {
  item_name: string
  total_revenue: number
  bill_count: number
  rank: number
}

/**
 * Fetches top 8 POS items by revenue for the current week.
 * Joins bill_items with bills and filters by current week dates.
 * Refetches every 5 minutes.
 */
export function useTopItemsThisWeek(branch: 'KR' | 'C2' | 'combined') {
  // Get Monday of current week
  const today = new Date()
  const dayOfWeek = (today.getDay() + 6) % 7 // 0=Mon, 6=Sun
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - dayOfWeek)
  const weekStartStr = weekStart.toISOString().slice(0, 10)
  const weekEndStr = today.toISOString().slice(0, 10)

  return useSupabaseQuery<TopItem[]>(
    ['top_items_week', branch, weekStartStr],
    async () => {
      // Get bill IDs for this week + branch filter
      let billQuery = supabase
        .from('bills')
        .select('id')
        .gte('bill_date', weekStartStr)
        .lte('bill_date', weekEndStr)

      if (branch !== 'combined') {
        billQuery = billQuery.eq('branch', branch)
      }

      const { data: bills, error: billsError } = await billQuery
      if (billsError) throw new Error(billsError.message)

      const billIds = (bills ?? []).map((b) => b.id)
      if (billIds.length === 0) return []

      // Get bill items for those bills
      const { data: items, error: itemsError } = await supabase
        .from('bill_items')
        .select('item_name, quantity, line_total, bill_id')
        .in('bill_id', billIds)

      if (itemsError) throw new Error(itemsError.message)

      // Aggregate by item name
      const agg: Record<string, { revenue: number; bills: Set<string> }> = {}
      for (const item of items ?? []) {
        if (!agg[item.item_name]) {
          agg[item.item_name] = { revenue: 0, bills: new Set() }
        }
        agg[item.item_name].revenue += Number(item.line_total ?? 0)
        agg[item.item_name].bills.add(item.bill_id)
      }

      // Sort by revenue desc, take top 8
      return Object.entries(agg)
        .map(([name, data]) => ({
          item_name: name,
          total_revenue: data.revenue,
          bill_count: data.bills.size,
          rank: 0,
        }))
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, 8)
        .map((item, idx) => ({ ...item, rank: idx + 1 }))
    },
    { retry: 2, staleTime: 60000, refetchInterval: 300000 }
  )
}

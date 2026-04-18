import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '../lib/supabase'
import type { MonthEndStockHistoryRecord } from '../types/phase6'

interface HistoryFilters {
  branch?: string
  year?: number
  status?: string
}

/**
 * Fetches submission history across all months for month end closing stock.
 * Joins employees table to get the name of the person who submitted.
 * Supports optional filters by branch, year, and status.
 *
 * @param filters - Optional branch/year/status filters
 * @returns list of past submissions sorted by year/month descending
 */
export function useMonthEndStockHistory(filters?: HistoryFilters) {
  const { branch, year, status } = filters ?? {}

  return useSupabaseQuery<MonthEndStockHistoryRecord[]>(
    ['month_end_stock_history', branch, year, status],
    async () => {
      let query = supabase
        .from('month_end_stock')
        .select(
          `
          id,
          branch,
          month,
          year,
          status,
          total_value,
          submitted_at,
          created_at,
          employees!submitted_by(full_name)
        `
        )
        .order('year', { ascending: false })
        .order('month', { ascending: false })

      if (branch) query = query.eq('branch', branch)
      if (year) query = query.eq('year', year)
      if (status) query = query.eq('status', status)

      const { data, error } = await query
      if (error) throw new Error(error.message)

      return (data ?? []).map((row) => {
        const r = row as Record<string, unknown>
        const emp = r['employees'] as { full_name: string } | null
        return {
          id: r['id'] as string,
          branch: r['branch'] as string,
          month: r['month'] as number,
          year: r['year'] as number,
          status: r['status'] as 'draft' | 'submitted',
          total_value: r['total_value'] as number,
          submitted_by_name: emp?.full_name ?? null,
          submitted_at: r['submitted_at'] as string | null,
          created_at: r['created_at'] as string,
        }
      })
    },
    { retry: 2, staleTime: 30000 }
  )
}

/**
 * Fetches full item list for a specific month end stock entry (read-only view).
 *
 * @param stockId - UUID of the month_end_stock row
 */
export function useMonthEndStockEntryItems(stockId: string | null | undefined) {
  return useSupabaseQuery<
    Array<{
      id: string
      item_name: string
      section: string | null
      unit: string | null
      open_units: number
      packed_units: number
      total_units: number
      rate_per_unit: number
      cost: number
    }>
  >(
    ['month_end_stock_entry_items', stockId],
    async () => {
      if (!stockId) return []
      const { data, error } = await supabase
        .from('month_end_stock_items')
        .select(
          'id, item_name, section, unit, open_units, packed_units, total_units, rate_per_unit, cost'
        )
        .eq('month_end_stock_id', stockId)
        .order('item_name', { ascending: true })
      if (error) throw new Error(error.message)
      return data ?? []
    },
    { enabled: !!stockId, retry: 2, staleTime: 30000 }
  )
}

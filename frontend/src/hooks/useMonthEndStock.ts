import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '../lib/supabase'
import type { MonthEndStockEntry } from '../types/phase6'

/**
 * Fetches the month end stock header entry for a given month/year/branch.
 * Returns null when no entry exists yet for the period.
 *
 * @param month  - Month number 1–12
 * @param year   - Full year e.g. 2026
 * @param branch - Branch code KR or C2
 */
export function useMonthEndStock(month: number, year: number, branch: string) {
  return useSupabaseQuery<MonthEndStockEntry | null>(
    ['month_end_stock', branch, year, month],
    async () => {
      const { data, error } = await supabase
        .from('month_end_stock')
        .select('*')
        .eq('branch', branch)
        .eq('month', month)
        .eq('year', year)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return data as MonthEndStockEntry | null
    },
    { enabled: !!branch && !!month && !!year, retry: 2, staleTime: 30000 }
  )
}

/**
 * Fetches the saved item rows for an existing month end stock entry.
 * Returns an empty array when no entry or no items exist.
 *
 * @param stockId - UUID of the month_end_stock row
 */
export function useMonthEndStockSavedItems(stockId: string | null | undefined) {
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
      previous_month_rate: number | null
      rate_changed: boolean
    }>
  >(
    ['month_end_stock_items', stockId],
    async () => {
      if (!stockId) return []
      const { data, error } = await supabase
        .from('month_end_stock_items')
        .select('*')
        .eq('month_end_stock_id', stockId)
        .order('item_name', { ascending: true })
      if (error) throw new Error(error.message)
      return data ?? []
    },
    { enabled: !!stockId, retry: 2, staleTime: 30000 }
  )
}

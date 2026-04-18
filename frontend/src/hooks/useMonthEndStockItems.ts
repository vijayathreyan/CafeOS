import { useMemo } from 'react'
import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '../lib/supabase'
import type { MonthEndStockConfig, StockItemRow } from '../types/phase6'

interface PrevRateRow {
  item_name: string
  rate_per_unit: number
}

/**
 * Fetches the full item list for month end stock entry.
 * Combines config items with previous month rates (for pre-fill) and
 * any saved values from an existing entry for the current period.
 *
 * @param month         - Current month 1–12
 * @param year          - Current full year e.g. 2026
 * @param branch        - KR or C2
 * @param savedItemsMap - Optional map of item_name → saved row (from existing entry)
 */
export function useMonthEndStockItems(
  month: number,
  year: number,
  branch: string,
  savedItemsMap?: Record<
    string,
    { open_units: number; packed_units: number; rate_per_unit: number }
  >
) {
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year

  const configQuery = useSupabaseQuery<MonthEndStockConfig[]>(
    ['month_end_stock_config'],
    async () => {
      const { data, error } = await supabase
        .from('month_end_stock_config')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true })
      if (error) throw new Error(error.message)
      return (data ?? []) as MonthEndStockConfig[]
    },
    { retry: 2, staleTime: 60000 }
  )

  const prevRatesQuery = useSupabaseQuery<PrevRateRow[]>(
    ['month_end_stock_prev_rates', branch, prevYear, prevMonth],
    async () => {
      const { data: prevEntry } = await supabase
        .from('month_end_stock')
        .select('id')
        .eq('branch', branch)
        .eq('month', prevMonth)
        .eq('year', prevYear)
        .maybeSingle()
      if (!prevEntry) return []
      const { data, error } = await supabase
        .from('month_end_stock_items')
        .select('item_name, rate_per_unit')
        .eq('month_end_stock_id', prevEntry.id)
      if (error) throw new Error(error.message)
      return (data ?? []) as PrevRateRow[]
    },
    { enabled: !!branch, retry: 2, staleTime: 30000 }
  )

  const prevRatesMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const row of prevRatesQuery.data ?? []) {
      map[row.item_name] = row.rate_per_unit
    }
    return map
  }, [prevRatesQuery.data])

  const rows = useMemo<StockItemRow[]>(() => {
    const config = configQuery.data ?? []
    const saved = savedItemsMap ?? {}
    return config.map((c) => {
      const existing = saved[c.item_name]
      const prevRate = prevRatesMap[c.item_name] ?? null
      return {
        item_name: c.item_name,
        section: c.section,
        unit: c.unit,
        sort_order: c.sort_order,
        open_units: existing?.open_units ?? 0,
        packed_units: existing?.packed_units ?? 0,
        rate_per_unit: existing?.rate_per_unit ?? prevRate ?? 0,
        previous_month_rate: prevRate,
        is_adhoc: false,
      }
    })
  }, [configQuery.data, savedItemsMap, prevRatesMap])

  return {
    rows,
    isLoading: configQuery.isLoading || prevRatesQuery.isLoading,
    isError: configQuery.isError || prevRatesQuery.isError,
  }
}

import { useMutation, useQueryClient } from 'react-query'
import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '../lib/supabase'
import type {
  MonthEndStockConfigItem,
  CreateMonthEndStockConfigPayload,
  UpdateMonthEndStockConfigPayload,
} from '../types/phase11'

/**
 * Fetches all month_end_stock_config rows for the admin settings page.
 * Ordered by section then sort_order ascending.
 *
 * Note: The data-entry flow uses a branch-filtered version of this query in
 * useMonthEndStockItems.ts (key: ['month_end_stock_config']). This hook uses
 * a distinct key ['month_end_stock_config', 'admin'] so it fetches all rows
 * regardless of active flag and does not interfere with the entry-flow cache.
 *
 * @param session - Auth session guard
 */
export function useMonthEndStockConfig(session: boolean) {
  return useSupabaseQuery<MonthEndStockConfigItem[]>(
    ['month_end_stock_config', 'admin'],
    async () => {
      const { data, error } = await supabase
        .from('month_end_stock_config')
        .select('*')
        .order('section', { ascending: true })
        .order('sort_order', { ascending: true })
      if (error) throw new Error(error.message)
      return (data ?? []) as MonthEndStockConfigItem[]
    },
    { enabled: !!session, retry: 2, staleTime: 30000 }
  )
}

/**
 * Mutation that inserts a new month_end_stock_config row.
 * Invalidates both the admin and entry-flow cache keys on success.
 */
export function useCreateMonthEndStockItem() {
  const qc = useQueryClient()

  return useMutation(
    async (payload: CreateMonthEndStockConfigPayload) => {
      const { error } = await supabase.from('month_end_stock_config').insert({
        item_name: payload.item_name,
        unit: payload.unit ?? null,
        branch_flag: payload.branch_flag,
        sort_order: payload.sort_order,
        section: payload.section,
        active: true,
      })
      if (error) throw new Error(error.message)
    },
    {
      onSuccess: () => {
        qc.invalidateQueries(['month_end_stock_config'])
      },
    }
  )
}

/**
 * Mutation that partially updates a month_end_stock_config row by id.
 * Accepts any subset of CreateMonthEndStockConfigPayload plus active flag.
 * Invalidates both the admin and entry-flow cache keys on success.
 */
export function useUpdateMonthEndStockItem() {
  const qc = useQueryClient()

  return useMutation(
    async ({ id, ...rest }: UpdateMonthEndStockConfigPayload) => {
      const { error } = await supabase.from('month_end_stock_config').update(rest).eq('id', id)
      if (error) throw new Error(error.message)
    },
    {
      onSuccess: () => {
        qc.invalidateQueries(['month_end_stock_config'])
      },
    }
  )
}

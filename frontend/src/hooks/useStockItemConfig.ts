import { useQuery, useMutation, useQueryClient } from 'react-query'
import { supabase } from '../lib/supabase'
import type { StockItemConfig } from '../types/stock'

/**
 * Fetches all active stock_item_config rows joined with item_master.
 * Used in Admin Settings to display weight-per-unit configuration.
 *
 * @param session - Auth session guard
 */
export function useStockItemConfig(session: boolean) {
  return useQuery<StockItemConfig[]>(
    'stock_item_config',
    async () => {
      const { data, error } = await supabase
        .from('stock_item_config')
        .select('*, item_master(id, name_en, name_ta, unit)')
        .eq('active', true)
        .order('weight_per_unit_effective_from', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as StockItemConfig[]
    },
    { enabled: !!session, retry: 2, staleTime: 30000 }
  )
}

interface UpdateWeightPayload {
  itemId: string
  weightPerUnitGrams: number
  entryUnit: string
}

/**
 * Mutation that updates the weight-per-unit for a stock item.
 * Deactivates the current config row and inserts a new one (history preserved).
 */
export function useUpdateStockItemConfig() {
  const qc = useQueryClient()

  return useMutation(
    async ({ itemId, weightPerUnitGrams, entryUnit }: UpdateWeightPayload) => {
      // Deactivate all current active configs for this item
      const { error: deactivateError } = await supabase
        .from('stock_item_config')
        .update({ active: false })
        .eq('item_id', itemId)
        .eq('active', true)

      if (deactivateError) throw new Error(deactivateError.message)

      // Insert new active config row
      const { error } = await supabase.from('stock_item_config').insert({
        item_id: itemId,
        entry_unit: entryUnit,
        weight_per_unit_grams: weightPerUnitGrams,
        weight_per_unit_effective_from: new Date().toISOString().split('T')[0],
        active: true,
      })

      if (error) throw new Error(error.message)
    },
    {
      onSuccess: () => {
        qc.invalidateQueries('stock_item_config')
      },
    }
  )
}

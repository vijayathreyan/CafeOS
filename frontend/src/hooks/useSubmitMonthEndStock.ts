import { useMutation, useQueryClient } from 'react-query'
import { supabase } from '../lib/supabase'
import type { SaveMonthEndStockPayload } from '../types/phase6'

interface UpsertResult {
  id: string
  total_value: number
}

/**
 * Saves month end stock items as a draft (status = 'draft').
 * Creates the header row if it doesn't exist, then replaces all item rows.
 * Returns the upserted stock entry id.
 */
export function useSaveMonthEndStockDraft() {
  const qc = useQueryClient()

  return useMutation(
    async (payload: SaveMonthEndStockPayload): Promise<UpsertResult> => {
      const totalValue = payload.items.reduce((sum, it) => {
        const total = (it.open_units + it.packed_units) * it.rate_per_unit
        return sum + total
      }, 0)

      const { data: entry, error: upsertErr } = await supabase
        .from('month_end_stock')
        .upsert(
          {
            branch: payload.branch,
            month: payload.month,
            year: payload.year,
            status: 'draft',
            total_value: totalValue,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'branch,month,year' }
        )
        .select('id, total_value')
        .single()

      if (upsertErr) throw new Error(upsertErr.message)

      const stockId = (entry as { id: string; total_value: number }).id

      await supabase.from('month_end_stock_items').delete().eq('month_end_stock_id', stockId)

      if (payload.items.length > 0) {
        const itemRows = payload.items.map((it) => ({
          month_end_stock_id: stockId,
          item_name: it.item_name,
          section: it.section,
          unit: it.unit,
          open_units: it.open_units,
          packed_units: it.packed_units,
          rate_per_unit: it.rate_per_unit,
          previous_month_rate: it.previous_month_rate,
          rate_changed: it.rate_changed,
        }))
        const { error: itemErr } = await supabase.from('month_end_stock_items').insert(itemRows)
        if (itemErr) throw new Error(itemErr.message)
      }

      return { id: stockId, total_value: totalValue }
    },
    {
      onSuccess: (_data, variables) => {
        qc.invalidateQueries(['month_end_stock', variables.branch, variables.year, variables.month])
        qc.invalidateQueries([
          'month_end_stock_items',
          variables.branch,
          variables.year,
          variables.month,
        ])
      },
    }
  )
}

/**
 * Submits month end stock entry (status → 'submitted').
 * Saves all items, marks submitted, and triggers WhatsApp alert.
 *
 * @returns mutation for submitting with WhatsApp alert
 */
export function useSubmitMonthEndStock() {
  const qc = useQueryClient()

  return useMutation(
    async (
      payload: SaveMonthEndStockPayload & { submitted_by: string; submitted_by_name: string }
    ): Promise<UpsertResult> => {
      const totalValue = payload.items.reduce((sum, it) => {
        const total = (it.open_units + it.packed_units) * it.rate_per_unit
        return sum + total
      }, 0)

      const { data: entry, error: upsertErr } = await supabase
        .from('month_end_stock')
        .upsert(
          {
            branch: payload.branch,
            month: payload.month,
            year: payload.year,
            status: 'submitted',
            total_value: totalValue,
            submitted_by: payload.submitted_by,
            submitted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'branch,month,year' }
        )
        .select('id, total_value')
        .single()

      if (upsertErr) throw new Error(upsertErr.message)

      const stockId = (entry as { id: string; total_value: number }).id

      await supabase.from('month_end_stock_items').delete().eq('month_end_stock_id', stockId)

      if (payload.items.length > 0) {
        const itemRows = payload.items.map((it) => ({
          month_end_stock_id: stockId,
          item_name: it.item_name,
          section: it.section,
          unit: it.unit,
          open_units: it.open_units,
          packed_units: it.packed_units,
          rate_per_unit: it.rate_per_unit,
          previous_month_rate: it.previous_month_rate,
          rate_changed: it.rate_changed,
        }))
        const { error: itemErr } = await supabase.from('month_end_stock_items').insert(itemRows)
        if (itemErr) throw new Error(itemErr.message)
      }

      return { id: stockId, total_value: totalValue }
    },
    {
      onSuccess: (_data, variables) => {
        qc.invalidateQueries(['month_end_stock', variables.branch, variables.year, variables.month])
        qc.invalidateQueries([
          'month_end_stock_items',
          variables.branch,
          variables.year,
          variables.month,
        ])
        qc.invalidateQueries(['month_end_stock_history'])
      },
    }
  )
}

/**
 * Unlocks a submitted month end stock entry for owner correction.
 * Sets status back to 'draft' so it can be edited and re-submitted.
 *
 * @returns mutation that takes { branch, month, year }
 */
export function useUnlockMonthEndStock() {
  const qc = useQueryClient()

  return useMutation(
    async ({ branch, month, year }: { branch: string; month: number; year: number }) => {
      const { error } = await supabase
        .from('month_end_stock')
        .update({
          status: 'draft',
          submitted_at: null,
          submitted_by: null,
          updated_at: new Date().toISOString(),
        })
        .eq('branch', branch)
        .eq('month', month)
        .eq('year', year)
      if (error) throw new Error(error.message)
    },
    {
      onSuccess: (_data, variables) => {
        qc.invalidateQueries(['month_end_stock', variables.branch, variables.year, variables.month])
      },
    }
  )
}

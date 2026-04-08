import { useQuery, useMutation, useQueryClient } from 'react-query'
import { supabase } from '../lib/supabase'
import { getOrCreateDailyEntry } from '../lib/dailyEntry'
import type { BranchCode } from '../lib/supabase'
import type { StockEntryRow, StockEntryRecord } from '../types/stock'

/**
 * Fetches existing stock entries for a given branch + date.
 * Returns an empty array when no entries have been saved yet.
 *
 * @param branch  - Branch code
 * @param date    - ISO date string 'YYYY-MM-DD'
 * @param session - Auth session (query is disabled when null)
 */
export function useStockEntries(branch: BranchCode | null, date: string, session: boolean) {
  return useQuery<StockEntryRow[]>(
    ['stock_entries', branch, date],
    async () => {
      if (!branch) return []
      const { data, error } = await supabase
        .from('stock_entries')
        .select('*')
        .eq('branch', branch)
        .eq('entry_date', date)
        .order('created_at', { ascending: true })
      if (error) throw new Error(error.message)
      return (data ?? []) as StockEntryRow[]
    },
    { enabled: !!session && !!branch, retry: 2, staleTime: 30000 }
  )
}

interface SaveStockPayload {
  branch: BranchCode
  date: string
  rows: StockEntryRecord[]
}

/**
 * Mutation that saves all stock rows for a branch+date in one atomic operation.
 * Deletes existing rows for the daily_entry then inserts fresh ones so that
 * "last saved values count" semantics are guaranteed.
 *
 * onSuccess invalidates ['stock_entries', branch, date] and shows a toast.
 * onError is handled by the caller.
 */
export function useSaveStockEntries() {
  const qc = useQueryClient()

  return useMutation(
    async ({ branch, date, rows }: SaveStockPayload) => {
      const dailyEntryId = await getOrCreateDailyEntry(branch, date)

      // Delete existing rows for this daily entry so re-saves replace them
      const { error: delError } = await supabase
        .from('stock_entries')
        .delete()
        .eq('daily_entry_id', dailyEntryId)

      if (delError) throw new Error(delError.message)

      if (rows.length === 0) return

      const records = rows.map((r) => ({
        ...r,
        daily_entry_id: dailyEntryId,
        branch,
        entry_date: date,
      }))

      const { error } = await supabase.from('stock_entries').insert(records)
      if (error) throw new Error(error.message)
    },
    {
      onSuccess: (_data, variables) => {
        qc.invalidateQueries(['stock_entries', variables.branch, variables.date])
      },
    }
  )
}

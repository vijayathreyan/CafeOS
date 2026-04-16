import { useMutation, useQueryClient } from 'react-query'
import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '../lib/supabase'
import { getOrCreateDailyEntry } from '../lib/dailyEntry'
import type { BranchCode } from '../lib/supabase'
import type { ExpenseEntryRow, ExpenseEntryRecord } from '../types/expense'

/**
 * Fetches existing expense entries for a given branch + date.
 * Returns an empty array when no entries have been saved yet.
 *
 * @param branch  - Branch code
 * @param date    - ISO date string 'YYYY-MM-DD'
 * @param session - Auth session guard
 */
export function useExpenseEntries(branch: BranchCode | null, date: string, session: boolean) {
  return useSupabaseQuery<ExpenseEntryRow[]>(
    ['expense_entries', branch, date],
    async () => {
      if (!branch) return []
      const { data, error } = await supabase
        .from('expense_entries')
        .select('*')
        .eq('branch', branch)
        .eq('entry_date', date)
        .order('created_at', { ascending: true })
      if (error) throw new Error(error.message)
      return (data ?? []) as ExpenseEntryRow[]
    },
    { enabled: !!session && !!branch, retry: 2, staleTime: 30000 }
  )
}

interface SaveExpensePayload {
  branch: BranchCode
  date: string
  rows: Omit<ExpenseEntryRecord, 'daily_entry_id'>[]
}

/**
 * Mutation that saves all expense rows for a branch+date.
 * Deletes existing rows for the daily entry then inserts fresh ones.
 * Rows with amount === 0 are skipped (not saved).
 */
export function useSaveExpenseEntries() {
  const qc = useQueryClient()

  return useMutation(
    async ({ branch, date, rows }: SaveExpensePayload) => {
      const dailyEntryId = await getOrCreateDailyEntry(branch, date)

      const { error: delError } = await supabase
        .from('expense_entries')
        .delete()
        .eq('daily_entry_id', dailyEntryId)

      if (delError) throw new Error(delError.message)

      const nonZero = rows.filter((r) => r.amount > 0)
      if (nonZero.length === 0) return

      const records = nonZero.map((r) => ({
        ...r,
        daily_entry_id: dailyEntryId,
        branch,
        entry_date: date,
      }))

      const { error } = await supabase.from('expense_entries').insert(records)
      if (error) throw new Error(error.message)
    },
    {
      onSuccess: (_data, variables) => {
        qc.invalidateQueries(['expense_entries', variables.branch, variables.date])
      },
    }
  )
}

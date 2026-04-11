import { useQuery, useMutation, useQueryClient } from 'react-query'
import { supabase } from '../lib/supabase'
import type { PLSalaryEntry } from '../types/phase4'

/**
 * Fetches salary entries for a given month/year and branch.
 * Returns an empty array when no entries exist (form will show default staff rows).
 *
 * @param monthYear - Format 'YYYY-MM'
 * @param branch - 'KR' or 'C2'
 * @param session - Auth session guard (only fetches when truthy)
 */
export function useSalaryEntries(monthYear: string, branch: 'KR' | 'C2', session: boolean) {
  return useQuery<PLSalaryEntry[]>(
    ['salary_entries', monthYear, branch],
    async () => {
      const { data, error } = await supabase
        .from('pl_salary_entries')
        .select('*')
        .eq('month_year', monthYear)
        .eq('branch', branch)
        .order('staff_name')
      if (error) throw new Error(error.message)
      return (data ?? []) as PLSalaryEntry[]
    },
    { enabled: !!session && !!monthYear && !!branch, retry: 2, staleTime: 30000 }
  )
}

interface SalaryRowPayload {
  branch: 'KR' | 'C2'
  month_year: string
  staff_name: string
  amount: number
  notes: string | null
  entered_by: string
}

/**
 * Batch-upserts salary entries for a month/branch combination.
 * Uses ON CONFLICT(branch, month_year, staff_name) DO UPDATE.
 * Rows with amount <= 0 are skipped (not saved).
 *
 * @param monthYear - Format 'YYYY-MM', used to invalidate cache key
 * @param branch - 'KR' or 'C2', used to invalidate cache key
 */
export function useSaveSalaryEntries(monthYear: string, branch: 'KR' | 'C2') {
  const qc = useQueryClient()
  return useMutation(
    async (rows: SalaryRowPayload[]) => {
      for (const row of rows) {
        if (row.amount <= 0) continue
        const { error } = await supabase.from('pl_salary_entries').upsert(
          {
            branch: row.branch,
            month_year: row.month_year,
            staff_name: row.staff_name,
            amount: row.amount,
            notes: row.notes,
            entered_by: row.entered_by,
          },
          { onConflict: 'branch,month_year,staff_name' }
        )
        if (error) throw new Error(error.message)
      }
    },
    { onSuccess: () => qc.invalidateQueries(['salary_entries', monthYear, branch]) }
  )
}

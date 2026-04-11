import { useQuery, useMutation, useQueryClient } from 'react-query'
import { supabase } from '../lib/supabase'
import type { UPIEntry } from '../types/phase4'

/** Returns a date string 'YYYY-MM-DD' N days after the input date string. */
export function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

/**
 * Returns the Monday of the week containing the given date, in 'YYYY-MM-DD' format.
 *
 * @param date - Date object to compute Monday from
 */
export function getMondayOfWeek(date: Date): string {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sun, 1 = Mon
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().split('T')[0]
}

/**
 * Fetches UPI entries for a given week (Monday to Sunday, all branches).
 * NULL upi_total means "not yet entered" — shown as — in the UI.
 *
 * @param weekStart - Monday date in 'YYYY-MM-DD' format
 * @param session - Auth session guard (only fetches when truthy)
 */
export function useUPIEntries(weekStart: string, session: boolean) {
  const weekEnd = addDaysToDate(weekStart, 6)
  return useQuery<UPIEntry[]>(
    ['upi_entries', weekStart],
    async () => {
      const { data, error } = await supabase
        .from('upi_entries')
        .select('*')
        .gte('entry_date', weekStart)
        .lte('entry_date', weekEnd)
        .order('entry_date')
        .order('branch')
      if (error) throw new Error(error.message)
      return (data ?? []) as UPIEntry[]
    },
    { enabled: !!session && !!weekStart, retry: 2, staleTime: 30000 }
  )
}

interface UpsertUPIPayload {
  branch: 'KR' | 'C2'
  entry_date: string
  upi_total: number | null
  notes: string | null
  entered_by: string
}

/**
 * Upserts a single UPI entry (insert on conflict DO UPDATE for branch+entry_date).
 *
 * @param weekStart - Used to invalidate the correct query cache key after save
 */
export function useUpsertUPIEntry(weekStart: string) {
  const qc = useQueryClient()
  return useMutation(
    async (payload: UpsertUPIPayload) => {
      const { error } = await supabase.from('upi_entries').upsert(
        {
          branch: payload.branch,
          entry_date: payload.entry_date,
          upi_total: payload.upi_total,
          notes: payload.notes ?? null,
          entered_by: payload.entered_by,
        },
        { onConflict: 'branch,entry_date' }
      )
      if (error) throw new Error(error.message)
    },
    { onSuccess: () => qc.invalidateQueries(['upi_entries', weekStart]) }
  )
}

/**
 * Saves all provided UPI rows for a week in a batch upsert.
 * Only rows with a non-null upi_total or non-empty notes are upserted.
 *
 * @param weekStart - Used to invalidate the correct query cache key after save
 */
export function useSaveWeekUPI(weekStart: string) {
  const qc = useQueryClient()
  return useMutation(
    async (rows: UpsertUPIPayload[]) => {
      const toSave = rows.filter((r) => r.upi_total !== null || (r.notes?.trim() ?? '') !== '')
      for (const row of toSave) {
        const { error } = await supabase.from('upi_entries').upsert(
          {
            branch: row.branch,
            entry_date: row.entry_date,
            upi_total: row.upi_total,
            notes: row.notes ?? null,
            entered_by: row.entered_by,
          },
          { onConflict: 'branch,entry_date' }
        )
        if (error) throw new Error(error.message)
      }
    },
    { onSuccess: () => qc.invalidateQueries(['upi_entries', weekStart]) }
  )
}

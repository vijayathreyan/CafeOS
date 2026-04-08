import { supabase } from './supabase'
import type { BranchCode } from './supabase'

/**
 * Returns the daily_entry id for the given branch + date, creating one if it doesn't exist.
 * Uses shift_number = 1 as the canonical record for daily (non-shift) entries.
 * Safe to call concurrently — the UNIQUE constraint on (branch, entry_date, shift_number)
 * means a second insert will be caught by the ON CONFLICT clause.
 *
 * @param branch - Branch code ('KR' or 'C2')
 * @param date   - ISO date string 'YYYY-MM-DD'
 * @returns The UUID of the daily_entry row
 * @throws Error if the database operation fails
 */
export async function getOrCreateDailyEntry(branch: BranchCode, date: string): Promise<string> {
  // Try to fetch an existing entry first (avoids a write on the common path)
  const { data: existing } = await supabase
    .from('daily_entries')
    .select('id')
    .eq('branch', branch)
    .eq('entry_date', date)
    .eq('shift_number', 1)
    .maybeSingle()

  if (existing) return existing.id

  // None found — insert one
  const { data, error } = await supabase
    .from('daily_entries')
    .insert({ branch, entry_date: date, shift_number: 1 })
    .select('id')
    .single()

  if (error) {
    // Race condition: another caller inserted between our SELECT and INSERT.
    // Fetch again — the row must exist now.
    if (error.code === '23505') {
      const { data: race } = await supabase
        .from('daily_entries')
        .select('id')
        .eq('branch', branch)
        .eq('entry_date', date)
        .eq('shift_number', 1)
        .single()
      if (race) return race.id
    }
    throw new Error(`Failed to create daily entry: ${error.message}`)
  }

  return data.id
}

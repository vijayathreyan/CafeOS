import { useMutation, useQueryClient } from 'react-query'
import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '../lib/supabase'
import type { PLBranch, PLMonthlyOverride } from '../types/phase8'
import { monthToFirstDay } from '../types/phase8'

/**
 * Fetches the P&L monthly override (EB bill) for a branch and month.
 * Returns null when no override has been saved yet.
 *
 * @param branch - 'KR' or 'C2' (Combined fetches KR then C2 separately)
 * @param month  - Date representing the first day of the month
 */
export function usePLMonthlyOverride(branch: PLBranch, month: Date) {
  const firstDay = monthToFirstDay(month)
  // For Combined, fetch KR override (primary)
  const effectiveBranch = branch === 'Combined' ? 'KR' : branch

  return useSupabaseQuery<PLMonthlyOverride | null>(
    ['pl_monthly_override', effectiveBranch, firstDay],
    async () => {
      const { data, error } = await supabase
        .from('pl_monthly_overrides')
        .select('*')
        .eq('branch', effectiveBranch)
        .eq('month', firstDay)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return data as PLMonthlyOverride | null
    },
    { retry: 2, staleTime: 30000 }
  )
}

/**
 * Fetches overrides for both KR and C2 branches (used in Combined view).
 */
export function usePLMonthlyOverrideBoth(month: Date) {
  const firstDay = monthToFirstDay(month)
  return useSupabaseQuery<{ KR: PLMonthlyOverride | null; C2: PLMonthlyOverride | null }>(
    ['pl_monthly_override_both', firstDay],
    async () => {
      const [krRes, c2Res] = await Promise.all([
        supabase
          .from('pl_monthly_overrides')
          .select('*')
          .eq('branch', 'KR')
          .eq('month', firstDay)
          .maybeSingle(),
        supabase
          .from('pl_monthly_overrides')
          .select('*')
          .eq('branch', 'C2')
          .eq('month', firstDay)
          .maybeSingle(),
      ])
      return {
        KR: krRes.data as PLMonthlyOverride | null,
        C2: c2Res.data as PLMonthlyOverride | null,
      }
    },
    { retry: 2, staleTime: 30000 }
  )
}

interface SaveOverridePayload {
  branch: 'KR' | 'C2'
  month: Date
  eb_bill_amount: number
  notes: string | null
  updated_by: string
}

/**
 * Mutation: upserts EB bill override for a branch/month.
 * Uses ON CONFLICT(branch, month) DO UPDATE.
 */
export function useSavePLOverride() {
  const qc = useQueryClient()
  return useMutation(
    async (payload: SaveOverridePayload) => {
      const firstDay = monthToFirstDay(payload.month)
      const { error } = await supabase.from('pl_monthly_overrides').upsert(
        {
          branch: payload.branch,
          month: firstDay,
          eb_bill_amount: payload.eb_bill_amount,
          notes: payload.notes,
          updated_by: payload.updated_by,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'branch,month' }
      )
      if (error) throw new Error(error.message)
    },
    {
      onSuccess: (_data, vars) => {
        const firstDay = monthToFirstDay(vars.month)
        qc.invalidateQueries(['pl_monthly_override', vars.branch, firstDay])
        qc.invalidateQueries(['pl_monthly_override_both', firstDay])
        qc.invalidateQueries('pl_report')
      },
    }
  )
}

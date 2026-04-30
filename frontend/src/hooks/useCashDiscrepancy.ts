import { useMutation, useQuery, useQueryClient } from 'react-query'
import { supabase } from '../lib/supabase'
import type { CashDiscrepancy } from '../types/phase9'

/**
 * Fetches cash discrepancy records for a branch and date range.
 */
export function useCashDiscrepancy(
  branch: 'KR' | 'C2' | 'all',
  fromDate: string,
  toDate: string,
  session: boolean
) {
  return useQuery<CashDiscrepancy[]>(
    ['cash_discrepancy', branch, fromDate, toDate],
    async () => {
      let q = supabase
        .from('cash_discrepancy')
        .select('*')
        .gte('created_at', fromDate)
        .lte('created_at', toDate + 'T23:59:59')
        .order('created_at', { ascending: false })

      if (branch !== 'all') q = q.eq('branch', branch)

      const { data, error } = await q
      if (error) throw new Error(error.message)
      return (data ?? []) as CashDiscrepancy[]
    },
    { enabled: !!session, retry: 2, staleTime: 30000 }
  )
}

/**
 * Counts unacknowledged red-flag cash discrepancies for sidebar badge.
 */
export function useUnacknowledgedRedCount(session: boolean) {
  return useQuery<number>(
    'cash_discrepancy_unacked_count',
    async () => {
      const { count, error } = await supabase
        .from('cash_discrepancy')
        .select('*', { count: 'exact', head: true })
        .eq('alert_level', 'red')
        .eq('acknowledged', false)
      if (error) throw new Error(error.message)
      return count ?? 0
    },
    { enabled: !!session, retry: 2, staleTime: 30000 }
  )
}

/**
 * Acknowledges a cash discrepancy record.
 */
export function useAcknowledgeDiscrepancy() {
  const qc = useQueryClient()
  return useMutation(
    async ({ id, acknowledgedBy }: { id: string; acknowledgedBy: string }) => {
      const { error } = await supabase
        .from('cash_discrepancy')
        .update({
          acknowledged: true,
          acknowledged_by: acknowledgedBy,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    {
      onSuccess: () => {
        qc.invalidateQueries('cash_discrepancy')
        qc.invalidateQueries('cash_discrepancy_unacked_count')
      },
    }
  )
}

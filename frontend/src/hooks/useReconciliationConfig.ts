import { useMutation, useQueryClient } from 'react-query'
import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '../lib/supabase'
import type { ReconciliationConfig, UpdateReconciliationConfigPayload } from '../types/phase11'

/**
 * Fetches the single reconciliation_config row for the given branch.
 * Returns null when no config has been created for the branch yet.
 *
 * @param session - Auth session guard
 * @param branch  - Branch code (KR or C2)
 */
export function useReconciliationConfig(session: boolean, branch: string) {
  return useSupabaseQuery<ReconciliationConfig | null>(
    ['reconciliation_config', branch],
    async () => {
      const { data, error } = await supabase
        .from('reconciliation_config')
        .select('*')
        .eq('branch', branch)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return data as ReconciliationConfig | null
    },
    { enabled: !!session && !!branch, retry: 2, staleTime: 30000 }
  )
}

/**
 * Mutation that upserts a reconciliation_config row.
 * Uses the row id to target the existing record for partial update.
 * Invalidates the ['reconciliation_config'] query cache on success.
 */
export function useUpdateReconciliationConfig() {
  const qc = useQueryClient()

  return useMutation(
    async ({ id, ...rest }: UpdateReconciliationConfigPayload) => {
      const { error } = await supabase
        .from('reconciliation_config')
        .update({ ...rest, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    {
      onSuccess: () => {
        qc.invalidateQueries(['reconciliation_config'])
      },
    }
  )
}

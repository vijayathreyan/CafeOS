import { useMutation, useQueryClient } from 'react-query'
import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '../lib/supabase'
import type {
  SnackItemConfig,
  CreateSnackItemPayload,
  UpdateSnackItemPayload,
} from '../types/phase11'

/**
 * Fetches all snack_item_config rows, optionally filtered by branch.
 * Ordered by sort_order ascending.
 *
 * @param session - Auth session guard
 * @param branch  - Optional branch code to filter results (KR or C2)
 */
export function useSnackItems(session: boolean, branch?: string) {
  return useSupabaseQuery<SnackItemConfig[]>(
    ['snack_item_config', branch ?? 'all'],
    async () => {
      let query = supabase
        .from('snack_item_config')
        .select('*')
        .order('sort_order', { ascending: true })

      if (branch) {
        query = query.eq('branch', branch)
      }

      const { data, error } = await query
      if (error) throw new Error(error.message)
      return (data ?? []) as SnackItemConfig[]
    },
    { enabled: !!session, retry: 2, staleTime: 30000 }
  )
}

/**
 * Mutation that inserts a new snack_item_config row.
 * Invalidates the ['snack_item_config'] query cache on success.
 */
export function useCreateSnackItem() {
  const qc = useQueryClient()

  return useMutation(
    async (payload: CreateSnackItemPayload) => {
      const { error } = await supabase.from('snack_item_config').insert({
        branch: payload.branch,
        item_name: payload.item_name,
        item_name_tamil: payload.item_name_tamil ?? null,
        input_type: payload.input_type,
        sort_order: payload.sort_order,
        active: true,
      })
      if (error) throw new Error(error.message)
    },
    {
      onSuccess: () => {
        qc.invalidateQueries(['snack_item_config'])
      },
    }
  )
}

/**
 * Mutation that partially updates a snack_item_config row by id.
 * Accepts any subset of CreateSnackItemPayload plus active flag.
 * Invalidates the ['snack_item_config'] query cache on success.
 */
export function useUpdateSnackItem() {
  const qc = useQueryClient()

  return useMutation(
    async ({ id, ...rest }: UpdateSnackItemPayload) => {
      const { error } = await supabase.from('snack_item_config').update(rest).eq('id', id)
      if (error) throw new Error(error.message)
    },
    {
      onSuccess: () => {
        qc.invalidateQueries(['snack_item_config'])
      },
    }
  )
}

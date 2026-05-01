import { useMutation, useQueryClient } from 'react-query'
import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '../lib/supabase'
import type {
  PLSalaryConfig,
  CreatePLSalaryConfigPayload,
  UpdatePLSalaryConfigPayload,
} from '../types/phase11'

/**
 * Fetches all pl_salary_config rows, optionally filtered by branch.
 * Ordered by sort_order ascending.
 *
 * @param session - Auth session guard
 * @param branch  - Optional branch code to filter results (KR or C2)
 */
export function usePLSalaryConfig(session: boolean, branch?: string) {
  return useSupabaseQuery<PLSalaryConfig[]>(
    ['pl_salary_config', branch ?? 'all'],
    async () => {
      let query = supabase
        .from('pl_salary_config')
        .select('*')
        .order('sort_order', { ascending: true })

      if (branch) {
        query = query.eq('branch', branch)
      }

      const { data, error } = await query
      if (error) throw new Error(error.message)
      return (data ?? []) as PLSalaryConfig[]
    },
    { enabled: !!session, retry: 2, staleTime: 30000 }
  )
}

/**
 * Mutation that inserts a new pl_salary_config row.
 * Invalidates the ['pl_salary_config'] query cache on success.
 */
export function useCreatePLSalaryConfig() {
  const qc = useQueryClient()

  return useMutation(
    async (payload: CreatePLSalaryConfigPayload) => {
      const { error } = await supabase.from('pl_salary_config').insert({
        staff_name: payload.staff_name,
        branch: payload.branch,
        sort_order: payload.sort_order,
        active: true,
      })
      if (error) throw new Error(error.message)
    },
    {
      onSuccess: () => {
        qc.invalidateQueries(['pl_salary_config'])
      },
    }
  )
}

/**
 * Mutation that partially updates a pl_salary_config row by id.
 * Accepts any subset of CreatePLSalaryConfigPayload plus active flag.
 * Invalidates the ['pl_salary_config'] query cache on success.
 */
export function useUpdatePLSalaryConfig() {
  const qc = useQueryClient()

  return useMutation(
    async ({ id, ...rest }: UpdatePLSalaryConfigPayload) => {
      const { error } = await supabase.from('pl_salary_config').update(rest).eq('id', id)
      if (error) throw new Error(error.message)
    },
    {
      onSuccess: () => {
        qc.invalidateQueries(['pl_salary_config'])
      },
    }
  )
}

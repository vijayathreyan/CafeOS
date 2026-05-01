import { useMutation, useQueryClient } from 'react-query'
import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '../lib/supabase'
import type {
  SupervisorExpenseCategory,
  CreateSupervisorExpenseCategoryPayload,
  UpdateSupervisorExpenseCategoryPayload,
} from '../types/phase11'

/**
 * Fetches all supervisor_expense_categories rows ordered by sort_order ascending.
 *
 * @param session - Auth session guard
 */
export function useSupervisorExpenseCategories(session: boolean) {
  return useSupabaseQuery<SupervisorExpenseCategory[]>(
    ['supervisor_expense_categories'],
    async () => {
      const { data, error } = await supabase
        .from('supervisor_expense_categories')
        .select('*')
        .order('sort_order', { ascending: true })
      if (error) throw new Error(error.message)
      return (data ?? []) as SupervisorExpenseCategory[]
    },
    { enabled: !!session, retry: 2, staleTime: 30000 }
  )
}

/**
 * Mutation that inserts a new supervisor_expense_categories row.
 * Invalidates the ['supervisor_expense_categories'] query cache on success.
 */
export function useCreateSupervisorExpenseCategory() {
  const qc = useQueryClient()

  return useMutation(
    async (payload: CreateSupervisorExpenseCategoryPayload) => {
      const { error } = await supabase.from('supervisor_expense_categories').insert({
        category_name: payload.category_name,
        flows_to_hk_misc: payload.flows_to_hk_misc,
        sort_order: payload.sort_order,
        active: true,
      })
      if (error) throw new Error(error.message)
    },
    {
      onSuccess: () => {
        qc.invalidateQueries(['supervisor_expense_categories'])
      },
    }
  )
}

/**
 * Mutation that partially updates a supervisor_expense_categories row by id.
 * Accepts any subset of CreateSupervisorExpenseCategoryPayload plus active flag.
 * Invalidates the ['supervisor_expense_categories'] query cache on success.
 */
export function useUpdateSupervisorExpenseCategory() {
  const qc = useQueryClient()

  return useMutation(
    async ({ id, ...rest }: UpdateSupervisorExpenseCategoryPayload) => {
      const { error } = await supabase
        .from('supervisor_expense_categories')
        .update(rest)
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    {
      onSuccess: () => {
        qc.invalidateQueries(['supervisor_expense_categories'])
      },
    }
  )
}

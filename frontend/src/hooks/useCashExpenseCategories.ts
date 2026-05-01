import { useMutation, useQueryClient } from 'react-query'
import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '../lib/supabase'
import type {
  CashExpenseCategory,
  CreateCashExpenseCategoryPayload,
  UpdateCashExpenseCategoryPayload,
} from '../types/phase11'

/**
 * Fetches all cash_expense_categories rows, optionally filtered by branch.
 * Ordered by sort_order ascending.
 *
 * @param session - Auth session guard
 * @param branch  - Optional branch code to filter results (KR or C2)
 */
export function useCashExpenseCategories(session: boolean, branch?: string) {
  return useSupabaseQuery<CashExpenseCategory[]>(
    ['cash_expense_categories', branch ?? 'all'],
    async () => {
      let query = supabase
        .from('cash_expense_categories')
        .select('*')
        .order('sort_order', { ascending: true })

      if (branch) {
        query = query.eq('branch', branch)
      }

      const { data, error } = await query
      if (error) throw new Error(error.message)
      return (data ?? []) as CashExpenseCategory[]
    },
    { enabled: !!session, retry: 2, staleTime: 30000 }
  )
}

/**
 * Mutation that inserts a new cash_expense_categories row.
 * Invalidates the ['cash_expense_categories'] query cache on success.
 */
export function useCreateCashExpenseCategory() {
  const qc = useQueryClient()

  return useMutation(
    async (payload: CreateCashExpenseCategoryPayload) => {
      const { error } = await supabase.from('cash_expense_categories').insert({
        branch: payload.branch,
        category_name: payload.category_name,
        category_name_tamil: payload.category_name_tamil ?? null,
        gas_for_pl_gas_bill: payload.gas_for_pl_gas_bill,
        sort_order: payload.sort_order,
        active: true,
      })
      if (error) throw new Error(error.message)
    },
    {
      onSuccess: () => {
        qc.invalidateQueries(['cash_expense_categories'])
      },
    }
  )
}

/**
 * Mutation that partially updates a cash_expense_categories row by id.
 * Accepts any subset of CreateCashExpenseCategoryPayload plus active flag.
 * Invalidates the ['cash_expense_categories'] query cache on success.
 */
export function useUpdateCashExpenseCategory() {
  const qc = useQueryClient()

  return useMutation(
    async ({ id, ...rest }: UpdateCashExpenseCategoryPayload) => {
      const { error } = await supabase.from('cash_expense_categories').update(rest).eq('id', id)
      if (error) throw new Error(error.message)
    },
    {
      onSuccess: () => {
        qc.invalidateQueries(['cash_expense_categories'])
      },
    }
  )
}

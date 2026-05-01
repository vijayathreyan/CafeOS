import { useMutation, useQueryClient } from 'react-query'
import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '../lib/supabase'
import type { FixedExpenseRow, UpdateFixedExpensePayload } from '../types/phase11'

/**
 * Fetches all fixed_expenses rows, optionally filtered by branch.
 * Ordered by branch then label.
 *
 * @param session - Auth session guard
 * @param branch  - Optional branch code to filter results (KR or C2)
 */
export function useFixedExpenses(session: boolean, branch?: string) {
  return useSupabaseQuery<FixedExpenseRow[]>(
    ['fixed_expenses', branch ?? 'all'],
    async () => {
      let query = supabase
        .from('fixed_expenses')
        .select('*')
        .order('branch', { ascending: true })
        .order('label', { ascending: true })

      if (branch) {
        query = query.eq('branch', branch)
      }

      const { data, error } = await query
      if (error) throw new Error(error.message)
      return (data ?? []) as FixedExpenseRow[]
    },
    { enabled: !!session, retry: 2, staleTime: 30000 }
  )
}

/**
 * Mutation that updates the annual_amount (and optionally annual_basis) for a
 * fixed_expenses row. The monthly_amount column is GENERATED ALWAYS AS
 * (annual_amount / months_divisor) so it must NOT be written directly.
 * Invalidates the ['fixed_expenses'] query cache on success.
 */
export function useUpdateFixedExpense() {
  const qc = useQueryClient()

  return useMutation(
    async ({ id, annual_amount, annual_basis }: UpdateFixedExpensePayload) => {
      const updatePayload: { annual_amount: number; annual_basis?: string; updated_at: string } = {
        annual_amount,
        updated_at: new Date().toISOString(),
      }
      if (annual_basis !== undefined) {
        updatePayload.annual_basis = annual_basis
      }

      const { error } = await supabase.from('fixed_expenses').update(updatePayload).eq('id', id)
      if (error) throw new Error(error.message)
    },
    {
      onSuccess: () => {
        qc.invalidateQueries(['fixed_expenses'])
      },
    }
  )
}

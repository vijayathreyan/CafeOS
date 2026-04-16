import { useMutation, useQueryClient } from 'react-query'
import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '../lib/supabase'
import type { OwnerManualExpense, ExpenseType } from '../types/phase4'
import { PL_CATEGORY_MAP } from '../types/phase4'

interface ManualExpenseFilters {
  expense_type?: ExpenseType | 'all'
  dateFrom?: string
  dateTo?: string
}

/**
 * Fetches owner manual expense entries with optional filters.
 * Capital Purchase entries appear here but are also stored in capital_expenditure.
 *
 * @param session - Auth session guard (only fetches when truthy)
 * @param filters - Optional filter criteria
 */
export function useManualExpenses(session: boolean, filters?: ManualExpenseFilters) {
  return useSupabaseQuery<OwnerManualExpense[]>(
    ['manual_expenses', filters],
    async () => {
      let q = supabase
        .from('owner_manual_expenses')
        .select('*')
        .order('expense_date', { ascending: false })

      if (filters?.expense_type && filters.expense_type !== 'all') {
        q = q.eq('expense_type', filters.expense_type)
      }
      if (filters?.dateFrom) q = q.gte('expense_date', filters.dateFrom)
      if (filters?.dateTo) q = q.lte('expense_date', filters.dateTo)

      const { data, error } = await q
      if (error) throw new Error(error.message)
      return (data ?? []) as OwnerManualExpense[]
    },
    { enabled: !!session, retry: 2, staleTime: 30000 }
  )
}

interface CreateManualExpensePayload {
  expense_date: string
  branch: 'KR' | 'C2' | null // null = both branches
  expense_type: ExpenseType
  description: string
  amount: number
  receipt_photo_url: string | null
  pl_category_override?: string | null
  entered_by: string
}

/**
 * Creates a manual expense entry.
 * P&L category auto-set from PL_CATEGORY_MAP unless overridden.
 * Capital Purchase entries are also inserted into capital_expenditure table.
 */
export function useCreateManualExpense() {
  const qc = useQueryClient()
  return useMutation(
    async (payload: CreateManualExpensePayload) => {
      const plCategory =
        payload.pl_category_override !== undefined
          ? payload.pl_category_override
          : PL_CATEGORY_MAP[payload.expense_type]

      const { data: expense, error } = await supabase
        .from('owner_manual_expenses')
        .insert({
          expense_date: payload.expense_date,
          branch: payload.branch,
          expense_type: payload.expense_type,
          description: payload.description,
          amount: payload.amount,
          receipt_photo_url: payload.receipt_photo_url,
          pl_category: plCategory,
          entered_by: payload.entered_by,
        })
        .select('id')
        .single()

      if (error) throw new Error(error.message)

      // Capital purchases also go to capital_expenditure (below-the-line in P&L)
      if (payload.expense_type === 'capital' && expense) {
        const { error: capErr } = await supabase.from('capital_expenditure').insert({
          expense_id: expense.id,
          description: payload.description,
          amount: payload.amount,
          branch: payload.branch,
          expense_date: payload.expense_date,
          photo_url: payload.receipt_photo_url,
        })
        if (capErr) throw new Error(capErr.message)
      }
    },
    { onSuccess: () => qc.invalidateQueries(['manual_expenses']) }
  )
}

interface UpdateManualExpensePayload {
  id: string
  expense_date: string
  branch: 'KR' | 'C2' | null
  expense_type: ExpenseType
  description: string
  amount: number
  receipt_photo_url: string | null
  pl_category: string | null
}

/**
 * Updates an existing manual expense entry.
 */
export function useUpdateManualExpense() {
  const qc = useQueryClient()
  return useMutation(
    async ({ id, ...payload }: UpdateManualExpensePayload) => {
      const { error } = await supabase
        .from('owner_manual_expenses')
        .update({
          expense_date: payload.expense_date,
          branch: payload.branch,
          expense_type: payload.expense_type,
          description: payload.description,
          amount: payload.amount,
          receipt_photo_url: payload.receipt_photo_url,
          pl_category: payload.pl_category,
        })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    { onSuccess: () => qc.invalidateQueries(['manual_expenses']) }
  )
}

/**
 * Hard-deletes a manual expense entry.
 */
export function useDeleteManualExpense() {
  const qc = useQueryClient()
  return useMutation(
    async (id: string) => {
      const { error } = await supabase.from('owner_manual_expenses').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    { onSuccess: () => qc.invalidateQueries(['manual_expenses']) }
  )
}

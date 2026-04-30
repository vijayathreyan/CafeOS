import { useMutation, useQueryClient } from 'react-query'
import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '../lib/supabase'
import type { SupervisorExpense } from '../types/phase4'

/**
 * Fetches supervisor expense entries.
 * Pass last7Days=true for the Supervisor view (only last 7 days).
 * Pass last7Days=false (default) for Owner view (all entries).
 *
 * @param session - Auth session guard (only fetches when truthy)
 * @param last7Days - If true, only returns entries from the last 7 days
 */
export function useSupervisorExpenses(session: boolean, last7Days = false) {
  return useSupabaseQuery<SupervisorExpense[]>(
    ['supervisor_expenses', last7Days],
    async () => {
      let q = supabase
        .from('supervisor_expenses')
        .select('*')
        .order('expense_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (last7Days) {
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - 7)
        q = q.gte('expense_date', cutoff.toISOString().split('T')[0])
      }

      const { data, error } = await q
      if (error) throw new Error(error.message)
      return (data ?? []) as SupervisorExpense[]
    },
    { enabled: !!session, retry: 2, staleTime: 30000 }
  )
}

/**
 * Fetches active shops from supervisor_expense_shops table.
 * Used to populate the shop dropdown in the expense form.
 *
 * @param session - Auth session guard (only fetches when truthy)
 */
export function useExpenseShops(session: boolean) {
  return useSupabaseQuery<{ id: string; shop_name: string }[]>(
    'expense_shops',
    async () => {
      const { data, error } = await supabase
        .from('supervisor_expense_shops')
        .select('id, shop_name')
        .eq('active', true)
        .order('shop_name')
      if (error) throw new Error(error.message)
      return (data ?? []) as { id: string; shop_name: string }[]
    },
    { enabled: !!session, retry: 2, staleTime: 60000 }
  )
}

interface CreateExpensePayload {
  expense_date: string
  shop_name: string
  branch: 'KR' | 'C2'
  amount: number
  bill_photo_url: string | null
  submitted_by: string
}

/**
 * Creates a supervisor expense and automatically deducts from Supervisor float balance.
 * Updates supervisor_float_balance.current_balance in the same mutation sequence.
 * NOTE: WhatsApp alert will be wired in Phase 10.
 */
export function useCreateSupervisorExpense() {
  const qc = useQueryClient()
  return useMutation(
    async (payload: CreateExpensePayload) => {
      const { error } = await supabase.from('supervisor_expenses').insert({
        expense_date: payload.expense_date,
        shop_name: payload.shop_name,
        branch: payload.branch,
        amount: payload.amount,
        bill_photo_url: payload.bill_photo_url,
        submitted_by: payload.submitted_by,
        float_used: true,
      })
      if (error) throw new Error(error.message)

      // Auto-deduct from float balance
      const { data: bal, error: balErr } = await supabase
        .from('supervisor_float_balance')
        .select('id, current_balance')
        .limit(1)
        .single()

      if (!balErr && bal) {
        const newBalance = Number(bal.current_balance) - payload.amount
        await supabase
          .from('supervisor_float_balance')
          .update({ current_balance: newBalance, last_updated_at: new Date().toISOString() })
          .eq('id', bal.id)
      }
    },
    {
      onSuccess: () => {
        qc.invalidateQueries(['supervisor_expenses'])
        qc.invalidateQueries('supervisor_float')
      },
    }
  )
}

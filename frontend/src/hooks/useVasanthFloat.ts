import { useMutation, useQueryClient } from 'react-query'
import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '../lib/supabase'
import type { VasanthFloatBalance, FloatTransaction } from '../types/phase4'

/**
 * Fetches the current Vasanth float balance (single-row table).
 * Used by both Owner (with controls) and Supervisor (read-only display).
 *
 * @param session - Auth session guard (only fetches when truthy)
 */
export function useVasanthFloat(session: boolean) {
  return useSupabaseQuery<VasanthFloatBalance | null>(
    'vasanth_float',
    async () => {
      const { data } = await supabase
        .from('vasanth_float_balance')
        .select('*')
        .limit(1)
        .maybeSingle()
      return data as VasanthFloatBalance | null
    },
    { enabled: !!session, retry: 2, staleTime: 15000 }
  )
}

/**
 * Fetches the complete float transaction history (top-ups and expense deductions),
 * sorted chronologically ascending with computed running balance at each step.
 *
 * @param session - Auth session guard (only fetches when truthy)
 */
export function useFloatHistory(session: boolean) {
  return useSupabaseQuery<FloatTransaction[]>(
    'float_history',
    async () => {
      const [topupsRes, expensesRes] = await Promise.all([
        supabase
          .from('vasanth_float_topups')
          .select('id, topup_date, amount, notes, transfer_ref, created_at'),
        supabase
          .from('supervisor_expenses')
          .select('id, expense_date, amount, shop_name, branch, created_at'),
      ])

      if (topupsRes.error) throw new Error(topupsRes.error.message)
      if (expensesRes.error) throw new Error(expensesRes.error.message)

      type TopupRow = {
        id: string
        topup_date: string
        amount: number
        notes: string | null
        transfer_ref: string | null
        created_at: string
      }
      type ExpenseRow = {
        id: string
        expense_date: string
        amount: number
        shop_name: string
        branch: string
        created_at: string
      }

      const topups = (topupsRes.data ?? []) as TopupRow[]
      const expenses = (expensesRes.data ?? []) as ExpenseRow[]

      const merged: (FloatTransaction & { sortKey: string })[] = [
        ...topups.map((t) => ({
          id: t.id,
          date: t.topup_date,
          sortKey: t.created_at,
          type: 'topup' as const,
          description: t.notes ?? (t.transfer_ref ? `Ref: ${t.transfer_ref}` : 'Float top-up'),
          amount: Number(t.amount),
          running_balance: 0,
        })),
        ...expenses.map((e) => ({
          id: e.id,
          date: e.expense_date,
          sortKey: e.created_at,
          type: 'deduction' as const,
          description: `${e.shop_name} · ${e.branch}`,
          amount: Number(e.amount),
          running_balance: 0,
        })),
      ]

      merged.sort((a, b) => new Date(a.sortKey).getTime() - new Date(b.sortKey).getTime())

      let running = 0
      return merged.map(({ sortKey: _sortKey, ...t }) => {
        running = t.type === 'topup' ? running + t.amount : running - t.amount
        return { ...t, running_balance: running }
      })
    },
    { enabled: !!session, retry: 2, staleTime: 30000 }
  )
}

interface AddFundsPayload {
  topup_date: string
  amount: number
  transfer_ref: string | null
  notes: string | null
  added_by: string
}

/**
 * Adds funds to the Vasanth float.
 * Updates vasanth_float_balance.current_balance and inserts a topup record
 * with running_balance_after for audit purposes.
 */
export function useAddFloatFunds() {
  const qc = useQueryClient()
  return useMutation(
    async (payload: AddFundsPayload) => {
      const { data: bal, error: balErr } = await supabase
        .from('vasanth_float_balance')
        .select('id, current_balance')
        .limit(1)
        .single()
      if (balErr) throw new Error(balErr.message)

      const newBalance = Number(bal.current_balance) + payload.amount

      const { error: updateErr } = await supabase
        .from('vasanth_float_balance')
        .update({ current_balance: newBalance, last_updated_at: new Date().toISOString() })
        .eq('id', bal.id)
      if (updateErr) throw new Error(updateErr.message)

      const { error: insertErr } = await supabase.from('vasanth_float_topups').insert({
        topup_date: payload.topup_date,
        amount: payload.amount,
        transfer_ref: payload.transfer_ref,
        notes: payload.notes,
        added_by: payload.added_by,
        running_balance_after: newBalance,
      })
      if (insertErr) throw new Error(insertErr.message)
    },
    {
      onSuccess: () => {
        qc.invalidateQueries('vasanth_float')
        qc.invalidateQueries('float_history')
      },
    }
  )
}

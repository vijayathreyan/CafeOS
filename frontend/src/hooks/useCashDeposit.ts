import { useQuery, useMutation, useQueryClient } from 'react-query'
import { supabase } from '../lib/supabase'
import type { CashDeposit, CashDepositRow } from '../types/phase4'

/**
 * Fetches all cash deposit records for the Owner history view, most recent first.
 *
 * @param session - Auth session guard (only fetches when truthy)
 */
export function useDepositHistory(session: boolean) {
  return useQuery<CashDeposit[]>(
    'deposit_history',
    async () => {
      const { data, error } = await supabase
        .from('cash_deposits')
        .select('*')
        .order('deposit_date', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as CashDeposit[]
    },
    { enabled: !!session, retry: 2, staleTime: 30000 }
  )
}

interface CreateDepositPayload {
  deposit_date: string
  challan_photo_url: string | null
  bank_ref: string | null
  notes: string | null
  rows: CashDepositRow[]
  total_amount: number // the challan amount — must equal sum of rows (validated in UI)
  submitted_by: string
}

/**
 * Creates a new cash deposit record.
 * total_amount is the challan amount (validated equal to rows sum in the UI before call).
 */
export function useCreateCashDeposit() {
  const qc = useQueryClient()
  return useMutation(
    async (payload: CreateDepositPayload) => {
      const { error } = await supabase.from('cash_deposits').insert({
        deposit_date: payload.deposit_date,
        challan_photo_url: payload.challan_photo_url,
        bank_ref: payload.bank_ref,
        notes: payload.notes,
        rows: payload.rows,
        total_amount: payload.total_amount,
        submitted_by: payload.submitted_by,
      })
      if (error) throw new Error(error.message)
    },
    { onSuccess: () => qc.invalidateQueries('deposit_history') }
  )
}

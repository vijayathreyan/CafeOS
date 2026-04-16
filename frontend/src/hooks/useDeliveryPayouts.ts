import { useMutation, useQueryClient } from 'react-query'
import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '../lib/supabase'
import type { DeliveryPlatformEntry, DeliveryPlatform } from '../types/phase4'

/**
 * Fetches all delivery platform payout entries, most recent first.
 *
 * @param session - Auth session guard (only fetches when truthy)
 */
export function useDeliveryPayouts(session: boolean) {
  return useSupabaseQuery<DeliveryPlatformEntry[]>(
    'delivery_payouts',
    async () => {
      const { data, error } = await supabase
        .from('delivery_platform_entries')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as DeliveryPlatformEntry[]
    },
    { enabled: !!session, retry: 2, staleTime: 30000 }
  )
}

interface PayoutPayload {
  platform: DeliveryPlatform
  branch: 'KR' | 'C2'
  period_from: string
  period_to: string
  amount_credited: number
  bank_utr: string | null
  notes: string | null
  entered_by: string
}

/**
 * Creates a new delivery platform payout entry.
 */
export function useCreateDeliveryPayout() {
  const qc = useQueryClient()
  return useMutation(
    async (payload: PayoutPayload) => {
      const { error } = await supabase.from('delivery_platform_entries').insert({
        platform: payload.platform,
        branch: payload.branch,
        period_from: payload.period_from,
        period_to: payload.period_to,
        amount_credited: payload.amount_credited,
        bank_utr: payload.bank_utr,
        notes: payload.notes,
        entered_by: payload.entered_by,
      })
      if (error) throw new Error(error.message)
    },
    { onSuccess: () => qc.invalidateQueries('delivery_payouts') }
  )
}

/**
 * Updates an existing delivery platform payout entry.
 */
export function useUpdateDeliveryPayout() {
  const qc = useQueryClient()
  return useMutation(
    async ({ id, ...payload }: PayoutPayload & { id: string }) => {
      const { error } = await supabase
        .from('delivery_platform_entries')
        .update({
          platform: payload.platform,
          branch: payload.branch,
          period_from: payload.period_from,
          period_to: payload.period_to,
          amount_credited: payload.amount_credited,
          bank_utr: payload.bank_utr,
          notes: payload.notes,
        })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    { onSuccess: () => qc.invalidateQueries('delivery_payouts') }
  )
}

/**
 * Deletes a delivery platform payout entry.
 */
export function useDeleteDeliveryPayout() {
  const qc = useQueryClient()
  return useMutation(
    async (id: string) => {
      const { error } = await supabase.from('delivery_platform_entries').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    { onSuccess: () => qc.invalidateQueries('delivery_payouts') }
  )
}

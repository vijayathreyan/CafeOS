import { useMutation, useQueryClient } from 'react-query'
import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '../lib/supabase'
import type {
  PostPaidCustomer,
  PostPaidPayment,
  PostPaidBalance,
  PostPaidCreditEntry,
  RecordPostPaidPaymentPayload,
} from '../types/phase5'

/**
 * Fetches all active post-paid customers (KR branch).
 * Returns seeded customers: ITI, Ramco, Arun, Ajith.
 *
 * @param session - Auth session guard
 */
export function usePostPaidCustomers(session: boolean) {
  return useSupabaseQuery<PostPaidCustomer[]>(
    'postpaid_customers',
    async () => {
      const { data, error } = await supabase
        .from('postpaid_customers')
        .select('*')
        .eq('active', true)
        .order('name')
      if (error) throw new Error(error.message)
      return (data ?? []) as PostPaidCustomer[]
    },
    { enabled: !!session, retry: 2, staleTime: 30000 }
  )
}

/**
 * Computes the outstanding balance for all post-paid customers.
 * Aggregates total credit from postpaid_entries and total payments from postpaid_payments.
 * Returns a PostPaidBalance record per customer.
 *
 * @param session - Auth session guard
 */
export function usePostPaidBalances(session: boolean) {
  return useSupabaseQuery<PostPaidBalance[]>(
    'postpaid_balances',
    async () => {
      const [customersRes, entriesRes, paymentsRes] = await Promise.all([
        supabase.from('postpaid_customers').select('*').eq('active', true).order('name'),
        supabase
          .from('postpaid_entries')
          .select('customer_id, customer_name, daily_total')
          .not('customer_id', 'is', null),
        supabase
          .from('postpaid_payments')
          .select('customer_id, amount_received, payment_date')
          .order('payment_date', { ascending: false }),
      ])

      if (customersRes.error) throw new Error(customersRes.error.message)
      if (entriesRes.error) throw new Error(entriesRes.error.message)
      if (paymentsRes.error) throw new Error(paymentsRes.error.message)

      const customers = (customersRes.data ?? []) as PostPaidCustomer[]
      const entries = (entriesRes.data ?? []) as { customer_id: string; daily_total: number }[]
      const payments = (paymentsRes.data ?? []) as {
        customer_id: string
        amount_received: number
        payment_date: string
      }[]

      const today = new Date()

      return customers.map((customer) => {
        const credit = entries
          .filter((e) => e.customer_id === customer.id)
          .reduce((sum, e) => sum + (e.daily_total ?? 0), 0)

        const customerPayments = payments.filter((p) => p.customer_id === customer.id)

        const paid = customerPayments.reduce((sum, p) => sum + (p.amount_received ?? 0), 0)

        const lastPayment = customerPayments[0]?.payment_date ?? null
        const daysSince = lastPayment
          ? Math.floor((today.getTime() - new Date(lastPayment).getTime()) / (1000 * 60 * 60 * 24))
          : null

        return {
          customer,
          total_credit: Math.round(credit * 100) / 100,
          total_paid: Math.round(paid * 100) / 100,
          outstanding: Math.round((credit - paid) * 100) / 100,
          last_payment_date: lastPayment,
          days_since_payment: daysSince,
        } satisfies PostPaidBalance
      })
    },
    { enabled: !!session, retry: 2, staleTime: 30000 }
  )
}

/**
 * Fetches credit entries and payment history for a single customer.
 * Used in the customer history drawer.
 *
 * @param customerId - PostPaid customer UUID
 * @param session    - Auth session guard
 */
export function usePostPaidHistory(customerId: string | undefined, session: boolean) {
  return useSupabaseQuery<{ credits: PostPaidCreditEntry[]; payments: PostPaidPayment[] }>(
    ['postpaid_history', customerId],
    async () => {
      const [creditsRes, paymentsRes] = await Promise.all([
        supabase
          .from('postpaid_entries')
          .select('*, daily_entries(entry_date, branch)')
          .eq('customer_id', customerId as string)
          .order('created_at', { ascending: false })
          .limit(60),
        supabase
          .from('postpaid_payments')
          .select('*')
          .eq('customer_id', customerId as string)
          .order('payment_date', { ascending: false })
          .limit(60),
      ])

      if (creditsRes.error) throw new Error(creditsRes.error.message)
      if (paymentsRes.error) throw new Error(paymentsRes.error.message)

      return {
        credits: (creditsRes.data ?? []) as PostPaidCreditEntry[],
        payments: (paymentsRes.data ?? []) as PostPaidPayment[],
      }
    },
    { enabled: !!session && !!customerId, retry: 2, staleTime: 30000 }
  )
}

/**
 * Mutation: records a payment received from a post-paid customer.
 * Reduces outstanding balance immediately via React Query cache invalidation.
 */
export function useRecordPostPaidPayment() {
  const qc = useQueryClient()

  return useMutation(
    async (payload: RecordPostPaidPaymentPayload) => {
      const { error } = await supabase.from('postpaid_payments').insert({
        customer_id: payload.customer_id,
        payment_date: payload.payment_date,
        amount_received: payload.amount_received,
        payment_method: payload.payment_method || null,
        notes: payload.notes || null,
        entered_by: payload.entered_by || null,
      })
      if (error) throw new Error(error.message)
    },
    {
      onSuccess: () => {
        qc.invalidateQueries('postpaid_balances')
        qc.invalidateQueries('postpaid_history')
      },
    }
  )
}

import { useMutation, useQueryClient } from 'react-query'
import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '../lib/supabase'
import type {
  PostPaidCustomer,
  PostPaidPayment,
  PostPaidBalance,
  PostPaidCreditEntry,
  RecordPostPaidPaymentPayload,
  CustomerMonthlyData,
  MonthlyRow,
  MonthlyRowStatus,
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
 * Aggregates total credit from two sources:
 *   1. postpaid_entries.daily_total — daily data-entry credits
 *   2. bills.total_amount where payment_mode = 'postpaid' — POS bills charged to the customer
 * Subtracts total payments from postpaid_payments to arrive at outstanding.
 * Returns a PostPaidBalance record per customer.
 *
 * @param session - Auth session guard
 */
export function usePostPaidBalances(session: boolean) {
  return useSupabaseQuery<PostPaidBalance[]>(
    'postpaid_balances',
    async () => {
      const [customersRes, entriesRes, paymentsRes, posBillsRes] = await Promise.all([
        supabase.from('postpaid_customers').select('*').eq('active', true).order('name'),
        supabase
          .from('postpaid_entries')
          .select('customer_id, customer_name, daily_total')
          .not('customer_id', 'is', null),
        supabase
          .from('postpaid_payments')
          .select('customer_id, amount_received, payment_date')
          .order('payment_date', { ascending: false }),
        supabase
          .from('bills')
          .select('postpaid_customer_id, total_amount')
          .eq('payment_mode', 'postpaid')
          .not('postpaid_customer_id', 'is', null),
      ])

      if (customersRes.error) throw new Error(customersRes.error.message)
      if (entriesRes.error) throw new Error(entriesRes.error.message)
      if (paymentsRes.error) throw new Error(paymentsRes.error.message)
      if (posBillsRes.error) throw new Error(posBillsRes.error.message)

      const customers = (customersRes.data ?? []) as PostPaidCustomer[]
      const entries = (entriesRes.data ?? []) as { customer_id: string; daily_total: number }[]
      const payments = (paymentsRes.data ?? []) as {
        customer_id: string
        amount_received: number
        payment_date: string
      }[]
      const posBills = (posBillsRes.data ?? []) as {
        postpaid_customer_id: string
        total_amount: number
      }[]

      const today = new Date()

      return customers.map((customer) => {
        const entriesCredit = entries
          .filter((e) => e.customer_id === customer.id)
          .reduce((sum, e) => sum + (e.daily_total ?? 0), 0)

        const posCredit = posBills
          .filter((b) => b.postpaid_customer_id === customer.id)
          .reduce((sum, b) => sum + (b.total_amount ?? 0), 0)

        const credit = entriesCredit + posCredit

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
 * Passes payment_month to associate payment with a specific billing month.
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
        payment_month: payload.payment_month || null,
      })
      if (error) throw new Error(error.message)
    },
    {
      onSuccess: () => {
        qc.invalidateQueries('postpaid_balances')
        qc.invalidateQueries('postpaid_history')
        qc.invalidateQueries('postpaid_monthly_data')
      },
    }
  )
}

// ─── Month-wise helpers ───────────────────────────────────────────────────────

/** Returns 'YYYY-MM-DD' for the first day of the month containing the given date string. */
function firstOfMonth(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`
}

/** Formats a 'YYYY-MM-DD' first-of-month string to 'June 2026'. */
function monthLabel(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })
}

/** Determines status for a monthly row. */
function computeStatus(outstanding: number, monthStr: string): MonthlyRowStatus {
  if (outstanding === 0) return 'settled'
  if (outstanding < 0) return 'advance'
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const monthDate = new Date(monthStr)
  if (monthDate < thirtyDaysAgo) return 'overdue'
  return 'partial'
}

/**
 * Computes month-wise credit/payment breakdown per customer.
 * Combines postpaid_entries + POS bills (bills table) for credit,
 * and postpaid_payments for paid amounts, grouped by month.
 * Falls back to month-of-payment_date for legacy rows where payment_month is null.
 *
 * @param session - Auth session guard
 */
export function usePostPaidMonthlyData(session: boolean) {
  return useSupabaseQuery<CustomerMonthlyData[]>(
    'postpaid_monthly_data',
    async () => {
      const [customersRes, entriesRes, paymentsRes, posBillsRes] = await Promise.all([
        supabase.from('postpaid_customers').select('*').eq('active', true).order('name'),
        supabase
          .from('postpaid_entries')
          .select('customer_id, daily_total, created_at')
          .not('customer_id', 'is', null),
        supabase
          .from('postpaid_payments')
          .select('customer_id, amount_received, payment_date, payment_month')
          .order('payment_date', { ascending: false }),
        supabase
          .from('bills')
          .select('postpaid_customer_id, total_amount, bill_date')
          .eq('payment_mode', 'postpaid')
          .not('postpaid_customer_id', 'is', null),
      ])

      if (customersRes.error) throw new Error(customersRes.error.message)
      if (entriesRes.error) throw new Error(entriesRes.error.message)
      if (paymentsRes.error) throw new Error(paymentsRes.error.message)
      if (posBillsRes.error) throw new Error(posBillsRes.error.message)

      const customers = (customersRes.data ?? []) as PostPaidCustomer[]
      const entries = (entriesRes.data ?? []) as {
        customer_id: string
        daily_total: number
        created_at: string
      }[]
      const payments = (paymentsRes.data ?? []) as {
        customer_id: string
        amount_received: number
        payment_date: string
        payment_month: string | null
      }[]
      const posBills = (posBillsRes.data ?? []) as {
        postpaid_customer_id: string
        total_amount: number
        bill_date: string
      }[]

      return customers.map((customer) => {
        // Accumulate credit by month from entries
        const creditByMonth = new Map<string, number>()
        for (const e of entries.filter((x) => x.customer_id === customer.id)) {
          const m = firstOfMonth(e.created_at)
          creditByMonth.set(m, (creditByMonth.get(m) ?? 0) + (e.daily_total ?? 0))
        }
        // Accumulate credit by month from POS bills
        for (const b of posBills.filter((x) => x.postpaid_customer_id === customer.id)) {
          const m = firstOfMonth(b.bill_date)
          creditByMonth.set(m, (creditByMonth.get(m) ?? 0) + (b.total_amount ?? 0))
        }

        // Accumulate paid by month
        const paidByMonth = new Map<string, number>()
        for (const p of payments.filter((x) => x.customer_id === customer.id)) {
          // Use payment_month if set, otherwise fall back to month-of-payment_date
          const m = p.payment_month ? firstOfMonth(p.payment_month) : firstOfMonth(p.payment_date)
          paidByMonth.set(m, (paidByMonth.get(m) ?? 0) + (p.amount_received ?? 0))
        }

        // Union of all months with activity
        const allMonths = new Set([...creditByMonth.keys(), ...paidByMonth.keys()])

        const months: MonthlyRow[] = Array.from(allMonths)
          .sort((a, b) => b.localeCompare(a)) // newest first
          .map((m) => {
            const credit = Math.round((creditByMonth.get(m) ?? 0) * 100) / 100
            const paid = Math.round((paidByMonth.get(m) ?? 0) * 100) / 100
            const outstanding = Math.round((credit - paid) * 100) / 100
            return {
              month: m,
              month_label: monthLabel(m),
              credit,
              paid,
              outstanding,
              status: computeStatus(outstanding, m),
            } satisfies MonthlyRow
          })

        const overall_outstanding = months.reduce((s, r) => s + r.outstanding, 0)

        return {
          customer,
          overall_outstanding: Math.round(overall_outstanding * 100) / 100,
          months,
        } satisfies CustomerMonthlyData
      })
    },
    { enabled: !!session, retry: 2, staleTime: 30000 }
  )
}

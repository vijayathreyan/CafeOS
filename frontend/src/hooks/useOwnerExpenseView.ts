import { useQuery } from 'react-query'
import { supabase } from '../lib/supabase'
import type { SupervisorExpense } from '../types/phase4'

interface ExpenseFilters {
  branch?: 'KR' | 'C2' | 'all'
  dateFrom?: string
  dateTo?: string
  shopName?: string
}

/**
 * Fetches all supervisor expense entries for the Owner's view.
 * Supports optional filtering by branch, date range, and shop name.
 * These totals flow into the P&L HO Expenses line.
 *
 * @param session - Auth session guard (only fetches when truthy)
 * @param filters - Optional filter criteria for the query
 */
export function useOwnerExpenseView(session: boolean, filters?: ExpenseFilters) {
  return useQuery<SupervisorExpense[]>(
    ['owner_expense_view', filters],
    async () => {
      let q = supabase
        .from('supervisor_expenses')
        .select('*')
        .order('expense_date', { ascending: false })

      if (filters?.branch && filters.branch !== 'all') {
        q = q.eq('branch', filters.branch)
      }
      if (filters?.dateFrom) q = q.gte('expense_date', filters.dateFrom)
      if (filters?.dateTo) q = q.lte('expense_date', filters.dateTo)
      if (filters?.shopName) q = q.eq('shop_name', filters.shopName)

      const { data, error } = await q
      if (error) throw new Error(error.message)
      return (data ?? []) as SupervisorExpense[]
    },
    { enabled: !!session, retry: 2, staleTime: 30000 }
  )
}

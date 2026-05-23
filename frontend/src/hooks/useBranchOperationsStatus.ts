import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '../lib/supabase'

export interface BranchOperationsStatus {
  shiftOpen: boolean
  shiftOpenSince: string | null
  dataEntryStarted: boolean
  monthEndStockStatus: 'submitted' | 'due_soon' | 'overdue' | 'pending'
  monthEndDaysLeft: number | null
  lastDepositTime: string | null
  hasDepositToday: boolean
  reconciliationStatus: 'clean' | 'amber' | 'red' | 'pending' | 'none'
}

/**
 * Fetches all branch operations status indicators for one branch for a given date.
 * Powers the Branch Operations Status cards on the owner dashboard.
 */
export function useBranchOperationsStatus(branch: 'KR' | 'C2', date: string) {
  return useSupabaseQuery<BranchOperationsStatus>(
    ['branch_ops_status', branch, date],
    async () => {
      const today = date
      const now = new Date(today)
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth() + 1
      // Day of month for month-end deadline logic
      const dayOfMonth = now.getDate()
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
      const daysLeft = daysInMonth - dayOfMonth

      const [sessionRes, entryRes, stockRes, depositRes, reconRes] = await Promise.all([
        // Open shift today
        supabase
          .from('pos_sessions')
          .select('opened_at')
          .eq('branch', branch)
          .eq('is_closed', false)
          .gte('opened_at', `${today}T00:00:00`)
          .lte('opened_at', `${today}T23:59:59`)
          .order('opened_at', { ascending: false })
          .limit(1)
          .maybeSingle(),

        // Daily entry exists today
        supabase
          .from('daily_entries')
          .select('id')
          .eq('branch', branch)
          .eq('entry_date', today)
          .limit(1)
          .maybeSingle(),

        // Month end stock status for current month
        supabase
          .from('month_end_stock')
          .select('status')
          .eq('branch', branch)
          .eq('year', currentYear)
          .eq('month', currentMonth)
          .limit(1)
          .maybeSingle(),

        // Last cash deposit for this branch
        supabase
          .from('cash_deposits')
          .select('deposit_date, created_at')
          .order('deposit_date', { ascending: false })
          .limit(1)
          .maybeSingle(),

        // Reconciliation result for today
        supabase
          .from('reconciliation_results')
          .select('status')
          .eq('branch', branch)
          .eq('entry_date', today)
          .limit(1)
          .maybeSingle(),
      ])

      // Month end stock status
      let monthEndStatus: BranchOperationsStatus['monthEndStockStatus'] = 'pending'
      let monthEndDaysLeft: number | null = null
      if (stockRes.data) {
        monthEndStatus = stockRes.data.status === 'submitted' ? 'submitted' : 'pending'
      } else if (dayOfMonth > daysInMonth) {
        monthEndStatus = 'overdue'
      } else if (daysLeft <= 5) {
        monthEndStatus = 'due_soon'
        monthEndDaysLeft = daysLeft
      }

      // Last deposit
      const lastDeposit = depositRes.data
      const hasDepositToday = lastDeposit?.deposit_date === today

      // Reconciliation status
      const reconData = reconRes.data
      let reconStatus: BranchOperationsStatus['reconciliationStatus'] = 'none'
      if (reconData) {
        if (reconData.status === 'reconciled') reconStatus = 'clean'
        else if (reconData.status === 'amber') reconStatus = 'amber'
        else if (reconData.status === 'red') reconStatus = 'red'
        else reconStatus = 'pending'
      }

      return {
        shiftOpen: !!sessionRes.data,
        shiftOpenSince: sessionRes.data?.opened_at ?? null,
        dataEntryStarted: !!entryRes.data,
        monthEndStockStatus: monthEndStatus,
        monthEndDaysLeft,
        lastDepositTime: lastDeposit?.created_at ?? null,
        hasDepositToday,
        reconciliationStatus: reconStatus,
      }
    },
    { retry: 2, staleTime: 30000, refetchInterval: 60000 }
  )
}

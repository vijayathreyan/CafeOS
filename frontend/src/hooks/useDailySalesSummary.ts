import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '../lib/supabase'
import type { PLBranch, DailySalesSummaryRow, DailySalesSummaryTotals } from '../types/phase8'
import { monthToFirstDay, monthToLastDay, monthToYYYYMM, datesInMonth } from '../types/phase8'

interface DailySalesSummaryResult {
  rows: DailySalesSummaryRow[]
  totals: DailySalesSummaryTotals
}

interface CashDepositJsonRow {
  branch: string
  date: string
  amount: number
}

/**
 * Fetches the Daily Sales Summary for a branch and month.
 * Returns one row per date, assembling cash, UPI, post-paid, deposits, and notes.
 *
 * @param branch - 'KR' | 'C2' | 'Combined'
 * @param month  - Date representing the first day of the target month
 */
export function useDailySalesSummary(branch: PLBranch, month: Date) {
  const monthStr = monthToYYYYMM(month)
  const firstDay = monthToFirstDay(month)
  const lastDay = monthToLastDay(month)
  const dates = datesInMonth(month)

  return useSupabaseQuery<DailySalesSummaryResult>(
    ['daily_sales_summary', branch, monthStr],
    async () => {
      const branches: Array<'KR' | 'C2'> = branch === 'Combined' ? ['KR', 'C2'] : [branch]

      // Fetch daily_entries (id, entry_date, branch, notes) for the month
      const { data: dailyEntries, error: deErr } = await supabase
        .from('daily_entries')
        .select('id, entry_date, branch, notes')
        .in('branch', branches)
        .gte('entry_date', firstDay)
        .lte('entry_date', lastDay)
        .order('entry_date', { ascending: true })
        .order('branch', { ascending: true })

      if (deErr) throw new Error(deErr.message)

      const allDeIds = (dailyEntries ?? []).map((d) => d.id as string)

      // Parallel bulk fetches
      const [cashRes, expenseRes, postpaidRes, upiRes, depositRes] = await Promise.all([
        // Cash entries (denomination totals) — sum per daily_entry_id
        allDeIds.length > 0
          ? supabase
              .from('cash_entries')
              .select('daily_entry_id, shift_total')
              .in('daily_entry_id', allDeIds)
          : Promise.resolve({ data: [], error: null }),
        // Cash expenses per date per branch
        supabase
          .from('expense_entries')
          .select('entry_date, branch, amount')
          .in('branch', branches)
          .gte('entry_date', firstDay)
          .lte('entry_date', lastDay),
        // Post-paid entries (by customer name)
        allDeIds.length > 0
          ? supabase
              .from('postpaid_entries')
              .select('daily_entry_id, customer_name, daily_total')
              .in('daily_entry_id', allDeIds)
          : Promise.resolve({ data: [], error: null }),
        // UPI entries per date per branch (null = not entered = show —)
        supabase
          .from('upi_entries')
          .select('entry_date, branch, upi_total')
          .in('branch', branches)
          .gte('entry_date', firstDay)
          .lte('entry_date', lastDay),
        // Cash deposits (rows JSONB [{branch, date, amount}])
        supabase
          .from('cash_deposits')
          .select('rows')
          .gte('deposit_date', firstDay)
          .lte('deposit_date', lastDay),
      ])

      // Build lookup maps for fast access

      // Cash in hand: sum shift_total per daily_entry_id
      const cashByDeId = new Map<string, number>()
      for (const ce of cashRes.data ?? []) {
        const id = ce.daily_entry_id as string
        cashByDeId.set(id, (cashByDeId.get(id) ?? 0) + Number(ce.shift_total))
      }

      // Cash expenses: sum per date+branch
      const expByDateBranch = new Map<string, number>()
      for (const e of expenseRes.data ?? []) {
        const key = `${e.entry_date}:${e.branch}`
        expByDateBranch.set(key, (expByDateBranch.get(key) ?? 0) + Number(e.amount))
      }

      // Post-paid by daily_entry_id, per customer
      const postByDeId = new Map<
        string,
        { iti: number; ramco: number; arun: number; ajith: number }
      >()
      for (const pp of postpaidRes.data ?? []) {
        const id = pp.daily_entry_id as string
        if (!postByDeId.has(id)) postByDeId.set(id, { iti: 0, ramco: 0, arun: 0, ajith: 0 })
        const entry = postByDeId.get(id)!
        const name = (pp.customer_name as string).toLowerCase()
        const total = Number(pp.daily_total)
        if (name.includes('iti')) entry.iti += total
        else if (name.includes('ramco')) entry.ramco += total
        else if (name.includes('arun')) entry.arun += total
        else if (name.includes('ajith')) entry.ajith += total
      }

      // UPI: map date+branch → upi_total (null means not entered)
      const upiByDateBranch = new Map<string, number | null>()
      for (const u of upiRes.data ?? []) {
        const key = `${u.entry_date}:${u.branch}`
        upiByDateBranch.set(key, u.upi_total !== null ? Number(u.upi_total) : null)
      }

      // Cash deposits: flatten JSONB rows into date+branch → amount
      const depositByDateBranch = new Map<string, number>()
      for (const dep of depositRes.data ?? []) {
        const rows = (dep.rows as CashDepositJsonRow[]) ?? []
        for (const r of rows) {
          const key = `${r.date}:${r.branch}`
          depositByDateBranch.set(key, (depositByDateBranch.get(key) ?? 0) + Number(r.amount))
        }
      }

      // Build a lookup of daily_entry aggregates: date+branch → { cashInHand, deIds, notes }
      const deByDateBranch = new Map<
        string,
        {
          cashInHand: number
          iti: number
          ramco: number
          arun: number
          ajith: number
          notes: string | null
        }
      >()
      for (const de of dailyEntries ?? []) {
        const key = `${de.entry_date}:${de.branch}`
        const curr = deByDateBranch.get(key) ?? {
          cashInHand: 0,
          iti: 0,
          ramco: 0,
          arun: 0,
          ajith: 0,
          notes: null,
        }
        const cashForShift = cashByDeId.get(de.id as string) ?? 0
        const ppForShift = postByDeId.get(de.id as string) ?? {
          iti: 0,
          ramco: 0,
          arun: 0,
          ajith: 0,
        }
        curr.cashInHand += cashForShift
        curr.iti += ppForShift.iti
        curr.ramco += ppForShift.ramco
        curr.arun += ppForShift.arun
        curr.ajith += ppForShift.ajith
        if (de.notes && !curr.notes) curr.notes = de.notes as string
        deByDateBranch.set(key, curr)
      }

      // Assemble rows for each date and branch
      const rows: DailySalesSummaryRow[] = []
      const activeBranches: Array<'KR' | 'C2'> = branch === 'Combined' ? ['KR', 'C2'] : [branch]

      for (const date of dates) {
        for (const b of activeBranches) {
          const key = `${date}:${b}`
          const de = deByDateBranch.get(key)
          const upiVal = upiByDateBranch.has(key) ? upiByDateBranch.get(key)! : null
          const cashExp = expByDateBranch.get(key) ?? 0
          const cashInHand = de?.cashInHand ?? 0

          const iti = b === 'KR' ? (de?.iti ?? null) : null
          const ramco = b === 'KR' ? (de?.ramco ?? null) : null
          const arun = b === 'KR' ? (de?.arun ?? null) : null
          const ajith = b === 'KR' ? (de?.ajith ?? null) : null
          const totalPostpaid = (iti ?? 0) + (ramco ?? 0) + (arun ?? 0) + (ajith ?? 0)

          const salesFromCollection = cashInHand + cashExp + (upiVal ?? 0)
          const totalShopSales = salesFromCollection + totalPostpaid
          const cashDeposited = depositByDateBranch.get(key) ?? null

          rows.push({
            date,
            branch: b,
            upi: upiVal,
            cash_expenses: cashExp,
            cash_in_hand: cashInHand,
            iti,
            ramco,
            arun,
            ajith,
            total_postpaid: totalPostpaid,
            sales_from_collection: salesFromCollection,
            total_shop_sales: totalShopSales,
            billed_sales: null,
            difference_amount: null,
            cash_deposited: cashDeposited,
            remarks: de?.notes ?? null,
          })
        }
      }

      // Month totals
      const totals: DailySalesSummaryTotals = {
        upi: rows.filter((r) => r.upi !== null).reduce((s, r) => s + (r.upi ?? 0), 0),
        cash_expenses: rows.reduce((s, r) => s + r.cash_expenses, 0),
        cash_in_hand: rows.reduce((s, r) => s + r.cash_in_hand, 0),
        iti: rows.reduce((s, r) => s + (r.iti ?? 0), 0),
        ramco: rows.reduce((s, r) => s + (r.ramco ?? 0), 0),
        arun: rows.reduce((s, r) => s + (r.arun ?? 0), 0),
        ajith: rows.reduce((s, r) => s + (r.ajith ?? 0), 0),
        total_postpaid: rows.reduce((s, r) => s + r.total_postpaid, 0),
        sales_from_collection: rows.reduce((s, r) => s + r.sales_from_collection, 0),
        total_shop_sales: rows.reduce((s, r) => s + r.total_shop_sales, 0),
        cash_deposited: rows.reduce((s, r) => s + (r.cash_deposited ?? 0), 0),
        upi_days_with_data: rows.filter((r) => r.upi !== null).length,
        upi_days_missing: rows.filter((r) => r.upi === null).length,
      }

      return { rows, totals }
    },
    { retry: 2, staleTime: 30000 }
  )
}

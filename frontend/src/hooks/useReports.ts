import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '../lib/supabase'
import type {
  ReportFilters,
  MilkReportRow,
  ConsumptionReportRow,
  WastageReportRow,
  ExpenseReportRow,
} from '../types/phase7'

// ─── Shared helper ────────────────────────────────────────────────────────────

/**
 * Fetches daily_entry IDs for a date range and optional branch.
 * Used by wastage and expense reports which still need the daily_entries join.
 */
async function fetchDailyEntryIds(filters: ReportFilters) {
  let q = supabase
    .from('daily_entries')
    .select('id, entry_date, branch')
    .gte('entry_date', filters.from_date)
    .lte('entry_date', filters.to_date)

  if (filters.branch !== 'all') q = q.eq('branch', filters.branch)

  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data ?? []
}

// ─── Milk Report ─────────────────────────────────────────────────────────────

/**
 * Fetches milk data per day per branch from milk_entries (single source of truth).
 * Migration 020 consolidated all milk data — bought, opening, closing, consumed —
 * into milk_entries directly. No join to stock_entries needed.
 *
 * @param filters - from_date, to_date, branch ('all' | 'KR' | 'C2')
 */
export function useMilkReport(filters: ReportFilters) {
  return useSupabaseQuery<MilkReportRow[]>(
    ['milk_report', filters.from_date, filters.to_date, filters.branch],
    async () => {
      let q = supabase
        .from('milk_entries')
        .select(
          'entry_date, branch, opening_balance_litres, bought_litres, total_consumed_litres, closing_balance_litres, coffee_s1_litres, tea_s1_litres, coffee_s2_litres, tea_s2_litres'
        )
        .gte('entry_date', filters.from_date)
        .lte('entry_date', filters.to_date)
        .order('entry_date', { ascending: false })

      if (filters.branch !== 'all') q = q.eq('branch', filters.branch)

      const { data, error } = await q
      if (error) throw new Error(error.message)

      return (data ?? []).map((row) => {
        const s1c = Number(row.coffee_s1_litres ?? 0)
        const s1t = Number(row.tea_s1_litres ?? 0)
        const s2c = Number(row.coffee_s2_litres ?? 0)
        const s2t = Number(row.tea_s2_litres ?? 0)
        const consumed = Number(row.total_consumed_litres ?? 0)
        return {
          entry_date: row.entry_date as string,
          branch: row.branch as string,
          opening_balance: Number(row.opening_balance_litres ?? 0),
          bought: Number(row.bought_litres ?? 0),
          used: consumed,
          remaining: Number(row.closing_balance_litres ?? 0),
          s1_coffee: s1c,
          s1_tea: s1t,
          s2_coffee: s2c,
          s2_tea: s2t,
          total_coffee: s1c + s2c,
          total_tea: s1t + s2t,
          grand_total: consumed,
        }
      })
    },
    { retry: 2, staleTime: 30000 }
  )
}

// ─── Consumption Report ───────────────────────────────────────────────────────

/**
 * Fetches stock consumption per item per day for the given date range.
 * Consumption = opening_stock + purchase − closing_stock.
 *
 * @param filters - from_date, to_date, branch ('all' | 'KR' | 'C2')
 * @param itemFilter - optional item name substring filter
 */
export function useConsumptionReport(filters: ReportFilters, itemFilter?: string) {
  return useSupabaseQuery<ConsumptionReportRow[]>(
    ['consumption_report', filters.from_date, filters.to_date, filters.branch, itemFilter],
    async () => {
      let q = supabase
        .from('stock_entries')
        .select('entry_date, branch, item_name, unit, opening_stock, purchase, closing_stock')
        .gte('entry_date', filters.from_date)
        .lte('entry_date', filters.to_date)
        .order('entry_date', { ascending: false })
        .order('item_name', { ascending: true })

      if (filters.branch !== 'all') q = q.eq('branch', filters.branch)

      const { data, error } = await q
      if (error) throw new Error(error.message)

      let rows = (data ?? []).map((row) => ({
        entry_date: row.entry_date as string,
        branch: row.branch as string,
        item_name: row.item_name as string,
        unit: row.unit as string | null,
        opening_stock: Number(row.opening_stock),
        purchase: Number(row.purchase),
        closing_stock: Number(row.closing_stock),
        consumption: Number(row.opening_stock) + Number(row.purchase) - Number(row.closing_stock),
      }))

      if (itemFilter?.trim()) {
        const lower = itemFilter.trim().toLowerCase()
        rows = rows.filter((r) => r.item_name.toLowerCase().includes(lower))
      }

      return rows
    },
    { retry: 2, staleTime: 30000 }
  )
}

// ─── Wastage Report ───────────────────────────────────────────────────────────

/**
 * Fetches snack wastage and complimentary data per item per day for the given date range.
 * Wastage % = (wastage / supplied) × 100 where supplied = qty (vendor) or prepared (in-house).
 *
 * @param filters - from_date, to_date, branch ('all' | 'KR' | 'C2')
 */
export function useWastageReport(filters: ReportFilters) {
  return useSupabaseQuery<WastageReportRow[]>(
    ['wastage_report', filters.from_date, filters.to_date, filters.branch],
    async () => {
      const dailyEntries = await fetchDailyEntryIds(filters)
      if (!dailyEntries.length) return []

      const ids = dailyEntries.map((d) => d.id)

      const { data: snackEntries, error } = await supabase
        .from('snack_entries')
        .select(
          'daily_entry_id, item_name, input_type, qty, prepared, sold, wastage, complimentary'
        )
        .in('daily_entry_id', ids)

      if (error) throw new Error(error.message)

      const dailyMap = new Map(dailyEntries.map((d) => [d.id, d]))

      return (snackEntries ?? [])
        .map((s) => {
          const d = dailyMap.get(s.daily_entry_id)
          if (!d) return null
          const supplied = s.input_type === 'qty' ? Number(s.qty) : Number(s.prepared)
          const wastage = Number(s.wastage)
          return {
            entry_date: d.entry_date,
            branch: d.branch,
            item_name: s.item_name as string,
            supplied,
            sold: Number(s.sold),
            wastage,
            complimentary: Number(s.complimentary),
            wastage_pct: supplied > 0 ? (wastage / supplied) * 100 : 0,
          }
        })
        .filter((r): r is WastageReportRow => r !== null)
        .sort((a, b) => b.entry_date.localeCompare(a.entry_date))
    },
    { retry: 2, staleTime: 30000 }
  )
}

// ─── Expense Report ───────────────────────────────────────────────────────────

/**
 * Fetches cash expense entries per day per category for the given date range.
 *
 * @param filters - from_date, to_date, branch ('all' | 'KR' | 'C2')
 */
export function useExpenseReport(filters: ReportFilters) {
  return useSupabaseQuery<ExpenseReportRow[]>(
    ['expense_report', filters.from_date, filters.to_date, filters.branch],
    async () => {
      let q = supabase
        .from('expense_entries')
        .select('entry_date, branch, category, amount, is_gas')
        .gte('entry_date', filters.from_date)
        .lte('entry_date', filters.to_date)
        .order('entry_date', { ascending: false })
        .order('category', { ascending: true })

      if (filters.branch !== 'all') q = q.eq('branch', filters.branch)

      const { data, error } = await q
      if (error) throw new Error(error.message)

      return (data ?? []).map((row) => ({
        entry_date: row.entry_date as string,
        branch: row.branch as string,
        category: row.category as string,
        amount: Number(row.amount),
        is_gas: row.is_gas as boolean,
      }))
    },
    { retry: 2, staleTime: 30000 }
  )
}

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
 * Returns an array of { id, entry_date, branch } objects.
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

/**
 * Fetches the most recent closing stock for 'Milk' before a given date, per branch.
 * Uses a reliable 2-step approach (consistent with fetchDailyEntryIds pattern) instead
 * of PostgREST embedded-filter dot-notation which is unreliable for ordering/filtering.
 *
 * @param fromDate - ISO date string; we want entries strictly before this date
 * @param branch - 'all' | 'KR' | 'C2'
 * @returns Record mapping branch name to its prior closing stock (0 if none found)
 */
async function fetchPriorClosingStock(
  fromDate: string,
  branch: string
): Promise<Record<string, number>> {
  const branches = branch === 'all' ? ['KR', 'C2'] : [branch]
  const result: Record<string, number> = {}

  for (const br of branches) {
    const { data: priorEntries } = await supabase
      .from('daily_entries')
      .select('id')
      .eq('branch', br)
      .lt('entry_date', fromDate)
      .order('entry_date', { ascending: false })
      .limit(5)

    if (priorEntries?.length) {
      const priorIds = priorEntries.map((e) => e.id)
      const { data: stockRows } = await supabase
        .from('stock_entries')
        .select('closing_stock, daily_entry_id')
        .eq('item_name', 'Milk')
        .in('daily_entry_id', priorIds)
        .limit(1)
      result[br] = Number(stockRows?.[0]?.closing_stock ?? 0)
    } else {
      result[br] = 0
    }
  }

  return result
}

// ─── Milk Report ─────────────────────────────────────────────────────────────

/**
 * Fetches milk consumption (coffee + tea) per day per branch for the given date range.
 * Aggregates shift 1 and shift 2 into a single row per date+branch combination.
 * Also includes packet inventory columns from stock_entries (item_name = 'Milk').
 *
 * @param filters - from_date, to_date, branch ('all' | 'KR' | 'C2')
 */
export function useMilkReport(filters: ReportFilters) {
  return useSupabaseQuery<MilkReportRow[]>(
    ['milk_report', filters.from_date, filters.to_date, filters.branch],
    async () => {
      const dailyEntries = await fetchDailyEntryIds(filters)
      if (!dailyEntries.length) return []

      const ids = dailyEntries.map((d) => d.id)

      const [{ data: milkEntries, error: milkError }, { data: stockEntries, error: stockError }] =
        await Promise.all([
          supabase
            .from('milk_entries')
            .select('daily_entry_id, shift_number, coffee_milk_litres, tea_milk_litres')
            .in('daily_entry_id', ids),
          supabase
            .from('stock_entries')
            .select('daily_entry_id, purchase, closing_stock')
            .in('daily_entry_id', ids)
            .eq('item_name', 'Milk'),
        ])

      if (milkError) throw new Error(milkError.message)
      if (stockError) throw new Error(stockError.message)

      // Fix 2+3: Per-branch prior closing stock via reliable 2-step query
      const priorByBranch = await fetchPriorClosingStock(filters.from_date, filters.branch)

      const dailyMap = new Map(dailyEntries.map((d) => [d.id, d]))

      const stockMap = new Map<string, { purchase: number; closing_stock: number }>()
      for (const s of stockEntries ?? []) {
        const d = dailyMap.get(s.daily_entry_id)
        if (!d) continue
        const key = `${d.entry_date}:${d.branch}`
        const existing = stockMap.get(key)
        if (existing) {
          existing.purchase += Number(s.purchase)
          existing.closing_stock += Number(s.closing_stock)
        } else {
          stockMap.set(key, {
            purchase: Number(s.purchase),
            closing_stock: Number(s.closing_stock),
          })
        }
      }

      const rowMap = new Map<string, MilkReportRow>()

      for (const d of dailyEntries) {
        const key = `${d.entry_date}:${d.branch}`
        if (!rowMap.has(key)) {
          rowMap.set(key, {
            entry_date: d.entry_date,
            branch: d.branch,
            opening_balance: 0,
            bought: 0,
            used: 0,
            remaining: 0,
            s1_coffee: 0,
            s1_tea: 0,
            s2_coffee: 0,
            s2_tea: 0,
            total_coffee: 0,
            total_tea: 0,
            grand_total: 0,
          })
        }
      }

      for (const m of milkEntries ?? []) {
        const d = dailyMap.get(m.daily_entry_id)
        if (!d) continue
        const key = `${d.entry_date}:${d.branch}`
        const row = rowMap.get(key)
        if (!row) continue

        const coffee = Number(m.coffee_milk_litres)
        const tea = Number(m.tea_milk_litres)

        if (m.shift_number === 1) {
          row.s1_coffee += coffee
          row.s1_tea += tea
        } else {
          row.s2_coffee += coffee
          row.s2_tea += tea
        }
        row.total_coffee += coffee
        row.total_tea += tea
        row.grand_total += coffee + tea
      }

      const sortedAsc = Array.from(rowMap.values()).sort((a, b) =>
        a.entry_date.localeCompare(b.entry_date)
      )

      // Fix 1: Per-branch running balance so KR and C2 don't pollute each other
      const runningByBranch: Record<string, number> = {}
      for (const row of sortedAsc) {
        const br = row.branch
        const key = `${row.entry_date}:${br}`
        const stock = stockMap.get(key)
        const prior = runningByBranch[br] ?? priorByBranch[br] ?? 0
        row.opening_balance = prior
        row.bought = stock?.purchase ?? 0
        row.remaining = stock ? Number(stock.closing_stock) : prior + row.bought
        // Fix 5: Clamp used to 0 to handle data entry errors
        row.used = Math.max(0, row.opening_balance + row.bought - row.remaining)
        runningByBranch[br] = row.remaining
      }

      return sortedAsc.sort((a, b) => b.entry_date.localeCompare(a.entry_date))
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

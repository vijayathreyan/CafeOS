import { useMutation, useQuery, useQueryClient } from 'react-query'
import { supabase } from '../lib/supabase'
import {
  runAllPredictions,
  sumPredictions,
  getReconciliationStatus,
  type DayData,
  type StockRow,
  type SnackRow,
  type MilkRow,
} from '../lib/reconciliation'
import { checkDoubleAlert } from '../lib/doubleAlert'
import { sendAlertForTrigger } from '../lib/alertService'
import type { ReconciliationResult } from '../types/phase9'

// ─── Query key ────────────────────────────────────────────────────────────────

function reconKey(branch: string, month: string) {
  return ['reconciliation_results', branch, month]
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchItemPricesAndConfig(branch: 'KR' | 'C2') {
  const branchCol = branch === 'KR' ? 'active_kr' : 'active_c2'
  const { data, error } = await supabase
    .from('item_master')
    .select(`id, name_en, selling_price, reconciliation_method, ml_per_serving, ${branchCol}`)
    .not('reconciliation_method', 'is', null)

  if (error) throw new Error(error.message)

  const itemPrices: Record<string, number> = {}
  const mlPerServing: Record<string, number> = {}

  for (const item of data ?? []) {
    const price = Number(item.selling_price ?? 0)
    if (price <= 0) continue
    const ml = Number(item.ml_per_serving ?? 0)
    itemPrices[item.name_en] = price
    if (ml > 0) mlPerServing[item.name_en] = ml
  }

  // Convert milk prices from per-serving to per-litre for consumed_litres method
  for (const [name, price] of Object.entries(itemPrices)) {
    const ml = mlPerServing[name]
    if (
      ml &&
      ml > 0 &&
      (name.toLowerCase().includes('milk') ||
        name.toLowerCase() === 'tea' ||
        name.toLowerCase() === 'coffee')
    ) {
      itemPrices[name] = (price / ml) * 1000
    }
  }

  const { data: configs } = await supabase
    .from('stock_item_config')
    .select('item_id, weight_per_unit_grams, item_master!inner(name_en)')
    .eq('active', true)

  const weightConfig: DayData['weightConfig'] = {}
  for (const c of configs ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const name = (c.item_master as any)?.name_en
    if (name) {
      weightConfig[name] = { weight_per_unit_grams: Number(c.weight_per_unit_grams) }
    }
  }

  return { itemPrices, weightConfig }
}

async function fetchDayData(
  branch: 'KR' | 'C2',
  date: string,
  itemPrices: Record<string, number>,
  weightConfig: DayData['weightConfig']
): Promise<DayData> {
  // Fetch current day daily_entry IDs
  const { data: entries } = await supabase
    .from('daily_entries')
    .select('id')
    .eq('branch', branch)
    .eq('entry_date', date)

  const ids = (entries ?? []).map((e) => e.id)

  // Compute previous date
  const d = new Date(date + 'T00:00:00')
  d.setDate(d.getDate() - 1)
  const prevDate = d.toISOString().slice(0, 10)

  const [stockRes, prevStockRes, snackRes, milkRes] = await Promise.all([
    supabase
      .from('stock_entries')
      .select('item_name, opening_stock, purchase, closing_stock')
      .eq('branch', branch)
      .eq('entry_date', date),
    supabase
      .from('stock_entries')
      .select('item_name, opening_stock, purchase, closing_stock')
      .eq('branch', branch)
      .eq('entry_date', prevDate),
    ids.length > 0
      ? supabase
          .from('snack_entries')
          .select('item_name, input_type, qty, prepared, wastage')
          .in('daily_entry_id', ids)
      : Promise.resolve({ data: [], error: null }),
    ids.length > 0
      ? supabase
          .from('milk_entries')
          .select('shift_number, coffee_milk_litres, tea_milk_litres')
          .in('daily_entry_id', ids)
      : Promise.resolve({ data: [], error: null }),
  ])

  return {
    branch,
    date,
    stockEntries: (stockRes.data ?? []) as StockRow[],
    prevStockEntries: (prevStockRes.data ?? []) as StockRow[],
    snackEntries: (snackRes.data ?? []) as SnackRow[],
    milkEntries: (milkRes.data ?? []) as MilkRow[],
    itemPrices,
    weightConfig,
  }
}

async function fetchReportedSales(branch: 'KR' | 'C2', date: string): Promise<number | null> {
  const { data: entries } = await supabase
    .from('daily_entries')
    .select('id')
    .eq('branch', branch)
    .eq('entry_date', date)

  const ids = (entries ?? []).map((e) => e.id)

  // Check if UPI entry exists for this day
  const { data: upiData } = await supabase
    .from('upi_entries')
    .select('upi_total')
    .eq('branch', branch)
    .eq('entry_date', date)
    .maybeSingle()

  if (!upiData) return null // UPI not yet entered → pending

  const upiTotal = Number(upiData.upi_total ?? 0)

  // Cash in hand (from cash_entries denominations)
  let cashInHand = 0
  if (ids.length > 0) {
    const { data: cashEntries } = await supabase
      .from('cash_entries')
      .select('denom_500, denom_200, denom_100, denom_50, denom_20, denom_10')
      .in('daily_entry_id', ids)

    for (const ce of cashEntries ?? []) {
      cashInHand +=
        ce.denom_500 * 500 +
        ce.denom_200 * 200 +
        ce.denom_100 * 100 +
        ce.denom_50 * 50 +
        ce.denom_20 * 20 +
        ce.denom_10 * 10
    }
  }

  // Cash expenses
  const { data: expenseData } = await supabase
    .from('expense_entries')
    .select('amount')
    .eq('branch', branch)
    .eq('entry_date', date)

  const cashExpenses = (expenseData ?? []).reduce((s, e) => s + Number(e.amount), 0)

  // Post-paid (KR only)
  let postpaidTotal = 0
  if (branch === 'KR' && ids.length > 0) {
    const { data: ppData } = await supabase
      .from('postpaid_entries')
      .select('amount')
      .in('daily_entry_id', ids)
    postpaidTotal = (ppData ?? []).reduce((s, p) => s + Number(p.amount), 0)
  }

  return cashInHand + cashExpenses + upiTotal + postpaidTotal
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * Fetches saved reconciliation results for a branch and month from the database.
 */
export function useReconciliationResults(branch: 'KR' | 'C2', month: string, session: boolean) {
  return useQuery<ReconciliationResult[]>(
    reconKey(branch, month),
    async () => {
      const from = `${month}-01`
      const d = new Date(month + '-01')
      d.setMonth(d.getMonth() + 1)
      d.setDate(0)
      const to = d.toISOString().slice(0, 10)

      const { data, error } = await supabase
        .from('reconciliation_results')
        .select('*')
        .eq('branch', branch)
        .gte('entry_date', from)
        .lte('entry_date', to)
        .order('entry_date', { ascending: true })

      if (error) throw new Error(error.message)
      return (data ?? []) as ReconciliationResult[]
    },
    { enabled: !!session, retry: 2, staleTime: 60000 }
  )
}

/**
 * Runs batch reconciliation for all dates in the month for a branch.
 * Saves/upserts results into reconciliation_results table.
 */
export function useRunBatchReconciliation() {
  const qc = useQueryClient()

  return useMutation(
    async ({ branch, month }: { branch: 'KR' | 'C2'; month: string }) => {
      const { itemPrices, weightConfig } = await fetchItemPricesAndConfig(branch)

      const [y, m] = month.split('-').map(Number)
      const daysInMonth = new Date(y, m, 0).getDate()
      const today = new Date().toISOString().slice(0, 10)

      const results: Array<{
        branch: string
        entry_date: string
        predicted_sales: number
        reported_sales: number
        difference: number
        status: string
        item_breakdown: unknown
        calculated_at: string
      }> = []

      for (let day = 1; day <= daysInMonth; day++) {
        const date = `${month}-${String(day).padStart(2, '0')}`
        if (date > today) break

        const reportedSales = await fetchReportedSales(branch, date)

        if (reportedSales === null) {
          // UPI not entered — mark pending
          results.push({
            branch,
            entry_date: date,
            predicted_sales: 0,
            reported_sales: 0,
            difference: 0,
            status: 'pending',
            item_breakdown: null,
            calculated_at: new Date().toISOString(),
          })
          continue
        }

        const dayData = await fetchDayData(branch, date, itemPrices, weightConfig)
        const predictions = runAllPredictions(dayData)
        const predictedSales = sumPredictions(predictions)
        const difference = predictedSales - reportedSales
        const status = getReconciliationStatus(difference)

        results.push({
          branch,
          entry_date: date,
          predicted_sales: predictedSales,
          reported_sales: reportedSales,
          difference,
          status,
          item_breakdown: predictions,
          calculated_at: new Date().toISOString(),
        })

        if (status === 'amber' || status === 'red') {
          const triggerEvent = status === 'red' ? 'reconciliation_red' : 'reconciliation_amber'
          sendAlertForTrigger(
            triggerEvent,
            {
              branch,
              date,
              amount: String(Math.round(Math.abs(difference))),
            },
            { branch }
          )
          await checkDoubleAlert(branch, date)
        }
      }

      if (results.length > 0) {
        const { error } = await supabase
          .from('reconciliation_results')
          .upsert(results, { onConflict: 'branch,entry_date' })
        if (error) throw new Error(error.message)
      }

      return results
    },
    {
      onSuccess: (_, vars) => {
        qc.invalidateQueries(reconKey(vars.branch, vars.month))
      },
    }
  )
}

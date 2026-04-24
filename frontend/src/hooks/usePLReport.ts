import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '../lib/supabase'
import type { PLBranch, PLReportData, PLSection, PLLineItem } from '../types/phase8'
import { monthToFirstDay, monthToLastDay, monthToYYYYMM, prevMonthDate } from '../types/phase8'

// ─── Defaults for Fixed Expenses (used when DB has no rows) ──────────────────

const FIXED_DEFAULTS: Record<string, Record<string, number>> = {
  KR: {
    Rent: 17375,
    'FSSAI License': 416.67,
    'Corporation License': 416.67,
    'Internet (ACT)': 555.29,
    Pagarbook: 500,
    'Diwali Bonus': 3750,
    'Yearly Trip': 520.83,
  },
  C2: {
    Rent: 15000,
    'FSSAI License': 416.67,
    Pagarbook: 500,
    'Diwali Bonus': 1250,
    'Yearly Trip': 208.33,
  },
}

// ─── Per-branch data fetch ───────────────────────────────────────────────────

interface BranchMonthData {
  fixedExpenses: { label: string; amount: number }[]
  hasFixedCostFallback: boolean
  openingStock: number
  krHoExpenses: number
  milkCost: number
  coffeeCost: number
  teaCost: number
  homeBakesCost: number
  shopExpenses: number
  momosCost: number
  closingStock: number
  waterBill: number
  gasBill: number
  ebBill: number
  hkMiscTotal: number
  salary: { staff_name: string; amount: number }[]
  swiggy: number
  zomato: number
  shopSales: number
  capitalPurchases: { label: string; amount: number }[]
}

async function fetchBranchMonthData(
  branch: 'KR' | 'C2',
  firstDay: string,
  lastDay: string,
  monthNum: number,
  year: number,
  monthStr: string
): Promise<BranchMonthData> {
  // 1. Fixed expenses
  const { data: fixedRows } = await supabase
    .from('fixed_expenses')
    .select('label, monthly_amount')
    .eq('branch', branch)
    .eq('active', true)
    .order('label')

  const fixedExpenses = (fixedRows ?? []).map((r) => ({
    label: r.label as string,
    amount: Number(r.monthly_amount),
  }))
  const hasFixedCostFallback = fixedExpenses.length === 0

  if (hasFixedCostFallback) {
    const defaults = FIXED_DEFAULTS[branch] ?? {}
    for (const [label, amount] of Object.entries(defaults)) {
      fixedExpenses.push({ label, amount })
    }
  }

  // 2a. Opening stock (previous month)
  const prevFirst = monthToFirstDay(prevMonthDate(new Date(year, monthNum - 1, 1)))
  const [prevYearN, prevMonthN] = prevFirst.split('-').map(Number)
  const { data: prevStock } = await supabase
    .from('month_end_stock')
    .select('total_value')
    .eq('branch', branch)
    .eq('month', prevMonthN)
    .eq('year', prevYearN)
    .maybeSingle()
  const openingStock = Number((prevStock as { total_value?: number } | null)?.total_value ?? 0)

  // 2b. Closing stock (current month)
  const { data: currStock } = await supabase
    .from('month_end_stock')
    .select('total_value')
    .eq('branch', branch)
    .eq('month', monthNum)
    .eq('year', year)
    .maybeSingle()
  const closingStock = Number((currStock as { total_value?: number } | null)?.total_value ?? 0)

  // 2c. Daily entry IDs for the month
  const { data: dailyEntryRows } = await supabase
    .from('daily_entries')
    .select('id')
    .eq('branch', branch)
    .gte('entry_date', firstDay)
    .lte('entry_date', lastDay)
  const deIds = (dailyEntryRows ?? []).map((d) => d.id as string)

  // 2d. Vendor lookups — get all vendor IDs we need
  const { data: vendorRows } = await supabase
    .from('vendors')
    .select('id, business_name')
    .eq('active', true)
  const vendors = vendorRows ?? []

  const findVendor = (pattern: string) =>
    vendors.find((v) => (v.business_name as string).toLowerCase().includes(pattern.toLowerCase()))

  const pioneerVendor = findVendor('Pioneer') ?? findVendor('Franchisor') ?? findVendor('KR HO')
  const homeBakersVendor = findVendor('Home Baker') ?? findVendor('Home Bak')
  const momosVendor = findVendor('Momos') ?? findVendor('Momo')
  const kalingarajVendor = findVendor('Kalingaraj') ?? findVendor('Milk')

  // 2e. Vendor payments in the month
  async function vendorPaymentsInMonth(vendorId: string | undefined): Promise<number> {
    if (!vendorId) return 0
    const nextMonth = new Date(year, monthNum, 1).toISOString()
    const { data } = await supabase
      .from('vendor_payments')
      .select('amount_paid')
      .eq('vendor_id', vendorId)
      .gte('paid_at', firstDay + 'T00:00:00.000Z')
      .lt('paid_at', nextMonth)
    return (data ?? []).reduce((s, r) => s + Number(r.amount_paid), 0)
  }

  const [krHoExpenses, homeBakesCost, momosCost] = await Promise.all([
    branch === 'KR' ? vendorPaymentsInMonth(pioneerVendor?.id as string) : Promise.resolve(0),
    vendorPaymentsInMonth(homeBakersVendor?.id as string),
    vendorPaymentsInMonth(momosVendor?.id as string),
  ])

  // 2f. Milk: litres BOUGHT (purchase from stock_entries) × cost price
  let milkCost = 0
  if (deIds.length > 0) {
    const { data: milkStockRows } = await supabase
      .from('stock_entries')
      .select('purchase')
      .ilike('item_name', '%Milk%')
      .in('daily_entry_id', deIds)
    const milkPurchased = (milkStockRows ?? []).reduce((s, r) => s + Number(r.purchase), 0)

    // Get milk cost price from Kalingaraj vendor rates
    let milkRatePerLitre = 0
    if (kalingarajVendor) {
      const { data: vi } = await supabase
        .from('vendor_items')
        .select('id')
        .eq('vendor_id', kalingarajVendor.id)
        .eq('active', true)
        .limit(1)
        .maybeSingle()
      if (vi) {
        const { data: rates } = await supabase
          .from('vendor_item_rates')
          .select('cost_price, effective_from')
          .eq('vendor_item_id', (vi as { id: string }).id)
          .lte('effective_from', lastDay)
          .order('effective_from', { ascending: false })
          .limit(1)
          .maybeSingle()
        milkRatePerLitre = Number((rates as { cost_price?: number } | null)?.cost_price ?? 0)
      }
    }
    milkCost = milkPurchased * milkRatePerLitre
  }

  // 2g. Coffee & Tea: consumption × cost_per_gram
  async function powderCost(itemPattern: string): Promise<number> {
    if (deIds.length === 0) return 0
    const { data: stockRows } = await supabase
      .from('stock_entries')
      .select('opening_stock, purchase, closing_stock')
      .ilike('item_name', itemPattern)
      .in('daily_entry_id', deIds)
    const consumedGrams = (stockRows ?? []).reduce(
      (s, r) => s + Number(r.opening_stock) + Number(r.purchase) - Number(r.closing_stock),
      0
    )
    if (consumedGrams <= 0) return 0

    // Get cost_per_gram from vendor_item_rates
    const { data: items } = await supabase
      .from('vendor_items')
      .select('id, vendor_item_rates(cost_price_per_gram, effective_from)')
      .eq('active', true)
      .limit(20)
    const allRates: { cost_price_per_gram: number; effective_from: string }[] = []
    for (const vi of items ?? []) {
      const rates =
        (vi.vendor_item_rates as {
          cost_price_per_gram: number | null
          effective_from: string
        }[]) ?? []
      for (const r of rates) {
        if (r.cost_price_per_gram != null && r.effective_from <= lastDay) {
          allRates.push({
            cost_price_per_gram: Number(r.cost_price_per_gram),
            effective_from: r.effective_from,
          })
        }
      }
    }
    allRates.sort((a, b) => (a.effective_from < b.effective_from ? 1 : -1))
    const costPerGram = allRates[0]?.cost_price_per_gram ?? 0
    return Math.round(consumedGrams * costPerGram * 100) / 100
  }

  const [coffeeCost, teaCost] = await Promise.all([
    powderCost('%Coffee Powder%'),
    powderCost('%Tea Powder%'),
  ])

  // 2h. Shop expenses (non-gas cash expenses)
  const { data: shopExpRows } = await supabase
    .from('expense_entries')
    .select('amount')
    .eq('branch', branch)
    .eq('is_gas', false)
    .gte('entry_date', firstDay)
    .lte('entry_date', lastDay)
  const shopExpenses = (shopExpRows ?? []).reduce((s, r) => s + Number(r.amount), 0)

  // 3. Bills & Annual
  // Water bill
  const { data: waterRows } = await supabase
    .from('owner_manual_expenses')
    .select('amount')
    .eq('expense_type', 'water_bill')
    .eq('branch', branch)
    .gte('expense_date', firstDay)
    .lte('expense_date', lastDay)
  const waterBill = (waterRows ?? []).reduce((s, r) => s + Number(r.amount), 0)

  // Gas bill
  const { data: gasRows } = await supabase
    .from('expense_entries')
    .select('amount')
    .eq('branch', branch)
    .eq('is_gas', true)
    .gte('entry_date', firstDay)
    .lte('entry_date', lastDay)
  const gasBill = (gasRows ?? []).reduce((s, r) => s + Number(r.amount), 0)

  // EB Bill (from override)
  const { data: ebOverride } = await supabase
    .from('pl_monthly_overrides')
    .select('eb_bill_amount')
    .eq('branch', branch)
    .eq('month', firstDay)
    .maybeSingle()
  const ebBill = Number((ebOverride as { eb_bill_amount?: number } | null)?.eb_bill_amount ?? 0)

  // HK & Misc: supervisor_expenses + owner maintenance/irregular
  const [{ data: supExpRows }, { data: ownerExpRows }] = await Promise.all([
    supabase
      .from('supervisor_expenses')
      .select('amount')
      .eq('branch', branch)
      .gte('expense_date', firstDay)
      .lte('expense_date', lastDay),
    supabase
      .from('owner_manual_expenses')
      .select('amount')
      .eq('branch', branch)
      .in('expense_type', ['maintenance', 'irregular'])
      .gte('expense_date', firstDay)
      .lte('expense_date', lastDay),
  ])
  const hkMiscTotal =
    (supExpRows ?? []).reduce((s, r) => s + Number(r.amount), 0) +
    (ownerExpRows ?? []).reduce((s, r) => s + Number(r.amount), 0)

  // 4. Salary
  const { data: salaryRows } = await supabase
    .from('pl_salary_entries')
    .select('staff_name, amount')
    .eq('branch', branch)
    .eq('month_year', monthStr)
    .order('staff_name')
  const salary = (salaryRows ?? []).map((r) => ({
    staff_name: r.staff_name as string,
    amount: Number(r.amount),
  }))

  // 5. Revenue — Swiggy/Zomato (KR only)
  let swiggy = 0
  let zomato = 0
  if (branch === 'KR') {
    const { data: deliveryRows } = await supabase
      .from('delivery_platform_entries')
      .select('platform, amount_credited')
      .eq('branch', 'KR')
      .gte('period_from', firstDay)
      .lte('period_from', lastDay)
    for (const r of deliveryRows ?? []) {
      if ((r.platform as string).toLowerCase() === 'swiggy') swiggy += Number(r.amount_credited)
      else if ((r.platform as string).toLowerCase() === 'zomato')
        zomato += Number(r.amount_credited)
    }
  }

  // Shop sales: Cash in Hand + Cash Expenses + UPI + Post-Paid
  let cashInHand = 0
  let cashExpTotal = 0
  let upiTotal = 0
  let postpaidTotal = 0

  if (deIds.length > 0) {
    const [cashRes, postRes] = await Promise.all([
      supabase.from('cash_entries').select('shift_total').in('daily_entry_id', deIds),
      supabase.from('postpaid_entries').select('daily_total').in('daily_entry_id', deIds),
    ])
    cashInHand = (cashRes.data ?? []).reduce((s, r) => s + Number(r.shift_total), 0)
    postpaidTotal = (postRes.data ?? []).reduce((s, r) => s + Number(r.daily_total), 0)
  }

  const { data: expAllRows } = await supabase
    .from('expense_entries')
    .select('amount')
    .eq('branch', branch)
    .gte('entry_date', firstDay)
    .lte('entry_date', lastDay)
  cashExpTotal = (expAllRows ?? []).reduce((s, r) => s + Number(r.amount), 0)

  const { data: upiRows } = await supabase
    .from('upi_entries')
    .select('upi_total')
    .eq('branch', branch)
    .gte('entry_date', firstDay)
    .lte('entry_date', lastDay)
    .not('upi_total', 'is', null)
  upiTotal = (upiRows ?? []).reduce((s, r) => s + Number(r.upi_total), 0)

  const shopSales = cashInHand + cashExpTotal + upiTotal + postpaidTotal

  // Capital purchases (excluded from Total Expenses, shown separately)
  const { data: capitalRows } = await supabase
    .from('capital_expenditure')
    .select('description, amount')
    .eq('branch', branch)
    .gte('expense_date', firstDay)
    .lte('expense_date', lastDay)
  const capitalPurchases = (capitalRows ?? []).map((r) => ({
    label: r.description as string,
    amount: Number(r.amount),
  }))

  return {
    fixedExpenses,
    hasFixedCostFallback,
    openingStock,
    krHoExpenses,
    milkCost,
    coffeeCost,
    teaCost,
    homeBakesCost,
    shopExpenses,
    momosCost,
    closingStock,
    waterBill,
    gasBill,
    ebBill,
    hkMiscTotal,
    salary,
    swiggy,
    zomato,
    shopSales,
    capitalPurchases,
  }
}

// ─── Assemble PLReportData from branch data ──────────────────────────────────

function assembleReport(
  curr: BranchMonthData,
  prev: BranchMonthData,
  branch: PLBranch
): PLReportData {
  const isKROnly = (label: string) =>
    ['Corporation License', 'Internet (ACT)', 'KR HO / HO Expenses'].includes(label)

  // Section 1 — Fixed Expenses
  const allLabels = Array.from(
    new Set([...curr.fixedExpenses.map((f) => f.label), ...prev.fixedExpenses.map((f) => f.label)])
  )
  const s1Lines: PLLineItem[] = allLabels.map((label) => {
    const c = curr.fixedExpenses.find((f) => f.label === label)?.amount ?? 0
    const p = prev.fixedExpenses.find((f) => f.label === label)?.amount ?? 0
    return {
      label,
      current: c,
      previous: p,
      variance: c - p,
      note: isKROnly(label) && branch === 'Combined' ? 'KR only' : undefined,
    }
  })
  const s1Total = s1Lines.reduce((s, l) => s + l.current, 0)
  const s1PrevTotal = s1Lines.reduce((s, l) => s + l.previous, 0)

  // Section 2 — Raw Materials
  const rawMaterialsLines: PLLineItem[] = [
    {
      label: 'Opening Stock',
      current: curr.openingStock,
      previous: prev.openingStock,
      variance: curr.openingStock - prev.openingStock,
    },
    {
      label: 'KR HO / HO Expenses',
      current: curr.krHoExpenses,
      previous: prev.krHoExpenses,
      variance: curr.krHoExpenses - prev.krHoExpenses,
      note: 'KR only',
    },
    {
      label: 'Milk',
      current: curr.milkCost,
      previous: prev.milkCost,
      variance: curr.milkCost - prev.milkCost,
    },
    {
      label: 'Coffee',
      current: curr.coffeeCost,
      previous: prev.coffeeCost,
      variance: curr.coffeeCost - prev.coffeeCost,
    },
    {
      label: 'Tea',
      current: curr.teaCost,
      previous: prev.teaCost,
      variance: curr.teaCost - prev.teaCost,
    },
    {
      label: 'Home Bakes',
      current: curr.homeBakesCost,
      previous: prev.homeBakesCost,
      variance: curr.homeBakesCost - prev.homeBakesCost,
    },
    {
      label: 'Shop Expenses',
      current: curr.shopExpenses,
      previous: prev.shopExpenses,
      variance: curr.shopExpenses - prev.shopExpenses,
    },
    {
      label: 'Momos',
      current: curr.momosCost,
      previous: prev.momosCost,
      variance: curr.momosCost - prev.momosCost,
    },
    {
      label: 'Closing Stock',
      current: -curr.closingStock,
      previous: -prev.closingStock,
      variance: -curr.closingStock - -prev.closingStock,
      note: 'Deducted',
    },
  ]
  const s2Total = rawMaterialsLines.reduce((s, l) => s + l.current, 0)
  const s2PrevTotal = rawMaterialsLines.reduce((s, l) => s + l.previous, 0)

  // Section 3 — Bills & Annual
  const s3Lines: PLLineItem[] = [
    {
      label: 'Water Bill',
      current: curr.waterBill,
      previous: prev.waterBill,
      variance: curr.waterBill - prev.waterBill,
    },
    {
      label: 'Gas Bill',
      current: curr.gasBill,
      previous: prev.gasBill,
      variance: curr.gasBill - prev.gasBill,
    },
    {
      label: 'EB Bill',
      current: curr.ebBill,
      previous: prev.ebBill,
      variance: curr.ebBill - prev.ebBill,
    },
    {
      label: 'HK & Misc Total',
      current: curr.hkMiscTotal,
      previous: prev.hkMiscTotal,
      variance: curr.hkMiscTotal - prev.hkMiscTotal,
    },
  ]
  const s3Total = s3Lines.reduce((s, l) => s + l.current, 0)
  const s3PrevTotal = s3Lines.reduce((s, l) => s + l.previous, 0)

  // Section 4 — Salary
  const allStaff = Array.from(
    new Set([...curr.salary.map((s) => s.staff_name), ...prev.salary.map((s) => s.staff_name)])
  )
  const s4Lines: PLLineItem[] = allStaff.map((name) => {
    const c = curr.salary.find((s) => s.staff_name === name)?.amount ?? 0
    const p = prev.salary.find((s) => s.staff_name === name)?.amount ?? 0
    return { label: name, current: c, previous: p, variance: c - p }
  })
  const s4Total = s4Lines.reduce((s, l) => s + l.current, 0)
  const s4PrevTotal = s4Lines.reduce((s, l) => s + l.previous, 0)

  // Section 5 — Revenue
  const s5Lines: PLLineItem[] = [
    {
      label: 'Swiggy',
      current: curr.swiggy,
      previous: prev.swiggy,
      variance: curr.swiggy - prev.swiggy,
      note: 'KR only',
    },
    {
      label: 'Zomato',
      current: curr.zomato,
      previous: prev.zomato,
      variance: curr.zomato - prev.zomato,
      note: 'KR only',
    },
    {
      label: 'Sales from Shop',
      current: curr.shopSales,
      previous: prev.shopSales,
      variance: curr.shopSales - prev.shopSales,
    },
  ]
  const s5Total = s5Lines.reduce((s, l) => s + l.current, 0)
  const s5PrevTotal = s5Lines.reduce((s, l) => s + l.previous, 0)

  const totalSales = s5Total
  const totalExpenses = s1Total + s2Total + s3Total + s4Total
  const grossProfit = totalSales - totalExpenses

  const prevTotalSales = s5PrevTotal
  const prevTotalExpenses = s1PrevTotal + s2PrevTotal + s3PrevTotal + s4PrevTotal
  const prevGrossProfit = prevTotalSales - prevTotalExpenses

  const capitalPurchases = curr.capitalPurchases.map((cp) => ({
    label: cp.label,
    current: cp.amount,
    previous: 0,
    variance: cp.amount,
    isCapital: true,
  }))

  const sections: PLSection[] = [
    {
      id: 'section1',
      title: 'Section 1 — Fixed Expenses',
      lines: s1Lines,
      total: s1Total,
      prevTotal: s1PrevTotal,
    },
    {
      id: 'section2',
      title: 'Section 2 — Raw Materials',
      lines: rawMaterialsLines,
      total: s2Total,
      prevTotal: s2PrevTotal,
    },
    {
      id: 'section3',
      title: 'Section 3 — Bills & Annual',
      lines: s3Lines,
      total: s3Total,
      prevTotal: s3PrevTotal,
    },
    {
      id: 'section4',
      title: 'Section 4 — Salary',
      lines: s4Lines,
      total: s4Total,
      prevTotal: s4PrevTotal,
    },
    {
      id: 'section5',
      title: 'Section 5 — Revenue',
      lines: s5Lines,
      total: s5Total,
      prevTotal: s5PrevTotal,
    },
  ]

  return {
    sections,
    totalSales,
    totalExpenses,
    grossProfit,
    capitalPurchases,
    prevTotalSales,
    prevTotalExpenses,
    prevGrossProfit,
    hasFixedCostFallback: curr.hasFixedCostFallback || prev.hasFixedCostFallback,
  }
}

// ─── Merge KR + C2 data for Combined view ────────────────────────────────────

function mergeBranchData(kr: BranchMonthData, c2: BranchMonthData): BranchMonthData {
  const mergeFixed = () => {
    const all = new Map<string, number>()
    for (const f of kr.fixedExpenses) all.set(f.label, (all.get(f.label) ?? 0) + f.amount)
    for (const f of c2.fixedExpenses) all.set(f.label, (all.get(f.label) ?? 0) + f.amount)
    return Array.from(all.entries()).map(([label, amount]) => ({ label, amount }))
  }
  const mergeSalary = () => {
    const all = new Map<string, number>()
    for (const s of kr.salary) all.set(s.staff_name, s.amount)
    for (const s of c2.salary) all.set(s.staff_name, s.amount)
    return Array.from(all.entries()).map(([staff_name, amount]) => ({ staff_name, amount }))
  }

  return {
    fixedExpenses: mergeFixed(),
    hasFixedCostFallback: kr.hasFixedCostFallback || c2.hasFixedCostFallback,
    openingStock: kr.openingStock + c2.openingStock,
    krHoExpenses: kr.krHoExpenses,
    milkCost: kr.milkCost + c2.milkCost,
    coffeeCost: kr.coffeeCost + c2.coffeeCost,
    teaCost: kr.teaCost + c2.teaCost,
    homeBakesCost: kr.homeBakesCost + c2.homeBakesCost,
    shopExpenses: kr.shopExpenses + c2.shopExpenses,
    momosCost: kr.momosCost + c2.momosCost,
    closingStock: kr.closingStock + c2.closingStock,
    waterBill: kr.waterBill + c2.waterBill,
    gasBill: kr.gasBill + c2.gasBill,
    ebBill: kr.ebBill + c2.ebBill,
    hkMiscTotal: kr.hkMiscTotal + c2.hkMiscTotal,
    salary: mergeSalary(),
    swiggy: kr.swiggy,
    zomato: kr.zomato,
    shopSales: kr.shopSales + c2.shopSales,
    capitalPurchases: [...kr.capitalPurchases, ...c2.capitalPurchases],
  }
}

// ─── Main Hook ────────────────────────────────────────────────────────────────

interface UsePLReportParams {
  branch: PLBranch
  month: Date
}

/**
 * Assembles the full P&L report for a given branch and month.
 * Includes previous month comparison and variance calculations.
 *
 * @param params - branch ('KR' | 'C2' | 'Combined') and month (Date, first of month)
 */
export function usePLReport({ branch, month }: UsePLReportParams) {
  const monthNum = month.getMonth() + 1
  const year = month.getFullYear()
  const monthStr = monthToYYYYMM(month)
  const firstDay = monthToFirstDay(month)
  const lastDay = monthToLastDay(month)

  const prevMonth = prevMonthDate(month)
  const prevMonthStr = monthToYYYYMM(prevMonth)
  const prevFirstDay = monthToFirstDay(prevMonth)
  const prevLastDay = monthToLastDay(prevMonth)
  const prevMonthNum = prevMonth.getMonth() + 1
  const prevYear = prevMonth.getFullYear()

  return useSupabaseQuery<PLReportData>(
    ['pl_report', branch, monthStr],
    async () => {
      if (branch === 'Combined') {
        const [krCurr, c2Curr, krPrev, c2Prev] = await Promise.all([
          fetchBranchMonthData('KR', firstDay, lastDay, monthNum, year, monthStr),
          fetchBranchMonthData('C2', firstDay, lastDay, monthNum, year, monthStr),
          fetchBranchMonthData(
            'KR',
            prevFirstDay,
            prevLastDay,
            prevMonthNum,
            prevYear,
            prevMonthStr
          ),
          fetchBranchMonthData(
            'C2',
            prevFirstDay,
            prevLastDay,
            prevMonthNum,
            prevYear,
            prevMonthStr
          ),
        ])
        const curr = mergeBranchData(krCurr, c2Curr)
        const prev = mergeBranchData(krPrev, c2Prev)
        return assembleReport(curr, prev, 'Combined')
      } else {
        const [curr, prev] = await Promise.all([
          fetchBranchMonthData(branch, firstDay, lastDay, monthNum, year, monthStr),
          fetchBranchMonthData(
            branch,
            prevFirstDay,
            prevLastDay,
            prevMonthNum,
            prevYear,
            prevMonthStr
          ),
        ])
        return assembleReport(curr, prev, branch)
      }
    },
    { retry: 2, staleTime: 60000 }
  )
}

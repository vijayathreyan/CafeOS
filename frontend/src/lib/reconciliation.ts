// ─── Phase 9 — Sales Reconciliation Engine — 10 Prediction Methods ────────────
//
// Each pure function receives a DayData object and returns zero or more
// ItemPrediction records. The hook (useReconciliation.ts) assembles DayData
// from Supabase queries and calls runAllPredictions().
//
// Thresholds: configurable via Admin Settings (Phase 11). Defaults used here.

import type { ItemPrediction } from '../types/phase9'

// Reconciliation thresholds (₹) — Phase 11 will make these Admin-configurable
export const RECON_AMBER_THRESHOLD = 200
export const RECON_RED_THRESHOLD = 500

export interface StockRow {
  item_name: string
  opening_stock: number
  purchase: number
  closing_stock: number
}

export interface SnackRow {
  item_name: string
  input_type: 'qty' | 'prepared'
  qty: number
  prepared: number
  wastage: number
}

export interface MilkRow {
  shift_number: number
  coffee_milk_litres: number
  tea_milk_litres: number
}

/**
 * All data needed for a single day's reconciliation calculation.
 * itemPrices values are already in "per unit of measurement used by this method"
 * (e.g. for consumed_litres: price per litre; for others: price per piece/cup/unit).
 */
export interface DayData {
  branch: 'KR' | 'C2'
  date: string
  stockEntries: StockRow[]
  prevStockEntries: StockRow[]
  snackEntries: SnackRow[]
  milkEntries: MilkRow[]
  itemPrices: Record<string, number>
  weightConfig: Record<string, { weight_per_unit_grams: number; weight_per_cup_grams?: number }>
}

// ─── Method 1: consumed_litres — Tea Milk, Coffee Milk ────────────────────────
// itemPrices should contain price-per-litre for 'Coffee Milk' and 'Tea Milk'

export function predictConsumedLitres(data: DayData): ItemPrediction[] {
  const results: ItemPrediction[] = []
  const totalCoffee = data.milkEntries.reduce((s, m) => s + Number(m.coffee_milk_litres), 0)
  const totalTea = data.milkEntries.reduce((s, m) => s + Number(m.tea_milk_litres), 0)

  const coffeeKey = Object.keys(data.itemPrices).find((k) => k.toLowerCase().includes('coffee'))
  const teaKey = Object.keys(data.itemPrices).find(
    (k) => k.toLowerCase().includes('tea') && k.toLowerCase().includes('milk')
  )

  const coffeePrice = coffeeKey ? data.itemPrices[coffeeKey] : 0
  const teaPrice = teaKey ? data.itemPrices[teaKey] : 0

  if (totalCoffee > 0 && coffeePrice > 0) {
    results.push({
      itemName: 'Coffee Milk',
      predictedQty: totalCoffee,
      predictedRevenue: totalCoffee * coffeePrice,
      method: 'consumed_litres',
    })
  }
  if (totalTea > 0 && teaPrice > 0) {
    results.push({
      itemName: 'Tea Milk',
      predictedQty: totalTea,
      predictedRevenue: totalTea * teaPrice,
      method: 'consumed_litres',
    })
  }
  return results
}

// ─── Method 2: received_wastage_diff ──────────────────────────────────────────
// (Qty received − Wastage entered) × selling price

const RECEIVED_WASTAGE_ITEMS = [
  'Medu Vada',
  'Onion Samosa',
  'Aloo Samosa',
  'Cutlet',
  'Elai Adai',
  'Kozhukattai',
]

export function predictReceivedWastageDiff(data: DayData): ItemPrediction[] {
  return RECEIVED_WASTAGE_ITEMS.flatMap((itemName) => {
    const entry = data.snackEntries.find((e) => e.item_name === itemName)
    if (!entry) return []
    const received = entry.input_type === 'qty' ? entry.qty : entry.prepared
    const net = received - entry.wastage
    if (net <= 0) return []
    const price = data.itemPrices[itemName] ?? 0
    if (price <= 0) return []
    return [
      {
        itemName,
        predictedQty: net,
        predictedRevenue: net * price,
        method: 'received_wastage_diff',
      },
    ]
  })
}

// ─── Method 3: stock_balance ──────────────────────────────────────────────────
// (Opening stock − Closing stock) × selling price

const STOCK_BALANCE_ITEMS = [
  'Tea Cake',
  'Choco Lava',
  'Lava',
  'Brownie',
  'Banana Cake',
  'Cream Bun',
  'Jam Bun',
  'Plain Bun',
  'Bun Butter Jam',
  'Coconut Bun',
]

export function predictStockBalance(data: DayData): ItemPrediction[] {
  return STOCK_BALANCE_ITEMS.flatMap((itemName) => {
    const entry = data.stockEntries.find((e) => e.item_name === itemName)
    if (!entry) return []
    const consumed = entry.opening_stock - entry.closing_stock
    if (consumed <= 0) return []
    const price = data.itemPrices[itemName] ?? 0
    if (price <= 0) return []
    return [
      {
        itemName,
        predictedQty: consumed,
        predictedRevenue: consumed * price,
        method: 'stock_balance',
      },
    ]
  })
}

// ─── Method 4: consumed_pieces — Veg Momos, Chicken Momos ────────────────────

const CONSUMED_PIECES_ITEMS = ['Veg Momos', 'Chicken Momos']

export function predictConsumedPieces(data: DayData): ItemPrediction[] {
  return CONSUMED_PIECES_ITEMS.flatMap((itemName) => {
    const entry = data.snackEntries.find((e) => e.item_name === itemName)
    if (!entry || entry.qty <= 0) return []
    const price = data.itemPrices[itemName] ?? 0
    if (price <= 0) return []
    return [
      {
        itemName,
        predictedQty: entry.qty,
        predictedRevenue: entry.qty * price,
        method: 'consumed_pieces',
      },
    ]
  })
}

// ─── Method 5: pack_of_bottle — Osmania Biscuits: packets × 24 pieces × ₹5 ──

export function predictPackOfBottle(data: DayData): ItemPrediction[] {
  const entry = data.stockEntries.find((e) => e.item_name.toLowerCase().includes('osmania'))
  if (!entry || entry.purchase <= 0) return []
  const totalPieces = entry.purchase * 24
  return [
    {
      itemName: 'Osmania Biscuit',
      predictedQty: totalPieces,
      predictedRevenue: totalPieces * 5,
      method: 'pack_of_bottle',
    },
  ]
}

// ─── Method 6: remaining_weight_bottle — Ladoos ───────────────────────────────

const WEIGHT_BOTTLE_ITEMS = ['Peanut Ladoo', 'Dry Fruit Ladoo', 'Rava Ladoo']

export function predictRemainingWeightBottle(data: DayData): ItemPrediction[] {
  return WEIGHT_BOTTLE_ITEMS.flatMap((itemName) => {
    const today = data.stockEntries.find((e) => e.item_name === itemName)
    const prev = data.prevStockEntries.find((e) => e.item_name === itemName)
    if (!today || !prev) return []
    const weightUsed = prev.closing_stock - today.closing_stock
    if (weightUsed <= 0) return []
    const config = data.weightConfig[itemName]
    if (!config || config.weight_per_unit_grams <= 0) return []
    const units = weightUsed / config.weight_per_unit_grams
    const price = data.itemPrices[itemName] ?? 0
    if (price <= 0) return []
    return [
      {
        itemName,
        predictedQty: Math.round(units),
        predictedRevenue: units * price,
        method: 'remaining_weight_bottle',
      },
    ]
  })
}

// ─── Method 7: remaining_weight_peanut — Sundal/Peanuts, Sweet Corn ──────────

const WEIGHT_PEANUT_ITEMS = ['Sundal', 'Sweet Corn']

export function predictRemainingWeightPeanut(data: DayData): ItemPrediction[] {
  return WEIGHT_PEANUT_ITEMS.flatMap((itemName) => {
    const today = data.stockEntries.find((e) => e.item_name === itemName)
    const prev = data.prevStockEntries.find((e) => e.item_name === itemName)
    if (!today || !prev) return []
    const weightUsed = prev.closing_stock - today.closing_stock
    if (weightUsed <= 0) return []
    const config = data.weightConfig[itemName]
    const gramsPerCup = config?.weight_per_cup_grams ?? config?.weight_per_unit_grams ?? 0
    if (gramsPerCup <= 0) return []
    const cups = weightUsed / gramsPerCup
    const price = data.itemPrices[itemName] ?? 0
    if (price <= 0) return []
    return [
      {
        itemName,
        predictedQty: Math.round(cups),
        predictedRevenue: cups * price,
        method: 'remaining_weight_peanut',
      },
    ]
  })
}

// ─── Method 8: remaining_cups — Rose Milk, Badam Milk (C2 only) ──────────────

const REMAINING_CUPS_ITEMS = ['Rose Milk', 'Badam Milk']

export function predictRemainingCups(data: DayData): ItemPrediction[] {
  if (data.branch !== 'C2') return []
  return REMAINING_CUPS_ITEMS.flatMap((itemName) => {
    const today = data.stockEntries.find((e) => e.item_name === itemName)
    const prev = data.prevStockEntries.find((e) => e.item_name === itemName)
    if (!today || !prev) return []
    const cupsUsed = prev.closing_stock - today.closing_stock
    if (cupsUsed <= 0) return []
    const price = data.itemPrices[itemName] ?? 0
    if (price <= 0) return []
    return [
      {
        itemName,
        predictedQty: cupsUsed,
        predictedRevenue: cupsUsed * price,
        method: 'remaining_cups',
      },
    ]
  })
}

// ─── Method 9: big_box_opened — Paal Khoa (KR only) ──────────────────────────

export function predictBigBoxOpened(data: DayData): ItemPrediction[] {
  if (data.branch !== 'KR') return []
  const entry = data.stockEntries.find(
    (e) =>
      e.item_name.toLowerCase().includes('paal khoa') ||
      e.item_name.toLowerCase().includes('paa khoa')
  )
  if (!entry || entry.purchase <= 0) return []
  const price = data.itemPrices['Paal Khoa'] ?? data.itemPrices['Paa Khoa'] ?? 0
  if (price <= 0) return []
  return [
    {
      itemName: 'Paal Khoa',
      predictedQty: entry.purchase,
      predictedRevenue: entry.purchase * price,
      method: 'big_box_opened',
    },
  ]
}

// ─── Method 10: preparation_staff ─────────────────────────────────────────────

const PREPARATION_ITEMS = ['Bajji', 'Masala Bonda', 'Cauliflower 65', 'Chinese Bonda']

export function predictPreparationStaff(data: DayData): ItemPrediction[] {
  return PREPARATION_ITEMS.flatMap((itemName) => {
    const entry = data.snackEntries.find((e) => e.item_name === itemName)
    if (!entry || entry.prepared <= 0) return []
    const price = data.itemPrices[itemName] ?? 0
    if (price <= 0) return []
    return [
      {
        itemName,
        predictedQty: entry.prepared,
        predictedRevenue: entry.prepared * price,
        method: 'preparation_staff',
      },
    ]
  })
}

// ─── Master runner ─────────────────────────────────────────────────────────────

/** Runs all 10 prediction methods and returns the combined list. */
export function runAllPredictions(data: DayData): ItemPrediction[] {
  return [
    ...predictConsumedLitres(data),
    ...predictReceivedWastageDiff(data),
    ...predictStockBalance(data),
    ...predictConsumedPieces(data),
    ...predictPackOfBottle(data),
    ...predictRemainingWeightBottle(data),
    ...predictRemainingWeightPeanut(data),
    ...predictRemainingCups(data),
    ...predictBigBoxOpened(data),
    ...predictPreparationStaff(data),
  ]
}

/** Sums predicted revenue from all item predictions. */
export function sumPredictions(predictions: ItemPrediction[]): number {
  return predictions.reduce((s, p) => s + p.predictedRevenue, 0)
}

/** Determines reconciliation status based on absolute difference. */
export function getReconciliationStatus(
  difference: number,
  amberThreshold = RECON_AMBER_THRESHOLD,
  redThreshold = RECON_RED_THRESHOLD
): 'reconciled' | 'amber' | 'red' {
  const abs = Math.abs(difference)
  if (abs >= redThreshold) return 'red'
  if (abs >= amberThreshold) return 'amber'
  return 'reconciled'
}

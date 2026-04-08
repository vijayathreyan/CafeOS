/** Input type for a stock item row */
export type StockInputType = 'kg_grams' | 'count' | 'weight_grams'

/** Definition of a stock item as shown in the entry form */
export interface StockItemDefinition {
  name: string
  unit: string
  inputType: StockInputType
}

/** Mutable form state for a single stock row */
export interface StockFormRow extends StockItemDefinition {
  /** Opening stock in base unit (grams for kg_grams/weight_grams, count for count) */
  openingStock: number
  /** Purchase in base unit */
  purchase: number
  /** Closing stock display — kg part (only for kg_grams items) */
  closingKg: number
  /** Closing stock display — grams part (only for kg_grams items, 0-999) */
  closingGramsField: number
  /** Closing stock in base unit (grams total or count) */
  closingStock: number
}

/** Record saved to the database (stock_entries table) */
export interface StockEntryRecord {
  daily_entry_id: string
  item_name: string
  unit: string
  opening_stock: number
  purchase: number
  closing_stock: number
  closing_kg: number | null
  closing_grams: number | null
  entry_method: string
  branch: string
  entry_date: string
  entered_by: string | null
  entered_by_role: string | null
}

/** Row returned from the database when loading existing entries */
export interface StockEntryRow {
  id: string
  daily_entry_id: string
  item_name: string
  unit: string
  opening_stock: number
  purchase: number
  closing_stock: number
  closing_kg: number | null
  closing_grams: number | null
  entry_method: string
  branch: string | null
  entry_date: string | null
}

/** Stock item config (weight-per-unit for ladoo/sundal/corn) */
export interface StockItemConfig {
  id: string
  item_id: string
  entry_unit: string
  weight_per_unit_grams: number
  weight_per_unit_effective_from: string
  branch: string | null
  active: boolean
  item_master: {
    id: string
    name_en: string
    name_ta: string | null
    unit: string
  }
}

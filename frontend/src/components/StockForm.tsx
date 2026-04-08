import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import KgGramsInput from './KgGramsInput'
import DraftRestorationDialog from './DraftRestorationDialog'
import { saveDraft, loadDraft, clearDraft } from '../lib/offlineQueue'
import { useSaveStockEntries, useStockEntries } from '../hooks/useStockEntries'
import { useToast } from '../hooks/use-toast'
import { useAuth } from '../contexts/AuthContext'
import type { BranchCode } from '../lib/supabase'
import type { StockFormRow, StockItemDefinition, StockEntryRecord } from '../types/stock'
import { Save, CheckCircle2 } from 'lucide-react'

// ── Item definitions ──────────────────────────────────────────

const KR_ITEMS: StockItemDefinition[] = [
  { name: 'Coffee Powder', unit: 'kg', inputType: 'kg_grams' },
  { name: 'Tea Powder', unit: 'kg', inputType: 'kg_grams' },
  { name: 'Country Sugar', unit: 'kg', inputType: 'count' },
  { name: 'White Sugar', unit: 'kg', inputType: 'count' },
  { name: 'Peanut Ladoo Bottle', unit: 'grams', inputType: 'weight_grams' },
  { name: 'Dry Fruit Ladoo Bottle', unit: 'grams', inputType: 'weight_grams' },
  { name: 'Rava Ladoo Bottle', unit: 'grams', inputType: 'weight_grams' },
  { name: 'Peanuts/Sundal', unit: 'grams', inputType: 'weight_grams' },
  { name: 'Milk', unit: 'packets', inputType: 'count' },
  { name: 'Tea Cake', unit: 'pcs', inputType: 'count' },
  { name: 'Banana Cake', unit: 'pcs', inputType: 'count' },
  { name: 'Brownie', unit: 'pcs', inputType: 'count' },
  { name: 'Lava', unit: 'pcs', inputType: 'count' },
  { name: 'Cream Bun', unit: 'pcs', inputType: 'count' },
  { name: 'Jam Bun', unit: 'pcs', inputType: 'count' },
  { name: 'Bun Butter Jam', unit: 'pcs', inputType: 'count' },
  { name: 'Plain Bun', unit: 'pcs', inputType: 'count' },
  { name: 'Coconut Bun', unit: 'pcs', inputType: 'count' },
  { name: 'Osmania Biscuit', unit: 'packets', inputType: 'count' },
  { name: 'Paa Khoa', unit: 'boxes', inputType: 'count' },
  { name: 'Water Bottle Bunch', unit: 'bunches', inputType: 'count' },
  { name: 'Momos Packet', unit: 'packets', inputType: 'count' },
  { name: 'Sweet Corn Packet', unit: 'cups', inputType: 'count' },
]

const C2_ITEMS: StockItemDefinition[] = [
  { name: 'Coffee Powder', unit: 'kg', inputType: 'kg_grams' },
  { name: 'Tea Powder', unit: 'kg', inputType: 'kg_grams' },
  { name: 'Country Sugar', unit: 'kg', inputType: 'count' },
  { name: 'White Sugar', unit: 'kg', inputType: 'count' },
  { name: 'Peanut Ladoo Bottle', unit: 'grams', inputType: 'weight_grams' },
  { name: 'Dry Fruit Ladoo Bottle', unit: 'grams', inputType: 'weight_grams' },
  { name: 'Peanuts/Sundal', unit: 'grams', inputType: 'weight_grams' },
  { name: 'White Channa', unit: 'grams', inputType: 'weight_grams' },
  { name: 'Egg', unit: 'pcs', inputType: 'count' },
  { name: 'Milk', unit: 'packets', inputType: 'count' },
  { name: 'Tea Cake', unit: 'pcs', inputType: 'count' },
  { name: 'Banana Cake', unit: 'pcs', inputType: 'count' },
  { name: 'Brownie', unit: 'pcs', inputType: 'count' },
  { name: 'Lava', unit: 'pcs', inputType: 'count' },
  { name: 'Cream Bun', unit: 'pcs', inputType: 'count' },
  { name: 'Jam Bun', unit: 'pcs', inputType: 'count' },
  { name: 'Bun Butter Jam', unit: 'pcs', inputType: 'count' },
  { name: 'Plain Bun', unit: 'pcs', inputType: 'count' },
  { name: 'Coconut Bun', unit: 'pcs', inputType: 'count' },
  { name: 'Osmania Biscuit', unit: 'packets', inputType: 'count' },
  { name: 'Momos Packet', unit: 'packets', inputType: 'count' },
  { name: 'Sweet Corn Packet', unit: 'cups', inputType: 'count' },
  { name: 'Rose Milk Cup', unit: 'cups', inputType: 'count' },
  { name: 'Badam Milk Cup', unit: 'cups', inputType: 'count' },
]

// ── Helpers ───────────────────────────────────────────────────

function buildDefaultRows(items: StockItemDefinition[]): StockFormRow[] {
  return items.map((item) => ({
    ...item,
    openingStock: 0,
    purchase: 0,
    closingKg: 0,
    closingGramsField: 0,
    closingStock: 0,
  }))
}

function rowsFromDb(
  dbRows: ReturnType<typeof useStockEntries>['data'],
  items: StockItemDefinition[]
): StockFormRow[] {
  const defaults = buildDefaultRows(items)
  if (!dbRows || dbRows.length === 0) return defaults

  return defaults.map((row) => {
    const saved = dbRows.find((d) => d.item_name === row.name)
    if (!saved) return row
    return {
      ...row,
      openingStock: saved.opening_stock ?? 0,
      purchase: saved.purchase ?? 0,
      closingKg: saved.closing_kg ?? 0,
      closingGramsField: saved.closing_grams ?? 0,
      closingStock: saved.closing_stock ?? 0,
    }
  })
}

// ── Component ─────────────────────────────────────────────────

interface StockFormProps {
  branch: BranchCode
  date: string
  enteredByRole: string
}

/**
 * Stock levels entry form shared by staff and supervisor.
 * Features: draft auto-save every 30s, draft restoration dialog,
 * kg+grams dual input for Coffee/Tea Powder closing stock,
 * auto-calculated Total and Consumption columns.
 */
export default function StockForm({ branch, date, enteredByRole }: StockFormProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const items = branch === 'KR' ? KR_ITEMS : C2_ITEMS
  const draftKey = `stock_${branch}_${date}`

  const { data: dbRows, isLoading } = useStockEntries(branch, date, !!user)
  const saveMutation = useSaveStockEntries()

  // Lazy init: check localStorage synchronously — no setState in effect needed
  const [draftDialogOpen, setDraftDialogOpen] = useState(() => {
    const draft = loadDraft<StockFormRow[]>(draftKey)
    return draft !== null && draft.length > 0
  })
  const [rows, setRows] = useState<StockFormRow[]>(buildDefaultRows(items))
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null)
  const [dbLoaded, setDbLoaded] = useState(false)

  // ── Load DB data once (only when no draft dialog is shown) ─
  useEffect(() => {
    if (dbLoaded || isLoading || draftDialogOpen) return
    if (dbRows !== undefined) {
      if (dbRows.length > 0) setRows(rowsFromDb(dbRows, items))
      setDbLoaded(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbRows, isLoading, dbLoaded])

  const handleRestoreDraft = () => {
    const draft = loadDraft<StockFormRow[]>(draftKey)
    if (draft) setRows(draft)
    setDraftDialogOpen(false)
  }

  const handleDiscardDraft = () => {
    clearDraft(draftKey)
    if (dbRows && dbRows.length > 0) setRows(rowsFromDb(dbRows, items))
    setDraftDialogOpen(false)
  }

  // ── Auto-save draft every 30 seconds ──────────────────────
  const rowsRef = useRef(rows)

  useEffect(() => {
    rowsRef.current = rows
  })

  useEffect(() => {
    const interval = setInterval(() => {
      saveDraft(draftKey, rowsRef.current)
      setDraftSavedAt(Date.now())
      setTimeout(() => setDraftSavedAt(null), 3000)
    }, 30000)
    return () => clearInterval(interval)
  }, [draftKey])

  // ── Row update helpers ─────────────────────────────────────

  const updateRow = useCallback((idx: number, updates: Partial<StockFormRow>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...updates } : r)))
  }, [])

  const handleNumericChange =
    (idx: number, field: 'openingStock' | 'purchase' | 'closingStock') =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Math.max(0, Number(e.target.value) || 0)
      updateRow(idx, { [field]: val })
    }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => e.target.select()

  const handleKgGramsChange = (idx: number) => (kg: number, grams: number, total: number) => {
    updateRow(idx, { closingKg: kg, closingGramsField: grams, closingStock: total })
  }

  // ── Save ──────────────────────────────────────────────────

  const handleSave = async () => {
    const records: StockEntryRecord[] = rows.map((row) => {
      const isKgGrams = row.inputType === 'kg_grams'
      return {
        daily_entry_id: '', // filled by hook
        item_name: row.name,
        unit: row.unit,
        opening_stock: row.openingStock,
        purchase: row.purchase,
        closing_stock: isKgGrams ? row.closingStock : row.closingStock,
        closing_kg: isKgGrams ? row.closingKg : null,
        closing_grams: isKgGrams ? row.closingGramsField : null,
        entry_method: row.inputType,
        branch,
        entry_date: date,
        entered_by: user?.id ?? null,
        entered_by_role: enteredByRole,
      }
    })

    try {
      await saveMutation.mutateAsync({ branch, date, rows: records })
      clearDraft(draftKey)
      toast({ title: 'Stock saved', description: 'Stock levels saved successfully.' })
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Could not save stock levels.',
        variant: 'destructive',
      })
    }
  }

  // ── Render ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  return (
    <>
      <DraftRestorationDialog
        open={draftDialogOpen}
        onRestore={handleRestoreDraft}
        onDiscard={handleDiscardDraft}
      />

      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-base">
            Stock Levels — {branch === 'KR' ? 'Kaappi Ready' : 'Coffee Mate C2'}
          </CardTitle>
          {draftSavedAt && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              Draft saved ✓
            </span>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {/* Horizontal-scroll table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b bg-muted/50 text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="text-left px-3 py-2 font-medium min-w-[140px] sticky left-0 bg-muted/50">
                    Item
                  </th>
                  <th className="text-center px-3 py-2 font-medium min-w-[60px]">Unit</th>
                  <th className="text-center px-3 py-2 font-medium min-w-[90px]">Opening</th>
                  <th className="text-center px-3 py-2 font-medium min-w-[90px]">Purchase</th>
                  <th className="text-center px-3 py-2 font-medium min-w-[90px]">Total</th>
                  <th className="text-center px-3 py-2 font-medium min-w-[160px]">Closing</th>
                  <th className="text-center px-3 py-2 font-medium min-w-[90px]">Used</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const total = row.openingStock + row.purchase
                  const consumed = total - row.closingStock
                  const isKgGrams = row.inputType === 'kg_grams'

                  return (
                    <tr key={row.name} className="border-b last:border-0 hover:bg-accent/20">
                      {/* Item name */}
                      <td className="px-3 py-2 font-medium sticky left-0 bg-background">
                        {row.name}
                      </td>

                      {/* Unit */}
                      <td className="px-3 py-2 text-center text-muted-foreground">{row.unit}</td>

                      {/* Opening stock */}
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min="0"
                          value={row.openingStock}
                          onChange={handleNumericChange(idx, 'openingStock')}
                          onFocus={handleFocus}
                          className="h-8 text-center text-sm w-full"
                          aria-label={`${row.name} opening stock`}
                        />
                      </td>

                      {/* Purchase */}
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min="0"
                          value={row.purchase}
                          onChange={handleNumericChange(idx, 'purchase')}
                          onFocus={handleFocus}
                          className="h-8 text-center text-sm w-full"
                          aria-label={`${row.name} purchase`}
                        />
                      </td>

                      {/* Total (auto) */}
                      <td className="px-3 py-2 text-center text-muted-foreground font-medium">
                        {total.toLocaleString('en-IN')}
                      </td>

                      {/* Closing stock */}
                      <td className="px-3 py-2">
                        {isKgGrams ? (
                          <KgGramsInput
                            kg={row.closingKg}
                            grams={row.closingGramsField}
                            onChange={handleKgGramsChange(idx)}
                            label={row.name}
                          />
                        ) : (
                          <Input
                            type="number"
                            min="0"
                            value={row.closingStock}
                            onChange={handleNumericChange(idx, 'closingStock')}
                            onFocus={handleFocus}
                            className="h-8 text-center text-sm w-full"
                            aria-label={`${row.name} closing stock`}
                          />
                        )}
                      </td>

                      {/* Consumption (auto) */}
                      <td
                        className={`px-3 py-2 text-center font-medium ${consumed < 0 ? 'text-destructive' : 'text-foreground'}`}
                      >
                        {consumed.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Save button */}
          <div className="p-4 border-t flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Multiple saves allowed — last saved values count.
            </p>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isLoading}
              className="min-w-[120px]"
            >
              {saveMutation.isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin h-4 w-4 border-2 border-background border-t-transparent rounded-full" />
                  Saving…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Save Stock
                </span>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

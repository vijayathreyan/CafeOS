import React, { useState, useEffect, useRef, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import DraftRestorationDialog from './DraftRestorationDialog'
import { saveDraft, loadDraft, clearDraft } from '../lib/offlineQueue'
import { useSaveExpenseEntries, useExpenseEntries } from '../hooks/useExpenseEntries'
import { useToast } from '../hooks/use-toast'
import { useAuth } from '../contexts/AuthContext'
import type { BranchCode } from '../lib/supabase'
import type { ExpenseFormRow } from '../types/expense'
import { Plus, Trash2, Save, CheckCircle2 } from 'lucide-react'

// ── Category definitions ──────────────────────────────────────

const KR_CATEGORIES: { name: string; isGas: boolean }[] = [
  { name: 'Lemon & Ginger', isGas: false },
  { name: 'Lorry Water', isGas: false },
  { name: 'Sugar', isGas: false },
  { name: 'Cauliflower', isGas: false },
  { name: 'Potato', isGas: false },
  { name: 'Onion', isGas: false },
  { name: 'Tomato', isGas: false },
  { name: 'Other Veggies', isGas: false },
  { name: 'Bun Items', isGas: false },
  { name: 'Kadalai Mittai', isGas: false },
  { name: 'Curd', isGas: false },
  { name: 'Flower', isGas: false },
  { name: 'Corporation', isGas: false },
  { name: 'Evening Snacks', isGas: false },
  { name: 'Rajam Sukku Powder/Malt', isGas: false },
  { name: 'Gas', isGas: true },
]

const C2_CATEGORIES: { name: string; isGas: boolean }[] = [
  { name: 'Lemon & Ginger', isGas: false },
  { name: 'Bread', isGas: false },
  { name: 'Egg', isGas: false },
  { name: 'Sugar', isGas: false },
  { name: 'Cauliflower', isGas: false },
  { name: 'Potato', isGas: false },
  { name: 'Onion', isGas: false },
  { name: 'Tomato', isGas: false },
  { name: 'Other Veggies', isGas: false },
  { name: 'Bun', isGas: false },
  { name: 'Evening Snacks', isGas: false },
  { name: 'Gas', isGas: true },
]

function buildDefaultRows(categories: { name: string; isGas: boolean }[]): ExpenseFormRow[] {
  return categories.map((cat) => ({
    rowKey: uuidv4(),
    category: cat.name,
    amount: 0,
    isGas: cat.isGas,
    isStandard: true,
  }))
}

function rowsFromDb(
  dbRows: ReturnType<typeof useExpenseEntries>['data'],
  categories: { name: string; isGas: boolean }[]
): ExpenseFormRow[] {
  const defaults = buildDefaultRows(categories)
  if (!dbRows || dbRows.length === 0) return defaults

  // Map standard categories to DB amounts
  const mapped = defaults.map((row) => {
    const saved = dbRows.find((d) => d.category === row.category && !row.isStandard === false)
    return saved ? { ...row, amount: Number(saved.amount) } : row
  })

  // Append any ad-hoc rows from DB that aren't in the standard list
  const standardNames = new Set(categories.map((c) => c.name))
  const adHoc = dbRows
    .filter((d) => !standardNames.has(d.category))
    .map((d) => ({
      rowKey: uuidv4(),
      category: d.category,
      amount: Number(d.amount),
      isGas: d.is_gas,
      isStandard: false,
    }))

  return [...mapped, ...adHoc]
}

// ── Component ─────────────────────────────────────────────────

interface ExpenseFormProps {
  branch: BranchCode
  date: string
  enteredByRole: string
}

/**
 * Cash expenses entry form shared by staff and supervisor.
 * Pre-fills standard categories; user can add ad-hoc rows.
 * Features: draft auto-save every 30s, draft restoration dialog.
 * Gas category is flagged with is_gas=true (flows to P&L Gas Bill).
 */
export default function ExpenseForm({ branch, date, enteredByRole }: ExpenseFormProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const categories = branch === 'KR' ? KR_CATEGORIES : C2_CATEGORIES
  const draftKey = `expense_${branch}_${date}`

  const { data: dbRows, isLoading } = useExpenseEntries(branch, date, !!user)
  const saveMutation = useSaveExpenseEntries()

  // Lazy init: check localStorage synchronously — no setState in effect needed
  const [draftDialogOpen, setDraftDialogOpen] = useState(() => {
    const draft = loadDraft<ExpenseFormRow[]>(draftKey)
    return draft !== null && draft.length > 0
  })
  const [rows, setRows] = useState<ExpenseFormRow[]>(buildDefaultRows(categories))
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null)
  const [dbLoaded, setDbLoaded] = useState(false)

  // ── Load DB data once (only when no draft dialog is shown) ─
  useEffect(() => {
    if (dbLoaded || isLoading || draftDialogOpen) return
    if (dbRows !== undefined) {
      if (dbRows.length > 0) setRows(rowsFromDb(dbRows, categories))
      setDbLoaded(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbRows, isLoading, dbLoaded])

  const handleRestoreDraft = () => {
    const draft = loadDraft<ExpenseFormRow[]>(draftKey)
    if (draft) setRows(draft)
    setDraftDialogOpen(false)
  }

  const handleDiscardDraft = () => {
    clearDraft(draftKey)
    if (dbRows && dbRows.length > 0) setRows(rowsFromDb(dbRows, categories))
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

  const updateAmount = useCallback((key: string, value: string) => {
    const num = Math.max(0, Number(value) || 0)
    setRows((prev) => prev.map((r) => (r.rowKey === key ? { ...r, amount: num } : r)))
  }, [])

  const updateCategory = useCallback((key: string, value: string) => {
    setRows((prev) => prev.map((r) => (r.rowKey === key ? { ...r, category: value } : r)))
  }, [])

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { rowKey: uuidv4(), category: '', amount: 0, isGas: false, isStandard: false },
    ])
  }

  const removeRow = (key: string) => {
    setRows((prev) => prev.filter((r) => r.rowKey !== key))
  }

  // ── Totals ────────────────────────────────────────────────

  const shopTotal = rows.filter((r) => !r.isGas).reduce((s, r) => s + r.amount, 0)
  const gasTotal = rows.filter((r) => r.isGas).reduce((s, r) => s + r.amount, 0)

  // ── Save ──────────────────────────────────────────────────

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({
        branch,
        date,
        rows: rows
          .filter((r) => r.category.trim() !== '')
          .map((r) => ({
            category: r.category,
            amount: r.amount,
            is_gas: r.isGas,
            entry_date: date,
            branch,
            entered_by: user?.id ?? null,
            entered_by_role: enteredByRole,
          })),
      })
      clearDraft(draftKey)
      toast({ title: 'Expenses saved', description: 'Cash expenses saved successfully.' })
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Could not save expenses.',
        variant: 'destructive',
      })
    }
  }

  // ── Render ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
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
            Cash Expenses — {branch === 'KR' ? 'Kaappi Ready' : 'Coffee Mate C2'}
          </CardTitle>
          {draftSavedAt && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              Draft saved ✓
            </span>
          )}
        </CardHeader>

        <CardContent className="p-0">
          <div className="divide-y">
            {rows.map((row) => (
              <div key={row.rowKey} className="flex items-center gap-2 px-4 py-2">
                {/* Category */}
                <div className="flex-1 min-w-0">
                  {row.isStandard ? (
                    <span className="text-sm font-medium text-foreground">
                      {row.category}
                      {row.isGas && (
                        <span className="ml-1.5 text-xs text-amber-600 font-normal">
                          (P&L Gas Bill)
                        </span>
                      )}
                    </span>
                  ) : (
                    <Input
                      placeholder="Category name"
                      value={row.category}
                      onChange={(e) => updateCategory(row.rowKey, e.target.value)}
                      className="h-8 text-sm"
                      aria-label="Custom expense category"
                    />
                  )}
                </div>

                {/* Amount */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-sm text-muted-foreground">₹</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.amount || ''}
                    placeholder="0"
                    onChange={(e) => updateAmount(row.rowKey, e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="h-8 w-28 text-right text-sm"
                    aria-label={`${row.category} amount`}
                  />
                </div>

                {/* Remove button (ad-hoc rows only) */}
                {!row.isStandard && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(row.rowKey)}
                    className="h-8 w-8 text-destructive hover:text-destructive/70 shrink-0"
                    aria-label="Remove row"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Add row */}
          <div className="px-4 py-2 border-t">
            <Button variant="link" onClick={addRow} className="p-0 h-auto text-sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Row
            </Button>
          </div>

          {/* Totals */}
          <div className="px-4 py-3 border-t bg-muted/30 space-y-1">
            {gasTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-amber-700 font-medium">Gas Bill (P&L)</span>
                <span className="font-medium">
                  ₹{gasTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold">
              <span>Shop Expenses Total</span>
              <span>₹{shopTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-base font-bold border-t pt-1">
              <span>Grand Total</span>
              <span>
                ₹{(shopTotal + gasTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Save */}
          <div className="p-4 border-t flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saveMutation.isLoading}
              className="min-w-[140px]"
            >
              {saveMutation.isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin h-4 w-4 border-2 border-background border-t-transparent rounded-full" />
                  Saving…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Save Expenses
                </span>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

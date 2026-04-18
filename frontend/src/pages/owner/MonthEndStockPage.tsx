import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Package, CheckCircle2, AlertCircle, Clock, Search, Bell } from 'lucide-react'
import PageContainer from '@/components/layouts/PageContainer'
import { PageHeader } from '@/components/layouts/PageHeader'
import SectionCard from '@/components/ui/SectionCard'
import EmptyState from '@/components/ui/EmptyState'
import { TableSkeleton } from '@/components/ui/LoadingSkeletons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useMonthEndStock, useMonthEndStockSavedItems } from '@/hooks/useMonthEndStock'
import { useMonthEndStockItems } from '@/hooks/useMonthEndStockItems'
import {
  useSaveMonthEndStockDraft,
  useSubmitMonthEndStock,
  useUnlockMonthEndStock,
} from '@/hooks/useSubmitMonthEndStock'
import { supabase } from '@/lib/supabase'
import { monthName, branchLabel, STOCK_SECTIONS } from '@/types/phase6'
import type { StockItemRow } from '@/types/phase6'

// ─── Constants ────────────────────────────────────────────────────────────────

const DRAFT_KEY = (branch: string, year: number, month: number) =>
  `draft_month_end_${branch}_${year}_${month}`

const ADHOC_ROW_COUNT = 4

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  { value: 'Beverages & Cleaning', label: 'Beverages & Cleaning' },
  { value: 'Packaging & Ingredients', label: 'Packaging & Ingredients' },
  { value: 'Spices & Speciality', label: 'Spices & Speciality' },
  { value: 'adhoc', label: 'Other (custom)' },
]

interface AdhocRow {
  item_name: string
  unit: string
  open_units: number
  packed_units: number
}

interface ItemValues {
  open_units: number
  packed_units: number
}

// ─── Draft persist/restore helpers ────────────────────────────────────────────

function saveToDraft(
  branch: string,
  year: number,
  month: number,
  values: Record<string, ItemValues>,
  adhoc: AdhocRow[]
) {
  try {
    localStorage.setItem(DRAFT_KEY(branch, year, month), JSON.stringify({ values, adhoc }))
  } catch {
    // Storage full — silently ignore
  }
}

function loadFromDraft(
  branch: string,
  year: number,
  month: number
): { values: Record<string, ItemValues>; adhoc: AdhocRow[] } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY(branch, year, month))
    if (!raw) return null
    return JSON.parse(raw) as { values: Record<string, ItemValues>; adhoc: AdhocRow[] }
  } catch {
    return null
  }
}

function clearDraftLocal(branch: string, year: number, month: number) {
  localStorage.removeItem(DRAFT_KEY(branch, year, month))
}

// ─── Utility: current month/year ──────────────────────────────────────────────

function currentMonthYear() {
  const d = new Date()
  return { month: d.getMonth() + 1, year: d.getFullYear() }
}

// ─── Item row component ────────────────────────────────────────────────────────

interface ItemRowProps {
  item_name: string
  unit: string
  open_units: number
  packed_units: number
  isSubmitted: boolean
  onChangeOpen: (v: number) => void
  onChangePacked: (v: number) => void
}

function ItemRow({
  item_name,
  unit,
  open_units,
  packed_units,
  isSubmitted,
  onChangeOpen,
  onChangePacked,
}: ItemRowProps) {
  const total = open_units + packed_units

  const numInput = (value: number, onChange: (v: number) => void) => (
    <Input
      type="number"
      min={0}
      value={value === 0 ? '' : String(value)}
      disabled={isSubmitted}
      onFocus={(e) => e.target.select()}
      onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      style={{ width: '80px', fontFamily: 'var(--font-mono)', fontSize: '13px' }}
    />
  )

  return (
    <tr
      style={{
        borderBottom: 'var(--border-default)',
        transition: 'background var(--transition-fast)',
      }}
      onMouseEnter={(e) => {
        if (!isSubmitted)
          (e.currentTarget as HTMLTableRowElement).style.background = 'var(--gray-50)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLTableRowElement).style.background = ''
      }}
    >
      <td
        style={{
          padding: '8px 12px',
          fontFamily: 'var(--font-body)',
          fontSize: '13px',
          color: 'var(--gray-900)',
          fontWeight: 500,
        }}
      >
        {item_name}
      </td>
      <td
        style={{
          padding: '8px 8px',
          fontFamily: 'var(--font-body)',
          fontSize: '12px',
          color: 'var(--gray-500)',
        }}
      >
        {unit}
      </td>
      <td style={{ padding: '8px 6px' }}>{numInput(open_units, onChangeOpen)}</td>
      <td style={{ padding: '8px 6px' }}>{numInput(packed_units, onChangePacked)}</td>
      <td
        style={{
          padding: '8px 12px',
          fontFamily: 'var(--font-mono)',
          fontSize: '13px',
          color: 'var(--gray-500)',
        }}
      >
        {total === 0 ? '' : total}
      </td>
    </tr>
  )
}

// ─── Adhoc item row component ─────────────────────────────────────────────────

interface AdhocRowProps {
  row: AdhocRow
  isSubmitted: boolean
  onChangeName: (v: string) => void
  onChangeUnit: (v: string) => void
  onChangeOpen: (v: number) => void
  onChangePacked: (v: number) => void
}

function AdhocItemRow({
  row,
  isSubmitted,
  onChangeName,
  onChangeUnit,
  onChangeOpen,
  onChangePacked,
}: AdhocRowProps) {
  const total = row.open_units + row.packed_units

  return (
    <tr style={{ borderBottom: 'var(--border-default)' }}>
      <td style={{ padding: '8px 6px' }}>
        <Input
          placeholder="Item name"
          value={row.item_name}
          disabled={isSubmitted}
          onChange={(e) => onChangeName(e.target.value)}
          style={{ fontSize: '13px' }}
        />
      </td>
      <td style={{ padding: '8px 6px' }}>
        <Input
          placeholder="Unit"
          value={row.unit}
          disabled={isSubmitted}
          onChange={(e) => onChangeUnit(e.target.value)}
          style={{ width: '70px', fontSize: '13px' }}
        />
      </td>
      <td style={{ padding: '8px 6px' }}>
        <Input
          type="number"
          min={0}
          value={row.open_units === 0 ? '' : String(row.open_units)}
          disabled={isSubmitted}
          onFocus={(e) => e.target.select()}
          onChange={(e) => onChangeOpen(e.target.value === '' ? 0 : Number(e.target.value))}
          style={{ width: '80px', fontFamily: 'var(--font-mono)', fontSize: '13px' }}
        />
      </td>
      <td style={{ padding: '8px 6px' }}>
        <Input
          type="number"
          min={0}
          value={row.packed_units === 0 ? '' : String(row.packed_units)}
          disabled={isSubmitted}
          onFocus={(e) => e.target.select()}
          onChange={(e) => onChangePacked(e.target.value === '' ? 0 : Number(e.target.value))}
          style={{ width: '80px', fontFamily: 'var(--font-mono)', fontSize: '13px' }}
        />
      </td>
      <td
        style={{
          padding: '8px 12px',
          fontFamily: 'var(--font-mono)',
          fontSize: '13px',
          color: 'var(--gray-500)',
        }}
      >
        {total === 0 ? '' : total}
      </td>
    </tr>
  )
}

// ─── Section table ────────────────────────────────────────────────────────────

const TABLE_HEADERS = ['Item', 'Unit', 'Open Units', 'Packed', 'Total']
const TABLE_WIDTHS = ['auto', '70px', '90px', '90px', '60px']

function SectionTable({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--gray-50)', borderBottom: 'var(--border-strong)' }}>
            {TABLE_HEADERS.map((h, i) => (
              <th
                key={h}
                style={{
                  padding: '10px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-body)',
                  color: 'var(--gray-600)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  textAlign: i >= 4 ? 'right' : 'left',
                  width: TABLE_WIDTHS[i],
                  whiteSpace: 'nowrap',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MonthEndStockPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  const { month: initMonth, year: initYear } = currentMonthYear()
  const [selectedMonth, setSelectedMonth] = useState(initMonth)
  const [selectedYear, setSelectedYear] = useState(initYear)
  const isStaff = user?.role === 'staff'
  const [selectedBranch, setSelectedBranch] = useState<'KR' | 'C2'>(
    isStaff ? (user?.branch_access[0] ?? 'KR') : 'KR'
  )
  const [searchText, setSearchText] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Draft restoration dialog
  const [showDraftDialog, setShowDraftDialog] = useState(false)
  const [pendingDraft, setPendingDraft] = useState<{
    values: Record<string, ItemValues>
    adhoc: AdhocRow[]
  } | null>(null)

  // Submit confirmation dialog
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  // Unlock confirmation
  const [showUnlockDialog, setShowUnlockDialog] = useState(false)

  // Item values state: keyed by item_name
  const [itemValues, setItemValues] = useState<Record<string, ItemValues>>({})
  // Adhoc rows
  const [adhocRows, setAdhocRows] = useState<AdhocRow[]>(
    Array.from({ length: ADHOC_ROW_COUNT }, () => ({
      item_name: '',
      unit: '',
      open_units: 0,
      packed_units: 0,
    }))
  )

  // Draft save indicator
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Data queries ──

  const { data: stockEntry, isLoading: stockLoading } = useMonthEndStock(
    selectedMonth,
    selectedYear,
    selectedBranch
  )
  const { data: savedItems } = useMonthEndStockSavedItems(stockEntry?.id)

  const savedItemsMap = useMemo(() => {
    const map: Record<string, ItemValues> = {}
    for (const it of savedItems ?? []) {
      map[it.item_name] = {
        open_units: it.open_units,
        packed_units: it.packed_units,
      }
    }
    return map
  }, [savedItems])

  const { rows: configRows, isLoading: itemsLoading } = useMonthEndStockItems(
    selectedMonth,
    selectedYear,
    selectedBranch,
    Object.keys(savedItemsMap).length > 0 ? savedItemsMap : undefined
  )

  // Mutations
  const saveDraftMutation = useSaveMonthEndStockDraft()
  const submitMutation = useSubmitMonthEndStock()
  const unlockMutation = useUnlockMonthEndStock()

  const isSubmitted = stockEntry?.status === 'submitted'

  // ── Initialize item values from config rows ──

  useEffect(() => {
    if (configRows.length === 0) return
    setItemValues((prev) => {
      const next: Record<string, ItemValues> = {}
      for (const row of configRows) {
        const existing = prev[row.item_name]
        next[row.item_name] = existing ?? {
          open_units: row.open_units,
          packed_units: row.packed_units,
        }
      }
      return next
    })
  }, [configRows])

  // ── Check for draft on period change ──

  useEffect(() => {
    if (isSubmitted) return
    const draft = loadFromDraft(selectedBranch, selectedYear, selectedMonth)
    if (draft) {
      setPendingDraft(draft)
      setShowDraftDialog(true)
    }
  }, [selectedBranch, selectedYear, selectedMonth, isSubmitted])

  // ── Auto-save to localStorage every 30s ──

  const doAutoSave = useCallback(() => {
    saveToDraft(selectedBranch, selectedYear, selectedMonth, itemValues, adhocRows)
    setLastSaved(new Date())
  }, [selectedBranch, selectedYear, selectedMonth, itemValues, adhocRows])

  useEffect(() => {
    if (isSubmitted) return
    autoSaveRef.current = setInterval(doAutoSave, 30000)
    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current)
    }
  }, [doAutoSave, isSubmitted])

  // ── Filter items ──

  const filteredRowsBySection = useMemo(() => {
    const result: Record<string, StockItemRow[]> = {}
    for (const section of STOCK_SECTIONS) result[section] = []

    for (const row of configRows) {
      const matchSearch =
        !searchText || row.item_name.toLowerCase().includes(searchText.toLowerCase())
      const matchCat =
        categoryFilter === 'all' || categoryFilter === 'adhoc' || row.section === categoryFilter
      if (matchSearch && matchCat) {
        result[row.section] = result[row.section] ?? []
        result[row.section].push(row)
      }
    }
    return result
  }, [configRows, searchText, categoryFilter])

  const visibleCount = useMemo(
    () => Object.values(filteredRowsBySection).reduce((s, rows) => s + rows.length, 0),
    [filteredRowsBySection]
  )

  // ── Build payload for save/submit ──

  const buildPayload = useCallback(() => {
    const items = configRows.map((row) => {
      const v = itemValues[row.item_name] ?? { open_units: 0, packed_units: 0 }
      return {
        item_name: row.item_name,
        section: row.section,
        unit: row.unit,
        open_units: v.open_units,
        packed_units: v.packed_units,
        rate_per_unit: 0,
        previous_month_rate: row.previous_month_rate,
        rate_changed: false,
      }
    })

    for (const ar of adhocRows) {
      if (!ar.item_name.trim()) continue
      items.push({
        item_name: ar.item_name,
        section: 'Spices & Speciality',
        unit: ar.unit || 'number',
        open_units: ar.open_units,
        packed_units: ar.packed_units,
        rate_per_unit: 0,
        previous_month_rate: null,
        rate_changed: false,
      })
    }

    return {
      branch: selectedBranch,
      month: selectedMonth,
      year: selectedYear,
      items,
    }
  }, [configRows, itemValues, adhocRows, selectedBranch, selectedMonth, selectedYear])

  // ── Handlers ──

  const handleRestoreDraft = () => {
    if (!pendingDraft) return
    setItemValues(pendingDraft.values)
    setAdhocRows(pendingDraft.adhoc)
    setShowDraftDialog(false)
    setPendingDraft(null)
  }

  const handleDiscardDraft = () => {
    clearDraftLocal(selectedBranch, selectedYear, selectedMonth)
    setShowDraftDialog(false)
    setPendingDraft(null)
  }

  const handleSaveDraft = async () => {
    try {
      saveToDraft(selectedBranch, selectedYear, selectedMonth, itemValues, adhocRows)
      await saveDraftMutation.mutateAsync(buildPayload())
      setLastSaved(new Date())
      toast({ title: 'Draft saved successfully' })
    } catch {
      toast({ title: 'Failed to save draft', variant: 'destructive' })
    }
  }

  const handleSubmit = async () => {
    if (!user) return
    try {
      const payload = buildPayload()
      await submitMutation.mutateAsync({
        ...payload,
        submitted_by: user.id,
        submitted_by_name: user.full_name,
      })
      clearDraftLocal(selectedBranch, selectedYear, selectedMonth)
      setShowSubmitDialog(false)
      toast({ title: 'Submitted successfully' })

      // Fire-and-forget: log WhatsApp alert for owner
      void (async () => {
        try {
          const { data: ownerRows } = await supabase
            .from('employees')
            .select('whatsapp_number, phone')
            .eq('role', 'owner')
            .eq('active', true)
            .limit(1)
          const owner = ownerRows?.[0]
          const recipient = owner?.whatsapp_number ?? owner?.phone ?? 'owner'

          const { data: unpricedRows } = await supabase
            .from('item_master')
            .select('id')
            .eq('cost_price', 0)
            .eq('active', true)
          const unpricedCount = unpricedRows?.length ?? 0

          const itemCount = payload.items.filter((it) => it.open_units + it.packed_units > 0).length
          const branchName = selectedBranch === 'KR' ? 'Kaappi Ready' : 'Coffee Mate C2'
          const period = `${monthName(selectedMonth)} ${selectedYear}`
          let message = `📦 Month End Stock submitted\nBranch: ${branchName} | ${period}\nSubmitted by: ${user.full_name}\nItems recorded: ${itemCount}`
          if (unpricedCount > 0) {
            message += `\n⚠️ ${unpricedCount} item${unpricedCount > 1 ? 's' : ''} have no cost price set — check Item Master`
          }

          await supabase.from('alert_log').insert({
            trigger_event: 'month_end_stock_submitted',
            recipient,
            channel: 'whatsapp',
            message,
            status: 'sent',
          })
        } catch {
          // Best-effort — do not fail the submission
        }
      })()
    } catch {
      toast({ title: 'Submission failed', variant: 'destructive' })
    }
  }

  const handleUnlock = async () => {
    try {
      await unlockMutation.mutateAsync({
        branch: selectedBranch,
        month: selectedMonth,
        year: selectedYear,
      })
      setShowUnlockDialog(false)
      toast({ title: 'Entry unlocked for editing' })
    } catch {
      toast({ title: 'Failed to unlock', variant: 'destructive' })
    }
  }

  const handleGenerateTask = async () => {
    if (!user) return
    try {
      const lastDay = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0]
      const { error } = await supabase.from('tasks').insert({
        title: 'Submit month end closing stock',
        description: `Record closing stock for ${monthName(selectedMonth)} ${selectedYear} before month end. Go to Month End Stock module.`,
        assigned_to: user.id,
        branch: selectedBranch,
        due_date: lastDay,
        priority: 'high',
        status: 'pending',
      })
      if (error) throw error
      toast({ title: 'Reminder task created' })
    } catch {
      toast({ title: 'Failed to create task', variant: 'destructive' })
    }
  }

  const setItemVal = useCallback((itemName: string, key: keyof ItemValues, value: number) => {
    setItemValues((prev) => ({
      ...prev,
      [itemName]: {
        ...(prev[itemName] ?? { open_units: 0, packed_units: 0 }),
        [key]: value,
      },
    }))
  }, [])

  const setAdhocVal = useCallback((idx: number, key: keyof AdhocRow, value: string | number) => {
    setAdhocRows((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [key]: value }
      return next
    })
  }, [])

  // ── Period label ──

  const periodLabel = `${monthName(selectedMonth)} ${selectedYear} · ${branchLabel(selectedBranch)}`

  // ── Month/year options ──

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: monthName(i + 1),
  }))
  const yearOptions = [selectedYear - 1, selectedYear, selectedYear + 1].map((y) => ({
    value: String(y),
    label: String(y),
  }))

  const isLoading = stockLoading || itemsLoading

  // ── Status banner ──

  function StatusBanner() {
    if (isSubmitted && stockEntry?.submitted_at) {
      const submittedDate = new Date(stockEntry.submitted_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      })
      return (
        <div
          style={{
            background: 'var(--color-success-bg)',
            border: '1px solid var(--color-success-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-3) var(--space-4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-3)',
            marginBottom: 'var(--space-4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <CheckCircle2 size={16} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
            <span style={{ fontSize: '14px', color: 'var(--color-success)', fontWeight: 500 }}>
              {monthName(selectedMonth)} {selectedYear} {selectedBranch} — Submitted on{' '}
              {submittedDate}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUnlockDialog(true)}
            style={{ fontSize: '12px' }}
          >
            Request Edit
          </Button>
        </div>
      )
    }
    if (stockEntry?.status === 'draft') {
      return (
        <div
          style={{
            background: 'var(--color-warning-bg)',
            border: '1px solid var(--color-warning-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-3) var(--space-4)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-4)',
          }}
        >
          <Clock size={16} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
          <span style={{ fontSize: '14px', color: 'var(--color-warning)', fontWeight: 500 }}>
            Draft saved — complete and submit before month end
          </span>
        </div>
      )
    }
    return (
      <div
        style={{
          background: 'var(--color-info-bg)',
          border: '1px solid var(--color-info-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-3) var(--space-4)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-4)',
        }}
      >
        <AlertCircle size={16} style={{ color: 'var(--color-info)', flexShrink: 0 }} />
        <span style={{ fontSize: '14px', color: 'var(--color-info)', fontWeight: 500 }}>
          No entry yet for {monthName(selectedMonth)} {selectedYear} — {selectedBranch}
        </span>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <PageContainer>
      <PageHeader title="Month End Stock" subtitle="Record closing stock values for end of month" />

      {/* Period selector */}
      <SectionCard className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
            <SelectTrigger style={{ width: '140px' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger style={{ width: '100px' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y.value} value={y.value}>
                  {y.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!isStaff && (
            <Select
              value={selectedBranch}
              onValueChange={(v) => setSelectedBranch(v as 'KR' | 'C2')}
            >
              <SelectTrigger style={{ width: '160px' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="KR">Kaappi Ready</SelectItem>
                <SelectItem value="C2">Coffee Mate C2</SelectItem>
              </SelectContent>
            </Select>
          )}

          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--gray-800)',
              padding: '0 var(--space-2)',
              borderLeft: '2px solid var(--gray-200)',
              marginLeft: 'var(--space-1)',
            }}
          >
            {periodLabel}
          </div>

          {lastSaved && (
            <span
              style={{
                fontSize: '12px',
                color: 'var(--color-success)',
                fontFamily: 'var(--font-body)',
              }}
            >
              Draft saved ✓
            </span>
          )}
        </div>
      </SectionCard>

      {/* Status banner */}
      <StatusBanner />

      {/* Search + filter */}
      <SectionCard className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--gray-400)',
              }}
            />
            <Input
              placeholder="Search items…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ paddingLeft: '32px' }}
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger style={{ width: '200px' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span
            style={{
              fontSize: '13px',
              color: 'var(--gray-500)',
              fontFamily: 'var(--font-body)',
              whiteSpace: 'nowrap',
            }}
          >
            Showing {visibleCount} of {configRows.length} items
          </span>
        </div>
      </SectionCard>

      {/* Item tables */}
      {isLoading ? (
        <TableSkeleton cols={5} />
      ) : configRows.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon={Package}
            title="No items configured"
            description="Item list will appear once the month end stock config is seeded."
          />
        </SectionCard>
      ) : (
        <div data-testid="month-end-stock-form" className="space-y-4">
          {STOCK_SECTIONS.map((section) => {
            const sectionRows = filteredRowsBySection[section] ?? []
            if (
              sectionRows.length === 0 &&
              !(
                section === 'Spices & Speciality' &&
                (categoryFilter === 'all' || categoryFilter === 'adhoc')
              )
            ) {
              return null
            }
            return (
              <SectionCard key={section} title={section} padding="none">
                <SectionTable>
                  {sectionRows.map((row) => {
                    const v = itemValues[row.item_name] ?? {
                      open_units: row.open_units,
                      packed_units: row.packed_units,
                    }
                    return (
                      <ItemRow
                        key={row.item_name}
                        item_name={row.item_name}
                        unit={row.unit}
                        open_units={v.open_units}
                        packed_units={v.packed_units}
                        isSubmitted={isSubmitted}
                        onChangeOpen={(val) => setItemVal(row.item_name, 'open_units', val)}
                        onChangePacked={(val) => setItemVal(row.item_name, 'packed_units', val)}
                      />
                    )
                  })}
                  {section === 'Spices & Speciality' &&
                    (categoryFilter === 'all' || categoryFilter === 'adhoc') &&
                    adhocRows.map((ar, idx) => (
                      <AdhocItemRow
                        key={`adhoc-${idx}`}
                        row={ar}
                        isSubmitted={isSubmitted}
                        onChangeName={(v) => setAdhocVal(idx, 'item_name', v)}
                        onChangeUnit={(v) => setAdhocVal(idx, 'unit', v)}
                        onChangeOpen={(v) => setAdhocVal(idx, 'open_units', v)}
                        onChangePacked={(v) => setAdhocVal(idx, 'packed_units', v)}
                      />
                    ))}
                </SectionTable>
              </SectionCard>
            )
          })}
        </div>
      )}

      {/* Action buttons */}
      {!isLoading && configRows.length > 0 && (
        <SectionCard className="mt-4">
          <div className="flex flex-wrap items-center gap-3">
            {!isSubmitted && (
              <>
                <Button
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={saveDraftMutation.isLoading}
                >
                  {saveDraftMutation.isLoading ? 'Saving…' : 'Save Draft'}
                </Button>
                <Button onClick={() => setShowSubmitDialog(true)}>Submit</Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerateTask}
              style={{ marginLeft: 'auto', color: 'var(--gray-600)' }}
            >
              <Bell size={14} className="mr-1" />
              Generate Reminder Task
            </Button>
          </div>
        </SectionCard>
      )}

      {/* Draft restoration dialog */}
      <Dialog open={showDraftDialog} onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore draft?</DialogTitle>
          </DialogHeader>
          <p style={{ fontSize: '14px', color: 'var(--gray-600)' }}>
            A draft was saved earlier for {periodLabel}. Would you like to restore it?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={handleDiscardDraft}>
              Start Fresh
            </Button>
            <Button onClick={handleRestoreDraft}>Restore</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit confirmation dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Submit month end stock for {monthName(selectedMonth)} {selectedYear} {selectedBranch}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Once submitted this will be recorded for P&amp;L calculation. You can request an edit
              if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} disabled={submitMutation.isLoading}>
              {submitMutation.isLoading ? 'Submitting…' : 'Submit'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unlock dialog */}
      <AlertDialog open={showUnlockDialog} onOpenChange={setShowUnlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlock for editing?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reopen the {monthName(selectedMonth)} {selectedYear} {selectedBranch} entry
              for editing. Re-submitting will send another alert.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnlock} disabled={unlockMutation.isLoading}>
              Unlock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  )
}

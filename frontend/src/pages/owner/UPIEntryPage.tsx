import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  useUPIEntries,
  useSaveWeekUPI,
  useUpsertUPIEntry,
  getMondayOfWeek,
  addDaysToDate,
} from '../../hooks/useUPIEntries'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronLeft, ChevronRight, Save, ArrowLeft } from 'lucide-react'
import { showToast } from '@/lib/dialogs'
import type { UPIEntry } from '../../types/phase4'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const BRANCHES = ['KR', 'C2'] as const

function formatDateShort(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  })
}

const rowSchema = z.object({
  date: z.string(),
  branch: z.enum(['KR', 'C2']),
  amount: z.string(),
  notes: z.string(),
})

const formSchema = z.object({ rows: z.array(rowSchema) })
type FormValues = z.infer<typeof formSchema>

export default function UPIEntryPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [weekStart, setWeekStart] = React.useState(() => getMondayOfWeek(new Date()))

  const { data: entries = [], isLoading } = useUPIEntries(weekStart, !!user)
  const saveAll = useSaveWeekUPI(weekStart)
  const saveOne = useUpsertUPIEntry(weekStart)

  const weekDates = Array.from({ length: 7 }, (_, i) => addDaysToDate(weekStart, i))

  const { control, register, handleSubmit, reset, getValues } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rows: weekDates.flatMap((date) =>
        BRANCHES.map((branch) => ({ date, branch, amount: '', notes: '' }))
      ),
    },
  })

  const { fields } = useFieldArray({ control, name: 'rows' })

  // Pre-fill form when entries load or week changes
  useEffect(() => {
    const entryMap = new Map<string, UPIEntry>()
    entries.forEach((e) => entryMap.set(`${e.entry_date}_${e.branch}`, e))

    const rows = weekDates.flatMap((date) =>
      BRANCHES.map((branch) => {
        const existing = entryMap.get(`${date}_${branch}`)
        return {
          date,
          branch,
          amount: existing?.upi_total != null ? String(existing.upi_total) : '',
          notes: existing?.notes ?? '',
        }
      })
    )
    reset({ rows })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, weekStart])

  const onSaveAll = handleSubmit(async (values) => {
    const rows = values.rows
      .filter((r) => r.amount !== '' || r.notes.trim() !== '')
      .map((r) => ({
        branch: r.branch,
        entry_date: r.date,
        upi_total: r.amount === '' ? null : parseFloat(r.amount),
        notes: r.notes || null,
        entered_by: user!.id,
      }))
    try {
      await saveAll.mutateAsync(rows)
      showToast('Week saved successfully', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Save failed', 'error')
    }
  })

  const onSaveRow = async (idx: number) => {
    const row = getValues().rows[idx]
    try {
      await saveOne.mutateAsync({
        branch: row.branch,
        entry_date: row.date,
        upi_total: row.amount === '' ? null : parseFloat(row.amount),
        notes: row.notes || null,
        entered_by: user!.id,
      })
      showToast('Row saved', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Save failed', 'error')
    }
  }

  const weekEnd = addDaysToDate(weekStart, 6)
  const weekLabel = `${formatDateShort(weekStart)} – ${formatDateShort(weekEnd)}`

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/owner/data-entry')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">UPI Entry</h1>
      </div>

      <div className="flex items-center justify-between mb-4" data-testid="week-nav">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setWeekStart((w) => addDaysToDate(w, -7))}
          data-testid="prev-week-btn"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="font-medium text-foreground" data-testid="week-label">
          {weekLabel}
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setWeekStart((w) => addDaysToDate(w, 7))}
          data-testid="next-week-btn"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-80 w-full" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Day</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Branch</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">
                      UPI Total (₹)
                    </th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Notes</th>
                    <th className="w-12 p-3" />
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, idx) => {
                    const dayName = DAY_NAMES[Math.floor(idx / 2)]
                    return (
                      <tr key={field.id} className="border-b border-border last:border-0">
                        <td className="p-3 text-muted-foreground">{formatDateShort(field.date)}</td>
                        <td className="p-3 text-muted-foreground text-xs">{dayName}</td>
                        <td className="p-3">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded ${
                              field.branch === 'KR'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {field.branch}
                          </span>
                        </td>
                        <td className="p-3">
                          <Input
                            {...register(`rows.${idx}.amount`)}
                            type="number"
                            placeholder="—"
                            min="0"
                            step="0.01"
                            className="w-32"
                            data-testid={`upi-amount-${field.date}-${field.branch}`}
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            {...register(`rows.${idx}.notes`)}
                            placeholder="Optional"
                            className="w-40"
                          />
                        </td>
                        <td className="p-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onSaveRow(idx)}
                            disabled={saveOne.isLoading}
                          >
                            <Save className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-4 flex justify-end">
        <Button
          onClick={onSaveAll}
          disabled={saveAll.isLoading}
          className="min-w-[120px]"
          data-testid="save-all-btn"
        >
          {saveAll.isLoading ? 'Saving…' : 'Save All'}
        </Button>
      </div>
    </div>
  )
}

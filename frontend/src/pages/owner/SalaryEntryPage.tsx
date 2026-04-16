import React, { useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSalaryEntries, useSaveSalaryEntries } from '../../hooks/useSalaryEntries'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { showToast } from '@/lib/dialogs'
import { Save } from 'lucide-react'
import { STAFF_BY_BRANCH } from '../../types/phase4'
import type { PLSalaryEntry } from '../../types/phase4'

function currentMonthYear(): string {
  return new Date().toISOString().slice(0, 7)
}

function monthLabel(my: string): string {
  const [year, month] = my.split('-')
  return new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })
}

const rowSchema = z.object({
  staff_name: z.string(),
  amount: z.string(),
  notes: z.string(),
})
const formSchema = z.object({ rows: z.array(rowSchema) })
type FormValues = z.infer<typeof formSchema>

export default function SalaryEntryPage() {
  const { user } = useAuth()
  const [branch, setBranch] = React.useState<'KR' | 'C2'>('KR')
  const [monthYear, setMonthYear] = React.useState(currentMonthYear())

  const { data: entries = [], isLoading } = useSalaryEntries(monthYear, branch, !!user)
  const saveMut = useSaveSalaryEntries(monthYear, branch)

  const staffList = STAFF_BY_BRANCH[branch]

  const { control, register, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rows: staffList.map((name) => ({ staff_name: name, amount: '', notes: '' })),
    },
  })

  const { fields } = useFieldArray({ control, name: 'rows' })

  // Pre-fill from DB when entries or branch/month changes
  useEffect(() => {
    const entryMap = new Map<string, PLSalaryEntry>()
    entries.forEach((e) => entryMap.set(e.staff_name, e))

    const rows = staffList.map((name) => {
      const existing = entryMap.get(name)
      return {
        staff_name: name,
        amount: existing?.amount != null ? String(existing.amount) : '',
        notes: existing?.notes ?? '',
      }
    })
    reset({ rows })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, branch, monthYear])

  const onSave = handleSubmit(async (values) => {
    const rows = values.rows
      .filter((r) => r.amount !== '' && parseFloat(r.amount) > 0)
      .map((r) => ({
        branch,
        month_year: monthYear,
        staff_name: r.staff_name,
        amount: parseFloat(r.amount),
        notes: r.notes || null,
        entered_by: user!.id,
      }))

    if (rows.length === 0) {
      showToast('No salary amounts to save', 'warning')
      return
    }

    try {
      await saveMut.mutateAsync(rows)
      showToast('Salaries saved', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Save failed', 'error')
    }
  })

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-xl font-semibold text-foreground">Salary Entry</h1>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="space-y-1.5">
          <Label>Month</Label>
          <Input
            type="month"
            value={monthYear}
            onChange={(e) => setMonthYear(e.target.value)}
            className="h-10"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Branch</Label>
          <Select value={branch} onValueChange={(v) => setBranch(v as 'KR' | 'C2')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="KR">Kaappi Ready (KR)</SelectItem>
              <SelectItem value="C2">Coffee Mate C2</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        {monthLabel(monthYear)} · {branch}
      </p>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Staff Name</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Monthly Salary (₹)
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Notes</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, idx) => (
                  <tr key={field.id} className="border-b border-border last:border-0">
                    <td className="p-3 font-medium text-foreground">{field.staff_name}</td>
                    <td className="p-3">
                      <Input
                        {...register(`rows.${idx}.amount`)}
                        type="number"
                        placeholder="0.00"
                        min="0"
                        step="1"
                        className="w-36"
                        data-testid={`salary-${field.staff_name.replace(/\s+/g, '-').toLowerCase()}`}
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        {...register(`rows.${idx}.notes`)}
                        placeholder="Optional"
                        className="w-40"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Separator className="my-4" />

      <div className="flex items-center justify-end gap-4">
        <Button
          onClick={onSave}
          disabled={saveMut.isLoading}
          className="min-w-[120px]"
          data-testid="save-salary-btn"
        >
          <Save className="w-4 h-4 mr-1.5" />
          {saveMut.isLoading ? 'Saving…' : 'Save All'}
        </Button>
      </div>
    </div>
  )
}

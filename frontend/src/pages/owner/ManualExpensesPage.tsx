import React, { useCallback, useRef, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  useManualExpenses,
  useCreateManualExpense,
  useUpdateManualExpense,
  useDeleteManualExpense,
} from '../../hooks/useManualExpenses'
import { supabase } from '../../lib/supabase'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import SectionCard from '@/components/ui/SectionCard'
import AmountDisplay from '@/components/ui/AmountDisplay'
import EmptyState from '@/components/ui/EmptyState'
import { TableSkeleton } from '@/components/ui/LoadingSkeletons'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useConfirm, showToast } from '@/lib/dialogs'
import { Plus, Pencil, Trash2, Camera } from 'lucide-react'
import { PageContainer } from '@/components/layouts/PageContainer'
import { PageHeader } from '@/components/layouts/PageHeader'
import type { OwnerManualExpense, ExpenseType } from '../../types/phase4'
import { EXPENSE_TYPE_LABELS, PL_CATEGORY_MAP } from '../../types/phase4'

const BRANCH_OPTIONS = [
  { value: 'KR', label: 'KR — Kaappi Ready' },
  { value: 'C2', label: 'C2 — Coffee Mate' },
  { value: 'both', label: 'Both Branches' },
]

const schema = z.object({
  expense_date: z.string().min(1, 'Required'),
  branch: z.enum(['KR', 'C2', 'both']),
  expense_type: z.enum([
    'kr_ho_bill',
    'eb_bill',
    'water_bill',
    'maintenance',
    'capital',
    'irregular',
  ]),
  description: z.string().min(1, 'Required'),
  amount: z.string().min(1, 'Required'),
  pl_category: z.string(),
})
type FormValues = z.infer<typeof schema>

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function ManualExpensesPage() {
  const { user } = useAuth()
  const { confirm, ConfirmDialog } = useConfirm()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<OwnerManualExpense | null>(null)
  const [filterType, setFilterType] = useState<ExpenseType | 'all'>('all')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null)
  const photoRef = useRef<HTMLInputElement>(null)

  const { data: expenses = [], isLoading } = useManualExpenses(!!user, {
    expense_type: filterType === 'all' ? undefined : filterType,
  })
  const createMut = useCreateManualExpense()
  const updateMut = useUpdateManualExpense()
  const deleteMut = useDeleteManualExpense()

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      expense_date: new Date().toISOString().split('T')[0],
      branch: 'KR',
      expense_type: 'eb_bill',
      description: '',
      amount: '',
      pl_category: PL_CATEGORY_MAP['eb_bill'],
    },
  })

  const watchedType = useWatch({ control, name: 'expense_type' })

  // Auto-set pl_category when expense_type changes
  React.useEffect(() => {
    setValue('pl_category', PL_CATEGORY_MAP[watchedType as ExpenseType] ?? '')
  }, [watchedType, setValue])

  const openAdd = () => {
    setEditing(null)
    setPhoto(null)
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(null)
    setExistingPhotoUrl(null)
    reset({
      expense_date: new Date().toISOString().split('T')[0],
      branch: 'KR',
      expense_type: 'eb_bill',
      description: '',
      amount: '',
      pl_category: PL_CATEGORY_MAP['eb_bill'],
    })
    setOpen(true)
  }

  const openEdit = (exp: OwnerManualExpense) => {
    setEditing(exp)
    setPhoto(null)
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(null)
    setExistingPhotoUrl(exp.receipt_photo_url)
    reset({
      expense_date: exp.expense_date,
      branch: (exp.branch ?? 'both') as 'KR' | 'C2' | 'both',
      expense_type: exp.expense_type,
      description: exp.description,
      amount: String(exp.amount),
      pl_category: exp.pl_category ?? PL_CATEGORY_MAP[exp.expense_type],
    })
    setOpen(true)
  }

  const submitHandler = useCallback(
    async (values: FormValues) => {
      let receiptUrl = existingPhotoUrl

      if (photo) {
        const ext = photo.name.split('.').pop() ?? 'jpg'
        const ts = Date.now()
        const path = `manual-expenses/${user!.id}/${ts}.${ext}`
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('bill-photos')
          .upload(path, photo, { contentType: photo.type, upsert: false })
        if (uploadErr) {
          showToast(`Photo upload failed: ${uploadErr.message}`, 'error')
          return
        }
        receiptUrl = uploadData.path
      }

      const branchVal = values.branch === 'both' ? null : values.branch

      try {
        if (editing) {
          await updateMut.mutateAsync({
            id: editing.id,
            expense_date: values.expense_date,
            branch: branchVal,
            expense_type: values.expense_type as ExpenseType,
            description: values.description,
            amount: parseFloat(values.amount),
            receipt_photo_url: receiptUrl,
            pl_category: values.pl_category || null,
          })
          showToast('Expense updated', 'success')
        } else {
          await createMut.mutateAsync({
            expense_date: values.expense_date,
            branch: branchVal,
            expense_type: values.expense_type as ExpenseType,
            description: values.description,
            amount: parseFloat(values.amount),
            receipt_photo_url: receiptUrl,
            entered_by: user!.id,
          })
          showToast('Expense saved', 'success')
        }
        setOpen(false)
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Save failed', 'error')
      }
    },
    [existingPhotoUrl, photo, user, editing, updateMut, createMut, setOpen]
  )

  const onSubmit = handleSubmit(submitHandler)

  const onDelete = async (exp: OwnerManualExpense) => {
    const ok = await confirm({
      title: 'Delete Expense',
      description: `Delete "${exp.description}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      confirmVariant: 'destructive',
    })
    if (!ok) return
    try {
      await deleteMut.mutateAsync(exp.id)
      showToast('Deleted', 'info')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Delete failed', 'error')
    }
  }

  const isSaving = createMut.isLoading || updateMut.isLoading

  return (
    <PageContainer>
      {ConfirmDialog}

      <PageHeader
        title="Manual Expenses"
        action={
          <Button onClick={openAdd} data-testid="add-expense-btn">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Expense
          </Button>
        }
      />

      <div className="mb-4">
        <Select value={filterType} onValueChange={(v) => setFilterType(v as ExpenseType | 'all')}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {(Object.keys(EXPENSE_TYPE_LABELS) as ExpenseType[]).map((t) => (
              <SelectItem key={t} value={t}>
                {EXPENSE_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <TableSkeleton cols={3} />
      ) : expenses.length === 0 ? (
        <EmptyState
          icon={Plus}
          title="No manual expenses found"
          description="Add your first expense entry."
        />
      ) : (
        <div className="space-y-2">
          {expenses.map((e) => (
            <SectionCard key={e.id} padding="compact">
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground text-sm">{e.description}</span>
                      <Badge variant="outline" className="text-xs">
                        {EXPENSE_TYPE_LABELS[e.expense_type]}
                      </Badge>
                      {e.branch && (
                        <Badge variant="secondary" className="text-xs">
                          {e.branch}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(e.expense_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <AmountDisplay amount={Number(e.amount)} size="sm" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10"
                      onClick={() => openEdit(e)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-destructive hover:text-destructive/70"
                      onClick={() => onDelete(e)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </SectionCard>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg" data-testid="expense-form">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input type="date" {...register('expense_date')} />
                {errors.expense_date && (
                  <p className="text-destructive text-xs">{errors.expense_date.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Branch *</Label>
                <Controller
                  control={control}
                  name="branch"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BRANCH_OPTIONS.map((b) => (
                          <SelectItem key={b.value} value={b.value}>
                            {b.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Expense Type *</Label>
              <Controller
                control={control}
                name="expense_type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(EXPENSE_TYPE_LABELS) as ExpenseType[]).map((t) => (
                        <SelectItem key={t} value={t}>
                          {EXPENSE_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Textarea
                placeholder="What is this expense for?"
                rows={2}
                {...register('description')}
              />
              {errors.description && (
                <p className="text-destructive text-xs">{errors.description.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount (₹) *</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  {...register('amount')}
                />
                {errors.amount && (
                  <p className="text-destructive text-xs">{errors.amount.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>P&L Category</Label>
                <Input placeholder="Auto-set" {...register('pl_category')} className="text-xs" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Receipt / Photo</Label>
              <input
                ref={photoRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null
                  setPhoto(f)
                  if (photoPreview) URL.revokeObjectURL(photoPreview)
                  setPhotoPreview(f ? URL.createObjectURL(f) : null)
                }}
              />
              <button
                type="button"
                onClick={() => photoRef.current?.click()}
                className="flex items-center gap-2 h-10 w-full rounded-md border border-dashed border-input bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-accent/50 transition-colors"
              >
                <Camera className="w-4 h-4" />
                {photo
                  ? photo.name
                  : existingPhotoUrl
                    ? 'Replace photo'
                    : 'Optional — choose photo'}
              </button>
              {photoPreview && (
                <img src={photoPreview} alt="Receipt" className="h-20 w-auto rounded-md border" />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={isSaving}>
              {isSaving ? 'Saving…' : editing ? 'Update' : 'Save Expense'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  useDeliveryPayouts,
  useCreateDeliveryPayout,
  useUpdateDeliveryPayout,
  useDeleteDeliveryPayout,
} from '../../hooks/useDeliveryPayouts'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import SectionCard from '@/components/ui/SectionCard'
import AmountDisplay from '@/components/ui/AmountDisplay'
import EmptyState from '@/components/ui/EmptyState'
import { TableSkeleton } from '@/components/ui/LoadingSkeletons'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useConfirm, showToast } from '@/lib/dialogs'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { PageContainer } from '@/components/layouts/PageContainer'
import { PageHeader } from '@/components/layouts/PageHeader'
import type { DeliveryPlatformEntry } from '../../types/phase4'

const schema = z.object({
  platform: z.enum(['swiggy', 'zomato']),
  period_from: z.string().min(1, 'Required'),
  period_to: z.string().min(1, 'Required'),
  amount_credited: z.string().min(1, 'Required'),
  bank_utr: z.string(),
  notes: z.string(),
})
type FormValues = z.infer<typeof schema>

const PLATFORM_COLORS: Record<string, string> = {
  swiggy: 'bg-orange-100 text-orange-700',
  zomato: 'bg-red-100 text-red-700',
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function DeliveryPayoutsPage() {
  const { user } = useAuth()
  const { confirm, ConfirmDialog } = useConfirm()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<DeliveryPlatformEntry | null>(null)

  const { data: payouts = [], isLoading } = useDeliveryPayouts(!!user)
  const createMut = useCreateDeliveryPayout()
  const updateMut = useUpdateDeliveryPayout()
  const deleteMut = useDeleteDeliveryPayout()

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      platform: 'swiggy',
      period_from: '',
      period_to: '',
      amount_credited: '',
      bank_utr: '',
      notes: '',
    },
  })

  const openAdd = () => {
    setEditing(null)
    reset({
      platform: 'swiggy',
      period_from: '',
      period_to: '',
      amount_credited: '',
      bank_utr: '',
      notes: '',
    })
    setOpen(true)
  }

  const openEdit = (entry: DeliveryPlatformEntry) => {
    setEditing(entry)
    reset({
      platform: entry.platform,
      period_from: entry.period_from,
      period_to: entry.period_to,
      amount_credited: String(entry.amount_credited),
      bank_utr: entry.bank_utr ?? '',
      notes: entry.notes ?? '',
    })
    setOpen(true)
  }

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      platform: values.platform,
      branch: 'KR' as const,
      period_from: values.period_from,
      period_to: values.period_to,
      amount_credited: parseFloat(values.amount_credited),
      bank_utr: values.bank_utr || null,
      notes: values.notes || null,
      entered_by: user!.id,
    }
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, ...payload })
        showToast('Payout updated', 'success')
      } else {
        await createMut.mutateAsync(payload)
        showToast('Payout added', 'success')
      }
      setOpen(false)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Save failed', 'error')
    }
  })

  const onDelete = async (entry: DeliveryPlatformEntry) => {
    const ok = await confirm({
      title: 'Delete Payout Entry',
      description: 'Are you sure you want to delete this payout entry? This cannot be undone.',
      confirmLabel: 'Delete',
      confirmVariant: 'destructive',
    })
    if (!ok) return
    try {
      await deleteMut.mutateAsync(entry.id)
      showToast('Deleted', 'info')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Delete failed', 'error')
    }
  }

  // Monthly totals
  const monthlyTotals: Record<string, { swiggy: number; zomato: number }> = {}
  payouts.forEach((p) => {
    const month = p.created_at.slice(0, 7)
    if (!monthlyTotals[month]) monthlyTotals[month] = { swiggy: 0, zomato: 0 }
    monthlyTotals[month][p.platform] += Number(p.amount_credited)
  })

  const isSaving = createMut.isLoading || updateMut.isLoading

  return (
    <PageContainer>
      {ConfirmDialog}

      <PageHeader
        title="Delivery Payouts"
        action={
          <Button onClick={openAdd} data-testid="add-payout-btn">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Payout
          </Button>
        }
      />

      {isLoading ? (
        <TableSkeleton cols={3} />
      ) : payouts.length === 0 ? (
        <EmptyState
          icon={Plus}
          title="No payout entries yet"
          description="Add your first payout."
        />
      ) : (
        <div className="space-y-3">
          {payouts.map((p) => (
            <SectionCard key={p.id} padding="compact" data-testid="payout-row">
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`capitalize ${PLATFORM_COLORS[p.platform]}`}>
                        {p.platform}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(p.period_from)} – {formatDate(p.period_to)}
                      </span>
                    </div>
                    <p className="font-semibold text-foreground mt-1.5">
                      <AmountDisplay amount={Number(p.amount_credited)} size="sm" />
                    </p>
                    {p.bank_utr && (
                      <p className="text-xs text-muted-foreground mt-0.5">UTR: {p.bank_utr}</p>
                    )}
                    {p.notes && <p className="text-xs text-muted-foreground mt-0.5">{p.notes}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive/70"
                      onClick={() => onDelete(p)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </SectionCard>
          ))}

          <Separator className="my-4" />
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Monthly Totals</h2>
            {Object.entries(monthlyTotals)
              .sort(([a], [b]) => b.localeCompare(a))
              .slice(0, 3)
              .map(([month, totals]) => (
                <div key={month} className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground w-20">{month}</span>
                  <span className="text-orange-600 flex items-center gap-1">
                    Swiggy <AmountDisplay amount={totals.swiggy} size="sm" />
                  </span>
                  <span className="text-red-600 flex items-center gap-1">
                    Zomato <AmountDisplay amount={totals.zomato} size="sm" />
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="payout-form">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Payout' : 'Add Payout'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Platform *</Label>
              <Controller
                control={control}
                name="platform"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="swiggy">Swiggy</SelectItem>
                      <SelectItem value="zomato">Zomato</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Period From *</Label>
                <Input type="date" {...register('period_from')} />
                {errors.period_from && (
                  <p className="text-destructive text-xs">{errors.period_from.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Period To *</Label>
                <Input type="date" {...register('period_to')} />
                {errors.period_to && (
                  <p className="text-destructive text-xs">{errors.period_to.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Amount Credited (₹) *</Label>
              <Input
                type="number"
                placeholder="0.00"
                min="0"
                step="0.01"
                {...register('amount_credited')}
              />
              {errors.amount_credited && (
                <p className="text-destructive text-xs">{errors.amount_credited.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Bank UTR</Label>
              <Input placeholder="Optional" {...register('bank_utr')} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea placeholder="Optional" rows={2} {...register('notes')} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={isSaving}>
              {isSaving ? 'Saving…' : editing ? 'Update' : 'Add Payout'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

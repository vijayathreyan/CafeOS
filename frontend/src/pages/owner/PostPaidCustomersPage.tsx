import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  usePostPaidBalances,
  usePostPaidHistory,
  useRecordPostPaidPayment,
} from '../../hooks/usePostPaidCustomers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { showToast } from '@/lib/dialogs'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { IndianRupee, History, Plus, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { PostPaidBalance } from '../../types/phase5'

// ─── Schema ───────────────────────────────────────────────────────────────────

const paymentSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((v) => !Number.isNaN(parseFloat(v)) && parseFloat(v) > 0, 'Enter a valid amount'),
  payment_method: z.enum(['cash', 'upi', 'cheque']),
  notes: z.string().optional(),
})
type PaymentForm = z.infer<typeof paymentSchema>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function formatCurrency(n: number) {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ─── RecordPaymentDialog ──────────────────────────────────────────────────────

function RecordPaymentDialog({
  open,
  onClose,
  balance,
}: {
  open: boolean
  onClose: () => void
  balance: PostPaidBalance
}) {
  const { user } = useAuth()
  const recordPayment = useRecordPostPaidPayment()

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { date: todayStr(), amount: '', payment_method: 'cash', notes: '' },
  })

  async function onSubmit(values: PaymentForm) {
    try {
      await recordPayment.mutateAsync({
        customer_id: balance.customer.id,
        payment_date: values.date,
        amount_received: parseFloat(values.amount),
        payment_method: values.payment_method,
        notes: values.notes || '',
        entered_by: user?.id ?? '',
      })
      showToast(
        `Payment of ${formatCurrency(parseFloat(values.amount))} recorded for ${balance.customer.name}`,
        'success'
      )
      reset()
      onClose()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to record payment', 'error')
    }
  }

  const selectCls =
    'mt-1 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset()
          onClose()
        }
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Record Payment — {balance.customer.name}</DialogTitle>
        </DialogHeader>

        <div className="rounded-md bg-muted/50 p-3 mb-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Outstanding Balance</span>
            <span
              className={`font-semibold ${balance.outstanding > 0 ? 'text-destructive' : 'text-green-600'}`}
            >
              {formatCurrency(balance.outstanding)}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>
              Date <span className="text-destructive">*</span>
            </Label>
            <Input type="date" {...register('date')} className="mt-1" />
            {errors.date && <p className="text-destructive text-xs mt-1">{errors.date.message}</p>}
          </div>
          <div>
            <Label>
              Amount Received (₹) <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              {...register('amount')}
              className="mt-1"
              placeholder="0.00"
              data-testid="input-payment-amount"
            />
            {errors.amount && (
              <p className="text-destructive text-xs mt-1">{errors.amount.message}</p>
            )}
          </div>
          <div>
            <Label>
              Payment Method <span className="text-destructive">*</span>
            </Label>
            <Controller
              control={control}
              name="payment_method"
              render={({ field }) => (
                <select {...field} className={selectCls} data-testid="select-payment-method">
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="cheque">Cheque</option>
                </select>
              )}
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Input {...register('notes')} className="mt-1" placeholder="Optional note" />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset()
                onClose()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} data-testid="btn-save-payment">
              {isSubmitting ? 'Saving...' : 'Save Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── CustomerHistoryDialog ────────────────────────────────────────────────────

function CustomerHistoryDialog({
  open,
  onClose,
  balance,
}: {
  open: boolean
  onClose: () => void
  balance: PostPaidBalance
}) {
  const { user } = useAuth()
  const { data, isLoading } = usePostPaidHistory(balance.customer.id, !!user && open)

  // Merge credits and payments into a single timeline sorted by date desc
  type TimelineEntry = {
    date: string
    type: 'credit' | 'payment'
    label: string
    amount: number
    runningBalance: number
  }

  const timeline: TimelineEntry[] = []
  if (data) {
    let running = balance.outstanding

    const credits = [...data.credits].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    const payments = [...data.payments].sort(
      (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
    )

    const all = [
      ...credits.map((c) => ({
        date: c.created_at,
        type: 'credit' as const,
        label: 'Credit sale',
        amount: c.daily_total,
      })),
      ...payments.map((p) => ({
        date: p.payment_date,
        type: 'payment' as const,
        label: `Payment (${p.payment_method ?? 'cash'})`,
        amount: p.amount_received,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    for (const entry of all) {
      timeline.push({ ...entry, runningBalance: running })
      if (entry.type === 'credit') running -= entry.amount
      else running += entry.amount
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>History — {balance.customer.name}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : timeline.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No transaction history</p>
        ) : (
          <div className="space-y-2">
            {timeline.map((entry, i) => (
              <div
                key={i}
                className={`flex items-center justify-between p-3 rounded-md border text-sm ${
                  entry.type === 'payment'
                    ? 'border-green-200 bg-green-50/40'
                    : 'border-border bg-background'
                }`}
              >
                <div>
                  <p className="font-medium text-foreground">{entry.label}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(entry.date)}</p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-semibold ${entry.type === 'payment' ? 'text-green-700' : 'text-foreground'}`}
                  >
                    {entry.type === 'payment' ? '−' : '+'}
                    {formatCurrency(entry.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Bal: {formatCurrency(entry.runningBalance)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── CustomerCard ─────────────────────────────────────────────────────────────

function CustomerCard({ balance }: { balance: PostPaidBalance }) {
  const [payOpen, setPayOpen] = useState(false)
  const [histOpen, setHistOpen] = useState(false)
  const isSettled = balance.outstanding <= 0

  const isOverdue = balance.days_since_payment != null && balance.days_since_payment > 30

  return (
    <>
      <Card
        className={`transition-all ${isSettled ? 'border-green-200 bg-green-50/30' : isOverdue ? 'border-destructive/40' : 'border-border'}`}
        data-testid={`customer-card-${balance.customer.name.toLowerCase()}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">{balance.customer.name}</h3>
                {isSettled ? (
                  <Badge className="bg-green-100 text-green-800 text-xs" variant="outline">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Settled
                  </Badge>
                ) : isOverdue ? (
                  <Badge className="bg-destructive/10 text-destructive text-xs" variant="outline">
                    <AlertCircle className="w-3 h-3 mr-1" /> Overdue
                  </Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-800 text-xs" variant="outline">
                    Outstanding
                  </Badge>
                )}
              </div>
              {balance.customer.contact && (
                <p className="text-xs text-muted-foreground">{balance.customer.contact}</p>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setHistOpen(true)} className="h-8">
              <History className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="space-y-1.5 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Credit</span>
              <span>{formatCurrency(balance.total_credit)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Paid</span>
              <span className="text-green-700">{formatCurrency(balance.total_paid)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm font-semibold">
              <span>Outstanding</span>
              <span className={balance.outstanding > 0 ? 'text-destructive' : 'text-green-700'}>
                {formatCurrency(Math.abs(balance.outstanding))}
                {balance.outstanding < 0 && ' (overpaid)'}
              </span>
            </div>
            {balance.last_payment_date && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Last payment</span>
                <span>
                  {formatDate(balance.last_payment_date)}
                  {balance.days_since_payment != null && ` (${balance.days_since_payment}d ago)`}
                </span>
              </div>
            )}
          </div>

          <Button
            size="sm"
            className="w-full"
            variant={isSettled ? 'outline' : 'default'}
            onClick={() => setPayOpen(true)}
            data-testid={`btn-record-payment-${balance.customer.name.toLowerCase()}`}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Record Payment
          </Button>
        </CardContent>
      </Card>

      <RecordPaymentDialog open={payOpen} onClose={() => setPayOpen(false)} balance={balance} />

      <CustomerHistoryDialog open={histOpen} onClose={() => setHistOpen(false)} balance={balance} />
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PostPaidCustomersPage() {
  const { user } = useAuth()

  const { data: balances = [], isLoading } = usePostPaidBalances(!!user)

  const totalOutstanding = balances.reduce((s, b) => s + Math.max(b.outstanding, 0), 0)
  const overdueCount = balances.filter(
    (b) => b.outstanding > 0 && b.days_since_payment != null && b.days_since_payment > 30
  ).length

  return (
    <div className="p-4 max-w-3xl mx-auto" data-testid="postpaid-customers-page">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-foreground">Post-Paid Customers</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Credit sales and outstanding balances · KR branch
          </p>
        </div>
      </div>

      {/* Summary */}
      {!isLoading && balances.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-destructive" />
                <p className="text-xs text-muted-foreground">Total Outstanding</p>
              </div>
              <p
                className="text-lg font-bold text-destructive mt-1"
                data-testid="total-outstanding"
              >
                {formatCurrency(totalOutstanding)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <p className="text-xs text-muted-foreground">Overdue (&gt;30 days)</p>
              </div>
              <p className="text-lg font-bold text-amber-600 mt-1" data-testid="overdue-count">
                {overdueCount}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Customer cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : balances.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">No post-paid customers found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-testid="customer-list">
          {balances.map((balance) => (
            <CustomerCard key={balance.customer.id} balance={balance} />
          ))}
        </div>
      )}
    </div>
  )
}

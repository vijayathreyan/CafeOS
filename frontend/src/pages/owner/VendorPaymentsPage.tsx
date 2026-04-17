import React, { useState, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useVendors } from '../../hooks/useVendors'
import {
  useVendorCycleLogs,
  useVendorManualBillsForCycle,
  useVendorPaymentHistory,
  useMarkVendorPaid,
  useAddVendorBill,
  useVendorAutoTotal,
} from '../../hooks/useVendorPayments'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import SectionCard from '@/components/ui/SectionCard'
import StatusBadge from '@/components/ui/StatusBadge'
import AmountDisplay from '@/components/ui/AmountDisplay'
import EmptyState from '@/components/ui/EmptyState'
import { CardGridSkeleton } from '@/components/ui/LoadingSkeletons'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { showToast } from '@/lib/dialogs'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle2, AlertCircle, Plus, History, Calculator } from 'lucide-react'
import { PageContainer } from '@/components/layouts/PageContainer'
import { PageHeader } from '@/components/layouts/PageHeader'
import {
  getMonThuCycle,
  getFixedDateCycle,
  SECTION_A_VENDORS,
  SECTION_B_VENDORS,
} from '../../types/phase5'
import type { Vendor } from '../../types/vendor'
import type { VendorPaymentCycleLog } from '../../types/phase5'

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const markPaidSchema = z.object({
  whatsapp_bill_amount: z.string().min(1, "Enter the amount from vendor's bill"),
  payment_method: z.enum(['cash', 'upi', 'bank_transfer', 'cheque']),
  notes: z.string().optional(),
})
type MarkPaidForm = z.infer<typeof markPaidSchema>

const addBillSchema = z.object({
  bill_date: z.string().min(1, 'Bill date is required'),
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((v) => !Number.isNaN(parseFloat(v)) && parseFloat(v) > 0, 'Enter a valid amount'),
  notes: z.string().optional(),
})
type AddBillForm = z.infer<typeof addBillSchema>

// ─── Cycle helpers ────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatCurrency(n: number | null | undefined) {
  if (n == null) return '—'
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** True if the vendor name matches a Section B vendor (manual bill only). */
function isSectionB(name: string) {
  return SECTION_B_VENDORS.some((s) => name.toLowerCase().includes(s.toLowerCase()))
}

/** True if the vendor name matches a Section A vendor (auto-calc). */
function isSectionA(name: string) {
  return (
    !isSectionB(name) && SECTION_A_VENDORS.some((s) => name.toLowerCase().includes(s.toLowerCase()))
  )
}

/** Kalingaraj uses fixed_dates cycle; all others Mon/Thu. */
function isKalingaraj(name: string) {
  return name.toLowerCase().includes('kalingaraj')
}

// ─── AutoTotalPanel ───────────────────────────────────────────────────────────

function AutoTotalPanel({
  vendorId,
  cycleStart,
  cycleEnd,
  onTotal,
}: {
  vendorId: string
  cycleStart: string
  cycleEnd: string
  onTotal: (total: number) => void
}) {
  const { user } = useAuth()
  const {
    data: lines = [],
    isLoading,
    refetch,
  } = useVendorAutoTotal(vendorId, cycleStart, cycleEnd, !!user)

  const total = lines.reduce((s, l) => s + l.line_total, 0)

  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Auto-Calculated Items
        </p>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs gap-1"
          onClick={async () => {
            await refetch()
            onTotal(total)
          }}
        >
          <Calculator className="w-3.5 h-3.5" />
          Compute
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : lines.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No daily entries found for this period. Click Compute to refresh.
        </p>
      ) : (
        <Table className="text-xs">
          <TableHeader>
            <TableRow>
              <TableHead className="py-1 pl-0">Item</TableHead>
              <TableHead className="py-1 text-right">Qty</TableHead>
              <TableHead className="py-1 text-right">Rate</TableHead>
              <TableHead className="py-1 text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((l, i) => (
              <TableRow key={i}>
                <TableCell className="py-1 pl-0">{l.item_name}</TableCell>
                <TableCell className="py-1 text-right">{l.qty}</TableCell>
                <TableCell className="py-1 text-right">₹{l.rate}</TableCell>
                <TableCell className="py-1 text-right font-medium">
                  {formatCurrency(l.line_total)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={3} className="py-1 pl-0 font-semibold text-foreground">
                System Total
              </TableCell>
              <TableCell className="py-1 text-right font-semibold text-foreground">
                {formatCurrency(total)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}
    </div>
  )
}

// ─── AddBillDialog ────────────────────────────────────────────────────────────

function AddBillDialog({
  open,
  onClose,
  vendor,
  cycleLogId,
}: {
  open: boolean
  onClose: () => void
  vendor: Vendor
  cycleLogId: string | null
}) {
  const addBill = useAddVendorBill()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddBillForm>({
    resolver: zodResolver(addBillSchema),
    defaultValues: { bill_date: todayStr(), amount: '', notes: '' },
  })

  async function onSubmit(values: AddBillForm) {
    try {
      await addBill.mutateAsync({
        vendor_id: vendor.id,
        cycle_log_id: cycleLogId,
        bill_date: values.bill_date,
        amount: parseFloat(values.amount),
        photo_url: null,
        notes: values.notes || '',
      })
      showToast('Bill added successfully', 'success')
      reset()
      onClose()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to add bill', 'error')
    }
  }

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
          <DialogTitle>Add Bill — {vendor.business_name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>
              Bill Date <span className="text-destructive">*</span>
            </Label>
            <Input type="date" {...register('bill_date')} className="mt-1" />
            {errors.bill_date && (
              <p className="text-destructive text-xs mt-1">{errors.bill_date.message}</p>
            )}
          </div>
          <div>
            <Label>
              Amount (₹) <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              {...register('amount')}
              className="mt-1"
              placeholder="0.00"
              data-testid="input-bill-amount"
            />
            {errors.amount && (
              <p className="text-destructive text-xs mt-1">{errors.amount.message}</p>
            )}
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Add Bill'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── MarkPaidDialog ───────────────────────────────────────────────────────────

function MarkPaidDialog({
  open,
  onClose,
  vendor,
  cycleLog,
  cycleStart,
  cycleEnd,
  cycleType,
  systemTotal,
}: {
  open: boolean
  onClose: () => void
  vendor: Vendor
  cycleLog: VendorPaymentCycleLog | null
  cycleStart: string
  cycleEnd: string
  cycleType: string
  systemTotal: number | null
}) {
  const { user } = useAuth()
  const markPaid = useMarkVendorPaid()

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MarkPaidForm>({
    resolver: zodResolver(markPaidSchema),
    defaultValues: {
      whatsapp_bill_amount: systemTotal != null ? String(systemTotal) : '',
      payment_method: 'cash',
      notes: '',
    },
  })

  const watchedBill = useWatch({ control, name: 'whatsapp_bill_amount' })
  const billNum = parseFloat(watchedBill ?? '') || 0
  // Treat null systemTotal as 0 so diff-warning shows when a bill amount is entered
  const effectiveSystemTotal = systemTotal ?? 0
  const diff = billNum > 0 ? billNum - effectiveSystemTotal : null

  async function onSubmit(values: MarkPaidForm) {
    try {
      await markPaid.mutateAsync({
        cycle_log_id: cycleLog?.id ?? null,
        vendor_id: vendor.id,
        cycle_start: cycleStart,
        cycle_end: cycleEnd,
        cycle_type: cycleType,
        amount_paid: parseFloat(values.whatsapp_bill_amount),
        payment_method: values.payment_method,
        notes: values.notes || '',
        paid_by: user?.id ?? '',
        system_total: systemTotal,
        vendor_bill_amount: parseFloat(values.whatsapp_bill_amount),
      })
      showToast(`${vendor.business_name} marked as paid`, 'success')
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
          <DialogTitle>Mark as Paid — {vendor.business_name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {systemTotal != null && (
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">System Total</span>
                <span className="font-medium">{formatCurrency(systemTotal)}</span>
              </div>
            </div>
          )}

          <div>
            <Label>
              Vendor Bill Amount (₹) <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              {...register('whatsapp_bill_amount')}
              className="mt-1"
              placeholder="Enter amount from vendor's bill"
              data-testid="input-vendor-bill"
            />
            {errors.whatsapp_bill_amount && (
              <p className="text-destructive text-xs mt-1">{errors.whatsapp_bill_amount.message}</p>
            )}
          </div>

          {diff != null && Math.abs(diff) > 0.01 && (
            <div
              className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm"
              data-testid="diff-warning"
            >
              <div className="flex justify-between text-amber-700">
                <span>Difference</span>
                <span className="font-semibold">
                  {diff > 0 ? '+' : ''}
                  {formatCurrency(diff)}
                </span>
              </div>
              <p className="text-xs text-amber-600 mt-1">
                {diff > 0
                  ? 'Vendor bill is higher than system total'
                  : 'Vendor bill is lower than system total'}
              </p>
            </div>
          )}

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
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                </select>
              )}
            />
          </div>

          <div>
            <Label>Notes</Label>
            <Input {...register('notes')} className="mt-1" placeholder="Explain any difference" />
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
            <Button type="submit" disabled={isSubmitting} data-testid="btn-confirm-paid">
              {isSubmitting ? 'Saving...' : 'Confirm Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── PaymentHistoryDialog ─────────────────────────────────────────────────────

function PaymentHistoryDialog({
  open,
  onClose,
  vendor,
}: {
  open: boolean
  onClose: () => void
  vendor: Vendor
}) {
  const { user } = useAuth()
  const { data, isLoading } = useVendorPaymentHistory(vendor.id, !!user && open)

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payment History — {vendor.business_name}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !data || data.cycles.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No payment history yet</p>
        ) : (
          <div className="space-y-3">
            {data.cycles.map((cycle) => {
              const payment = data.payments.find((p) => p.cycle_log_id === cycle.id)
              return (
                <div
                  key={cycle.id}
                  className={`rounded-md border p-3 ${cycle.status === 'paid' ? 'border-green-200 bg-green-50/50' : 'border-amber-200 bg-amber-50/50'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {formatDate(cycle.cycle_start)} – {formatDate(cycle.cycle_end)}
                    </span>
                    <Badge
                      className={`text-xs ${cycle.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}
                      variant="outline"
                    >
                      {cycle.status === 'paid' ? 'Paid' : 'Pending'}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground flex gap-4">
                    {cycle.system_total != null && (
                      <span>System: {formatCurrency(cycle.system_total)}</span>
                    )}
                    {cycle.vendor_bill_amount != null && (
                      <span>Bill: {formatCurrency(cycle.vendor_bill_amount)}</span>
                    )}
                    {payment && (
                      <span className="text-green-700">
                        Paid: {formatCurrency(payment.amount_paid)}
                      </span>
                    )}
                  </div>
                  {cycle.notes && (
                    <p className="text-xs text-muted-foreground mt-1">{cycle.notes}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── SectionACard ─────────────────────────────────────────────────────────────

function SectionACard({
  vendor,
  cycleLog,
  cycleStart,
  cycleEnd,
  cycleType,
  cycleLabel,
}: {
  vendor: Vendor
  cycleLog: VendorPaymentCycleLog | null
  cycleStart: string
  cycleEnd: string
  cycleType: string
  cycleLabel: string
}) {
  const [markPaidOpen, setMarkPaidOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [systemTotal, setSystemTotal] = useState<number | null>(cycleLog?.system_total ?? null)
  const isPaid = cycleLog?.status === 'paid'

  return (
    <>
      <SectionCard
        className="transition-all"
        status={isPaid ? 'success' : 'none'}
        data-testid={`vendor-card-${vendor.business_name.replace(/\s+/g, '-').toLowerCase()}`}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground text-sm">{vendor.business_name}</h3>
              {isPaid ? (
                <StatusBadge status="paid" label="Paid" size="sm" />
              ) : (
                <StatusBadge status="pending" label="Pending" size="sm" />
              )}
            </div>
            {vendor.contact_name && (
              <p className="text-xs text-muted-foreground mt-0.5">{vendor.contact_name}</p>
            )}
            {vendor.whatsapp_number && (
              <p className="text-xs text-muted-foreground">WhatsApp: {vendor.whatsapp_number}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHistoryOpen(true)}
            className="h-8 text-xs gap-1"
          >
            <History className="w-3.5 h-3.5" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mb-3">
          Period: <span className="text-foreground font-medium">{cycleLabel}</span>
        </p>

        {!isPaid && (
          <AutoTotalPanel
            vendorId={vendor.id}
            cycleStart={cycleStart}
            cycleEnd={cycleEnd}
            onTotal={(t) => setSystemTotal(t)}
          />
        )}

        {isPaid && cycleLog && (
          <div className="text-sm space-y-1">
            {cycleLog.system_total != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">System Total</span>
                <span>{formatCurrency(cycleLog.system_total)}</span>
              </div>
            )}
            {cycleLog.vendor_bill_amount != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vendor Bill</span>
                <span>{formatCurrency(cycleLog.vendor_bill_amount)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-green-700">
              <span>Paid</span>
              <span>{formatCurrency(cycleLog.total_paid)}</span>
            </div>
          </div>
        )}

        {!isPaid && (
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              className="flex-1"
              onClick={() => setMarkPaidOpen(true)}
              data-testid={`btn-mark-paid-${vendor.business_name.replace(/\s+/g, '-').toLowerCase()}`}
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Mark as Paid
            </Button>
          </div>
        )}
      </SectionCard>

      <MarkPaidDialog
        open={markPaidOpen}
        onClose={() => setMarkPaidOpen(false)}
        vendor={vendor}
        cycleLog={cycleLog}
        cycleStart={cycleStart}
        cycleEnd={cycleEnd}
        cycleType={cycleType}
        systemTotal={systemTotal}
      />

      <PaymentHistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        vendor={vendor}
      />
    </>
  )
}

// ─── SectionBCard ─────────────────────────────────────────────────────────────

function SectionBCard({
  vendor,
  cycleLog,
  cycleStart,
  cycleEnd,
  cycleType,
  cycleLabel,
}: {
  vendor: Vendor
  cycleLog: VendorPaymentCycleLog | null
  cycleStart: string
  cycleEnd: string
  cycleType: string
  cycleLabel: string
}) {
  const { user } = useAuth()
  const [markPaidOpen, setMarkPaidOpen] = useState(false)
  const [addBillOpen, setAddBillOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const isPaid = cycleLog?.status === 'paid'

  const { data: bills = [] } = useVendorManualBillsForCycle(vendor.id, cycleStart, cycleEnd, !!user)

  const totalDue = bills.reduce((s, b) => s + b.amount, 0)

  return (
    <>
      <SectionCard
        className="transition-all"
        status={isPaid ? 'success' : 'none'}
        data-testid={`vendor-card-${vendor.business_name.replace(/\s+/g, '-').toLowerCase()}`}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground text-sm">{vendor.business_name}</h3>
              {isPaid ? (
                <StatusBadge status="paid" label="Paid" size="sm" />
              ) : bills.length > 0 ? (
                <StatusBadge status="pending" label="Pending" size="sm" />
              ) : (
                <StatusBadge status="inactive" label="No Bills" size="sm" />
              )}
            </div>
            {vendor.contact_name && (
              <p className="text-xs text-muted-foreground mt-0.5">{vendor.contact_name}</p>
            )}
            {vendor.whatsapp_number && (
              <p className="text-xs text-muted-foreground">WhatsApp: {vendor.whatsapp_number}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHistoryOpen(true)}
            className="h-8 text-xs gap-1"
          >
            <History className="w-3.5 h-3.5" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mb-3">
          Period: <span className="text-foreground font-medium">{cycleLabel}</span>
        </p>

        {bills.length > 0 && (
          <div className="rounded-md border border-border bg-muted/30 p-3 mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Bills This Cycle
            </p>
            <div className="space-y-1.5">
              {bills.map((bill) => (
                <div key={bill.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{formatDate(bill.bill_date)}</span>
                  <AmountDisplay amount={bill.amount} size="sm" />
                </div>
              ))}
              <Separator className="my-1" />
              <div className="flex justify-between text-sm font-semibold">
                <span>Total Due</span>
                <AmountDisplay amount={totalDue} size="sm" />
              </div>
            </div>
          </div>
        )}

        {!isPaid && (
          <div className="flex gap-2 mt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAddBillOpen(true)}
              className="flex-1"
              data-testid={`btn-add-bill-${vendor.business_name.replace(/\s+/g, '-').toLowerCase()}`}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Bill
            </Button>
            {bills.length > 0 && (
              <Button
                size="sm"
                className="flex-1"
                onClick={() => setMarkPaidOpen(true)}
                data-testid={`btn-mark-paid-${vendor.business_name.replace(/\s+/g, '-').toLowerCase()}`}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Mark as Paid
              </Button>
            )}
          </div>
        )}

        {isPaid && cycleLog && (
          <div className="text-sm font-semibold text-green-700 flex justify-between">
            <span>Paid</span>
            <AmountDisplay amount={cycleLog.total_paid} size="sm" variant="positive" />
          </div>
        )}
      </SectionCard>

      <AddBillDialog
        open={addBillOpen}
        onClose={() => setAddBillOpen(false)}
        vendor={vendor}
        cycleLogId={cycleLog?.id ?? null}
      />

      <MarkPaidDialog
        open={markPaidOpen}
        onClose={() => setMarkPaidOpen(false)}
        vendor={vendor}
        cycleLog={cycleLog}
        cycleStart={cycleStart}
        cycleEnd={cycleEnd}
        cycleType={cycleType}
        systemTotal={totalDue}
      />

      <PaymentHistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        vendor={vendor}
      />
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function VendorPaymentsPage() {
  const { user } = useAuth()
  const today = useMemo(() => new Date(), [])

  const monThuCycle = useMemo(() => getMonThuCycle(today), [today])
  const fixedCycle = useMemo(() => getFixedDateCycle(today), [today])

  const { data: vendors = [], isLoading: vendorsLoading } = useVendors(!!user)
  const { data: monThuLogs = [] } = useVendorCycleLogs(
    monThuCycle.cycleStart,
    monThuCycle.cycleEnd,
    !!user
  )
  const { data: fixedLogs = [] } = useVendorCycleLogs(
    fixedCycle.cycleStart,
    fixedCycle.cycleEnd,
    !!user
  )

  // Only include active, payment-cycle vendors
  const activeVendors = vendors.filter((v) => v.active && v.payment_cycle_type !== 'same_day_cash')

  // Section A: auto-calculated
  const sectionAVendors = activeVendors.filter((v) => isSectionA(v.business_name))

  // Section B: manual bill entry
  const sectionBVendors = activeVendors.filter((v) => isSectionB(v.business_name))

  // Helper: find cycle log for a vendor in the right cycle
  function getCycleLog(vendor: Vendor): {
    log: VendorPaymentCycleLog | null
    cycleStart: string
    cycleEnd: string
    cycleLabel: string
    cycleType: string
  } {
    const isFixed = isKalingaraj(vendor.business_name)
    const cycle = isFixed ? fixedCycle : monThuCycle
    const logs = isFixed ? fixedLogs : monThuLogs
    const log = logs.find((l) => l.vendor_id === vendor.id) ?? null
    return {
      log,
      cycleStart: cycle.cycleStart,
      cycleEnd: cycle.cycleEnd,
      cycleLabel: cycle.label,
      cycleType: isFixed ? 'fixed_dates' : 'mon_thu',
    }
  }

  const allPaymentVendors = [...sectionAVendors, ...sectionBVendors]
  const pendingCount = allPaymentVendors.filter((v) => {
    const { log } = getCycleLog(v)
    return !log || log.status === 'pending'
  }).length

  const todayDisplay = today.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <PageContainer data-testid="vendor-payments-page">
      <PageHeader
        title="Vendor Payments"
        subtitle={todayDisplay}
        action={
          pendingCount > 0 ? (
            <Badge
              className="bg-amber-100 text-amber-800 text-sm"
              variant="outline"
              data-testid="pending-count"
            >
              <AlertCircle className="w-3.5 h-3.5 mr-1" />
              {pendingCount} vendor{pendingCount > 1 ? 's' : ''} pending
            </Badge>
          ) : undefined
        }
      />

      {/* Cycle info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <SectionCard padding="compact">
          <div className="p-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Mon/Thu Cycle
            </p>
            <p className="text-sm font-medium text-foreground mt-0.5">{monThuCycle.label}</p>
            {monThuCycle.isPaymentDay && (
              <Badge className="bg-primary/10 text-primary text-xs mt-1" variant="outline">
                Payment due today
              </Badge>
            )}
          </div>
        </SectionCard>
        <SectionCard padding="compact">
          <div className="p-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Kalingaraj Cycle (1st/11th/21st)
            </p>
            <p className="text-sm font-medium text-foreground mt-0.5">{fixedCycle.label}</p>
            {fixedCycle.isPaymentDay && (
              <Badge className="bg-primary/10 text-primary text-xs mt-1" variant="outline">
                Payment due today
              </Badge>
            )}
          </div>
        </SectionCard>
      </div>

      {vendorsLoading ? (
        <CardGridSkeleton count={3} />
      ) : (
        <>
          {/* ── Section A — Auto-Calculated Vendors ─────────────────── */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <h2
                className="text-base font-semibold text-foreground"
                data-testid="section-a-heading"
              >
                Section A — Auto-Calculated
              </h2>
              <Badge variant="secondary" className="text-xs">
                {sectionAVendors.length} vendors
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Quantities auto-calculated from daily stock and snack entries × vendor rate.
            </p>
            {sectionAVendors.length === 0 ? (
              <EmptyState
                icon={AlertCircle}
                title="No Section A vendors"
                description="Add vendors matching the known snack vendor names."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sectionAVendors.map((vendor) => {
                  const { log, cycleStart, cycleEnd, cycleLabel, cycleType } = getCycleLog(vendor)
                  return (
                    <SectionACard
                      key={vendor.id}
                      vendor={vendor}
                      cycleLog={log}
                      cycleStart={cycleStart}
                      cycleEnd={cycleEnd}
                      cycleType={cycleType}
                      cycleLabel={cycleLabel}
                    />
                  )
                })}
              </div>
            )}
          </div>

          <Separator className="my-6" />

          {/* ── Section B — Manual Bill Entry Vendors ───────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2
                className="text-base font-semibold text-foreground"
                data-testid="section-b-heading"
              >
                Section B — Manual Bill Entry
              </h2>
              <Badge variant="secondary" className="text-xs">
                {sectionBVendors.length} vendors
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Vendors who send WhatsApp bills. Add each bill and mark as paid.
            </p>
            {sectionBVendors.length === 0 ? (
              <EmptyState
                icon={AlertCircle}
                title="No Section B vendors"
                description="No Section B vendors found."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sectionBVendors.map((vendor) => {
                  const { log, cycleStart, cycleEnd, cycleLabel, cycleType } = getCycleLog(vendor)
                  return (
                    <SectionBCard
                      key={vendor.id}
                      vendor={vendor}
                      cycleLog={log}
                      cycleStart={cycleStart}
                      cycleEnd={cycleEnd}
                      cycleType={cycleType}
                      cycleLabel={cycleLabel}
                    />
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </PageContainer>
  )
}

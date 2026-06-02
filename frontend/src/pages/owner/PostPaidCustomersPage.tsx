import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  usePostPaidBalances,
  usePostPaidMonthlyData,
  useRecordPostPaidPayment,
} from '../../hooks/usePostPaidCustomers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import StatusBadge from '@/components/ui/StatusBadge'
import EmptyState from '@/components/ui/EmptyState'
import KPICard from '@/components/ui/KPICard'
import { CardGridSkeleton } from '@/components/ui/LoadingSkeletons'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { showToast } from '@/lib/dialogs'
import { ChevronDown, ChevronUp, IndianRupee, AlertCircle, Plus } from 'lucide-react'
import { PageContainer } from '@/components/layouts/PageContainer'
import { PageHeader } from '@/components/layouts/PageHeader'
import type { CustomerMonthlyData, MonthlyRow, MonthlyRowStatus } from '../../types/phase5'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function formatCurrency(n: number) {
  return `₹${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function firstOfCurrentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function currentMonthLabel(): string {
  return new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

// ─── Status badge for monthly row ────────────────────────────────────────────

function MonthStatusBadge({ status }: { status: MonthlyRowStatus }) {
  if (status === 'settled') return <StatusBadge status="settled" label="Settled" size="sm" />
  if (status === 'advance') return <StatusBadge status="info" label="Advance" size="sm" />
  if (status === 'overdue') return <StatusBadge status="overdue" label="Overdue" size="sm" />
  return <StatusBadge status="warning" label="Partial" size="sm" />
}

// ─── RecordPaymentSheet ───────────────────────────────────────────────────────

interface PaymentSheetProps {
  open: boolean
  onClose: () => void
  customerData: CustomerMonthlyData
}

function RecordPaymentSheet({ open, onClose, customerData }: PaymentSheetProps) {
  const { user } = useAuth()
  const recordPayment = useRecordPostPaidPayment()

  const outstandingMonths = customerData.months.filter((m) => m.outstanding > 0)
  const defaultMonth =
    outstandingMonths.length > 0
      ? outstandingMonths[outstandingMonths.length - 1].month // oldest outstanding
      : firstOfCurrentMonth()

  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayStr())
  const [paymentMonth, setPaymentMonth] = useState(defaultMonth)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'bank_transfer'>('cash')
  const [notes, setNotes] = useState('')
  const [amountError, setAmountError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const selectCls =
    'mt-1 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

  function handleClose() {
    setAmount('')
    setDate(todayStr())
    setPaymentMonth(defaultMonth)
    setPaymentMethod('cash')
    setNotes('')
    setAmountError('')
    onClose()
  }

  async function handleSave() {
    const parsed = parseFloat(amount)
    if (!amount || Number.isNaN(parsed) || parsed <= 0) {
      setAmountError('Enter a valid amount greater than 0')
      return
    }
    setAmountError('')
    setSubmitting(true)
    try {
      await recordPayment.mutateAsync({
        customer_id: customerData.customer.id,
        payment_date: date,
        amount_received: parsed,
        payment_method: paymentMethod,
        notes: notes,
        entered_by: user?.id ?? '',
        payment_month: paymentMonth,
      })
      const monthLabelStr = new Date(paymentMonth).toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
      })
      showToast(`Payment of ${formatCurrency(parsed)} recorded for ${monthLabelStr}`, 'success')
      handleClose()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to record payment', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const currentFOM = firstOfCurrentMonth()
  const currentML = currentMonthLabel()
  const hasCurrentMonth = outstandingMonths.some((m) => m.month === currentFOM)

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose()
      }}
    >
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>Record Payment — {customerData.customer.name}</SheetTitle>
        </SheetHeader>

        <div className="rounded-md bg-muted/50 p-3 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Overall Outstanding</span>
            <span
              className={`font-semibold ${customerData.overall_outstanding > 0 ? 'text-destructive' : 'text-green-600'}`}
            >
              {customerData.overall_outstanding < 0
                ? `+${formatCurrency(customerData.overall_outstanding)} advance`
                : formatCurrency(customerData.overall_outstanding)}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label>
              Amount Received (₹) <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1"
              placeholder="0.00"
            />
            {amountError && <p className="text-destructive text-xs mt-1">{amountError}</p>}
          </div>

          <div>
            <Label>
              Payment Date <span className="text-destructive">*</span>
            </Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label>
              Which month does this cover <span className="text-destructive">*</span>
            </Label>
            <select
              value={paymentMonth}
              onChange={(e) => setPaymentMonth(e.target.value)}
              className={selectCls}
            >
              {!hasCurrentMonth && <option value={currentFOM}>{currentML} (current month)</option>}
              {outstandingMonths.map((m) => (
                <option key={m.month} value={m.month}>
                  {m.month_label} — {formatCurrency(m.outstanding)} outstanding
                  {m.status === 'overdue' ? ' ⚠' : ''}
                </option>
              ))}
              {hasCurrentMonth && <option value={currentFOM}>{currentML} (current month)</option>}
            </select>
          </div>

          <div>
            <Label>
              Payment Method <span className="text-destructive">*</span>
            </Label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'upi' | 'bank_transfer')}
              className={selectCls}
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>

          <div>
            <Label>Notes</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
              placeholder="Optional note"
            />
          </div>
        </div>

        <SheetFooter className="mt-6 gap-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Payment'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ─── MonthTable ───────────────────────────────────────────────────────────────

function MonthTable({ months }: { months: MonthlyRow[] }) {
  if (months.length === 0) {
    return <p className="text-muted-foreground text-sm text-center py-4">No transaction history</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="text-left py-2 pr-3 font-medium">Month</th>
            <th className="text-right py-2 px-3 font-medium">Credit</th>
            <th className="text-right py-2 px-3 font-medium">Paid</th>
            <th className="text-right py-2 px-3 font-medium">Outstanding</th>
            <th className="text-center py-2 pl-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {months.map((row) => (
            <tr
              key={row.month}
              className="border-b last:border-0 hover:bg-muted/30 transition-colors"
            >
              <td className="py-2.5 pr-3 font-medium text-foreground">{row.month_label}</td>
              <td className="py-2.5 px-3 text-right tabular-nums text-foreground">
                {formatCurrency(row.credit)}
              </td>
              <td className="py-2.5 px-3 text-right tabular-nums text-green-700">
                {row.paid > 0 ? formatCurrency(row.paid) : '—'}
              </td>
              <td className="py-2.5 px-3 text-right tabular-nums">
                <span
                  className={
                    row.outstanding > 0
                      ? 'text-destructive font-semibold'
                      : row.outstanding < 0
                        ? 'text-blue-600 font-semibold'
                        : 'text-green-700 font-semibold'
                  }
                >
                  {row.outstanding === 0
                    ? '—'
                    : row.outstanding < 0
                      ? `+${formatCurrency(row.outstanding)}`
                      : formatCurrency(row.outstanding)}
                </span>
              </td>
              <td className="py-2.5 pl-3 text-center">
                <MonthStatusBadge status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── CustomerLedgerCard ───────────────────────────────────────────────────────

function CustomerLedgerCard({ customerData }: { customerData: CustomerMonthlyData }) {
  const [expanded, setExpanded] = useState(false)
  const [payOpen, setPayOpen] = useState(false)

  const { customer, overall_outstanding, months } = customerData
  const hasOverdue = months.some((m) => m.status === 'overdue')
  const isSettled = overall_outstanding <= 0

  return (
    <>
      <div
        className="rounded-lg border bg-card shadow-sm overflow-hidden"
        data-testid={`customer-card-${customer.name.toLowerCase()}`}
      >
        <div
          className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors select-none"
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-semibold text-foreground truncate">{customer.name}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border shrink-0">
              {customer.branch}
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span
              className={`font-bold text-sm tabular-nums ${
                overall_outstanding > 0
                  ? 'text-destructive'
                  : overall_outstanding < 0
                    ? 'text-blue-600'
                    : 'text-green-700'
              }`}
            >
              {overall_outstanding === 0
                ? 'Settled'
                : overall_outstanding < 0
                  ? `+${formatCurrency(overall_outstanding)} advance`
                  : formatCurrency(overall_outstanding)}
            </span>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {expanded && (
          <div className="border-t px-4 pb-4 pt-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {isSettled && <StatusBadge status="settled" label="Settled" size="sm" />}
                {hasOverdue && !isSettled && (
                  <StatusBadge status="overdue" label="Has overdue" size="sm" />
                )}
              </div>
              <Button
                size="sm"
                variant={isSettled ? 'outline' : 'default'}
                onClick={() => setPayOpen(true)}
                data-testid={`btn-record-payment-${customer.name.toLowerCase()}`}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Record Payment
              </Button>
            </div>
            <MonthTable months={months} />
          </div>
        )}
      </div>

      <RecordPaymentSheet
        open={payOpen}
        onClose={() => setPayOpen(false)}
        customerData={customerData}
      />
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PostPaidCustomersPage() {
  const { user } = useAuth()

  const { data: balances = [], isLoading: balancesLoading } = usePostPaidBalances(!!user)
  const { data: monthlyData = [], isLoading: monthlyLoading } = usePostPaidMonthlyData(!!user)

  const isLoading = balancesLoading || monthlyLoading

  const totalOutstanding = balances.reduce((s, b) => s + Math.max(b.outstanding, 0), 0)

  const overdueCount = monthlyData.reduce(
    (s, cd) => s + (cd.months.some((m) => m.status === 'overdue') ? 1 : 0),
    0
  )

  return (
    <PageContainer data-testid="postpaid-customers-page">
      <PageHeader
        title="Post-Paid Customers"
        subtitle="Month-wise credit ledger · KR &amp; C2 branches"
      />

      {!isLoading && balances.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <KPICard
            title="Total Outstanding"
            value={`₹${totalOutstanding.toLocaleString('en-IN')}`}
            icon={IndianRupee}
            status="danger"
            data-testid="total-outstanding"
          />
          <KPICard
            title="Overdue (>30 days)"
            value={overdueCount}
            icon={AlertCircle}
            status="warning"
            data-testid="overdue-count"
          />
        </div>
      )}

      {isLoading ? (
        <CardGridSkeleton />
      ) : monthlyData.length === 0 ? (
        <EmptyState
          icon={IndianRupee}
          title="No post-paid customers"
          description="No post-paid customers found."
        />
      ) : (
        <div className="space-y-3" data-testid="customer-list">
          {monthlyData.map((cd) => (
            <CustomerLedgerCard key={cd.customer.id} customerData={cd} />
          ))}
        </div>
      )}
    </PageContainer>
  )
}

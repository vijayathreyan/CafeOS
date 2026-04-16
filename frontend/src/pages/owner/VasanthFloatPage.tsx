import React, { useState } from 'react'
import PageContainer from '@/components/layouts/PageContainer'
import PageHeader from '@/components/layouts/PageHeader'
import AmountDisplay from '@/components/ui/AmountDisplay'
import SectionCard from '@/components/ui/SectionCard'
import KPICard from '@/components/ui/KPICard'
import { useAuth } from '../../contexts/AuthContext'
import { useVasanthFloat, useFloatHistory, useAddFloatFunds } from '../../hooks/useVasanthFloat'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { showToast } from '@/lib/dialogs'
import { Banknote, TrendingUp, TrendingDown, History, Plus } from 'lucide-react'

const addFundsSchema = z.object({
  topup_date: z.string().min(1, 'Required'),
  amount: z.string().min(1, 'Required'),
  transfer_ref: z.string(),
  notes: z.string(),
})
type AddFundsForm = z.infer<typeof addFundsSchema>

export default function VasanthFloatPage() {
  const { user } = useAuth()
  const [addOpen, setAddOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const { data: balance, isLoading: balLoading } = useVasanthFloat(!!user)
  const { data: history = [], isLoading: histLoading } = useFloatHistory(!!user)
  const addFunds = useAddFloatFunds()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddFundsForm>({
    resolver: zodResolver(addFundsSchema),
    defaultValues: {
      topup_date: new Date().toISOString().split('T')[0],
      amount: '',
      transfer_ref: '',
      notes: '',
    },
  })

  const onAddFunds = handleSubmit(async (values) => {
    try {
      await addFunds.mutateAsync({
        topup_date: values.topup_date,
        amount: parseFloat(values.amount),
        transfer_ref: values.transfer_ref || null,
        notes: values.notes || null,
        added_by: user!.id,
      })
      showToast('Funds added to float', 'success')
      setAddOpen(false)
      reset()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to add funds', 'error')
    }
  })

  // This month stats
  const thisMonth = new Date().toISOString().slice(0, 7)
  const thisMonthTopups = history
    .filter((t) => t.type === 'topup' && t.date.startsWith(thisMonth))
    .reduce((s, t) => s + t.amount, 0)
  const thisMonthSpent = history
    .filter((t) => t.type === 'deduction' && t.date.startsWith(thisMonth))
    .reduce((s, t) => s + t.amount, 0)

  return (
    <PageContainer>
      <PageHeader
        title="Vasanth Float"
        subtitle="Supervisor cash float management"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setHistoryOpen(true)}>
              <History className="w-4 h-4 mr-1.5" />
              History
            </Button>
            <Button onClick={() => setAddOpen(true)} data-testid="add-funds-btn">
              <Plus className="w-4 h-4 mr-1.5" />
              Add Funds
            </Button>
          </div>
        }
      />

      {/* Current Balance */}
      <SectionCard className="mb-4" status="info" data-testid="float-balance-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--gray-600)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                margin: 0,
              }}
            >
              Current Balance
            </p>
            {balLoading ? (
              <Skeleton className="h-10 w-36 mt-1" />
            ) : (
              <div style={{ marginTop: 'var(--space-1)' }} data-testid="float-balance">
                {balance != null ? (
                  <AmountDisplay amount={Number(balance.current_balance)} size="xl" />
                ) : (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--text-3xl)',
                      color: 'var(--gray-400)',
                    }}
                  >
                    —
                  </span>
                )}
              </div>
            )}
          </div>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'var(--color-info-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Banknote style={{ width: 28, height: 28, color: 'var(--color-info)' }} />
          </div>
        </div>
      </SectionCard>

      {/* This month stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <KPICard
          title="Topped Up"
          value={`₹${thisMonthTopups.toLocaleString('en-IN')}`}
          subtitle="This month"
          icon={TrendingUp}
          status="success"
        />
        <KPICard
          title="Spent"
          value={`₹${thisMonthSpent.toLocaleString('en-IN')}`}
          subtitle="This month"
          icon={TrendingDown}
          status="danger"
        />
      </div>

      {/* Action buttons (mobile fallback) */}
      <div className="flex gap-3 lg:hidden">
        <Button onClick={() => setAddOpen(true)} className="flex-1" data-testid="add-funds-btn">
          <Plus className="w-4 h-4 mr-1.5" />
          Add Funds
        </Button>
        <Button variant="outline" onClick={() => setHistoryOpen(true)} className="flex-1">
          <History className="w-4 h-4 mr-1.5" />
          View History
        </Button>
      </div>

      {/* Add Funds Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Funds to Float</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input type="date" {...register('topup_date')} />
                {errors.topup_date && (
                  <p className="text-destructive text-xs">{errors.topup_date.message}</p>
                )}
              </div>
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
            </div>
            <div className="space-y-1.5">
              <Label>Transfer Reference</Label>
              <Input placeholder="UTR / UPI reference — optional" {...register('transfer_ref')} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea placeholder="Optional" rows={2} {...register('notes')} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={onAddFunds} disabled={addFunds.isLoading}>
              {addFunds.isLoading ? 'Adding…' : 'Add Funds'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Float Transaction History</DialogTitle>
          </DialogHeader>
          {histLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : history.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">No transactions yet.</p>
          ) : (
            <div className="space-y-1">
              {[...history].reverse().map((t) => (
                <div key={t.id} className="flex items-center gap-3 py-2">
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      t.type === 'topup' ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{t.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.date + 'T00:00:00').toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p
                      className={`text-sm font-medium ${
                        t.type === 'topup' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {t.type === 'topup' ? '+' : '−'}₹{t.amount.toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ₹{t.running_balance.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

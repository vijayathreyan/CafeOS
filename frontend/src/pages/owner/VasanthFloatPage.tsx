import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useVasanthFloat, useFloatHistory, useAddFloatFunds } from '../../hooks/useVasanthFloat'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
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
import { Banknote, ArrowLeft, TrendingUp, TrendingDown, History, Plus } from 'lucide-react'

const addFundsSchema = z.object({
  topup_date: z.string().min(1, 'Required'),
  amount: z.string().min(1, 'Required'),
  transfer_ref: z.string(),
  notes: z.string(),
})
type AddFundsForm = z.infer<typeof addFundsSchema>

export default function VasanthFloatPage() {
  const navigate = useNavigate()
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
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Vasanth Float</h1>
      </div>

      {/* Current Balance */}
      <Card className="mb-4 border-primary/20" data-testid="float-balance-card">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Current Balance
              </p>
              {balLoading ? (
                <Skeleton className="h-10 w-36 mt-1" />
              ) : (
                <p className="text-3xl font-bold text-foreground mt-1" data-testid="float-balance">
                  {balance != null
                    ? `₹${Number(balance.current_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                    : '—'}
                </p>
              )}
            </div>
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
              <Banknote className="w-7 h-7 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* This month stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <p className="text-xs text-muted-foreground">Topped Up</p>
            </div>
            <p className="font-semibold text-foreground">
              ₹{thisMonthTopups.toLocaleString('en-IN')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <p className="text-xs text-muted-foreground">Spent</p>
            </div>
            <p className="font-semibold text-foreground">
              ₹{thisMonthSpent.toLocaleString('en-IN')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
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
    </div>
  )
}

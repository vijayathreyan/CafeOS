import React, { useRef, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  useSupervisorExpenses,
  useExpenseShops,
  useCreateSupervisorExpense,
} from '../../hooks/useSupervisorExpenses'
import { supabase } from '../../lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
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
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { showToast } from '@/lib/dialogs'
import { Plus, Camera } from 'lucide-react'
import { PageContainer } from '@/components/layouts/PageContainer'
import { PageHeader } from '@/components/layouts/PageHeader'

const today = new Date().toISOString().split('T')[0]

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  })
}

export default function SupervisorExpensesPage() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)

  const { data: recentExpenses = [], isLoading } = useSupervisorExpenses(!!user, true)
  const { data: shops = [] } = useExpenseShops(!!user)
  const createMut = useCreateSupervisorExpense()

  const [shop, setShop] = useState('')
  const [branch, setBranch] = useState<'KR' | 'C2'>('KR')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today)
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const photoRef = useRef<HTMLInputElement>(null)

  const handlePhotoChange = (file: File | null) => {
    setPhoto(file)
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(file ? URL.createObjectURL(file) : null)
  }

  const resetForm = () => {
    setShop('')
    setBranch('KR')
    setAmount('')
    setDate(today)
    setPhoto(null)
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(null)
    if (photoRef.current) photoRef.current.value = ''
    setFormError(null)
  }

  const handleSubmit = async () => {
    setFormError(null)
    if (!shop) {
      setFormError('Please select a shop')
      return
    }
    if (!amount || parseFloat(amount) <= 0) {
      setFormError('Enter a valid amount')
      return
    }
    if (!photo) {
      setFormError('Bill photo is required')
      return
    }

    try {
      const ext = photo.name.split('.').pop() ?? 'jpg'
      const path = `expenses/${user!.id}/${Date.now()}.${ext}`
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('bill-photos')
        .upload(path, photo, { contentType: photo.type, upsert: false })
      if (uploadErr) throw new Error(`Photo upload failed: ${uploadErr.message}`)

      await createMut.mutateAsync({
        expense_date: date,
        shop_name: shop,
        branch,
        amount: parseFloat(amount),
        bill_photo_url: uploadData.path,
        submitted_by: user!.id,
      })

      showToast('Expense recorded', 'success')
      resetForm()
      setOpen(false)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed')
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Expense Entry"
        action={
          <Button
            onClick={() => {
              resetForm()
              setOpen(true)
            }}
            data-testid="add-expense-btn"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Expense
          </Button>
        }
      />

      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
        Last 7 Days
      </h2>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : recentExpenses.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground text-sm">
            No expenses in the last 7 days.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {recentExpenses.map((e) => (
            <Card key={e.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground text-sm">{e.shop_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(e.expense_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {e.branch}
                    </Badge>
                    <span className="font-semibold text-foreground text-sm">
                      ₹{Number(e.amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="expense-form">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Branch *</Label>
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

            <div className="space-y-1.5">
              <Label>Shop Name *</Label>
              <Select value={shop} onValueChange={setShop}>
                <SelectTrigger>
                  <SelectValue placeholder="Select shop…" />
                </SelectTrigger>
                <SelectContent>
                  {shops.map((s) => (
                    <SelectItem key={s.id} value={s.shop_name}>
                      {s.shop_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Amount (₹) *</Label>
              <Input
                type="number"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Bill Photo *</Label>
              <input
                ref={photoRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                capture="environment"
                className="hidden"
                onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => photoRef.current?.click()}
                className="flex items-center gap-2 h-10 w-full rounded-md border border-dashed border-input bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-accent/50 transition-colors"
              >
                <Camera className="w-4 h-4 flex-shrink-0" />
                {photo ? photo.name : 'Tap to take photo or choose from gallery'}
              </button>
              {photoPreview && (
                <img
                  src={photoPreview}
                  alt="Bill preview"
                  className="mt-1.5 h-24 w-auto rounded-md border border-border object-cover"
                />
              )}
            </div>

            {formError && <p className="text-destructive text-sm">{formError}</p>}
          </div>
          <Separator />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createMut.isLoading}>
              {createMut.isLoading ? 'Saving…' : 'Record Expense'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

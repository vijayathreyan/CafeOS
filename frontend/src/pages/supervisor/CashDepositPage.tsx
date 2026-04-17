import React, { useRef, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useCreateCashDeposit } from '../../hooks/useCashDeposit'
import { supabase } from '../../lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import SectionCard from '@/components/ui/SectionCard'
import AmountDisplay from '@/components/ui/AmountDisplay'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { showToast } from '@/lib/dialogs'
import { Camera, Plus, Trash2, CheckCircle2 } from 'lucide-react'
import { PageContainer } from '@/components/layouts/PageContainer'
import { PageHeader } from '@/components/layouts/PageHeader'
import type { CashDepositRow } from '../../types/phase4'

const today = new Date().toISOString().split('T')[0]

interface DepositRowState {
  branch: 'KR' | 'C2'
  date_covered: string
  amount: string
}

function SuccessScreen({ onReset }: { onReset: () => void }) {
  return (
    <div className="p-8 max-w-md mx-auto text-center">
      <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
      <h2 className="text-xl font-semibold text-foreground mb-2">Deposit Submitted</h2>
      <p className="text-muted-foreground mb-6">
        The cash deposit has been recorded. The owner will be notified.
      </p>
      <Button onClick={onReset} className="w-full">
        Submit Another Deposit
      </Button>
    </div>
  )
}

export default function CashDepositPage() {
  const { user } = useAuth()
  const createDeposit = useCreateCashDeposit()
  const [submitted, setSubmitted] = useState(false)

  const [depositDate, setDepositDate] = useState(today)
  const [challanAmount, setChallanAmount] = useState('')
  const [bankRef, setBankRef] = useState('')
  const [notes, setNotes] = useState('')
  const [rows, setRows] = useState<DepositRowState[]>([
    { branch: 'KR', date_covered: today, amount: '' },
    { branch: 'C2', date_covered: today, amount: '' },
  ])
  const [challanPhoto, setChallanPhoto] = useState<File | null>(null)
  const [challanPreview, setChallanPreview] = useState<string | null>(null)
  const challanPhotoRef = useRef<HTMLInputElement>(null)
  const [challanError, setChallanError] = useState<string | null>(null)

  const rowsTotal = rows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)
  const challanAmountNum = parseFloat(challanAmount) || 0
  const amountMismatch =
    challanAmountNum > 0 && rowsTotal > 0 && Math.abs(rowsTotal - challanAmountNum) > 0.001

  const addRow = () => setRows((r) => [...r, { branch: 'KR', date_covered: today, amount: '' }])

  const removeRow = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i))

  const updateRow = (i: number, field: keyof DepositRowState, val: string) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [field]: val } : row)))

  const handlePhotoChange = (file: File | null) => {
    setChallanPhoto(file)
    if (challanPreview) URL.revokeObjectURL(challanPreview)
    setChallanPreview(file ? URL.createObjectURL(file) : null)
  }

  const canSubmit =
    depositDate &&
    challanPhoto &&
    challanAmountNum > 0 &&
    rows.some((r) => parseFloat(r.amount) > 0) &&
    !amountMismatch

  const handleSubmit = async () => {
    if (!canSubmit) return
    setChallanError(null)

    const validRows = rows.filter((r) => parseFloat(r.amount) > 0)

    // Validate amounts match
    const computedTotal = validRows.reduce((s, r) => s + parseFloat(r.amount), 0)
    if (Math.abs(computedTotal - challanAmountNum) > 0.001) {
      setChallanError(
        `Row total ₹${computedTotal.toLocaleString('en-IN')} does not match challan amount ₹${challanAmountNum.toLocaleString('en-IN')}. Please check and correct.`
      )
      return
    }

    try {
      let photoUrl: string | null = null
      if (challanPhoto) {
        const ext = challanPhoto.name.split('.').pop() ?? 'jpg'
        const path = `deposits/${user!.id}/${Date.now()}.${ext}`
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('bill-photos')
          .upload(path, challanPhoto, { contentType: challanPhoto.type, upsert: false })
        if (uploadErr) throw new Error(`Photo upload failed: ${uploadErr.message}`)
        photoUrl = uploadData.path
      }

      const depositRows: CashDepositRow[] = validRows.map((r) => ({
        branch: r.branch,
        date_covered: r.date_covered,
        amount: parseFloat(r.amount),
      }))

      await createDeposit.mutateAsync({
        deposit_date: depositDate,
        challan_photo_url: photoUrl,
        bank_ref: bankRef || null,
        notes: notes || null,
        rows: depositRows,
        total_amount: challanAmountNum,
        submitted_by: user!.id,
      })

      setSubmitted(true)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Submission failed', 'error')
    }
  }

  const handleReset = () => {
    setSubmitted(false)
    setDepositDate(today)
    setChallanAmount('')
    setBankRef('')
    setNotes('')
    setRows([
      { branch: 'KR', date_covered: today, amount: '' },
      { branch: 'C2', date_covered: today, amount: '' },
    ])
    setChallanPhoto(null)
    if (challanPreview) URL.revokeObjectURL(challanPreview)
    setChallanPreview(null)
    setChallanError(null)
  }

  if (submitted) return <SuccessScreen onReset={handleReset} />

  return (
    <PageContainer>
      <PageHeader title="Cash Deposit" />

      <SectionCard padding="compact">
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Deposit Date *</Label>
              <Input
                type="date"
                value={depositDate}
                onChange={(e) => setDepositDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Bank Ref / Slip No.</Label>
              <Input
                placeholder="Optional"
                value={bankRef}
                onChange={(e) => setBankRef(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Challan Amount (₹) *</Label>
            <Input
              type="number"
              placeholder="Total from bank challan"
              min="0"
              step="0.01"
              value={challanAmount}
              onChange={(e) => setChallanAmount(e.target.value)}
              data-testid="challan-amount-input"
            />
            <p className="text-xs text-muted-foreground">
              This must exactly match the sum of all rows below.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Challan Photo *</Label>
            <input
              ref={challanPhotoRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              capture="environment"
              className="hidden"
              onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => challanPhotoRef.current?.click()}
              className="flex items-center gap-2 h-10 w-full rounded-md border border-dashed border-input bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-accent/50 transition-colors"
            >
              <Camera className="w-4 h-4 flex-shrink-0" />
              {challanPhoto ? challanPhoto.name : 'Tap to take photo or choose from gallery'}
            </button>
            {challanPreview && (
              <img
                src={challanPreview}
                alt="Challan preview"
                className="mt-1.5 h-28 w-auto rounded-md border border-border object-cover"
              />
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Deposit Breakdown *</Label>
              <Button variant="link" size="sm" onClick={addRow} className="h-auto p-0 text-sm">
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Row
              </Button>
            </div>
            <div className="space-y-2">
              {rows.map((row, i) => (
                <div key={i} className="grid grid-cols-[100px_1fr_100px_36px] gap-2 items-center">
                  <Select value={row.branch} onValueChange={(v) => updateRow(i, 'branch', v)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KR">KR</SelectItem>
                      <SelectItem value="C2">C2</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={row.date_covered}
                    onChange={(e) => updateRow(i, 'date_covered', e.target.value)}
                    className="h-9 text-sm"
                  />
                  <Input
                    type="number"
                    placeholder="Amount"
                    min="0"
                    step="0.01"
                    value={row.amount}
                    onChange={(e) => updateRow(i, 'amount', e.target.value)}
                    className="h-9 text-sm"
                  />
                  {rows.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-destructive hover:text-destructive/70"
                      onClick={() => removeRow(i)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between text-sm font-medium">
              <span className="text-muted-foreground">Rows Total:</span>
              <span className={amountMismatch ? 'text-destructive' : 'text-foreground'}>
                <AmountDisplay
                  amount={rowsTotal}
                  size="sm"
                  variant={amountMismatch ? 'negative' : 'default'}
                />
              </span>
            </div>

            {amountMismatch && (
              <p className="text-destructive text-sm mt-2" data-testid="total-mismatch-error">
                Row total ₹{rowsTotal.toLocaleString('en-IN')} does not match challan amount ₹
                {challanAmountNum.toLocaleString('en-IN')}. Please check and correct.
              </p>
            )}

            {challanError && <p className="text-destructive text-sm mt-2">{challanError}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              placeholder="Optional"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!canSubmit || createDeposit.isLoading}
            data-testid="submit-deposit-btn"
          >
            {createDeposit.isLoading ? 'Submitting…' : 'Submit Deposit'}
          </Button>

          {!challanPhoto && (
            <p className="text-xs text-muted-foreground text-center">
              Challan photo is required before submitting.
            </p>
          )}
        </div>
      </SectionCard>
    </PageContainer>
  )
}

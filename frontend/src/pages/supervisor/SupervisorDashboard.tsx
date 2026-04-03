import React, { useState, useRef } from 'react'

interface Task {
  id: string
  title: string
  description?: string | null
  status: string
  due_date?: string | null
  branch?: string | null
  assigned_by_emp?: { full_name: string } | null
}
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from 'react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ChevronDown, Banknote, ClipboardList, Camera } from 'lucide-react'
import StatusChip from '../../components/StatusChip'

export default function SupervisorDashboard() {
  const { t } = useTranslation()
  const { user, setActiveBranch } = useAuth()
  const navigate = useNavigate()
  const today = new Date().toISOString().split('T')[0]
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const toggle = (s: string) => setActiveSection((prev) => (prev === s ? null : s))

  const handleEnterShift = (branch: 'KR' | 'C2') => {
    setActiveBranch(branch)
    navigate('/supervisor-shift')
  }

  // ── Vasanth Float Balance ──
  const { data: floatData } = useQuery('vasanth_float', async () => {
    const { data } = await supabase.from('vasanth_float_balance').select('*').limit(1).maybeSingle()
    return data
  })

  // ── Expense shops dropdown ──
  const { data: shops = [] } = useQuery('expense_shops', async () => {
    const { data } = await supabase
      .from('supervisor_expense_shops')
      .select('*')
      .eq('active', true)
      .order('shop_name')
    return (data || []) as { id: string; shop_name: string }[]
  })

  // ── Tasks assigned to this supervisor ──
  const { data: tasks = [] } = useQuery(
    ['sup_tasks', user?.id],
    async () => {
      if (!user) return []
      const { data } = await supabase
        .from('tasks')
        .select('*, assigned_by_emp:assigned_by(full_name)')
        .eq('assigned_to', user.id)
        .order('due_date', { ascending: true })
      return data || []
    },
    { enabled: !!user }
  )

  // ── Expense form ──
  const [expShop, setExpShop] = useState('')
  const [expBranch, setExpBranch] = useState<'KR' | 'C2'>('KR')
  const [expAmount, setExpAmount] = useState('')
  const [expDate, setExpDate] = useState(today)
  const [expPhoto, setExpPhoto] = useState<File | null>(null)
  const [expPhotoPreview, setExpPhotoPreview] = useState<string | null>(null)
  const expPhotoRef = useRef<HTMLInputElement>(null)
  const [expMsg, setExpMsg] = useState<{ text: string; isError: boolean } | null>(null)

  const expMutation = useMutation(
    async () => {
      if (!expShop) throw new Error('Select a shop')
      if (!expAmount || parseFloat(expAmount) <= 0) throw new Error('Enter a valid amount')
      if (!expPhoto) throw new Error('Bill photo is required')

      // Upload photo to private bill-photos bucket
      const ext = expPhoto.name.split('.').pop() ?? 'jpg'
      const path = `${user?.id}/${Date.now()}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('bill-photos')
        .upload(path, expPhoto, { contentType: expPhoto.type, upsert: false })
      if (uploadError) throw new Error(`Photo upload failed: ${uploadError.message}`)

      const { error } = await supabase.from('supervisor_expenses').insert({
        expense_date: expDate,
        shop_name: expShop,
        branch: expBranch,
        amount: parseFloat(expAmount),
        bill_photo_url: uploadData.path,
        submitted_by: user?.id,
        float_used: true,
      })
      if (error) throw new Error(error.message)
    },
    {
      onSuccess: () => {
        setExpShop('')
        setExpAmount('')
        setExpDate(today)
        setExpPhoto(null)
        setExpPhotoPreview(null)
        if (expPhotoRef.current) expPhotoRef.current.value = ''
        setExpMsg({ text: 'Expense recorded', isError: false })
        setTimeout(() => setExpMsg(null), 3000)
      },
      onError: (e: unknown) =>
        setExpMsg({ text: e instanceof Error ? e.message : 'Failed', isError: true }),
    }
  )

  // ── Cash Deposit form ──
  const [depDate, setDepDate] = useState(today)
  const [depBankRef, setDepBankRef] = useState('')
  const [depNotes, setDepNotes] = useState('')
  const [depRows, setDepRows] = useState([{ branch: 'KR', amount: '' }])
  const [depMsg, setDepMsg] = useState<{ text: string; isError: boolean } | null>(null)

  const addDepRow = () => setDepRows((r) => [...r, { branch: 'KR', amount: '' }])
  const removeDepRow = (i: number) => setDepRows((r) => r.filter((_, idx) => idx !== i))
  const updateDepRow = (i: number, field: string, val: string) =>
    setDepRows((r) => r.map((row, idx) => (idx === i ? { ...row, [field]: val } : row)))

  const depMutation = useMutation(
    async () => {
      const validRows = depRows.filter((r) => r.amount && parseFloat(r.amount) > 0)
      if (validRows.length === 0) throw new Error('Add at least one row with an amount')
      const totalAmount = validRows.reduce((sum, r) => sum + parseFloat(r.amount), 0)
      const { error } = await supabase.from('cash_deposits').insert({
        deposit_date: depDate,
        bank_ref: depBankRef || null,
        notes: depNotes || null,
        rows: validRows.map((r) => ({ branch: r.branch, amount: parseFloat(r.amount) })),
        total_amount: totalAmount,
        submitted_by: user?.id,
      })
      if (error) throw new Error(error.message)
    },
    {
      onSuccess: () => {
        setDepDate(today)
        setDepBankRef('')
        setDepNotes('')
        setDepRows([{ branch: 'KR', amount: '' }])
        setDepMsg({ text: 'Cash deposit recorded', isError: false })
        setTimeout(() => setDepMsg(null), 3000)
      },
      onError: (e: unknown) =>
        setDepMsg({ text: e instanceof Error ? e.message : 'Failed', isError: true }),
    }
  )

  return (
    <div className="p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Supervisor Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {new Date().toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
          {' · '}
          {user?.full_name}
        </p>
      </div>

      {/* Float Balance — always visible, read-only */}
      <Card className="mb-4">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Vasanth Float Balance
            </p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {floatData != null
                ? `₹${Number(floatData.current_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                : '—'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
            <Banknote className="w-6 h-6 text-primary" />
          </div>
        </CardContent>
      </Card>

      {/* Expense Entry */}
      <SectionCard
        title="Expense Entry"
        open={activeSection === 'expense'}
        onToggle={() => toggle('expense')}
      >
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Shop Name *</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={expShop}
                onChange={(e) => setExpShop(e.target.value)}
              >
                <option value="">Select shop…</option>
                {shops.map((s) => (
                  <option key={s.id} value={s.shop_name}>
                    {s.shop_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Branch *</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={expBranch}
                onChange={(e) => setExpBranch(e.target.value as 'KR' | 'C2')}
              >
                <option value="KR">{t('branch.KR')}</option>
                <option value="C2">{t('branch.C2')}</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount (₹) *</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Bill Photo *</Label>
            <input
              ref={expPhotoRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null
                setExpPhoto(file)
                if (expPhotoPreview) URL.revokeObjectURL(expPhotoPreview)
                setExpPhotoPreview(file ? URL.createObjectURL(file) : null)
              }}
            />
            <button
              type="button"
              onClick={() => expPhotoRef.current?.click()}
              className="flex items-center gap-2 h-10 w-full rounded-md border border-dashed border-input bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-accent/50 transition-colors"
            >
              <Camera className="w-4 h-4 flex-shrink-0" />
              {expPhoto ? expPhoto.name : 'Tap to take photo or choose from gallery'}
            </button>
            {expPhotoPreview && (
              <img
                src={expPhotoPreview}
                alt="Bill preview"
                className="mt-1.5 h-24 w-auto rounded-md border border-border object-cover"
              />
            )}
          </div>
          {expMsg && (
            <p className={`text-sm ${expMsg.isError ? 'text-destructive' : 'text-green-600'}`}>
              {expMsg.text}
            </p>
          )}
          <Button
            className="w-full"
            onClick={() => expMutation.mutate()}
            disabled={expMutation.isLoading}
          >
            {expMutation.isLoading ? 'Saving…' : 'Record Expense'}
          </Button>
        </div>
      </SectionCard>

      {/* Cash Deposit */}
      <SectionCard
        title="Cash Deposit"
        open={activeSection === 'deposit'}
        onToggle={() => toggle('deposit')}
      >
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Deposit Date *</Label>
              <Input type="date" value={depDate} onChange={(e) => setDepDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Bank Ref / Challan No.</Label>
              <Input
                type="text"
                placeholder="Optional"
                value={depBankRef}
                onChange={(e) => setDepBankRef(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Deposit Rows *</Label>
            <div className="space-y-2 mt-1.5">
              {depRows.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    className="h-10 w-28 flex-shrink-0 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={row.branch}
                    onChange={(e) => updateDepRow(i, 'branch', e.target.value)}
                  >
                    <option value="KR">{t('branch.KR')}</option>
                    <option value="C2">{t('branch.C2')}</option>
                  </select>
                  <Input
                    type="number"
                    className="flex-1"
                    placeholder="Amount"
                    value={row.amount}
                    onChange={(e) => updateDepRow(i, 'amount', e.target.value)}
                    min="0"
                    step="0.01"
                  />
                  {depRows.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDepRow(i)}
                      className="text-destructive hover:text-destructive/70 flex-shrink-0"
                    >
                      ✕
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button variant="link" onClick={addDepRow} className="mt-1 p-0 h-auto text-sm">
              + Add Row
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <textarea
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              rows={2}
              placeholder="Optional"
              value={depNotes}
              onChange={(e) => setDepNotes(e.target.value)}
            />
          </div>

          {depMsg && (
            <p className={`text-sm ${depMsg.isError ? 'text-destructive' : 'text-green-600'}`}>
              {depMsg.text}
            </p>
          )}
          <Button
            className="w-full"
            onClick={() => depMutation.mutate()}
            disabled={depMutation.isLoading}
          >
            {depMutation.isLoading ? 'Saving…' : 'Submit Deposit'}
          </Button>
        </div>
      </SectionCard>

      {/* Enter Shift Data */}
      <SectionCard
        title="Enter Shift Data"
        open={activeSection === 'shift'}
        onToggle={() => toggle('shift')}
      >
        <div className="p-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Select the branch to enter shift data for:
          </p>
          <div className="flex gap-3">
            <Button className="flex-1" onClick={() => handleEnterShift('KR')}>
              <ClipboardList className="w-4 h-4 mr-2" />
              Kaappi Ready
            </Button>
            <Button className="flex-1" variant="outline" onClick={() => handleEnterShift('C2')}>
              <ClipboardList className="w-4 h-4 mr-2" />
              Coffee Mate C2
            </Button>
          </div>
        </div>
      </SectionCard>

      {/* Tasks */}
      <SectionCard
        title={`Tasks${tasks.length > 0 ? ` (${tasks.length})` : ''}`}
        open={activeSection === 'tasks'}
        onToggle={() => toggle('tasks')}
      >
        <div className="p-4">
          {tasks.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">No tasks assigned</p>
          ) : (
            <div className="space-y-2">
              {tasks.map((task: Task) => {
                const isOverdue =
                  task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'
                return (
                  <div
                    key={task.id}
                    className={`rounded-lg border p-3 ${isOverdue ? 'border-destructive/30 bg-red-50' : 'border-border'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm">{task.title}</p>
                        {task.description && (
                          <p className="text-muted-foreground text-xs mt-0.5 truncate">
                            {task.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                          {task.due_date && (
                            <span>Due: {new Date(task.due_date).toLocaleDateString('en-IN')}</span>
                          )}
                          {task.assigned_by_emp?.full_name && (
                            <span>From: {task.assigned_by_emp.full_name}</span>
                          )}
                          {task.branch && <span>{t(`branch.${task.branch}`)}</span>}
                        </div>
                      </div>
                      <StatusChip
                        variant={
                          task.status === 'done'
                            ? 'done'
                            : isOverdue
                              ? 'error'
                              : task.status === 'in_progress'
                                ? 'pending'
                                : 'grey'
                        }
                        label={task.status}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  )
}

function SectionCard({
  title,
  open,
  onToggle,
  children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <Card className="mb-3 overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 min-h-[48px] text-left hover:bg-accent/50 transition-colors"
        onClick={onToggle}
      >
        <span className="font-medium text-foreground">{title}</span>
        <ChevronDown
          className={`w-5 h-5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <>
          <Separator />
          {children}
        </>
      )}
    </Card>
  )
}

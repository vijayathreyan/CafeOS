import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation } from 'react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import StatusChip from '../../components/StatusChip'

export default function SupervisorDashboard() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const today = new Date().toISOString().split('T')[0]
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const toggle = (s: string) => setActiveSection(prev => prev === s ? null : s)

  // ── Vasanth Float Balance ──
  const { data: floatData } = useQuery('vasanth_float', async () => {
    const { data } = await supabase.from('vasanth_float_balance').select('*').limit(1).maybeSingle()
    return data
  })

  // ── Expense shops dropdown ──
  const { data: shops = [] } = useQuery('expense_shops', async () => {
    const { data } = await supabase.from('supervisor_expense_shops').select('*').eq('active', true).order('shop_name')
    return (data || []) as { id: string; shop_name: string }[]
  })

  // ── Tasks assigned to this supervisor ──
  const { data: tasks = [] } = useQuery(['sup_tasks', user?.id], async () => {
    if (!user) return []
    const { data } = await supabase
      .from('tasks')
      .select('*, assigned_by_emp:assigned_by(full_name)')
      .eq('assigned_to', user.id)
      .order('due_date', { ascending: true })
    return data || []
  }, { enabled: !!user })

  // ── Expense form ──
  const [expShop, setExpShop] = useState('')
  const [expBranch, setExpBranch] = useState<'KR' | 'C2'>('KR')
  const [expAmount, setExpAmount] = useState('')
  const [expDate, setExpDate] = useState(today)
  const [expMsg, setExpMsg] = useState<{ text: string; isError: boolean } | null>(null)

  const expMutation = useMutation(async () => {
    if (!expShop) throw new Error('Select a shop')
    if (!expAmount || parseFloat(expAmount) <= 0) throw new Error('Enter a valid amount')
    const { error } = await supabase.from('supervisor_expenses').insert({
      expense_date: expDate,
      shop_name: expShop,
      branch: expBranch,
      amount: parseFloat(expAmount),
      submitted_by: user?.id,
      float_used: true,
    })
    if (error) throw new Error(error.message)
  }, {
    onSuccess: () => {
      setExpShop(''); setExpAmount(''); setExpDate(today)
      setExpMsg({ text: 'Expense recorded', isError: false })
      setTimeout(() => setExpMsg(null), 3000)
    },
    onError: (e: any) => setExpMsg({ text: e.message, isError: true }),
  })

  // ── Cash Deposit form ──
  const [depDate, setDepDate] = useState(today)
  const [depBankRef, setDepBankRef] = useState('')
  const [depNotes, setDepNotes] = useState('')
  const [depRows, setDepRows] = useState([{ branch: 'KR', amount: '' }])
  const [depMsg, setDepMsg] = useState<{ text: string; isError: boolean } | null>(null)

  const addDepRow = () => setDepRows(r => [...r, { branch: 'KR', amount: '' }])
  const removeDepRow = (i: number) => setDepRows(r => r.filter((_, idx) => idx !== i))
  const updateDepRow = (i: number, field: string, val: string) =>
    setDepRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row))

  const depMutation = useMutation(async () => {
    const validRows = depRows.filter(r => r.amount && parseFloat(r.amount) > 0)
    if (validRows.length === 0) throw new Error('Add at least one row with an amount')
    const totalAmount = validRows.reduce((sum, r) => sum + parseFloat(r.amount), 0)
    const { error } = await supabase.from('cash_deposits').insert({
      deposit_date: depDate,
      bank_ref: depBankRef || null,
      notes: depNotes || null,
      rows: validRows.map(r => ({ branch: r.branch, amount: parseFloat(r.amount) })),
      total_amount: totalAmount,
      submitted_by: user?.id,
    })
    if (error) throw new Error(error.message)
  }, {
    onSuccess: () => {
      setDepDate(today); setDepBankRef(''); setDepNotes(''); setDepRows([{ branch: 'KR', amount: '' }])
      setDepMsg({ text: 'Cash deposit recorded', isError: false })
      setTimeout(() => setDepMsg(null), 3000)
    },
    onError: (e: any) => setDepMsg({ text: e.message, isError: true }),
  })

  return (
    <div className="p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="section-header">Supervisor Dashboard</h1>
        <p className="text-text-secondary text-sm mt-1">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          {' · '}{user?.full_name}
        </p>
      </div>

      {/* Float Balance — always visible, read-only */}
      <div className="card p-4 mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">Vasanth Float Balance</p>
          <p className="text-2xl font-bold text-text-primary mt-1">
            {floatData != null
              ? `₹${Number(floatData.current_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
              : '—'}
          </p>
        </div>
        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-2xl">💰</div>
      </div>

      {/* Expense Entry */}
      <SectionCard title="Expense Entry" open={activeSection === 'expense'} onToggle={() => toggle('expense')}>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Shop Name *</label>
              <select className="input-field" value={expShop} onChange={e => setExpShop(e.target.value)}>
                <option value="">Select shop…</option>
                {shops.map(s => <option key={s.id} value={s.shop_name}>{s.shop_name}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Branch *</label>
              <select className="input-field" value={expBranch} onChange={e => setExpBranch(e.target.value as 'KR' | 'C2')}>
                <option value="KR">{t('branch.KR')}</option>
                <option value="C2">{t('branch.C2')}</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Amount (₹) *</label>
              <input
                type="number" className="input-field" placeholder="0.00"
                value={expAmount} onChange={e => setExpAmount(e.target.value)} min="0" step="0.01"
              />
            </div>
            <div>
              <label className="input-label">Date *</label>
              <input type="date" className="input-field" value={expDate} onChange={e => setExpDate(e.target.value)} />
            </div>
          </div>
          {expMsg && (
            <p className={`text-sm ${expMsg.isError ? 'text-error' : 'text-secondary'}`}>{expMsg.text}</p>
          )}
          <button
            className="btn-primary w-full"
            onClick={() => expMutation.mutate()}
            disabled={expMutation.isLoading}
          >
            {expMutation.isLoading ? 'Saving…' : 'Record Expense'}
          </button>
        </div>
      </SectionCard>

      {/* Cash Deposit */}
      <SectionCard title="Cash Deposit" open={activeSection === 'deposit'} onToggle={() => toggle('deposit')}>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Deposit Date *</label>
              <input type="date" className="input-field" value={depDate} onChange={e => setDepDate(e.target.value)} />
            </div>
            <div>
              <label className="input-label">Bank Ref / Challan No.</label>
              <input
                type="text" className="input-field" placeholder="Optional"
                value={depBankRef} onChange={e => setDepBankRef(e.target.value)}
              />
            </div>
          </div>

          {/* Multi-row deposit entries */}
          <div>
            <label className="input-label">Deposit Rows *</label>
            <div className="space-y-2 mt-1">
              {depRows.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    className="input-field w-28 flex-shrink-0"
                    value={row.branch}
                    onChange={e => updateDepRow(i, 'branch', e.target.value)}
                  >
                    <option value="KR">{t('branch.KR')}</option>
                    <option value="C2">{t('branch.C2')}</option>
                  </select>
                  <input
                    type="number" className="input-field flex-1" placeholder="Amount"
                    value={row.amount} onChange={e => updateDepRow(i, 'amount', e.target.value)}
                    min="0" step="0.01"
                  />
                  {depRows.length > 1 && (
                    <button
                      onClick={() => removeDepRow(i)}
                      className="text-error hover:text-error/70 text-lg leading-none px-1 flex-shrink-0"
                    >✕</button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={addDepRow} className="mt-2 text-primary text-sm font-medium hover:text-primary/80">
              + Add Row
            </button>
          </div>

          <div>
            <label className="input-label">Notes</label>
            <textarea
              className="input-field" rows={2} placeholder="Optional"
              value={depNotes} onChange={e => setDepNotes(e.target.value)}
            />
          </div>

          {depMsg && (
            <p className={`text-sm ${depMsg.isError ? 'text-error' : 'text-secondary'}`}>{depMsg.text}</p>
          )}
          <button
            className="btn-primary w-full"
            onClick={() => depMutation.mutate()}
            disabled={depMutation.isLoading}
          >
            {depMutation.isLoading ? 'Saving…' : 'Submit Deposit'}
          </button>
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
            <p className="text-text-secondary text-sm text-center py-4">No tasks assigned</p>
          ) : (
            <div className="space-y-2">
              {tasks.map((task: any) => {
                const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'
                return (
                  <div
                    key={task.id}
                    className={`rounded-lg border p-3 ${isOverdue ? 'border-error/30 bg-red-50' : 'border-border'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-primary text-sm">{task.title}</p>
                        {task.description && (
                          <p className="text-text-secondary text-xs mt-0.5 truncate">{task.description}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-1 text-xs text-text-secondary">
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
                          task.status === 'done' ? 'done'
                          : isOverdue ? 'error'
                          : task.status === 'in_progress' ? 'pending'
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
  title, open, onToggle, children,
}: {
  title: string; open: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div className="card mb-3 overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 min-h-tap text-left"
        onClick={onToggle}
      >
        <span className="font-medium text-text-primary">{title}</span>
        <svg
          className={`w-5 h-5 text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="border-t border-border">{children}</div>}
    </div>
  )
}

import React, { useState } from 'react'

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
import { useQuery } from 'react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ChevronDown, Banknote, ClipboardList, Package, Receipt, ArrowRight } from 'lucide-react'
import StatusChip from '../../components/StatusChip'

export default function SupervisorDashboard() {
  const { t } = useTranslation()
  const { user, setActiveBranch } = useAuth()
  const navigate = useNavigate()
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

      {/* Expense Entry — dedicated page */}
      <SectionCard
        title="Expense Entry"
        open={activeSection === 'expense'}
        onToggle={() => toggle('expense')}
      >
        <div className="p-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Record bill-wise expenses with photo upload. Float balance is automatically deducted.
          </p>
          <Button className="w-full" onClick={() => navigate('/supervisor/expenses')}>
            <Receipt className="w-4 h-4 mr-2" />
            Open Expense Entry
            <ArrowRight className="w-4 h-4 ml-auto" />
          </Button>
        </div>
      </SectionCard>

      {/* Cash Deposit — dedicated page */}
      <SectionCard
        title="Cash Deposit"
        open={activeSection === 'deposit'}
        onToggle={() => toggle('deposit')}
      >
        <div className="p-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Submit a bank deposit with challan photo and branch breakdown.
          </p>
          <Button className="w-full" onClick={() => navigate('/supervisor/cash-deposit')}>
            <Banknote className="w-4 h-4 mr-2" />
            Open Cash Deposit
            <ArrowRight className="w-4 h-4 ml-auto" />
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

      {/* Stock & Cash Expense Entry (Phase 2) */}
      <SectionCard
        title="Stock & Cash Expenses"
        open={activeSection === 'stock_expense'}
        onToggle={() => toggle('stock_expense')}
      >
        <div className="p-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Enter stock levels and cash expenses for either branch:
          </p>
          <Button className="w-full" onClick={() => navigate('/supervisor-entry')}>
            <Package className="w-4 h-4 mr-2" />
            Open Stock & Expenses Entry
          </Button>
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

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
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ChevronDown, Banknote, ClipboardList, Package, Receipt, ArrowRight } from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import PageContainer from '@/components/layouts/PageContainer'
import SectionCard from '@/components/ui/SectionCard'
import AmountDisplay from '@/components/ui/AmountDisplay'

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

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <PageContainer>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-2xl)',
            fontWeight: 'var(--font-semibold)',
            color: 'var(--gray-900)',
            letterSpacing: '-0.025em',
            margin: 0,
          }}
        >
          Supervisor Dashboard
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-600)', marginTop: '2px' }}>
          {today} · {user?.full_name}
        </p>
      </div>

      {/* Float Balance — always visible, read-only */}
      <SectionCard className="mb-4">
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
              Vasanth Float Balance
            </p>
            <div style={{ marginTop: 'var(--space-1)' }}>
              {floatData != null ? (
                <AmountDisplay amount={Number(floatData.current_balance)} size="xl" />
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
          </div>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'var(--color-info-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Banknote size={24} style={{ color: 'var(--color-info)' }} />
          </div>
        </div>
      </SectionCard>

      {/* Accordion sections */}
      {[
        {
          key: 'expense',
          title: 'Expense Entry',
          content: (
            <div
              style={{
                padding: 'var(--space-4)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
              }}
            >
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-600)' }}>
                Record bill-wise expenses with photo upload. Float balance is automatically
                deducted.
              </p>
              <Button className="w-full" onClick={() => navigate('/supervisor/expenses')}>
                <Receipt size={16} style={{ marginRight: '8px' }} />
                Open Expense Entry
                <ArrowRight size={16} style={{ marginLeft: 'auto' }} />
              </Button>
            </div>
          ),
        },
        {
          key: 'deposit',
          title: 'Cash Deposit',
          content: (
            <div
              style={{
                padding: 'var(--space-4)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
              }}
            >
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-600)' }}>
                Submit a bank deposit with challan photo and branch breakdown.
              </p>
              <Button className="w-full" onClick={() => navigate('/supervisor/cash-deposit')}>
                <Banknote size={16} style={{ marginRight: '8px' }} />
                Open Cash Deposit
                <ArrowRight size={16} style={{ marginLeft: 'auto' }} />
              </Button>
            </div>
          ),
        },
        {
          key: 'shift',
          title: 'Enter Shift Data',
          content: (
            <div
              style={{
                padding: 'var(--space-4)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
              }}
            >
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-600)' }}>
                Select the branch to enter shift data for:
              </p>
              <div className="flex gap-3">
                <Button className="flex-1" onClick={() => handleEnterShift('KR')}>
                  <ClipboardList size={16} style={{ marginRight: '6px' }} />
                  Kaappi Ready
                </Button>
                <Button className="flex-1" variant="outline" onClick={() => handleEnterShift('C2')}>
                  <ClipboardList size={16} style={{ marginRight: '6px' }} />
                  Coffee Mate C2
                </Button>
              </div>
            </div>
          ),
        },
        {
          key: 'stock_expense',
          title: 'Stock & Cash Expenses',
          content: (
            <div
              style={{
                padding: 'var(--space-4)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
              }}
            >
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-600)' }}>
                Enter stock levels and cash expenses for either branch:
              </p>
              <Button className="w-full" onClick={() => navigate('/supervisor-entry')}>
                <Package size={16} style={{ marginRight: '8px' }} />
                Open Stock &amp; Expenses Entry
              </Button>
            </div>
          ),
        },
        {
          key: 'tasks',
          title: `Tasks${tasks.length > 0 ? ` (${tasks.length})` : ''}`,
          content: (
            <div style={{ padding: 'var(--space-4)' }}>
              {tasks.length === 0 ? (
                <p
                  style={{
                    fontSize: 'var(--text-sm)',
                    color: 'var(--gray-500)',
                    textAlign: 'center',
                    padding: 'var(--space-4) 0',
                  }}
                >
                  No tasks assigned
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {tasks.map((task: Task) => {
                    const isOverdue =
                      task.due_date &&
                      new Date(task.due_date) < new Date() &&
                      task.status !== 'done'
                    return (
                      <div
                        key={task.id}
                        style={{
                          borderRadius: 'var(--radius-md)',
                          border: isOverdue
                            ? '1px solid var(--color-danger-border)'
                            : 'var(--border-default)',
                          background: isOverdue ? 'var(--color-danger-bg)' : 'transparent',
                          padding: 'var(--space-3)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: 'var(--space-2)',
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p
                              style={{
                                fontWeight: 500,
                                fontSize: 'var(--text-sm)',
                                color: 'var(--gray-900)',
                                margin: 0,
                              }}
                            >
                              {task.title}
                            </p>
                            {task.description && (
                              <p
                                style={{
                                  fontSize: 'var(--text-xs)',
                                  color: 'var(--gray-500)',
                                  marginTop: '2px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {task.description}
                              </p>
                            )}
                            <div
                              style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 'var(--space-2)',
                                marginTop: 'var(--space-1)',
                                fontSize: 'var(--text-xs)',
                                color: 'var(--gray-500)',
                              }}
                            >
                              {task.due_date && (
                                <span>
                                  Due: {new Date(task.due_date).toLocaleDateString('en-IN')}
                                </span>
                              )}
                              {task.assigned_by_emp?.full_name && (
                                <span>From: {task.assigned_by_emp.full_name}</span>
                              )}
                              {task.branch && <span>{t(`branch.${task.branch}`)}</span>}
                            </div>
                          </div>
                          <StatusBadge
                            status={
                              task.status === 'done'
                                ? 'success'
                                : isOverdue
                                  ? 'danger'
                                  : task.status === 'in_progress'
                                    ? 'pending'
                                    : 'inactive'
                            }
                            label={task.status}
                            size="sm"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ),
        },
      ].map(({ key, title, content }) => (
        <AccordionCard
          key={key}
          title={title}
          open={activeSection === key}
          onToggle={() => toggle(key)}
        >
          {content}
        </AccordionCard>
      ))}
    </PageContainer>
  )
}

function AccordionCard({
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
    <div
      style={{
        background: 'var(--brand-surface)',
        border: 'var(--border-default)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: 'var(--space-3)',
        overflow: 'hidden',
      }}
    >
      <button
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-4)',
          minHeight: '48px',
          textAlign: 'left',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          fontWeight: 500,
          fontSize: 'var(--text-base)',
          color: 'var(--gray-900)',
          transition: 'background var(--transition-fast)',
        }}
        onClick={onToggle}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--gray-50)'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.background = 'none'
        }}
      >
        <span>{title}</span>
        <ChevronDown
          size={20}
          style={{
            color: 'var(--gray-500)',
            transition: 'transform var(--transition-base)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>
      {open && (
        <>
          <Separator />
          {children}
        </>
      )}
    </div>
  )
}

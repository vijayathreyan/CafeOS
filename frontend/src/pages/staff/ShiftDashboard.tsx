import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { loadDraft, flushQueue } from '../../lib/offlineQueue'
import { Coffee, CheckCircle2, ChevronDown, Clock, Circle } from 'lucide-react'
import SnacksCard from './cards/SnacksCard'
import MilkCard from './cards/MilkCard'
import AssetsCard from './cards/AssetsCard'
import PostPaidCard from './cards/PostPaidCard'
import NotesCard from './cards/NotesCard'
import StockLevelsCard from './cards/StockLevelsCard'
import CashExpensesCard from './cards/CashExpensesCard'
import ShiftCloseModal from './ShiftCloseModal'

interface DailyEntry {
  id: string
  branch: string
  entry_date: string
  shift_number: number
  staff_id: string
  is_closed: boolean
  notes: string | null
}

type CardId = 'snacks' | 'milk' | 'assets' | 'stockLevels' | 'cashExpenses' | 'postpaid' | 'notes'

interface SectionStatus {
  snacks: boolean
  milk: boolean
  assets: boolean
  stockLevels: boolean
  cashExpenses: boolean
  postpaid: boolean
  notes: boolean
}

export default function ShiftDashboard() {
  const { t } = useTranslation()
  const { user, activeBranch } = useAuth()
  const qc = useQueryClient()

  const [expandedCard, setExpandedCard] = useState<CardId | null>(null)
  const [draftSaved, setDraftSaved] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [sectionStatus, setSectionStatus] = useState<SectionStatus>({
    snacks: false,
    milk: false,
    assets: false,
    stockLevels: false,
    cashExpenses: false,
    postpaid: false,
    notes: true,
  })

  const today = new Date().toISOString().split('T')[0]
  const branch = activeBranch || user?.branch_access[0]
  const isKR = branch === 'KR'

  // Load or create today's daily entry
  const { data: dailyEntry, isLoading } = useQuery(
    ['daily_entry', user?.id, branch, today],
    async () => {
      if (!branch || !user) return null
      const { data } = await supabase
        .from('daily_entries')
        .select('*')
        .eq('branch', branch)
        .eq('entry_date', today)
        .eq('shift_number', 1)
        .maybeSingle()
      return data as DailyEntry | null
    },
    { enabled: !!user && !!branch, retry: 2, staleTime: 30_000 }
  )

  const createEntryMutation = useMutation(
    async () => {
      if (!branch || !user) return null
      const { data, error } = await supabase
        .from('daily_entries')
        .insert({
          branch,
          entry_date: today,
          shift_number: 1,
          staff_id: user.id,
          staff_name: user.full_name,
          opened_at: new Date().toISOString(),
        })
        .select()
        .single()
      if (error) throw error
      return data as DailyEntry
    },
    { onSuccess: () => qc.invalidateQueries(['daily_entry', user?.id, branch, today]) }
  )

  // Auto-save draft every 30 seconds
  const draftKey = `shift_${branch}_${today}`
  useEffect(() => {
    const interval = setInterval(async () => {
      const draft = loadDraft(draftKey)
      if (draft) {
        setDraftSaved(true)
        setTimeout(() => setDraftSaved(false), 2000)
      }
    }, 30_000)
    return () => clearInterval(interval)
  }, [draftKey])

  // Online sync listener
  useEffect(() => {
    flushQueue().catch(() => {})
    const handler = async () => {
      await flushQueue()
    }
    window.addEventListener('online', handler)
    return () => window.removeEventListener('online', handler)
  }, [])

  const markSectionDone = useCallback((section: keyof SectionStatus, done: boolean) => {
    setSectionStatus((prev) => ({ ...prev, [section]: done }))
  }, [])

  // Stable onDone callbacks — each card gets a memoised function so that
  // inline arrow props don't create new references on every parent render,
  // which would cause an effect → setState → re-render → new prop loop.
  const onSnacksDone = useCallback(
    (done: boolean) => markSectionDone('snacks', done),
    [markSectionDone]
  )
  const onMilkDone = useCallback(
    (done: boolean) => markSectionDone('milk', done),
    [markSectionDone]
  )
  const onAssetsDone = useCallback(
    (done: boolean) => markSectionDone('assets', done),
    [markSectionDone]
  )
  const onStockLevelsDone = useCallback(
    (done: boolean) => markSectionDone('stockLevels', done),
    [markSectionDone]
  )
  const onCashExpensesDone = useCallback(
    (done: boolean) => markSectionDone('cashExpenses', done),
    [markSectionDone]
  )
  const onPostpaidDone = useCallback(
    (done: boolean) => markSectionDone('postpaid', done),
    [markSectionDone]
  )

  const allRequiredDone =
    sectionStatus.snacks &&
    sectionStatus.milk &&
    sectionStatus.assets &&
    (isKR ? sectionStatus.postpaid : true)

  const activeEntry = dailyEntry

  const handleOpenShift = async () => {
    await createEntryMutation.mutateAsync()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <p className="text-text-secondary">{t('common.loading')}</p>
      </div>
    )
  }

  // No active shift
  if (!activeEntry) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="card p-8 text-center max-w-sm">
          <div className="flex justify-center mb-4">
            <Coffee className="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            {t('shift.noActiveShift')}
          </h2>
          <p className="text-text-secondary text-sm mb-6">
            {branch ? t(`branch.${branch}`) : ''} · {today}
          </p>
          <button
            className="btn-primary w-full text-lg py-4"
            onClick={handleOpenShift}
            disabled={createEntryMutation.isLoading}
          >
            {createEntryMutation.isLoading ? t('common.loading') : t('shift.openNewShift')}
          </button>
        </div>
      </div>
    )
  }

  if (activeEntry.is_closed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="card p-8 text-center max-w-sm">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">Shift Closed</h2>
          <p className="text-text-secondary text-sm">
            {t('shift.closedAt')} {activeEntry.is_closed ? 'today' : ''}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="section-header">{t('shift.dashboard')}</h1>
          <p className="text-text-secondary text-sm mt-0.5">
            {branch ? t(`branch.${branch}`) : ''} · {today} · {user?.full_name}
          </p>
        </div>
        {draftSaved && (
          <span className="text-xs text-secondary font-medium animate-fade-in">
            {t('shift.draftSaved')}
          </span>
        )}
      </div>

      {/* Section cards */}
      <div className="space-y-3">
        {/* Snacks */}
        <SectionCard
          id="snacks"
          title={t('shift.sections.snacks')}
          done={sectionStatus.snacks}
          expanded={expandedCard === 'snacks'}
          onToggle={() => setExpandedCard(expandedCard === 'snacks' ? null : 'snacks')}
          required
        >
          <SnacksCard dailyEntryId={activeEntry.id} branch={branch!} onDone={onSnacksDone} />
        </SectionCard>

        {/* Milk Details */}
        <SectionCard
          id="milk"
          title={t('shift.sections.milk')}
          done={sectionStatus.milk}
          expanded={expandedCard === 'milk'}
          onToggle={() => setExpandedCard(expandedCard === 'milk' ? null : 'milk')}
          required
        >
          <MilkCard
            dailyEntryId={activeEntry.id}
            branch={branch!}
            entryDate={today}
            onDone={onMilkDone}
          />
        </SectionCard>

        {/* Assets */}
        <SectionCard
          id="assets"
          title={t('shift.sections.assets')}
          done={sectionStatus.assets}
          expanded={expandedCard === 'assets'}
          onToggle={() => setExpandedCard(expandedCard === 'assets' ? null : 'assets')}
          required
        >
          <AssetsCard dailyEntryId={activeEntry.id} onDone={onAssetsDone} />
        </SectionCard>

        {/* Stock Levels — once per day, not required for shift close */}
        <SectionCard
          id="stockLevels"
          title="Stock Levels"
          done={sectionStatus.stockLevels}
          expanded={expandedCard === 'stockLevels'}
          onToggle={() => setExpandedCard(expandedCard === 'stockLevels' ? null : 'stockLevels')}
          optional
        >
          <StockLevelsCard branch={branch!} entryDate={today} onDone={onStockLevelsDone} />
        </SectionCard>

        {/* Cash Expenses — once per day, not required for shift close */}
        <SectionCard
          id="cashExpenses"
          title="Cash Expenses"
          done={sectionStatus.cashExpenses}
          expanded={expandedCard === 'cashExpenses'}
          onToggle={() => setExpandedCard(expandedCard === 'cashExpenses' ? null : 'cashExpenses')}
          optional
        >
          <CashExpensesCard branch={branch!} entryDate={today} onDone={onCashExpensesDone} />
        </SectionCard>

        {/* Post-Paid — KR only */}
        {isKR && (
          <SectionCard
            id="postpaid"
            title={t('shift.sections.postpaid')}
            done={sectionStatus.postpaid}
            expanded={expandedCard === 'postpaid'}
            onToggle={() => setExpandedCard(expandedCard === 'postpaid' ? null : 'postpaid')}
            required
          >
            <PostPaidCard dailyEntryId={activeEntry.id} onDone={onPostpaidDone} />
          </SectionCard>
        )}

        {/* Notes — optional */}
        <SectionCard
          id="notes"
          title={t('shift.sections.notes')}
          done={false}
          expanded={expandedCard === 'notes'}
          onToggle={() => setExpandedCard(expandedCard === 'notes' ? null : 'notes')}
          optional
        >
          <NotesCard dailyEntryId={activeEntry.id} initialNotes={activeEntry.notes || ''} />
        </SectionCard>
      </div>

      {/* Close Shift button */}
      <div className="mt-6 pb-8">
        <button
          className={`w-full py-4 rounded-lg text-lg font-semibold transition-all ${
            allRequiredDone ? 'btn-primary' : 'bg-gray-100 text-text-secondary cursor-not-allowed'
          }`}
          disabled={!allRequiredDone}
          onClick={() => setShowCloseModal(true)}
        >
          {t('shift.close')}
        </button>
        {!allRequiredDone && (
          <p className="text-center text-xs text-text-secondary mt-2">
            Complete all required sections to close shift
          </p>
        )}
      </div>

      {/* Shift close modal */}
      {showCloseModal && (
        <ShiftCloseModal
          dailyEntry={activeEntry}
          branch={branch!}
          onClose={() => setShowCloseModal(false)}
          onConfirmed={() => {
            setShowCloseModal(false)
            qc.invalidateQueries(['daily_entry', user?.id, branch, today])
          }}
        />
      )}
    </div>
  )
}

interface SectionCardProps {
  id: CardId
  title: string
  done: boolean
  expanded: boolean
  onToggle: () => void
  required?: boolean
  optional?: boolean
  children: React.ReactNode
}

function SectionCard({ title, done, expanded, onToggle, optional, children }: SectionCardProps) {
  const { t } = useTranslation()
  return (
    <div className="card overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 min-h-tap text-left"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <span className="font-medium text-text-primary">{title}</span>
          {optional && (
            <span className="text-xs text-text-secondary">({t('common.optional')})</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {done ? (
            <span className="flex items-center gap-1.5 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-medium">{t('shift.status.done')}</span>
            </span>
          ) : optional ? (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Circle className="h-4 w-4" />
              <span className="text-sm font-medium">{t('shift.status.optional')}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">{t('shift.status.pending')}</span>
            </span>
          )}
          <ChevronDown
            className={`w-5 h-5 text-text-secondary transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {expanded && <div className="border-t border-border">{children}</div>}
    </div>
  )
}

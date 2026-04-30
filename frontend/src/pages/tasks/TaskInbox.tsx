import React, { useState } from 'react'
import { CheckSquare, Clock, Plus, AlertTriangle } from 'lucide-react'
import PageContainer from '@/components/layouts/PageContainer'
import PageHeader from '@/components/layouts/PageHeader'
import SectionCard from '@/components/ui/SectionCard'
import KPICard from '@/components/ui/KPICard'
import StatusBadge from '@/components/ui/StatusBadge'
import EmptyState from '@/components/ui/EmptyState'
import { CardGridSkeleton } from '@/components/ui/LoadingSkeletons'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/AuthContext'
import {
  useTasks,
  useCreateTask,
  useUpdateTaskStatus,
  useEmployeesForAssignment,
} from '@/hooks/useTasks'
import type { Task, CreateTaskPayload, TaskPriority, FrequencyType } from '@/types/phase10'
import { isOverdue, fmtTaskDate, PRIORITY_LABELS } from '@/types/phase10'
import { useToast } from '@/hooks/use-toast'

// ─── Shared styles ─────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--gray-600)',
  marginBottom: 4,
  fontFamily: 'var(--font-body)',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 'var(--radius-md)',
  border: 'var(--border-default)',
  fontSize: 13,
  fontFamily: 'var(--font-body)',
  color: 'var(--gray-800)',
  background: 'white',
  boxSizing: 'border-box',
}

function priorityStatus(p: TaskPriority): 'danger' | 'warning' | 'inactive' {
  if (p === 'high') return 'danger'
  if (p === 'normal') return 'warning'
  return 'inactive'
}

function taskStatusProps(s: string): {
  status: 'success' | 'warning' | 'inactive' | 'info'
  label: string
} {
  if (s === 'done') return { status: 'success', label: 'Done' }
  if (s === 'in_progress') return { status: 'info', label: 'In Progress' }
  return { status: 'inactive', label: 'Pending' }
}

// ─── Task card (shared) ───────────────────────────────────────────────────────

function TaskCard({
  task,
  showAssignee,
  canChangeStatus,
}: {
  task: Task
  showAssignee?: boolean
  canChangeStatus: boolean
}) {
  const { user } = useAuth()
  const updateStatus = useUpdateTaskStatus(user)
  const [markingDone, setMarkingDone] = useState(false)
  const [attachUrl, setAttachUrl] = useState('')
  const { toast } = useToast()
  const overdue = isOverdue(task)

  const handleMark = async (status: 'in_progress' | 'done') => {
    try {
      await updateStatus.mutateAsync({
        id: task.id,
        status,
        attachment_url: status === 'done' && attachUrl ? attachUrl : undefined,
      })
      toast({ title: status === 'done' ? 'Task marked done' : 'Task in progress' })
      setMarkingDone(false)
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed',
        variant: 'destructive',
      })
    }
  }

  return (
    <div
      data-testid={`task-card-${task.id}`}
      style={{
        border: 'var(--border-default)',
        borderLeft: overdue ? '4px solid var(--color-danger)' : undefined,
        borderRadius: 'var(--radius-lg)',
        padding: '14px 16px',
        background: 'white',
        marginBottom: 8,
      }}
    >
      {/* Title row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 8,
          marginBottom: 6,
        }}
      >
        <div style={{ flex: 1 }}>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              fontSize: 14,
              color: 'var(--gray-900)',
              margin: 0,
            }}
          >
            {overdue && (
              <AlertTriangle
                size={13}
                style={{ color: 'var(--color-danger)', marginRight: 4, verticalAlign: 'middle' }}
              />
            )}
            {task.title}
          </p>
          {task.description && (
            <p style={{ fontSize: 12, color: 'var(--gray-500)', margin: '2px 0 0' }}>
              {task.description}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <StatusBadge
            status={priorityStatus(task.priority)}
            label={PRIORITY_LABELS[task.priority]}
            size="sm"
          />
          <StatusBadge
            status={taskStatusProps(task.status).status}
            label={taskStatusProps(task.status).label}
            size="sm"
          />
        </div>
      </div>

      {/* Meta */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          fontSize: 12,
          color: 'var(--gray-500)',
          marginBottom: 8,
        }}
      >
        {task.due_date && (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              color: overdue ? 'var(--color-danger)' : undefined,
            }}
          >
            <Clock size={12} />
            Due: {fmtTaskDate(task.due_date)}
          </span>
        )}
        {task.branch && (
          <span>Branch: {task.branch === 'KR' ? 'Kaappi Ready' : 'Coffee Mate C2'}</span>
        )}
        {showAssignee && task.assigned_to_emp && <span>→ {task.assigned_to_emp.full_name}</span>}
        {task.assigned_by_emp && <span>By: {task.assigned_by_emp.full_name}</span>}
      </div>

      {/* Actions */}
      {canChangeStatus && task.status !== 'done' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {task.status !== 'in_progress' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleMark('in_progress')}
              disabled={updateStatus.isLoading}
              data-testid={`mark-inprogress-${task.id}`}
            >
              Mark In Progress
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => setMarkingDone((v) => !v)}
            disabled={updateStatus.isLoading}
            data-testid={`mark-done-${task.id}`}
          >
            <CheckSquare size={13} className="mr-1" />
            Mark Done
          </Button>
        </div>
      )}

      {/* Mark done: optional photo */}
      {markingDone && (
        <div
          style={{
            marginTop: 10,
            padding: 10,
            background: 'var(--gray-50)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <label style={labelStyle}>Attachment URL (optional)</label>
          <input
            value={attachUrl}
            onChange={(e) => setAttachUrl(e.target.value)}
            placeholder="Photo URL or leave empty"
            style={inputStyle}
            data-testid={`attach-input-${task.id}`}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Button size="sm" onClick={() => handleMark('done')} disabled={updateStatus.isLoading}>
              Confirm Done
            </Button>
            <Button size="sm" variant="outline" onClick={() => setMarkingDone(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Create task drawer ───────────────────────────────────────────────────────

function CreateTaskDrawer({
  open,
  onClose,
  canAssignSelf,
  excludeSelf,
}: {
  open: boolean
  onClose: () => void
  canAssignSelf: boolean
  excludeSelf?: string
}) {
  const { user } = useAuth()
  const createTask = useCreateTask(user)
  const { data: employees = [] } = useEmployeesForAssignment(!!user)
  const { toast } = useToast()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [branch, setBranch] = useState<'KR' | 'C2' | ''>('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('normal')
  const [isRecurring, setIsRecurring] = useState(false)
  const [frequency, setFrequency] = useState<FrequencyType>('weekly')
  const [customDays, setCustomDays] = useState('7')

  const filteredEmployees = employees.filter((e) => {
    if (!canAssignSelf && e.id === excludeSelf) return false
    return true
  })

  const handleCreate = async () => {
    if (!title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' })
      return
    }
    try {
      const payload: CreateTaskPayload = {
        title: title.trim(),
        description: description || undefined,
        assigned_to: assignedTo || null,
        branch: (branch as 'KR' | 'C2') || null,
        due_date: dueDate || null,
        priority,
        is_recurring: isRecurring,
        frequency: isRecurring ? frequency : undefined,
        custom_days: isRecurring && frequency === 'custom' ? Number(customDays) : undefined,
      }
      await createTask.mutateAsync(payload)
      toast({ title: 'Task created' })
      onClose()
      // Reset
      setTitle('')
      setDescription('')
      setAssignedTo('')
      setBranch('')
      setDueDate('')
      setPriority('normal')
      setIsRecurring(false)
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed',
        variant: 'destructive',
      })
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        style={{ width: 'min(480px, 95vw)', overflowY: 'auto', padding: '24px' }}
        data-testid="create-task-drawer"
      >
        <SheetHeader>
          <SheetTitle style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>
            New Task
          </SheetTitle>
        </SheetHeader>

        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Title */}
          <div>
            <label style={labelStyle}>Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={inputStyle}
              placeholder="Task title"
              data-testid="task-title-input"
            />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional details"
            />
          </div>

          {/* Assign To */}
          <div>
            <label style={labelStyle}>Assign To</label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              style={inputStyle}
              data-testid="assign-to-select"
            >
              <option value="">Unassigned</option>
              {filteredEmployees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.full_name} ({e.role})
                </option>
              ))}
            </select>
          </div>

          {/* Branch */}
          <div>
            <label style={labelStyle}>Branch</label>
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value as 'KR' | 'C2' | '')}
              style={inputStyle}
              data-testid="branch-select"
            >
              <option value="">Both / No specific branch</option>
              <option value="KR">Kaappi Ready (KR)</option>
              <option value="C2">Coffee Mate C2</option>
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label style={labelStyle}>Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={inputStyle}
              data-testid="due-date-input"
            />
          </div>

          {/* Priority */}
          <div>
            <label style={labelStyle}>Priority</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['low', 'normal', 'high'] as TaskPriority[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: 'var(--border-default)',
                    background: priority === p ? 'var(--brand-primary)' : 'transparent',
                    color: priority === p ? '#fff' : 'var(--gray-700)',
                    fontWeight: 500,
                    fontSize: 13,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                  data-testid={`priority-${p}`}
                >
                  {PRIORITY_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Recurring toggle */}
          <div>
            <label
              style={{
                ...labelStyle,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                data-testid="recurring-toggle"
              />
              Recurring Task
            </label>

            {isRecurring && (
              <div
                style={{
                  marginTop: 8,
                  padding: 12,
                  background: 'var(--gray-50)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
                data-testid="frequency-selector"
              >
                <label style={labelStyle}>Frequency</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as FrequencyType)}
                  style={inputStyle}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom (days)</option>
                </select>
                {frequency === 'custom' && (
                  <input
                    type="number"
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)}
                    min={1}
                    style={inputStyle}
                    placeholder="Number of days"
                  />
                )}
              </div>
            )}
          </div>

          <Button
            onClick={handleCreate}
            disabled={createTask.isLoading}
            className="mt-2"
            data-testid="create-task-submit"
          >
            {createTask.isLoading ? 'Creating…' : 'Create Task'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Role views ───────────────────────────────────────────────────────────────

function StaffTaskView() {
  const { user } = useAuth()
  const { data: tasks = [], isLoading } = useTasks(user)

  return (
    <SectionCard title="My Tasks" data-testid="staff-task-view">
      {isLoading ? (
        <CardGridSkeleton />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks assigned"
          description="You have no pending tasks right now."
        />
      ) : (
        tasks.map((t) => <TaskCard key={t.id} task={t} canChangeStatus={true} />)
      )}
    </SectionCard>
  )
}

function SupervisorTaskView() {
  const { user } = useAuth()
  const { data: tasks = [], isLoading } = useTasks(user)
  const [createOpen, setCreateOpen] = useState(false)

  const myTasks = tasks.filter((t) => t.assigned_to === user?.id)
  const staffTasks = tasks.filter((t) => t.assigned_to !== user?.id)

  // Filter controls
  const [branchFilter, setBranchFilter] = useState<'all' | 'KR' | 'C2'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'done'>(
    'all'
  )

  const applyFilters = (list: Task[]) =>
    list
      .filter((t) => branchFilter === 'all' || t.branch === branchFilter)
      .filter((t) => statusFilter === 'all' || t.status === statusFilter)

  return (
    <>
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        {/* Branch filter */}
        {(['all', 'KR', 'C2'] as const).map((b) => (
          <button
            key={b}
            onClick={() => setBranchFilter(b)}
            style={{
              padding: '5px 14px',
              borderRadius: 'var(--radius-md)',
              border: 'var(--border-default)',
              background: branchFilter === b ? 'var(--brand-primary)' : 'transparent',
              color: branchFilter === b ? '#fff' : 'var(--gray-700)',
              fontWeight: 500,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {b === 'all' ? 'All Branches' : b}
          </button>
        ))}

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          style={{
            padding: '6px 10px',
            borderRadius: 'var(--radius-md)',
            border: 'var(--border-default)',
            fontSize: 13,
            background: 'white',
          }}
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>

        <Button size="sm" onClick={() => setCreateOpen(true)} data-testid="new-task-btn">
          <Plus size={14} className="mr-1" />
          New Task
        </Button>
      </div>

      {isLoading ? (
        <CardGridSkeleton />
      ) : (
        <>
          {myTasks.length > 0 && (
            <SectionCard title="My Tasks" className="mb-4">
              {applyFilters(myTasks).map((t) => (
                <TaskCard key={t.id} task={t} canChangeStatus={true} />
              ))}
            </SectionCard>
          )}
          <SectionCard title="Staff Tasks" data-testid="supervisor-staff-tasks">
            {applyFilters(staffTasks).length === 0 ? (
              <EmptyState
                icon={CheckSquare}
                title="No staff tasks"
                description="No tasks matching current filters."
              />
            ) : (
              applyFilters(staffTasks).map((t) => (
                <TaskCard key={t.id} task={t} showAssignee canChangeStatus={false} />
              ))
            )}
          </SectionCard>
        </>
      )}

      <CreateTaskDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        canAssignSelf={false}
        excludeSelf={user?.id}
      />
    </>
  )
}

function OwnerTaskBoard() {
  const { user } = useAuth()
  const { data: tasks = [], isLoading } = useTasks(user)
  const [createOpen, setCreateOpen] = useState(false)

  // KPI metrics
  const totalPending = tasks.filter((t) => t.status === 'pending').length
  const overdue = tasks.filter((t) => isOverdue(t)).length
  const doneThisWeek = (() => {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return tasks.filter((t) => t.status === 'done' && t.updated_at >= weekAgo.toISOString()).length
  })()
  const highPriority = tasks.filter((t) => t.priority === 'high' && t.status !== 'done').length

  // Filters
  const [branchFilter, setBranchFilter] = useState<'all' | 'KR' | 'C2'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'done'>(
    'all'
  )
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'normal' | 'high'>('all')
  const [personFilter, setPersonFilter] = useState('')
  const { data: employees = [] } = useEmployeesForAssignment(!!user)

  const filtered = tasks
    .filter((t) => branchFilter === 'all' || t.branch === branchFilter)
    .filter((t) => statusFilter === 'all' || t.status === statusFilter)
    .filter((t) => priorityFilter === 'all' || t.priority === priorityFilter)
    .filter((t) => !personFilter || t.assigned_to === personFilter)

  return (
    <>
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4" data-testid="owner-kpi-row">
        <KPICard title="Total Pending" value={String(totalPending)} status="info" />
        <KPICard title="Overdue" value={String(overdue)} status={overdue > 0 ? 'danger' : 'none'} />
        <KPICard title="Done This Week" value={String(doneThisWeek)} status="success" />
        <KPICard
          title="High Priority"
          value={String(highPriority)}
          status={highPriority > 0 ? 'warning' : 'none'}
        />
      </div>

      {/* Filter row */}
      <SectionCard className="mb-4">
        <div className="flex flex-wrap gap-2 items-center">
          {(['all', 'KR', 'C2'] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBranchFilter(b)}
              data-testid={`branch-filter-${b}`}
              style={{
                padding: '5px 12px',
                borderRadius: 'var(--radius-md)',
                border: 'var(--border-default)',
                background: branchFilter === b ? 'var(--brand-primary)' : 'transparent',
                color: branchFilter === b ? '#fff' : 'var(--gray-700)',
                fontWeight: 500,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {b === 'all' ? 'All Branches' : b}
            </button>
          ))}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius-md)',
              border: 'var(--border-default)',
              fontSize: 13,
              background: 'white',
            }}
            data-testid="status-filter"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as typeof priorityFilter)}
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius-md)',
              border: 'var(--border-default)',
              fontSize: 13,
              background: 'white',
            }}
            data-testid="priority-filter"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>

          <select
            value={personFilter}
            onChange={(e) => setPersonFilter(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius-md)',
              border: 'var(--border-default)',
              fontSize: 13,
              background: 'white',
            }}
            data-testid="person-filter"
          >
            <option value="">All People</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.full_name}
              </option>
            ))}
          </select>

          <Button size="sm" onClick={() => setCreateOpen(true)} data-testid="new-task-btn">
            <Plus size={14} className="mr-1" />
            New Task
          </Button>
        </div>
      </SectionCard>

      {/* Task list */}
      <SectionCard title={`Tasks (${filtered.length})`} data-testid="owner-task-list">
        {isLoading ? (
          <CardGridSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title="No tasks"
            description="No tasks match current filters."
          />
        ) : (
          filtered.map((t) => <TaskCard key={t.id} task={t} showAssignee canChangeStatus={true} />)
        )}
      </SectionCard>

      <CreateTaskDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        canAssignSelf={true}
      />
    </>
  )
}

// ─── Main page (role dispatcher) ──────────────────────────────────────────────

export default function TaskInbox() {
  const { user } = useAuth()

  const getTitle = () => {
    if (user?.role === 'owner') return 'Task Board'
    if (user?.role === 'supervisor') return 'Task Manager'
    return 'Task Inbox'
  }

  const getSubtitle = () => {
    if (user?.role === 'owner') return 'All branches · All people'
    if (user?.role === 'supervisor') return 'Your tasks + staff tasks'
    return 'Tasks assigned to you'
  }

  return (
    <PageContainer data-testid="tasks-page">
      <PageHeader title={getTitle()} subtitle={getSubtitle()} />

      {user?.role === 'owner' && <OwnerTaskBoard />}
      {user?.role === 'supervisor' && <SupervisorTaskView />}
      {user?.role === 'staff' && <StaffTaskView />}
    </PageContainer>
  )
}

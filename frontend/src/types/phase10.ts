// ─── Phase 10 — Alert Manager + Task Management types ─────────────────────────

export interface AlertRule {
  id: string
  trigger_event: string
  rule_name: string
  description: string | null
  recipient_phones: string[]
  message_template: string | null
  active: boolean
  channel: string
  created_at: string
  updated_at: string
}

export interface AlertLog {
  id: string
  trigger_event: string
  rule_id: string | null
  recipient_phone: string | null
  message_sent: string | null
  delivery_status: string
  error_message: string | null
  branch: string | null
  reference_date: string | null
  created_at: string
}

export type TaskType = 'system' | 'manual' | 'recurring'
export type TaskPriority = 'low' | 'normal' | 'high'
export type TaskStatus = 'pending' | 'in_progress' | 'done'
export type FrequencyType = 'daily' | 'weekly' | 'monthly' | 'custom'

export interface Task {
  id: string
  task_type: TaskType
  title: string
  description: string | null
  assigned_to: string | null
  assigned_by: string | null
  branch: 'KR' | 'C2' | null
  due_date: string | null
  priority: TaskPriority
  status: TaskStatus
  attachment_url: string | null
  overdue_alerted_at: string | null
  created_at: string
  updated_at: string
  assigned_to_emp?: { full_name: string; phone: string } | null
  assigned_by_emp?: { full_name: string } | null
}

export interface TaskRecurrence {
  id: string
  task_template_id: string
  frequency: FrequencyType
  custom_days: number | null
  last_generated_at: string | null
  next_due_date: string | null
  active: boolean
}

export interface CreateTaskPayload {
  title: string
  description?: string
  assigned_to?: string | null
  branch: 'KR' | 'C2' | null
  due_date?: string | null
  priority: TaskPriority
  task_type?: TaskType
  is_recurring?: boolean
  frequency?: FrequencyType
  custom_days?: number
}

export interface UpdateTaskStatusPayload {
  id: string
  status: TaskStatus
  attachment_url?: string | null
}

export interface UpdateAlertRulePayload {
  id: string
  rule_name?: string
  description?: string
  recipient_phones?: string[]
  message_template?: string
  active?: boolean
}

/** Format a date as DD MMM YYYY */
export function fmtTaskDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** True if the task is overdue (due_date < today and not done) */
export function isOverdue(task: Task): boolean {
  if (!task.due_date || task.status === 'done') return false
  return new Date(task.due_date) < new Date(new Date().toISOString().slice(0, 10))
}

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  done: 'Done',
}

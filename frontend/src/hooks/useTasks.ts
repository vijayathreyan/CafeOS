import { useMutation, useQueryClient } from 'react-query'
import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '../lib/supabase'
import { sendAlertForTrigger } from '../lib/alertService'
import type { Task, CreateTaskPayload, UpdateTaskStatusPayload } from '../types/phase10'
import type { AppUser } from '../lib/supabase'

// ─── Task queries ─────────────────────────────────────────────────────────────

const TASK_SELECT =
  'id, task_type, title, description, assigned_to, assigned_by, branch, due_date, priority, status, attachment_url, overdue_alerted_at, created_at, updated_at, assigned_to_emp:assigned_to(full_name, phone), assigned_by_emp:assigned_by(full_name)'

/**
 * Fetch tasks visible to the current user based on role.
 * - staff: only tasks assigned to them
 * - supervisor: own tasks + staff tasks for their branch(es)
 * - owner: all tasks
 */
export function useTasks(user: AppUser | null) {
  return useSupabaseQuery<Task[]>(
    ['tasks', user?.id, user?.role],
    async () => {
      if (!user) return []
      let q = supabase
        .from('tasks')
        .select(TASK_SELECT)
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })

      if (user.role === 'staff') {
        q = q.eq('assigned_to', user.id)
      } else if (user.role === 'supervisor') {
        // Own tasks + staff tasks in their branches
        const branches = user.branch_access ?? []
        if (branches.length > 0) {
          q = q.or(`assigned_to.eq.${user.id},branch.in.(${branches.join(',')})`)
        } else {
          q = q.eq('assigned_to', user.id)
        }
      }
      // Owner: no filter — see all

      const { data, error } = await q
      if (error) throw new Error(error.message)
      return (data ?? []) as unknown as Task[]
    },
    { enabled: !!user, retry: 2, staleTime: 30000 }
  )
}

/**
 * Count of pending/in-progress tasks assigned to the current user (for badge).
 */
export function useMyTaskCount(userId: string | undefined) {
  return useSupabaseQuery<number>(
    ['tasks_count', userId],
    async () => {
      if (!userId) return 0
      const { count } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_to', userId)
        .in('status', ['pending', 'in_progress'])
      return count ?? 0
    },
    { enabled: !!userId, retry: 2, staleTime: 60000 }
  )
}

/**
 * Fetch all active employees for the task assignment dropdown.
 */
export function useEmployeesForAssignment(session: boolean) {
  return useSupabaseQuery<
    { id: string; full_name: string; role: string; branch_access: string[] }[]
  >(
    'employees_for_assignment',
    async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, role, branch_access')
        .eq('active', true)
        .is('deleted_at', null)
        .order('full_name', { ascending: true })
      if (error) throw new Error(error.message)
      return data ?? []
    },
    { enabled: !!session, retry: 2, staleTime: 60000 }
  )
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Create a new task. If recurring is enabled, also inserts task_recurrences row.
 * Fires task_assigned alert for the assignee.
 */
export function useCreateTask(user: AppUser | null) {
  const qc = useQueryClient()
  return useMutation(
    async (payload: CreateTaskPayload) => {
      const { data: task, error } = await supabase
        .from('tasks')
        .insert({
          task_type: payload.task_type ?? (payload.is_recurring ? 'recurring' : 'manual'),
          title: payload.title,
          description: payload.description ?? null,
          assigned_to: payload.assigned_to ?? null,
          assigned_by: user?.id ?? null,
          branch: payload.branch,
          due_date: payload.due_date ?? null,
          priority: payload.priority,
          status: 'pending',
        })
        .select('id')
        .single()

      if (error) throw new Error(error.message)

      if (payload.is_recurring && task?.id && payload.frequency) {
        const nextDue = new Date()
        if (payload.due_date) {
          nextDue.setTime(new Date(payload.due_date).getTime())
        }
        await supabase.from('task_recurrences').insert({
          task_template_id: task.id,
          frequency: payload.frequency,
          custom_days: payload.custom_days ?? null,
          next_due_date: payload.due_date ?? nextDue.toISOString().slice(0, 10),
          active: true,
        })
      }

      // Fire alert if assignee present
      if (payload.assigned_to) {
        const { data: emp } = await supabase
          .from('employees')
          .select('phone')
          .eq('id', payload.assigned_to)
          .single()
        if (emp?.phone) {
          await sendAlertForTrigger('task_assigned', {
            item_name: payload.title,
            date: payload.due_date ?? new Date().toISOString().slice(0, 10),
            staff_name: '',
          })
        }
      }

      return task
    },
    {
      onSuccess: () => {
        qc.invalidateQueries('tasks')
        qc.invalidateQueries(['tasks', user?.id, user?.role])
        qc.invalidateQueries(['tasks_count', user?.id])
      },
    }
  )
}

/**
 * Update task status. Optionally attach a photo URL (for mark-done flow).
 * Fires task_completed alert when status changes to 'done'.
 */
export function useUpdateTaskStatus(user: AppUser | null) {
  const qc = useQueryClient()
  return useMutation(
    async (payload: UpdateTaskStatusPayload) => {
      const updates: Record<string, unknown> = {
        status: payload.status,
        updated_at: new Date().toISOString(),
      }
      if (payload.attachment_url !== undefined) {
        updates.attachment_url = payload.attachment_url
      }

      const { error } = await supabase.from('tasks').update(updates).eq('id', payload.id)
      if (error) throw new Error(error.message)

      if (payload.status === 'done') {
        const today = new Date().toISOString().slice(0, 10)
        await sendAlertForTrigger('task_completed', {
          item_name: payload.id, // Will be replaced by caller with actual title
          date: today,
          staff_name: user?.full_name ?? '',
        })
      }
    },
    {
      onSuccess: () => {
        qc.invalidateQueries('tasks')
        qc.invalidateQueries(['tasks', user?.id, user?.role])
        qc.invalidateQueries(['tasks_count', user?.id])
      },
    }
  )
}

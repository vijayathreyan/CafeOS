import React from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from 'react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import StatusChip from '../../components/StatusChip'

export default function TaskInbox() {
  const { t } = useTranslation()
  const { user } = useAuth()

  const { data: tasks = [], isLoading } = useQuery('tasks', async () => {
    if (!user) return []
    let q = supabase.from('tasks').select('*, assigned_by_emp:assigned_by(full_name), assigned_to_emp:assigned_to(full_name)')
      .order('due_date', { ascending: true })

    if (user.role === 'staff') {
      q = q.eq('assigned_to', user.id)
    } else if (user.role === 'supervisor') {
      // Supervisor sees own tasks + staff tasks for their branches
    }
    const { data } = await q
    return data || []
  })

  const getChipVariant = (status: string, dueDate: string | null) => {
    if (status === 'done') return 'done' as const
    if (dueDate && new Date(dueDate) < new Date()) return 'error' as const
    if (status === 'in_progress') return 'pending' as const
    return 'grey' as const
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="section-header mb-6">{t('nav.tasks')}</h1>

      {isLoading ? (
        <div className="text-center py-12 text-text-secondary">{t('common.loading')}</div>
      ) : tasks.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-text-secondary">No tasks assigned</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task: any) => (
            <div key={task.id} className={`card p-4 ${task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done' ? 'border-error/30' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-medium text-text-primary">{task.title}</h3>
                  {task.description && <p className="text-text-secondary text-sm mt-1">{task.description}</p>}
                  <div className="flex flex-wrap gap-2 mt-2 text-xs text-text-secondary">
                    {task.due_date && <span>Due: {new Date(task.due_date).toLocaleDateString('en-IN')}</span>}
                    {task.assigned_by_emp?.full_name && <span>From: {task.assigned_by_emp.full_name}</span>}
                    {task.branch && <span>{t(`branch.${task.branch}`)}</span>}
                  </div>
                </div>
                <StatusChip variant={getChipVariant(task.status, task.due_date)} label={task.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

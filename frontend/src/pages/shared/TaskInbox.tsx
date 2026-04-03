import React from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from 'react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import StatusChip from '../../components/StatusChip'
import { CheckCircle2 } from 'lucide-react'

interface Task {
  id: string
  title: string
  description?: string | null
  status: string
  due_date?: string | null
  branch?: string | null
  assigned_by_emp?: { full_name: string } | null
  assigned_to_emp?: { full_name: string } | null
}

export default function TaskInbox() {
  const { t } = useTranslation()
  const { user, loading: authLoading } = useAuth()

  const { data: tasks = [], isLoading } = useQuery(
    ['tasks', user?.id],
    async () => {
      if (!user) return []
      let q = supabase
        .from('tasks')
        .select('*, assigned_by_emp:assigned_by(full_name), assigned_to_emp:assigned_to(full_name)')
        .order('due_date', { ascending: true })

      if (user.role === 'staff') {
        q = q.eq('assigned_to', user.id)
      }
      const { data } = await q
      return data || []
    },
    { enabled: !!user, retry: 2, staleTime: 30_000 }
  )

  const getChipVariant = (status: string, dueDate: string | null | undefined) => {
    if (status === 'done') return 'done' as const
    if (dueDate && new Date(dueDate) < new Date()) return 'error' as const
    if (status === 'in_progress') return 'pending' as const
    return 'grey' as const
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-foreground mb-6">{t('nav.tasks')}</h1>

      {authLoading || isLoading ? (
        <div className="text-center py-12 text-muted-foreground">{t('common.loading')}</div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" strokeWidth={1.5} />
          <h3 className="text-lg font-medium text-foreground mb-1">All caught up!</h3>
          <p className="text-sm text-muted-foreground">No tasks assigned to you right now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task: Task) => (
            <Card
              key={task.id}
              className={
                task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'
                  ? 'border-destructive/30'
                  : ''
              }
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">{task.title}</h3>
                    {task.description && (
                      <p className="text-muted-foreground text-sm mt-1">{task.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
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
                    variant={getChipVariant(task.status, task.due_date)}
                    label={task.status}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

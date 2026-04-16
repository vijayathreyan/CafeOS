import React from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from 'react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { CheckCircle2 } from 'lucide-react'
import PageContainer from '@/components/layouts/PageContainer'
import PageHeader from '@/components/layouts/PageHeader'
import SectionCard from '@/components/ui/SectionCard'
import StatusBadge from '@/components/ui/StatusBadge'
import EmptyState from '@/components/ui/EmptyState'

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

  return (
    <PageContainer>
      <PageHeader title={t('nav.tasks')} subtitle="Your assigned tasks" />

      {authLoading || isLoading ? (
        <div
          style={{ textAlign: 'center', padding: 'var(--space-12) 0', color: 'var(--gray-500)' }}
        >
          {t('common.loading')}
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="All caught up!"
          description="No tasks assigned to you right now."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {tasks.map((task: Task) => {
            const isOverdue =
              task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'
            return (
              <SectionCard key={task.id} padding="compact" status={isOverdue ? 'danger' : 'none'}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 'var(--space-3)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3
                      style={{
                        fontWeight: 500,
                        fontSize: 'var(--text-base)',
                        color: 'var(--gray-900)',
                        margin: 0,
                      }}
                    >
                      {task.title}
                    </h3>
                    {task.description && (
                      <p
                        style={{
                          fontSize: 'var(--text-sm)',
                          color: 'var(--gray-600)',
                          marginTop: 'var(--space-1)',
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
                        marginTop: 'var(--space-2)',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--gray-500)',
                      }}
                    >
                      {task.due_date && (
                        <span>Due: {new Date(task.due_date).toLocaleDateString('en-IN')}</span>
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
              </SectionCard>
            )
          })}
        </div>
      )}
    </PageContainer>
  )
}

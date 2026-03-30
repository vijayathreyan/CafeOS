import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { supabase, AppUser } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import StatusChip from '../../components/StatusChip'
import { useConfirm, showToast } from '@/lib/dialogs'

type AppUserExt = AppUser & { deleted_at?: string | null }

export default function UserManagement() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { confirm, ConfirmDialog } = useConfirm()
  const { user } = useAuth()
  const [filterRole, setFilterRole] = useState<string>('all')
  const [filterBranch, setFilterBranch] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [showDeleted, setShowDeleted] = useState(false)

  // Bug 7: on mount, soft-delete ghost records (deactivated employees with no auth account).
  useEffect(() => {
    const cleanupGhosts = async () => {
      await supabase
        .from('employees')
        .update({ deleted_at: new Date().toISOString() })
        .is('auth_user_id', null)
        .eq('active', false)
        .is('deleted_at', null)
    }
    cleanupGhosts()
  }, [])

  const { data: employees = [], isLoading } = useQuery(
    ['employees', user?.id, showDeleted],
    async () => {
      let q = supabase.from('employees').select('*').order('employee_id')
      if (showDeleted) {
        q = q.not('deleted_at', 'is', null)
      } else {
        q = q.is('deleted_at', null)
      }
      const { data } = await q
      return (data || []) as AppUserExt[]
    },
    { enabled: !!user, retry: 2, staleTime: 30_000 }
  )

  const deactivateMutation = useMutation(
    async (id: string) => {
      await supabase.from('employees').update({ active: false }).eq('id', id)
    },
    {
      onSuccess: () => { qc.invalidateQueries('employees'); showToast('Employee deactivated', 'info') },
      onError: () => showToast('Failed to deactivate employee', 'error'),
    }
  )

  const reactivateMutation = useMutation(
    async (id: string) => {
      await supabase.from('employees').update({ active: true }).eq('id', id)
    },
    {
      onSuccess: () => { qc.invalidateQueries('employees'); showToast('Employee reactivated', 'success') },
      onError: () => showToast('Failed to reactivate employee', 'error'),
    }
  )

  const deleteMutation = useMutation(
    async (id: string) => {
      const { error } = await supabase.from('employees').update({ deleted_at: new Date().toISOString() }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    {
      onSuccess: () => { qc.invalidateQueries('employees'); showToast('Employee deleted', 'info') },
      onError: (e: any) => showToast(e.message || 'Failed to delete employee', 'error'),
    }
  )

  const restoreMutation = useMutation(
    async (id: string) => {
      await supabase.from('employees').update({ deleted_at: null, active: true }).eq('id', id)
    },
    {
      onSuccess: () => { qc.invalidateQueries('employees'); showToast('Employee restored', 'success') },
      onError: () => showToast('Failed to restore employee', 'error'),
    }
  )

  const filtered = employees.filter(e => {
    if (filterRole !== 'all' && e.role !== filterRole) return false
    if (filterBranch !== 'all' && !e.branch_access.includes(filterBranch as any)) return false
    if (search && !e.full_name.toLowerCase().includes(search.toLowerCase()) &&
        !e.phone.includes(search) && !e.employee_id.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-foreground">{t('employees.title')}</h1>
        <Button onClick={() => navigate('/users/new')}>
          + {t('employees.add')}
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="p-4 flex flex-wrap gap-3">
          <Input
            className="flex-1 min-w-40"
            placeholder={t('common.search')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-ring"
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
          >
            <option value="all">{t('common.all')} Roles</option>
            <option value="staff">{t('employees.roles.staff')}</option>
            <option value="supervisor">{t('employees.roles.supervisor')}</option>
            <option value="owner">{t('employees.roles.owner')}</option>
          </select>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-ring"
            value={filterBranch}
            onChange={e => setFilterBranch(e.target.value)}
          >
            <option value="all">{t('common.all')} Branches</option>
            <option value="KR">{t('branch.KR')}</option>
            <option value="C2">{t('branch.C2')}</option>
          </select>
        </CardContent>
      </Card>

      {/* View toggle */}
      <div className="flex items-center gap-3 mb-4">
        <Button
          variant={!showDeleted ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowDeleted(false)}
        >
          Active Employees
        </Button>
        <Button
          variant={showDeleted ? 'destructive' : 'outline'}
          size="sm"
          onClick={() => setShowDeleted(true)}
        >
          View Deleted Employees
        </Button>
      </div>

      {/* Employee list */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">{t('common.loading')}</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(emp => (
            <Card
              key={emp.id}
              className={`${!emp.active || emp.deleted_at ? 'opacity-60' : ''}`}
            >
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-lg">
                      {emp.full_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{emp.full_name}</span>
                      <span className="text-xs text-muted-foreground">{emp.employee_id}</span>
                      {!emp.active && !emp.deleted_at && <StatusChip variant="grey" label="Inactive" />}
                      {emp.deleted_at && <StatusChip variant="error" label="Deleted" />}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      <span className="text-sm text-muted-foreground">{emp.phone}</span>
                      <Badge variant="secondary" className="capitalize">{emp.role}</Badge>
                      {emp.branch_access.map(b => (
                        <Badge key={b} variant="outline" className="text-primary border-primary/30">
                          {t(`branch.${b}`)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                  {!emp.deleted_at ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/users/${emp.id}/edit`)}
                      >
                        {t('common.edit')}
                      </Button>
                      {emp.active ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-yellow-600 hover:text-yellow-700"
                          onClick={async () => {
                            const ok = await confirm({
                              title: 'Deactivate Employee',
                              description: `Deactivate ${emp.full_name}? They will lose access to the system.`,
                              confirmLabel: 'Deactivate',
                            })
                            if (ok) deactivateMutation.mutate(emp.id)
                          }}
                        >
                          {t('employees.deactivate')}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-600 hover:text-green-700"
                          onClick={async () => {
                            const ok = await confirm({
                              title: 'Reactivate Employee',
                              description: `Reactivate ${emp.full_name}? They will regain access to the system.`,
                              confirmLabel: 'Reactivate',
                            })
                            if (ok) reactivateMutation.mutate(emp.id)
                          }}
                        >
                          {t('employees.reactivate')}
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={async () => {
                          const ok = await confirm({
                            title: 'Delete Employee',
                            description: `Delete ${emp.full_name}? Their data will be retained but hidden.`,
                            confirmLabel: 'Delete',
                            confirmVariant: 'destructive',
                          })
                          if (ok) deleteMutation.mutate(emp.id)
                        }}
                      >
                        Delete
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-green-600 hover:text-green-700"
                      onClick={async () => {
                        const ok = await confirm({
                          title: 'Restore Employee',
                          description: `Restore ${emp.full_name}? They will be reactivated and visible again.`,
                          confirmLabel: 'Restore',
                        })
                        if (ok) restoreMutation.mutate(emp.id)
                      }}
                    >
                      Restore
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              {showDeleted ? 'No deleted employees' : t('common.noData')}
            </div>
          )}
        </div>
      )}
      {ConfirmDialog}
    </div>
  )
}

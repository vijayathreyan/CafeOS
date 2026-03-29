import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { supabase, AppUser } from '../../lib/supabase'
import StatusChip from '../../components/StatusChip'

type AppUserExt = AppUser & { deleted_at?: string | null }

export default function UserManagement() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [filterRole, setFilterRole] = useState<string>('all')
  const [filterBranch, setFilterBranch] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [showDeleted, setShowDeleted] = useState(false)

  // Bug 7: on mount, soft-delete ghost records (deactivated employees with no auth account).
  // These are records left from pre-fix onboarding that never had an auth user created.
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

  // Bug 7: active list excludes deleted; deleted list shows only deleted.
  const { data: employees = [], isLoading } = useQuery(
    ['employees', showDeleted],
    async () => {
      let q = supabase.from('employees').select('*').order('employee_id')
      if (showDeleted) {
        q = q.not('deleted_at', 'is', null)
      } else {
        q = q.is('deleted_at', null)
      }
      const { data } = await q
      return (data || []) as AppUserExt[]
    }
  )

  const deactivateMutation = useMutation(
    async (id: string) => {
      await supabase.from('employees').update({ active: false }).eq('id', id)
    },
    { onSuccess: () => qc.invalidateQueries('employees') }
  )

  const reactivateMutation = useMutation(
    async (id: string) => {
      await supabase.from('employees').update({ active: true }).eq('id', id)
    },
    { onSuccess: () => qc.invalidateQueries('employees') }
  )

  // Bug 7: soft-delete sets deleted_at timestamp; record is never removed from DB.
  const deleteMutation = useMutation(
    async (id: string) => {
      await supabase.from('employees').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    },
    { onSuccess: () => qc.invalidateQueries('employees') }
  )

  // Bug 7: restore a deleted employee (clear deleted_at, reactivate).
  const restoreMutation = useMutation(
    async (id: string) => {
      await supabase.from('employees').update({ deleted_at: null, active: true }).eq('id', id)
    },
    { onSuccess: () => qc.invalidateQueries('employees') }
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
        <h1 className="section-header">{t('employees.title')}</h1>
        <button onClick={() => navigate('/users/new')} className="btn-primary">
          + {t('employees.add')}
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4 flex flex-wrap gap-3">
        <input
          className="input-field flex-1 min-w-40"
          placeholder={t('common.search')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="input-field w-36" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="all">{t('common.all')} Roles</option>
          <option value="staff">{t('employees.roles.staff')}</option>
          <option value="supervisor">{t('employees.roles.supervisor')}</option>
          <option value="owner">{t('employees.roles.owner')}</option>
        </select>
        <select className="input-field w-36" value={filterBranch} onChange={e => setFilterBranch(e.target.value)}>
          <option value="all">{t('common.all')} Branches</option>
          <option value="KR">{t('branch.KR')}</option>
          <option value="C2">{t('branch.C2')}</option>
        </select>
      </div>

      {/* Bug 7: toggle between active and deleted employee views */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setShowDeleted(false)}
          className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${!showDeleted ? 'bg-primary text-white' : 'bg-gray-100 text-text-secondary hover:bg-gray-200'}`}
        >
          Active Employees
        </button>
        <button
          onClick={() => setShowDeleted(true)}
          className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${showDeleted ? 'bg-error text-white' : 'bg-gray-100 text-text-secondary hover:bg-gray-200'}`}
        >
          View Deleted Employees
        </button>
      </div>

      {/* Employee list */}
      {isLoading ? (
        <div className="text-center py-12 text-text-secondary">{t('common.loading')}</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(emp => (
            <div
              key={emp.id}
              className={`card p-4 flex items-center justify-between gap-4 ${!emp.active || emp.deleted_at ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold text-lg">{emp.full_name.charAt(0)}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-text-primary">{emp.full_name}</span>
                    <span className="text-xs text-text-secondary">{emp.employee_id}</span>
                    {!emp.active && !emp.deleted_at && <StatusChip variant="grey" label="Inactive" />}
                    {emp.deleted_at && <StatusChip variant="error" label="Deleted" />}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mt-1">
                    <span className="text-sm text-text-secondary">{emp.phone}</span>
                    <span className="chip-grey capitalize">{emp.role}</span>
                    {emp.branch_access.map(b => (
                      <span key={b} className="text-xs bg-blue-50 text-primary px-2 py-0.5 rounded-chip font-medium">
                        {t(`branch.${b}`)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                {!emp.deleted_at ? (
                  <>
                    <button onClick={() => navigate(`/users/${emp.id}/edit`)} className="btn-secondary text-sm px-3 py-2">
                      {t('common.edit')}
                    </button>
                    {emp.active ? (
                      <button
                        onClick={() => { if (confirm(`Deactivate ${emp.full_name}?`)) deactivateMutation.mutate(emp.id) }}
                        className="btn-secondary text-sm px-3 py-2 text-warning"
                      >
                        {t('employees.deactivate')}
                      </button>
                    ) : (
                      <button
                        onClick={() => { if (confirm(`Reactivate ${emp.full_name}?`)) reactivateMutation.mutate(emp.id) }}
                        className="bg-green-600 text-white text-sm px-3 py-2 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        {t('employees.reactivate')}
                      </button>
                    )}
                    {/* Bug 7: Delete button — soft-delete, data never removed */}
                    <button
                      onClick={() => { if (confirm(`Delete ${emp.full_name}? Their data will be retained but hidden.`)) deleteMutation.mutate(emp.id) }}
                      className="btn-danger text-sm px-3 py-2"
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  /* Bug 7: restore a previously deleted employee */
                  <button
                    onClick={() => { if (confirm(`Restore ${emp.full_name}?`)) restoreMutation.mutate(emp.id) }}
                    className="bg-green-600 text-white text-sm px-3 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Restore
                  </button>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-text-secondary">
              {showDeleted ? 'No deleted employees' : t('common.noData')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

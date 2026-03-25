import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { supabase, AppUser } from '../../lib/supabase'
import StatusChip from '../../components/StatusChip'

export default function UserManagement() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [filterRole, setFilterRole] = useState<string>('all')
  const [filterBranch, setFilterBranch] = useState<string>('all')
  const [search, setSearch] = useState('')

  const { data: employees = [], isLoading } = useQuery('employees', async () => {
    const { data } = await supabase.from('employees').select('*').order('employee_id')
    return (data || []) as AppUser[]
  })

  const deactivateMutation = useMutation(
    async (id: string) => {
      await supabase.from('employees').update({ active: false }).eq('id', id)
    },
    { onSuccess: () => qc.invalidateQueries('employees') }
  )

  const resetPasswordMutation = useMutation(
    async (emp: AppUser) => {
      const tempPassword = Math.random().toString(36).slice(-8)
      const email = `${emp.phone.replace(/\D/g, '')}@cafeos.local`
      // In production: call Supabase admin API to reset password
      // For now: log the action
      console.log(`Reset password for ${emp.full_name}: ${tempPassword}`)
      // TODO: trigger WhatsApp via alert system with new credentials
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

      {/* Employee list */}
      {isLoading ? (
        <div className="text-center py-12 text-text-secondary">{t('common.loading')}</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(emp => (
            <div key={emp.id} className={`card p-4 flex items-center justify-between gap-4 ${!emp.active ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold text-lg">{emp.full_name.charAt(0)}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-text-primary">{emp.full_name}</span>
                    <span className="text-xs text-text-secondary">{emp.employee_id}</span>
                    {!emp.active && <StatusChip variant="grey" label="Inactive" />}
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
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => navigate(`/users/${emp.id}/edit`)} className="btn-secondary text-sm px-3 py-2">
                  {t('common.edit')}
                </button>
                {emp.active && (
                  <button
                    onClick={() => { if (confirm(`Deactivate ${emp.full_name}?`)) deactivateMutation.mutate(emp.id) }}
                    className="btn-danger text-sm px-3 py-2"
                  >
                    {t('employees.deactivate')}
                  </button>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-text-secondary">{t('common.noData')}</div>
          )}
        </div>
      )}
    </div>
  )
}

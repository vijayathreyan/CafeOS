import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { BranchCode } from '../lib/supabase'

export default function BranchSelect() {
  const { t } = useTranslation()
  const { user, setActiveBranch } = useAuth()
  const navigate = useNavigate()

  const handleSelect = (branch: BranchCode) => {
    setActiveBranch(branch)
    navigate('/')
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="card p-8 w-full max-w-sm text-center">
        <h2 className="text-xl font-semibold text-text-primary mb-2">{t('branch.select')}</h2>
        <p className="text-text-secondary text-sm mb-8">Welcome, {user.full_name}</p>
        <div className="space-y-3">
          {user.branch_access.map(branch => (
            <button
              key={branch}
              onClick={() => handleSelect(branch)}
              className="btn-primary w-full text-lg py-4"
            >
              {t(`branch.${branch}`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

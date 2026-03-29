import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from 'react-query'
import { useAuth } from '../contexts/AuthContext'
import { useLang } from '../contexts/LanguageContext'

export default function TopBar() {
  const { t } = useTranslation()
  const { user, activeBranch, logout } = useAuth()
  const { lang, toggleLang } = useLang()
  const navigate = useNavigate()
  const qc = useQueryClient()

  // Bug 2: clear all cached query data before logout so the next login starts clean.
  // navigate('/login') immediately — do not wait for onAuthStateChange.
  const handleLogout = async () => {
    qc.clear()
    await logout()
    navigate('/login')
  }

  const ownerNavClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      isActive ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary hover:bg-gray-100'
    }`

  return (
    <header className="bg-surface border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <span className="text-white text-sm font-bold">C</span>
        </div>
        <div>
          <span className="text-sm font-semibold text-text-primary">{t('app.name')}</span>
          {activeBranch && (
            <span className="ml-2 text-xs bg-blue-100 text-primary px-2 py-0.5 rounded-chip font-medium">
              {t(`branch.${activeBranch}`)}
            </span>
          )}
        </div>
      </div>

      {/* Bug 2/3: Owner desktop nav — Dashboard / Employees / Tasks on all pages */}
      {user?.role === 'owner' && (
        <nav className="hidden sm:flex items-center gap-1">
          <NavLink to="/" end className={ownerNavClass}>{t('nav.dashboard')}</NavLink>
          <NavLink to="/users" className={ownerNavClass}>{t('employees.title')}</NavLink>
          <NavLink to="/tasks" className={ownerNavClass}>{t('nav.tasks')}</NavLink>
        </nav>
      )}

      <div className="flex items-center gap-2">
        {/* Language toggle — only for staff/supervisor */}
        {user?.role !== 'owner' && (
          <button
            onClick={toggleLang}
            className="min-h-tap min-w-tap px-3 py-2 rounded-lg border border-border text-text-secondary text-sm font-medium hover:bg-gray-50 transition-colors"
            aria-label="Toggle language"
          >
            {lang === 'en' ? 'தமிழ்' : 'EN'}
          </button>
        )}

        {/* User chip */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-white text-xs font-semibold">
              {user?.full_name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-text-secondary hover:text-error transition-colors hidden sm:block"
          >
            {t('auth.logout')}
          </button>
        </div>
      </div>
    </header>
  )
}

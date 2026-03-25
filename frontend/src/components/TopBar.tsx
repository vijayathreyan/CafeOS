import React from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useLang } from '../contexts/LanguageContext'

export default function TopBar() {
  const { t } = useTranslation()
  const { user, activeBranch, logout } = useAuth()
  const { lang, toggleLang } = useLang()

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
            onClick={logout}
            className="text-xs text-text-secondary hover:text-error transition-colors hidden sm:block"
          >
            {t('auth.logout')}
          </button>
        </div>
      </div>
    </header>
  )
}

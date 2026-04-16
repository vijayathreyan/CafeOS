import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from 'react-query'
import { useAuth } from '../contexts/AuthContext'
import { useLang } from '../contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

export default function TopBar() {
  const { t } = useTranslation()
  const { user, activeBranch, logout } = useAuth()
  const { lang, toggleLang } = useLang()
  const navigate = useNavigate()
  const qc = useQueryClient()

  // Bug 4: always navigate to /login regardless of whether signOut succeeds.
  const handleLogout = async () => {
    qc.cancelQueries()
    qc.clear()
    try {
      await logout()
    } catch {
      localStorage.clear()
    } finally {
      navigate('/login')
    }
  }

  const ownerNavClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
    }`

  return (
    <header className="bg-background border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <span className="text-primary-foreground text-sm font-bold">C</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{t('app.name')}</span>
          {activeBranch && (
            <Badge variant="secondary" className="text-primary">
              {t(`branch.${activeBranch}`)}
            </Badge>
          )}
        </div>
      </div>

      {/* Bug 2/3: Owner desktop nav */}
      {user?.role === 'owner' && (
        <nav className="hidden sm:flex items-center gap-1">
          <NavLink to="/" end className={ownerNavClass}>
            {t('nav.dashboard')}
          </NavLink>
          <NavLink to="/users" className={ownerNavClass}>
            {t('employees.title')}
          </NavLink>
          <NavLink to="/tasks" className={ownerNavClass}>
            {t('nav.tasks')}
          </NavLink>
        </nav>
      )}

      <div className="flex items-center gap-2">
        {user?.role !== 'owner' && (
          <Button variant="outline" size="sm" onClick={toggleLang} aria-label="Toggle language">
            {lang === 'en' ? 'தமிழ்' : 'EN'}
          </Button>
        )}

        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
              {user?.full_name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="hidden sm:flex text-muted-foreground hover:text-destructive"
          >
            {t('auth.logout')}
          </Button>
        </div>
      </div>
    </header>
  )
}

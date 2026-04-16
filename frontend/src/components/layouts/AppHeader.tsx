import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from 'react-query'
import { useAuth } from '../../contexts/AuthContext'
import { useLang } from '../../contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Home, LogOut } from 'lucide-react'

function roleHomeUrl(role: string | undefined): string {
  if (role === 'supervisor') return '/supervisor-dashboard'
  if (role === 'staff') return '/staff-dashboard'
  return '/dashboard'
}

export default function AppHeader() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const { lang, toggleLang } = useLang()
  const navigate = useNavigate()
  const qc = useQueryClient()

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

  return (
    <header className="h-14 bg-background border-b border-border px-4 flex items-center justify-between sticky top-0 z-40">
      {/* Home button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(roleHomeUrl(user?.role))}
        className="gap-1.5 text-muted-foreground hover:text-foreground"
        data-testid="app-header-home"
        aria-label="Go home"
      >
        <Home className="w-4 h-4" />
        <span className="text-sm font-medium">{t('nav.dashboard')}</span>
      </Button>

      {/* Logo center */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none">
        <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
          <span className="text-primary-foreground text-xs font-bold">C</span>
        </div>
        <span className="text-sm font-semibold text-foreground">{t('app.name')}</span>
      </div>

      {/* Language toggle */}
      <Button variant="outline" size="sm" onClick={toggleLang} aria-label="Toggle language">
        {lang === 'en' ? 'தமிழ்' : 'EN'}
      </Button>

      {/* Avatar dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="p-0 rounded-full" aria-label="User menu">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {user?.full_name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-3 py-2">
            <p className="text-sm font-medium text-foreground">{user?.full_name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive gap-2">
            <LogOut className="w-4 h-4" />
            {t('auth.logout')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}

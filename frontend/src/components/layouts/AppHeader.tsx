import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from 'react-query'
import { useAuth } from '../../contexts/AuthContext'
import { useLang } from '../../contexts/LanguageContext'
import { Button } from '@/components/ui/button'
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

  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?'

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
    <header
      style={{
        height: 'var(--header-height)',
        background: '#FFFFFF',
        borderBottom: 'var(--border-default)',
        boxShadow: 'var(--shadow-xs)',
        padding: '0 var(--space-6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}
    >
      {/* ── Left: Home button ── */}
      <button
        data-testid="app-header-home"
        aria-label="Go home"
        onClick={() => navigate(roleHomeUrl(user?.role))}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '36px',
          height: '36px',
          borderRadius: 'var(--radius-md)',
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          color: 'var(--gray-600)',
          transition: 'background var(--transition-fast), color var(--transition-fast)',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.background = 'var(--gray-100)'
          el.style.color = 'var(--gray-900)'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.background = 'none'
          el.style.color = 'var(--gray-600)'
        }}
      >
        <Home size={20} />
      </button>

      {/* ── Center: Brand ── */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          pointerEvents: 'none',
        }}
      >
        <span style={{ fontSize: '18px' }}>☕</span>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--gray-900)',
          }}
        >
          {t('app.name')}
        </span>
      </div>

      {/* ── Right: Language toggle + Avatar dropdown ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        {/* Language toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleLang}
          aria-label="Toggle language"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
            height: '32px',
          }}
        >
          {lang === 'en' ? 'தமிழ்' : 'EN'}
        </Button>

        {/* Avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="User menu"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--brand-primary-subtle)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--brand-primary)',
                }}
              >
                {initials}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" style={{ width: '192px' }}>
            <div style={{ padding: '12px' }}>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--gray-900)',
                  margin: 0,
                }}
              >
                {user?.full_name}
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '12px',
                  color: 'var(--gray-500)',
                  margin: 0,
                  textTransform: 'capitalize',
                }}
              >
                {user?.role}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              style={{ color: 'var(--color-danger)', gap: '8px', cursor: 'pointer' }}
            >
              <LogOut size={16} />
              {t('auth.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

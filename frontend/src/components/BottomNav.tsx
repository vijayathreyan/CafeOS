import React from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import {
  Home,
  Users,
  ClipboardList,
  BarChart2,
  Settings,
  CheckSquare,
  Package,
  Wallet,
} from 'lucide-react'

export default function BottomNav() {
  const { t } = useTranslation()
  const { user } = useAuth()
  if (!user) return null

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center gap-1 flex-1 min-h-[48px] py-2 transition-colors ${
      isActive ? 'text-primary' : 'text-muted-foreground'
    }`

  return (
    <nav className="bg-background border-t border-border safe-bottom">
      <div className="flex items-stretch">
        <NavLink to="/" end className={navClass}>
          <Home className="w-6 h-6" />
          <span className="text-xs font-medium">{t('nav.dashboard')}</span>
        </NavLink>

        {user.role === 'staff' && (
          <NavLink to="/shift" className={navClass}>
            <ClipboardList className="w-6 h-6" />
            <span className="text-xs font-medium">{t('nav.shift')}</span>
          </NavLink>
        )}

        {user.role === 'staff' && (
          <NavLink to="/stock-entry" className={navClass}>
            <Package className="w-6 h-6" />
            <span className="text-xs font-medium">Stock</span>
          </NavLink>
        )}

        {user.role === 'staff' && (
          <NavLink to="/expense-entry" className={navClass}>
            <Wallet className="w-6 h-6" />
            <span className="text-xs font-medium">Expenses</span>
          </NavLink>
        )}

        {user.role === 'supervisor' && (
          <NavLink to="/supervisor-shift" className={navClass}>
            <ClipboardList className="w-6 h-6" />
            <span className="text-xs font-medium">{t('nav.shift')}</span>
          </NavLink>
        )}

        {user.role === 'supervisor' && (
          <NavLink to="/supervisor-entry" className={navClass}>
            <Package className="w-6 h-6" />
            <span className="text-xs font-medium">Stock & Exp</span>
          </NavLink>
        )}

        {user.role === 'owner' && (
          <NavLink to="/users" className={navClass}>
            <Users className="w-6 h-6" />
            <span className="text-xs font-medium">{t('employees.title')}</span>
          </NavLink>
        )}

        {user.role === 'owner' && (
          <NavLink to="/reports" className={navClass}>
            <BarChart2 className="w-6 h-6" />
            <span className="text-xs font-medium">{t('nav.reports')}</span>
          </NavLink>
        )}

        <NavLink to="/tasks" className={navClass}>
          <CheckSquare className="w-6 h-6" />
          <span className="text-xs font-medium">{t('nav.tasks')}</span>
        </NavLink>

        {user.role === 'owner' && (
          <NavLink to="/settings" className={navClass}>
            <Settings className="w-6 h-6" />
            <span className="text-xs font-medium">{t('nav.settings')}</span>
          </NavLink>
        )}
      </div>
    </nav>
  )
}

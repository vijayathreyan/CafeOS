import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from 'react-query'
import { useAuth } from '../../contexts/AuthContext'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  CreditCard,
  UserCheck,
  Package,
  Store,
  BarChart2,
  Settings,
  Menu,
  LogOut,
  Wallet,
  Database,
  Coins,
} from 'lucide-react'

interface NavItem {
  label: string
  to: string
  icon: React.ReactNode
  end?: boolean
}

interface NavGroup {
  title: string
  items: NavItem[]
}

function useNavGroups(): NavGroup[] {
  const { t } = useTranslation()
  return [
    {
      title: 'Core',
      items: [
        {
          label: t('nav.dashboard'),
          to: '/',
          icon: <LayoutDashboard className="w-4 h-4" />,
          end: true,
        },
        { label: t('employees.title'), to: '/users', icon: <Users className="w-4 h-4" /> },
        { label: t('nav.tasks'), to: '/tasks', icon: <CheckSquare className="w-4 h-4" /> },
        { label: t('nav.reports'), to: '/reports', icon: <BarChart2 className="w-4 h-4" /> },
        { label: t('nav.settings'), to: '/settings', icon: <Settings className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Owner',
      items: [
        {
          label: 'Vendor Payments',
          to: '/owner/vendor-payments',
          icon: <CreditCard className="w-4 h-4" />,
        },
        {
          label: 'Post-paid Customers',
          to: '/owner/postpaid-customers',
          icon: <UserCheck className="w-4 h-4" />,
        },
        { label: 'Item Master', to: '/owner/item-master', icon: <Package className="w-4 h-4" /> },
        { label: 'Vendor Master', to: '/vendors', icon: <Store className="w-4 h-4" /> },
        { label: 'Expenses', to: '/owner/expenses', icon: <Wallet className="w-4 h-4" /> },
        { label: 'Data Entry', to: '/owner/data-entry', icon: <Database className="w-4 h-4" /> },
        { label: 'Vasanth Float', to: '/owner/vasanth-float', icon: <Coins className="w-4 h-4" /> },
      ],
    },
  ]
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full ${
    isActive
      ? 'bg-primary text-primary-foreground'
      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
  }`

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const navGroups = useNavGroups()

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
    <div className="flex flex-col h-full">
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
          <span className="text-primary-foreground text-sm font-bold">C</span>
        </div>
        <span className="text-sm font-semibold text-foreground">{t('app.name')}</span>
      </div>

      {/* Nav groups */}
      <ScrollArea className="flex-1 py-3">
        {navGroups.map((group) => (
          <div key={group.title} className="px-3 mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
              {group.title}
            </p>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={linkClass}
                onClick={onClose}
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </ScrollArea>

      {/* User footer */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
          <Avatar className="w-7 h-7">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
              {user?.full_name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{user?.full_name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
        </div>
        <Separator className="mb-2" />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
        >
          <LogOut className="w-4 h-4" />
          {t('auth.logout')}
        </Button>
      </div>
    </div>
  )
}

interface OwnerLayoutProps {
  children: React.ReactNode
}

export default function OwnerLayout({ children }: OwnerLayoutProps) {
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside
        data-testid="owner-sidebar"
        className="hidden lg:flex flex-col w-60 shrink-0 border-r border-border bg-background sticky top-0 h-screen"
      >
        <SidebarContent />
      </aside>

      {/* Mobile: top bar + Sheet drawer */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border sticky top-0 z-40 bg-background">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="p-1.5"
                aria-label="Open navigation"
                data-testid="sidebar-hamburger"
              >
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-0">
              <SidebarContent onClose={() => setSheetOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground text-xs font-bold">C</span>
          </div>
          <span className="text-sm font-semibold text-foreground">CafeOS</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}

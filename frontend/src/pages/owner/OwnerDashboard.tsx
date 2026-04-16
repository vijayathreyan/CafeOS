import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  BarChart3,
  Handshake,
  CheckSquare,
  Settings,
  Receipt,
  Scale,
  List,
  CreditCard,
  Banknote,
  type LucideIcon,
} from 'lucide-react'

export default function OwnerDashboard() {
  const navigate = useNavigate()
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const cards: {
    title: string
    subtitle: string
    path: string
    Icon: LucideIcon
    ready: boolean
    phase?: string
  }[] = [
    {
      title: 'Users & Employees',
      subtitle: 'Manage staff accounts',
      path: '/users',
      Icon: Users,
      ready: true,
    },
    {
      title: 'Reports',
      subtitle: 'Sales, P&L, Reconciliation',
      path: '/reports',
      Icon: BarChart3,
      ready: false,
      phase: 'Phase 7–9',
    },
    {
      title: 'Data Entry',
      subtitle: 'UPI, Swiggy, Zomato payouts',
      path: '/owner/data-entry',
      Icon: CreditCard,
      ready: true,
    },
    {
      title: 'Expenses',
      subtitle: 'Bills, maintenance, HO expenses',
      path: '/owner/expenses',
      Icon: Receipt,
      ready: true,
    },
    {
      title: 'Vasanth Float',
      subtitle: 'Supervisor cash float balance',
      path: '/owner/vasanth-float',
      Icon: Banknote,
      ready: true,
    },
    {
      title: 'Vendor Master',
      subtitle: 'Manage suppliers and items',
      path: '/vendors',
      Icon: Handshake,
      ready: true,
    },
    {
      title: 'Item Master',
      subtitle: 'Manage items across all modules',
      path: '/owner/item-master',
      Icon: List,
      ready: true,
    },
    {
      title: 'Vendor Payments',
      subtitle: 'Mon/Thu cycles and monthly payments',
      path: '/owner/vendor-payments',
      Icon: Handshake,
      ready: true,
    },
    {
      title: 'Post-Paid Customers',
      subtitle: 'Credit sales and outstanding balances',
      path: '/owner/postpaid-customers',
      Icon: CreditCard,
      ready: true,
    },
    {
      title: 'Tasks',
      subtitle: 'Assign and track tasks',
      path: '/tasks',
      Icon: CheckSquare,
      ready: true,
    },
    {
      title: 'Stock Configuration',
      subtitle: 'Weight per unit settings',
      path: '/owner/stock-config',
      Icon: Scale,
      ready: true,
    },
    {
      title: 'Admin Settings',
      subtitle: 'Configure all modules',
      path: '/settings',
      Icon: Settings,
      ready: false,
      phase: 'Phase 11',
    },
    {
      title: 'POS / Billing',
      subtitle: 'Shop billing system',
      path: '/pos',
      Icon: Receipt,
      ready: false,
      phase: 'Phase 12',
    },
  ]

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Owner Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">{today} · Unlimited Food Works</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(({ title, subtitle, path, Icon, ready, phase }) => (
          <Card
            key={path}
            onClick={() => ready && navigate(path)}
            className={`transition-all ${ready ? 'cursor-pointer hover:shadow-card-lg hover:border-primary/30' : 'opacity-60 cursor-default'}`}
          >
            <CardContent className="p-5">
              <Icon className="w-8 h-8 mb-3 text-foreground" />
              <h3 className="font-semibold text-foreground">{title}</h3>
              <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
              {!ready && (
                <Badge variant="secondary" className="mt-2 text-xs">
                  {phase}
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

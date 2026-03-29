import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function OwnerDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const cards = [
    { title: 'Users & Employees', subtitle: 'Manage staff accounts', path: '/users', icon: '👥', ready: true },
    { title: 'Reports', subtitle: 'Sales, P&L, Reconciliation', path: '/reports', icon: '📊', ready: false, phase: 'Phase 7–9' },
    { title: 'Vendor Payments', subtitle: 'Mon/Thu payment cycles', path: '/vendors', icon: '🤝', ready: false, phase: 'Phase 5' },
    { title: 'Tasks', subtitle: 'Assign and track tasks', path: '/tasks', icon: '✅', ready: true },
    { title: 'Admin Settings', subtitle: 'Configure all modules', path: '/settings', icon: '⚙️', ready: false, phase: 'Phase 11' },
    { title: 'POS / Billing', subtitle: 'Shop billing system', path: '/pos', icon: '🧾', ready: false, phase: 'Phase 12' },
  ]

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Owner Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">{today} · Unlimited Food Works</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(card => (
          <Card
            key={card.path}
            onClick={() => card.ready && navigate(card.path)}
            className={`transition-all ${card.ready ? 'cursor-pointer hover:shadow-card-lg hover:border-primary/30' : 'opacity-60 cursor-default'}`}
          >
            <CardContent className="p-5">
              <div className="text-3xl mb-3">{card.icon}</div>
              <h3 className="font-semibold text-foreground">{card.title}</h3>
              <p className="text-muted-foreground text-sm mt-1">{card.subtitle}</p>
              {!card.ready && (
                <Badge variant="secondary" className="mt-2 text-xs">
                  {card.phase}
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

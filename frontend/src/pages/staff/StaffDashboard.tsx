import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function StaffDashboard() {
  const { t } = useTranslation()
  const { user, activeBranch } = useAuth()
  const navigate = useNavigate()
  const branch = activeBranch || user?.branch_access[0]
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Good morning, {user?.full_name?.split(' ')[0]} 👋</h1>
        <p className="text-muted-foreground text-sm mt-1">{today} · {branch ? t(`branch.${branch}`) : ''}</p>
      </div>

      {/* Quick action */}
      <Card className="mb-4">
        <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-foreground text-lg">Today's Shift</h2>
            <p className="text-muted-foreground text-sm mt-1">Fill in your shift details</p>
          </div>
          <Button onClick={() => navigate('/shift')} className="w-full sm:w-auto">
            Open Shift →
          </Button>
        </CardContent>
      </Card>

      {/* Maintenance contacts card */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-medium text-foreground mb-3">Service Contacts</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between"><span>Gas (Anand)</span><a href="tel:9942082233" className="text-primary font-medium">9942082233</a></div>
            <div className="flex justify-between"><span>Coffee Machine Repair</span><span className="italic">Contact Owner</span></div>
            <div className="flex justify-between"><span>Electrician</span><span className="italic">Contact Owner</span></div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

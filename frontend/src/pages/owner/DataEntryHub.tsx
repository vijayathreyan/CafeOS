import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CreditCard, Truck, Users, ArrowLeft } from 'lucide-react'

export default function DataEntryHub() {
  const navigate = useNavigate()

  const tiles = [
    {
      title: 'UPI Entry',
      subtitle: 'Weekly PhonePe / GPay / Paytm totals',
      path: '/owner/upi-entry',
      Icon: CreditCard,
    },
    {
      title: 'Delivery Payouts',
      subtitle: 'Swiggy & Zomato payout entries',
      path: '/owner/delivery-payouts',
      Icon: Truck,
    },
    {
      title: 'Salary Entry',
      subtitle: 'Monthly staff salary for P&L',
      path: '/owner/salary-entry',
      Icon: Users,
    },
  ]

  return (
    <div className="p-4 max-w-3xl mx-auto" data-testid="data-entry-hub">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Data Entry</h1>
          <p className="text-muted-foreground text-sm mt-0.5">UPI, Swiggy, Zomato payouts</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {tiles.map(({ title, subtitle, path, Icon }) => (
          <Card
            key={path}
            onClick={() => navigate(path)}
            className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
            data-testid={`tile-${title.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <CardContent className="p-5">
              <Icon className="w-8 h-8 mb-3 text-foreground" />
              <h3 className="font-semibold text-foreground">{title}</h3>
              <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

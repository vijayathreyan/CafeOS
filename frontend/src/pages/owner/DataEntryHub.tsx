import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { CreditCard, Truck, Users } from 'lucide-react'

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
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Data Entry</h1>
        <p className="text-muted-foreground text-sm mt-0.5">UPI, Swiggy, Zomato payouts</p>
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

import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useOwnerExpenseView } from '../../hooks/useOwnerExpenseView'
import { useExpenseShops } from '../../hooks/useSupervisorExpenses'
import { supabase } from '../../lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Image } from 'lucide-react'
import { PageContainer } from '@/components/layouts/PageContainer'
import { PageHeader } from '@/components/layouts/PageHeader'

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function OwnerHOExpensesPage() {
  const { user } = useAuth()
  const [branchFilter, setBranchFilter] = useState<'KR' | 'C2' | 'all'>('all')
  const [shopFilter, setShopFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)

  const { data: expenses = [], isLoading } = useOwnerExpenseView(!!user, {
    branch: branchFilter,
    shopName: shopFilter === 'all' ? undefined : shopFilter,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  })
  const { data: shops = [] } = useExpenseShops(!!user)

  // Summary cards
  const thisMonth = new Date().toISOString().slice(0, 7)
  const krTotal = expenses
    .filter((e) => e.branch === 'KR' && e.created_at.startsWith(thisMonth))
    .reduce((s, e) => s + Number(e.amount), 0)
  const c2Total = expenses
    .filter((e) => e.branch === 'C2' && e.created_at.startsWith(thisMonth))
    .reduce((s, e) => s + Number(e.amount), 0)

  const openPhoto = async (path: string | null) => {
    if (!path) return
    const { data } = await supabase.storage.from('bill-photos').createSignedUrl(path, 60)
    if (data?.signedUrl) setPhotoUrl(data.signedUrl)
  }

  return (
    <PageContainer>
      <PageHeader title="HO Expenses" />

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">KR This Month</p>
            <p className="font-bold text-foreground mt-1">₹{krTotal.toLocaleString('en-IN')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">C2 This Month</p>
            <p className="font-bold text-foreground mt-1">₹{c2Total.toLocaleString('en-IN')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Both This Month</p>
            <p className="font-bold text-foreground mt-1">
              ₹{(krTotal + c2Total).toLocaleString('en-IN')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Branch</Label>
              <Select
                value={branchFilter}
                onValueChange={(v) => setBranchFilter(v as 'KR' | 'C2' | 'all')}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="KR">KR</SelectItem>
                  <SelectItem value="C2">C2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Shop</Label>
              <Select value={shopFilter} onValueChange={setShopFilter}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {shops.map((s) => (
                    <SelectItem key={s.id} value={s.shop_name}>
                      {s.shop_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input
                type="date"
                className="h-8 text-sm"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input
                type="date"
                className="h-8 text-sm"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No expense entries match the selected filters.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {expenses.map((e) => (
            <Card key={e.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground text-sm">{e.shop_name}</span>
                      <Badge variant="outline" className="text-xs">
                        {e.branch}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(e.expense_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {e.bill_photo_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => openPhoto(e.bill_photo_url)}
                      >
                        <Image className="w-4 h-4" />
                      </Button>
                    )}
                    <span className="font-semibold text-foreground text-sm">
                      ₹{Number(e.amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <Separator className="my-2" />
          <p className="text-sm text-right text-muted-foreground">
            Total:{' '}
            <span className="font-semibold text-foreground">
              ₹{expenses.reduce((s, e) => s + Number(e.amount), 0).toLocaleString('en-IN')}
            </span>
          </p>
        </div>
      )}

      {/* Photo lightbox */}
      <Dialog open={!!photoUrl} onOpenChange={(open) => !open && setPhotoUrl(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bill Photo</DialogTitle>
          </DialogHeader>
          {photoUrl && (
            <img src={photoUrl} alt="Bill" className="w-full rounded-md object-contain max-h-96" />
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

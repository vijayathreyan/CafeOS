import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useDepositHistory } from '../../hooks/useCashDeposit'
import { supabase } from '../../lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
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
import type { CashDeposit } from '../../types/phase4'

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function OwnerDepositsPage() {
  const { user } = useAuth()
  const [branchFilter, setBranchFilter] = useState<'KR' | 'C2' | 'all'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [detail, setDetail] = useState<CashDeposit | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)

  const { data: deposits = [], isLoading } = useDepositHistory(!!user)

  const filtered = deposits.filter((d) => {
    if (branchFilter !== 'all') {
      const hasRow = (d.rows as { branch: string }[]).some((r) => r.branch === branchFilter)
      if (!hasRow) return false
    }
    if (dateFrom && d.deposit_date < dateFrom) return false
    if (dateTo && d.deposit_date > dateTo) return false
    return true
  })

  const openPhoto = async (path: string) => {
    const { data } = await supabase.storage.from('bill-photos').createSignedUrl(path, 60)
    if (data?.signedUrl) setPhotoUrl(data.signedUrl)
  }

  // Monthly totals per branch
  const monthlyTotals: Record<string, { KR: number; C2: number }> = {}
  filtered.forEach((d) => {
    const month = d.deposit_date.slice(0, 7)
    if (!monthlyTotals[month]) monthlyTotals[month] = { KR: 0, C2: 0 }
    ;(d.rows as { branch: 'KR' | 'C2'; amount: number }[]).forEach((r) => {
      monthlyTotals[month][r.branch] += Number(r.amount)
    })
  })

  return (
    <PageContainer>
      <PageHeader title="Cash Deposits" />

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-3">
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
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No deposits found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((d) => (
            <Card
              key={d.id}
              className="cursor-pointer hover:border-primary/30 transition-all"
              onClick={() => setDetail(d)}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground text-sm">
                      {formatDate(d.deposit_date)}
                    </p>
                    {d.bank_ref && (
                      <p className="text-xs text-muted-foreground">Ref: {d.bank_ref}</p>
                    )}
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {(d.rows as { branch: string }[])
                        .map((r) => r.branch)
                        .filter((b, i, arr) => arr.indexOf(b) === i)
                        .map((b) => (
                          <Badge key={b} variant="outline" className="text-xs">
                            {b}
                          </Badge>
                        ))}
                    </div>
                  </div>
                  <span className="font-bold text-foreground">
                    ₹{Number(d.total_amount).toLocaleString('en-IN')}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="mt-4 pt-4 border-t border-border">
            <h2 className="text-sm font-semibold text-foreground mb-2">Monthly Totals</h2>
            {Object.entries(monthlyTotals)
              .sort(([a], [b]) => b.localeCompare(a))
              .slice(0, 3)
              .map(([month, t]) => (
                <div key={month} className="flex gap-4 text-sm py-1">
                  <span className="text-muted-foreground w-20">{month}</span>
                  <span>KR ₹{t.KR.toLocaleString('en-IN')}</span>
                  <span>C2 ₹{t.C2.toLocaleString('en-IN')}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Deposit — {detail && formatDate(detail.deposit_date)}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Challan Total</span>
                <span className="font-semibold">
                  ₹{Number(detail.total_amount).toLocaleString('en-IN')}
                </span>
                {detail.bank_ref && (
                  <>
                    <span className="text-muted-foreground">Bank Ref</span>
                    <span>{detail.bank_ref}</span>
                  </>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Breakdown
                </p>
                {(detail.rows as { branch: string; date_covered: string; amount: number }[]).map(
                  (r, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-0.5">
                      <span className="text-muted-foreground">
                        {r.branch} · {formatDate(r.date_covered)}
                      </span>
                      <span>₹{Number(r.amount).toLocaleString('en-IN')}</span>
                    </div>
                  )
                )}
              </div>
              {detail.notes && <p className="text-sm text-muted-foreground">{detail.notes}</p>}
              {detail.challan_photo_url && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => openPhoto(detail.challan_photo_url!)}
                >
                  <Image className="w-4 h-4 mr-1.5" />
                  View Challan Photo
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!photoUrl} onOpenChange={(open) => !open && setPhotoUrl(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Challan Photo</DialogTitle>
          </DialogHeader>
          {photoUrl && (
            <img
              src={photoUrl}
              alt="Challan"
              className="w-full rounded-md object-contain max-h-96"
            />
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

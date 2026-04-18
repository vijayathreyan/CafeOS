import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, Eye, ArrowLeft } from 'lucide-react'
import PageContainer from '@/components/layouts/PageContainer'
import { PageHeader } from '@/components/layouts/PageHeader'
import SectionCard from '@/components/ui/SectionCard'
import StatusBadge from '@/components/ui/StatusBadge'
import AmountDisplay from '@/components/ui/AmountDisplay'
import EmptyState from '@/components/ui/EmptyState'
import DataTable from '@/components/ui/DataTable'
import { TableSkeleton } from '@/components/ui/LoadingSkeletons'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  useMonthEndStockHistory,
  useMonthEndStockEntryItems,
} from '@/hooks/useMonthEndStockHistory'
import { monthName, branchLabel } from '@/types/phase6'
import type { MonthEndStockHistoryRecord } from '@/types/phase6'
import type { ColumnDef } from '@/components/ui/DataTable'

// ─── View dialog for a single entry ───────────────────────────────────────────

function ViewEntryDialog({
  entry,
  open,
  onClose,
}: {
  entry: MonthEndStockHistoryRecord | null
  open: boolean
  onClose: () => void
}) {
  const { data: items, isLoading } = useMonthEndStockEntryItems(entry?.id ?? null)

  if (!entry) return null

  type ItemRow = {
    id: string
    item_name: string
    section: string | null
    unit: string | null
    open_units: number
    packed_units: number
    total_units: number
    rate_per_unit: number
    cost: number
  }

  const columns: ColumnDef<ItemRow>[] = [
    { header: 'Item', accessor: 'item_name' },
    { header: 'Unit', accessor: 'unit', width: '80px' },
    {
      header: 'Open',
      accessor: (r) => <span style={{ fontFamily: 'var(--font-mono)' }}>{r.open_units}</span>,
      align: 'right',
      width: '80px',
    },
    {
      header: 'Packed',
      accessor: (r) => <span style={{ fontFamily: 'var(--font-mono)' }}>{r.packed_units}</span>,
      align: 'right',
      width: '80px',
    },
    {
      header: 'Total',
      accessor: (r) => <span style={{ fontFamily: 'var(--font-mono)' }}>{r.total_units}</span>,
      align: 'right',
      width: '80px',
    },
    {
      header: 'Rate (₹)',
      accessor: (r) => <AmountDisplay amount={r.rate_per_unit} size="sm" />,
      align: 'right',
      width: '90px',
    },
    {
      header: 'Cost',
      accessor: (r) => <AmountDisplay amount={r.cost} size="sm" />,
      align: 'right',
      width: '100px',
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent style={{ maxWidth: '900px', maxHeight: '80vh', overflowY: 'auto' }}>
        <DialogHeader>
          <DialogTitle>
            {monthName(entry.month)} {entry.year} · {branchLabel(entry.branch)}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between mb-4">
          <StatusBadge
            status={entry.status === 'submitted' ? 'success' : 'warning'}
            label={entry.status === 'submitted' ? 'Submitted' : 'Draft'}
            dot
          />
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '12px', color: 'var(--gray-500)' }}>Total Closing Stock</p>
            <AmountDisplay amount={entry.total_value} size="lg" />
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton cols={7} />
        ) : (
          <DataTable
            columns={columns as unknown as ColumnDef<Record<string, unknown>>[]}
            data={(items ?? []) as unknown as Record<string, unknown>[]}
            emptyState={<EmptyState icon={Package} title="No items recorded" />}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Main history page ────────────────────────────────────────────────────────

export default function MonthEndStockHistoryPage() {
  const navigate = useNavigate()
  const [branchFilter, setBranchFilter] = useState<string>('all')
  const [yearFilter, setYearFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [viewEntry, setViewEntry] = useState<MonthEndStockHistoryRecord | null>(null)

  const currentYear = new Date().getFullYear()
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1].map((y) => String(y))

  const { data: history, isLoading } = useMonthEndStockHistory({
    branch: branchFilter !== 'all' ? branchFilter : undefined,
    year: yearFilter !== 'all' ? Number(yearFilter) : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  })

  const columns: ColumnDef<MonthEndStockHistoryRecord>[] = [
    {
      header: 'Month / Year',
      accessor: (r) => (
        <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>
          {monthName(r.month)} {r.year}
        </span>
      ),
    },
    {
      header: 'Branch',
      accessor: (r) => <span>{branchLabel(r.branch)}</span>,
    },
    {
      header: 'Total Value',
      accessor: (r) => <AmountDisplay amount={r.total_value} size="sm" />,
      align: 'right',
    },
    {
      header: 'Status',
      accessor: (r) => (
        <StatusBadge
          status={r.status === 'submitted' ? 'success' : 'warning'}
          label={r.status === 'submitted' ? 'Submitted' : 'Draft'}
          size="sm"
          dot
        />
      ),
    },
    {
      header: 'Submitted By',
      accessor: (r) => (
        <span style={{ color: 'var(--gray-600)', fontSize: '13px' }}>
          {r.submitted_by_name ?? '—'}
        </span>
      ),
    },
    {
      header: 'Submitted Date',
      accessor: (r) =>
        r.submitted_at ? (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
            {new Date(r.submitted_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        ) : (
          <span style={{ color: 'var(--gray-400)' }}>—</span>
        ),
    },
    {
      header: 'Actions',
      accessor: (r) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            setViewEntry(r)
          }}
        >
          <Eye size={14} className="mr-1" />
          View
        </Button>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Month End Stock History"
        subtitle="Past closing stock submissions"
        action={
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={14} className="mr-1" />
            Back
          </Button>
        }
      />

      {/* Filters */}
      <SectionCard className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger style={{ width: '160px' }}>
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              <SelectItem value="KR">Kaappi Ready</SelectItem>
              <SelectItem value="C2">Coffee Mate C2</SelectItem>
            </SelectContent>
          </Select>

          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger style={{ width: '120px' }}>
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger style={{ width: '140px' }}>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>

          <span
            style={{
              fontSize: '13px',
              color: 'var(--gray-500)',
              fontFamily: 'var(--font-body)',
            }}
          >
            {history?.length ?? 0} records
          </span>
        </div>
      </SectionCard>

      {/* Table */}
      <SectionCard padding="none">
        {isLoading ? (
          <div style={{ padding: 'var(--space-4)' }}>
            <TableSkeleton cols={7} />
          </div>
        ) : (
          <DataTable
            columns={columns as unknown as ColumnDef<Record<string, unknown>>[]}
            data={(history ?? []) as unknown as Record<string, unknown>[]}
            rowKey={(r) => (r as unknown as MonthEndStockHistoryRecord).id}
            onRowClick={(r) => setViewEntry(r as unknown as MonthEndStockHistoryRecord)}
            emptyState={
              <EmptyState
                icon={Package}
                title="No submissions yet"
                description="Month end stock submissions will appear here after they are recorded."
              />
            }
          />
        )}
      </SectionCard>

      {/* View entry dialog */}
      <ViewEntryDialog entry={viewEntry} open={!!viewEntry} onClose={() => setViewEntry(null)} />
    </PageContainer>
  )
}

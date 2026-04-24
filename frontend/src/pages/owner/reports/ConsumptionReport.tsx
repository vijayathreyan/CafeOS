import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingDown } from 'lucide-react'
import PageContainer from '@/components/layouts/PageContainer'
import PageHeader from '@/components/layouts/PageHeader'
import SectionCard from '@/components/ui/SectionCard'
import KPICard from '@/components/ui/KPICard'
import EmptyState from '@/components/ui/EmptyState'
import DataTable from '@/components/ui/DataTable'
import { TableSkeleton } from '@/components/ui/LoadingSkeletons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ReportFilterBar from '@/components/ReportFilterBar'
import { useConsumptionReport } from '@/hooks/useReports'
import { firstOfMonthISO, todayISO, formatDate, branchLabel } from '@/types/phase7'
import type { ConsumptionReportRow, ReportFilters } from '@/types/phase7'
import type { ColumnDef } from '@/components/ui/DataTable'

export default function ConsumptionReport() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<ReportFilters>({
    from_date: firstOfMonthISO(),
    to_date: todayISO(),
    branch: 'all',
  })
  const [itemFilter, setItemFilter] = useState('')

  const { data: rows, isLoading } = useConsumptionReport(filters, itemFilter)

  // KPI: total consumption, unique items, top consumed item
  const totalConsumption = (rows ?? []).reduce((s, r) => s + r.consumption, 0)
  const uniqueItems = new Set((rows ?? []).map((r) => r.item_name)).size

  // Top item by total consumption across date range
  const itemTotals = new Map<string, number>()
  for (const r of rows ?? []) {
    itemTotals.set(r.item_name, (itemTotals.get(r.item_name) ?? 0) + r.consumption)
  }
  let topItem = '—'
  let topQty = 0
  for (const [name, qty] of itemTotals.entries()) {
    if (qty > topQty) {
      topQty = qty
      topItem = name
    }
  }

  const columns: ColumnDef<ConsumptionReportRow>[] = [
    {
      header: 'Date',
      accessor: (r) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
          {formatDate(r.entry_date)}
        </span>
      ),
      width: '130px',
    },
    {
      header: 'Branch',
      accessor: (r) => (
        <span
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: r.branch === 'KR' ? 'var(--brand-primary)' : 'var(--color-secondary)',
          }}
        >
          {branchLabel(r.branch)}
        </span>
      ),
      width: '140px',
    },
    {
      header: 'Item',
      accessor: (r) => (
        <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>{r.item_name}</span>
      ),
    },
    {
      header: 'Unit',
      accessor: (r) => (
        <span style={{ color: 'var(--gray-500)', fontSize: '12px' }}>{r.unit ?? '—'}</span>
      ),
      width: '80px',
    },
    {
      header: 'Opening',
      accessor: (r) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
          {r.opening_stock.toFixed(2)}
        </span>
      ),
      align: 'right',
      width: '90px',
    },
    {
      header: 'Purchase',
      accessor: (r) => (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            color: r.purchase > 0 ? 'var(--color-secondary)' : 'var(--gray-400)',
          }}
        >
          {r.purchase > 0 ? `+${r.purchase.toFixed(2)}` : '—'}
        </span>
      ),
      align: 'right',
      width: '90px',
    },
    {
      header: 'Closing',
      accessor: (r) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
          {r.closing_stock.toFixed(2)}
        </span>
      ),
      align: 'right',
      width: '90px',
    },
    {
      header: 'Consumed',
      accessor: (r) => (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            fontWeight: 700,
            color: r.consumption < 0 ? 'var(--color-danger)' : 'var(--gray-900)',
          }}
        >
          {r.consumption.toFixed(2)}
        </span>
      ),
      align: 'right',
      width: '100px',
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Consumption Report"
        subtitle="Stock used per item per day (Opening + Purchase − Closing)"
        action={
          <Button variant="outline" size="sm" onClick={() => navigate('/reports')}>
            <ArrowLeft size={14} className="mr-1" />
            Reports
          </Button>
        }
      />

      {/* KPI summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <KPICard
          title="Total Consumed"
          value={totalConsumption.toFixed(1)}
          subtitle="units (mixed)"
          status="info"
        />
        <KPICard
          title="Unique Items"
          value={String(uniqueItems)}
          subtitle="items in range"
          status="none"
        />
        <KPICard
          title="Top Item"
          value={topItem}
          subtitle={topQty > 0 ? `${topQty.toFixed(1)} consumed` : 'no data'}
          status="none"
        />
      </div>

      {/* Filters */}
      <ReportFilterBar
        filters={filters}
        onChange={setFilters}
        count={rows?.length}
        extra={
          <div style={{ minWidth: '200px' }}>
            <Label
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--gray-600)',
                marginBottom: '4px',
                display: 'block',
              }}
            >
              Item Search
            </Label>
            <Input
              placeholder="Filter by item name…"
              value={itemFilter}
              onChange={(e) => setItemFilter(e.target.value)}
              style={{ width: '200px' }}
            />
          </div>
        }
      />

      {/* Table */}
      <SectionCard padding="none">
        {isLoading ? (
          <div style={{ padding: 'var(--space-4)' }}>
            <TableSkeleton cols={8} />
          </div>
        ) : (
          <DataTable
            columns={columns as unknown as ColumnDef<Record<string, unknown>>[]}
            data={(rows ?? []) as unknown as Record<string, unknown>[]}
            rowKey={(r) => {
              const row = r as unknown as ConsumptionReportRow
              return `${row.entry_date}-${row.branch}-${row.item_name}`
            }}
            emptyState={
              <EmptyState
                icon={TrendingDown}
                title="No consumption data found"
                description="Adjust the date range or branch filter to see stock consumption data."
              />
            }
          />
        )}
      </SectionCard>
    </PageContainer>
  )
}

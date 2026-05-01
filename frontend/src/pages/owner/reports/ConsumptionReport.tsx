import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingDown, Download, FileSpreadsheet } from 'lucide-react'
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
import { exportToPDF, exportToExcel } from '@/lib/exportUtils'
import type { ExportColumn } from '@/lib/exportUtils'

const CONSUMPTION_EXPORT_COLUMNS: ExportColumn[] = [
  { header: 'Date', key: 'date', width: 14 },
  { header: 'Branch', key: 'branch', width: 16 },
  { header: 'Item', key: 'item', width: 24 },
  { header: 'Unit', key: 'unit', width: 10 },
  { header: 'Opening', key: 'opening', width: 12, align: 'right' },
  { header: 'Purchase', key: 'purchase', width: 12, align: 'right' },
  { header: 'Closing', key: 'closing', width: 12, align: 'right' },
  { header: 'Consumed', key: 'consumed', width: 12, align: 'right' },
]

export default function ConsumptionReport() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<ReportFilters>({
    from_date: firstOfMonthISO(),
    to_date: todayISO(),
    branch: 'all',
  })
  const [itemFilter, setItemFilter] = useState('')

  const { data: rows, isLoading } = useConsumptionReport(filters, itemFilter)

  const branchStr =
    filters.branch === 'all' ? 'All Branches' : branchLabel(filters.branch as 'KR' | 'C2')
  const period = `${filters.from_date} to ${filters.to_date}`

  const exportRows = (rows ?? []).map((r) => ({
    date: formatDate(r.entry_date),
    branch: branchLabel(r.branch),
    item: r.item_name,
    unit: r.unit ?? '—',
    opening: r.opening_stock.toFixed(2),
    purchase: r.purchase.toFixed(2),
    closing: r.closing_stock.toFixed(2),
    consumed: r.consumption.toFixed(2),
  }))

  const exportTotals = {
    date: 'TOTAL',
    branch: '',
    item: '',
    unit: '',
    opening: (rows ?? []).reduce((s, r) => s + r.opening_stock, 0).toFixed(2),
    purchase: (rows ?? []).reduce((s, r) => s + r.purchase, 0).toFixed(2),
    closing: (rows ?? []).reduce((s, r) => s + r.closing_stock, 0).toFixed(2),
    consumed: (rows ?? []).reduce((s, r) => s + r.consumption, 0).toFixed(2),
  }

  const handlePDFExport = () =>
    exportToPDF(
      'Consumption Report',
      branchStr,
      period,
      CONSUMPTION_EXPORT_COLUMNS,
      exportRows,
      exportTotals
    )

  const handleExcelExport = () =>
    exportToExcel(
      'Consumption Report',
      branchStr,
      period,
      CONSUMPTION_EXPORT_COLUMNS,
      exportRows,
      exportTotals
    )

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
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Button variant="outline" size="sm" onClick={handlePDFExport} disabled={!rows?.length}>
              <Download size={14} className="mr-1" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExcelExport}
              disabled={!rows?.length}
            >
              <FileSpreadsheet size={14} className="mr-1" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/reports')}>
              <ArrowLeft size={14} className="mr-1" />
              Reports
            </Button>
          </div>
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

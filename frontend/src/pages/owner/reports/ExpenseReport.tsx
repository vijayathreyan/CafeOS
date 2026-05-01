import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Receipt, Download, FileSpreadsheet } from 'lucide-react'
import PageContainer from '@/components/layouts/PageContainer'
import PageHeader from '@/components/layouts/PageHeader'
import SectionCard from '@/components/ui/SectionCard'
import KPICard from '@/components/ui/KPICard'
import AmountDisplay from '@/components/ui/AmountDisplay'
import EmptyState from '@/components/ui/EmptyState'
import DataTable from '@/components/ui/DataTable'
import { TableSkeleton } from '@/components/ui/LoadingSkeletons'
import { Button } from '@/components/ui/button'
import ReportFilterBar from '@/components/ReportFilterBar'
import { useExpenseReport } from '@/hooks/useReports'
import { firstOfMonthISO, todayISO, formatDate, branchLabel } from '@/types/phase7'
import type { ExpenseReportRow, ReportFilters } from '@/types/phase7'
import type { ColumnDef } from '@/components/ui/DataTable'
import { exportToPDF, exportToExcel } from '@/lib/exportUtils'
import type { ExportColumn } from '@/lib/exportUtils'

interface CategorySummary {
  category: string
  total: number
  is_gas: boolean
}

const EXPENSE_EXPORT_COLUMNS: ExportColumn[] = [
  { header: 'Date', key: 'date', width: 14 },
  { header: 'Branch', key: 'branch', width: 16 },
  { header: 'Category', key: 'category', width: 24 },
  { header: 'Amount (₹)', key: 'amount', width: 14, align: 'right' },
]

export default function ExpenseReport() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<ReportFilters>({
    from_date: firstOfMonthISO(),
    to_date: todayISO(),
    branch: 'all',
  })
  const [view, setView] = useState<'detail' | 'summary'>('detail')

  const { data: rows, isLoading } = useExpenseReport(filters)

  const grandTotal = (rows ?? []).reduce((s, r) => s + r.amount, 0)
  const gasTotal = (rows ?? []).filter((r) => r.is_gas).reduce((s, r) => s + r.amount, 0)
  const shopTotal = grandTotal - gasTotal
  const numEntries = (rows ?? []).length

  const branchStr =
    filters.branch === 'all' ? 'All Branches' : branchLabel(filters.branch as 'KR' | 'C2')
  const period = `${filters.from_date} to ${filters.to_date}`

  const exportRows = (rows ?? []).map((r) => ({
    date: formatDate(r.entry_date),
    branch: branchLabel(r.branch),
    category: r.category,
    amount: r.amount,
  }))

  const exportTotals = {
    date: 'TOTAL',
    branch: '',
    category: '',
    amount: grandTotal,
  }

  // Build category summary
  const catMap = new Map<string, CategorySummary>()
  for (const r of rows ?? []) {
    const existing = catMap.get(r.category)
    if (existing) {
      existing.total += r.amount
    } else {
      catMap.set(r.category, { category: r.category, total: r.amount, is_gas: r.is_gas })
    }
  }
  const categorySummary = Array.from(catMap.values()).sort((a, b) => b.total - a.total)

  const detailColumns: ColumnDef<ExpenseReportRow>[] = [
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
      header: 'Category',
      accessor: (r) => (
        <div className="flex items-center gap-2">
          <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>{r.category}</span>
          {r.is_gas && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                color: 'var(--color-warning)',
                background: 'var(--color-warning-subtle, #fff3cd)',
                padding: '1px 6px',
                borderRadius: 'var(--radius-full)',
              }}
            >
              GAS
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Amount',
      accessor: (r) => <AmountDisplay amount={r.amount} size="sm" />,
      align: 'right',
      width: '120px',
    },
  ]

  const summaryColumns: ColumnDef<CategorySummary>[] = [
    {
      header: 'Category',
      accessor: (r) => (
        <div className="flex items-center gap-2">
          <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>{r.category}</span>
          {r.is_gas && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                color: 'var(--color-warning)',
                background: 'var(--color-warning-subtle, #fff3cd)',
                padding: '1px 6px',
                borderRadius: 'var(--radius-full)',
              }}
            >
              GAS → P&amp;L
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Total Amount',
      accessor: (r) => <AmountDisplay amount={r.total} size="sm" />,
      align: 'right',
      width: '140px',
    },
    {
      header: '% of Total',
      accessor: (r) => (
        <span
          style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--gray-600)' }}
        >
          {grandTotal > 0 ? ((r.total / grandTotal) * 100).toFixed(1) + '%' : '—'}
        </span>
      ),
      align: 'right',
      width: '100px',
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Expense Report"
        subtitle="Daily cash expenses by category and branch"
        action={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportToPDF(
                  'Expense Report',
                  branchStr,
                  period,
                  EXPENSE_EXPORT_COLUMNS,
                  exportRows,
                  exportTotals
                )
              }
              disabled={!rows?.length}
            >
              <Download size={14} className="mr-1" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportToExcel(
                  'Expense Report',
                  branchStr,
                  period,
                  EXPENSE_EXPORT_COLUMNS,
                  exportRows,
                  exportTotals
                )
              }
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Grand Total"
          value={`₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle={`${numEntries} entries`}
          status="info"
        />
        <KPICard
          title="Shop Expenses"
          value={`₹${shopTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle="Excluding gas"
          status="none"
        />
        <KPICard
          title="Gas Bill"
          value={`₹${gasTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle="Flows to P&L"
          status="warning"
        />
        <KPICard
          title="Categories"
          value={String(catMap.size)}
          subtitle="Distinct categories"
          status="none"
        />
      </div>

      {/* Filters + view toggle */}
      <ReportFilterBar
        filters={filters}
        onChange={setFilters}
        count={view === 'detail' ? rows?.length : categorySummary.length}
        extra={
          <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-end', paddingBottom: '2px' }}>
            <Button
              variant={view === 'detail' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('detail')}
            >
              Detail
            </Button>
            <Button
              variant={view === 'summary' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('summary')}
            >
              By Category
            </Button>
          </div>
        }
      />

      {/* Table */}
      <SectionCard padding="none">
        {isLoading ? (
          <div style={{ padding: 'var(--space-4)' }}>
            <TableSkeleton cols={4} />
          </div>
        ) : view === 'detail' ? (
          <DataTable
            columns={detailColumns as unknown as ColumnDef<Record<string, unknown>>[]}
            data={(rows ?? []) as unknown as Record<string, unknown>[]}
            rowKey={(r) => {
              const row = r as unknown as ExpenseReportRow
              return `${row.entry_date}-${row.branch}-${row.category}`
            }}
            emptyState={
              <EmptyState
                icon={Receipt}
                title="No expense entries found"
                description="Adjust the date range or branch filter to see expense data."
              />
            }
          />
        ) : (
          <DataTable
            columns={summaryColumns as unknown as ColumnDef<Record<string, unknown>>[]}
            data={categorySummary as unknown as Record<string, unknown>[]}
            rowKey={(r) => (r as unknown as CategorySummary).category}
            emptyState={
              <EmptyState
                icon={Receipt}
                title="No expense entries found"
                description="Adjust the date range or branch filter to see expense data."
              />
            }
          />
        )}
      </SectionCard>
    </PageContainer>
  )
}

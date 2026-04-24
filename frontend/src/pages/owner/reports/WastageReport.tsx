import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'
import PageContainer from '@/components/layouts/PageContainer'
import PageHeader from '@/components/layouts/PageHeader'
import SectionCard from '@/components/ui/SectionCard'
import KPICard from '@/components/ui/KPICard'
import EmptyState from '@/components/ui/EmptyState'
import DataTable from '@/components/ui/DataTable'
import { TableSkeleton } from '@/components/ui/LoadingSkeletons'
import { Button } from '@/components/ui/button'
import ReportFilterBar from '@/components/ReportFilterBar'
import { useWastageReport } from '@/hooks/useReports'
import { firstOfMonthISO, todayISO, formatDate, branchLabel } from '@/types/phase7'
import type { WastageReportRow, ReportFilters } from '@/types/phase7'
import type { ColumnDef } from '@/components/ui/DataTable'

function pct(val: number): string {
  return val.toFixed(1) + '%'
}

function wastageColor(pct: number): string {
  if (pct >= 20) return 'var(--color-danger)'
  if (pct >= 10) return 'var(--color-warning)'
  return 'var(--color-secondary)'
}

export default function WastageReport() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<ReportFilters>({
    from_date: firstOfMonthISO(),
    to_date: todayISO(),
    branch: 'all',
  })

  const { data: rows, isLoading } = useWastageReport(filters)

  const totalWastage = (rows ?? []).reduce((s, r) => s + r.wastage, 0)
  const totalComp = (rows ?? []).reduce((s, r) => s + r.complimentary, 0)
  const totalSupplied = (rows ?? []).reduce((s, r) => s + r.supplied, 0)
  const overallWastagePct = totalSupplied > 0 ? (totalWastage / totalSupplied) * 100 : 0
  const highWastageCount = (rows ?? []).filter((r) => r.wastage_pct >= 10).length

  const columns: ColumnDef<WastageReportRow>[] = [
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
      header: 'Supplied',
      accessor: (r) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{r.supplied}</span>
      ),
      align: 'right',
      width: '80px',
    },
    {
      header: 'Sold',
      accessor: (r) => (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            color: 'var(--color-secondary)',
          }}
        >
          {r.sold}
        </span>
      ),
      align: 'right',
      width: '80px',
    },
    {
      header: 'Wastage',
      accessor: (r) => (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            color: r.wastage > 0 ? 'var(--color-danger)' : 'var(--gray-400)',
            fontWeight: r.wastage > 0 ? 600 : 400,
          }}
        >
          {r.wastage > 0 ? r.wastage : '—'}
        </span>
      ),
      align: 'right',
      width: '80px',
    },
    {
      header: 'Comp',
      accessor: (r) => (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            color: r.complimentary > 0 ? 'var(--color-warning)' : 'var(--gray-400)',
          }}
        >
          {r.complimentary > 0 ? r.complimentary : '—'}
        </span>
      ),
      align: 'right',
      width: '80px',
    },
    {
      header: 'Wastage %',
      accessor: (r) => (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            fontWeight: 700,
            color: r.wastage > 0 ? wastageColor(r.wastage_pct) : 'var(--gray-400)',
          }}
        >
          {r.wastage > 0 ? pct(r.wastage_pct) : '—'}
        </span>
      ),
      align: 'right',
      width: '90px',
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Wastage Report"
        subtitle="Snack wastage and complimentary by item and date"
        action={
          <Button variant="outline" size="sm" onClick={() => navigate('/reports')}>
            <ArrowLeft size={14} className="mr-1" />
            Reports
          </Button>
        }
      />

      {/* KPI summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Total Wastage"
          value={String(totalWastage)}
          subtitle="units wasted"
          status="danger"
        />
        <KPICard
          title="Overall Wastage %"
          value={pct(overallWastagePct)}
          subtitle="of total supplied"
          status={overallWastagePct >= 10 ? 'danger' : 'none'}
        />
        <KPICard
          title="Complimentary"
          value={String(totalComp)}
          subtitle="units given free"
          status="warning"
        />
        <KPICard
          title="High Wastage Rows"
          value={String(highWastageCount)}
          subtitle="≥10% wastage"
          status={highWastageCount > 0 ? 'danger' : 'none'}
        />
      </div>

      {/* Filters */}
      <ReportFilterBar filters={filters} onChange={setFilters} count={rows?.length} />

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
              const row = r as unknown as WastageReportRow
              return `${row.entry_date}-${row.branch}-${row.item_name}`
            }}
            emptyState={
              <EmptyState
                icon={Trash2}
                title="No wastage data found"
                description="Adjust the date range or branch filter to see wastage data."
              />
            }
          />
        )}
      </SectionCard>
    </PageContainer>
  )
}

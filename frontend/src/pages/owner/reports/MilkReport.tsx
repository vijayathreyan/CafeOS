import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Milk } from 'lucide-react'
import PageContainer from '@/components/layouts/PageContainer'
import PageHeader from '@/components/layouts/PageHeader'
import SectionCard from '@/components/ui/SectionCard'
import KPICard from '@/components/ui/KPICard'
import EmptyState from '@/components/ui/EmptyState'
import DataTable from '@/components/ui/DataTable'
import { TableSkeleton } from '@/components/ui/LoadingSkeletons'
import { Button } from '@/components/ui/button'
import ReportFilterBar from '@/components/ReportFilterBar'
import { useMilkReport } from '@/hooks/useReports'
import { firstOfMonthISO, todayISO, formatDate, branchLabel } from '@/types/phase7'
import type { MilkReportRow, ReportFilters } from '@/types/phase7'
import type { ColumnDef } from '@/components/ui/DataTable'

function litres(val: number): string {
  return val.toFixed(2) + ' L'
}

export default function MilkReport() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<ReportFilters>({
    from_date: firstOfMonthISO(),
    to_date: todayISO(),
    branch: 'all',
  })

  const { data: rows, isLoading } = useMilkReport(filters)

  const totalCoffee = (rows ?? []).reduce((s, r) => s + r.total_coffee, 0)
  const totalTea = (rows ?? []).reduce((s, r) => s + r.total_tea, 0)
  const totalMilk = totalCoffee + totalTea
  const days = (rows ?? []).length
  const dailyAvg = days > 0 ? totalMilk / days : 0

  const columns: ColumnDef<MilkReportRow>[] = [
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
      header: 'S1 Coffee',
      accessor: (r) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
          {litres(r.s1_coffee)}
        </span>
      ),
      align: 'right',
      width: '100px',
    },
    {
      header: 'S1 Tea',
      accessor: (r) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{litres(r.s1_tea)}</span>
      ),
      align: 'right',
      width: '100px',
    },
    {
      header: 'S2 Coffee',
      accessor: (r) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
          {litres(r.s2_coffee)}
        </span>
      ),
      align: 'right',
      width: '100px',
    },
    {
      header: 'S2 Tea',
      accessor: (r) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{litres(r.s2_tea)}</span>
      ),
      align: 'right',
      width: '100px',
    },
    {
      header: 'Coffee Total',
      accessor: (r) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600 }}>
          {litres(r.total_coffee)}
        </span>
      ),
      align: 'right',
      width: '110px',
    },
    {
      header: 'Tea Total',
      accessor: (r) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600 }}>
          {litres(r.total_tea)}
        </span>
      ),
      align: 'right',
      width: '110px',
    },
    {
      header: 'Day Total',
      accessor: (r) => (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            fontWeight: 700,
            color: 'var(--brand-primary)',
          }}
        >
          {litres(r.grand_total)}
        </span>
      ),
      align: 'right',
      width: '100px',
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Milk Report"
        subtitle="Daily coffee and tea milk consumption by shift"
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
          title="Total Coffee Milk"
          value={litres(totalCoffee)}
          subtitle={`${days} day${days !== 1 ? 's' : ''}`}
          status="info"
        />
        <KPICard
          title="Total Tea Milk"
          value={litres(totalTea)}
          subtitle={`${days} day${days !== 1 ? 's' : ''}`}
          status="success"
        />
        <KPICard
          title="Grand Total"
          value={litres(totalMilk)}
          subtitle="Coffee + Tea"
          status="none"
        />
        <KPICard
          title="Daily Average"
          value={litres(dailyAvg)}
          subtitle="Per day (all shifts)"
          status="none"
        />
      </div>

      {/* Filters */}
      <ReportFilterBar filters={filters} onChange={setFilters} count={rows?.length} />

      {/* Table */}
      <SectionCard padding="none">
        {isLoading ? (
          <div style={{ padding: 'var(--space-4)' }}>
            <TableSkeleton cols={9} />
          </div>
        ) : (
          <DataTable
            columns={columns as unknown as ColumnDef<Record<string, unknown>>[]}
            data={(rows ?? []) as unknown as Record<string, unknown>[]}
            rowKey={(r) => {
              const row = r as unknown as MilkReportRow
              return `${row.entry_date}-${row.branch}`
            }}
            emptyState={
              <EmptyState
                icon={Milk}
                title="No milk entries found"
                description="Adjust the date range or branch filter to see milk data."
              />
            }
          />
        )}
      </SectionCard>
    </PageContainer>
  )
}

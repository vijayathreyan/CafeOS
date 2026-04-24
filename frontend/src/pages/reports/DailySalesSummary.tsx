import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, FileSpreadsheet, Info } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import PageContainer from '@/components/layouts/PageContainer'
import PageHeader from '@/components/layouts/PageHeader'
import SectionCard from '@/components/ui/SectionCard'
import KPICard from '@/components/ui/KPICard'
import { TableSkeleton } from '@/components/ui/LoadingSkeletons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDailySalesSummary } from '@/hooks/useDailySalesSummary'
import type { PLBranch, DailySalesSummaryRow } from '@/types/phase8'
import { monthToYYYYMM, fmtInr } from '@/types/phase8'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DASH = '—'

function fmtCell(val: number | null | undefined): string {
  if (val === null || val === undefined) return DASH
  return fmtInr(val)
}

function fmtDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  return `${d} ${months[m - 1]}`
}

// ─── Export Functions ─────────────────────────────────────────────────────────

function exportDailySalesPDF(rows: DailySalesSummaryRow[], branch: PLBranch, month: Date) {
  const doc = new jsPDF({ orientation: 'landscape' })
  const monthLabel = month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('CafeOS — Daily Sales Summary', 14, 12)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const branchLabel =
    branch === 'Combined'
      ? 'Combined (KR + C2)'
      : branch === 'KR'
        ? 'Kaappi Ready'
        : 'Coffee Mate C2'
  doc.text(
    `Branch: ${branchLabel}   Month: ${monthLabel}   Generated: ${new Date().toLocaleString('en-IN')}`,
    14,
    18
  )

  const head = [
    [
      'Date',
      'Branch',
      'UPI',
      'Cash Exp',
      'Cash In Hand',
      'ITI',
      'Ramco',
      'Arun',
      'Ajith',
      'Post-Paid',
      'Collection',
      'Shop Sales',
      'Billed',
      'Deposited',
    ],
  ]
  const body = rows.map((r) => [
    fmtDate(r.date),
    r.branch,
    r.upi !== null ? fmtInr(r.upi) : DASH,
    fmtInr(r.cash_expenses),
    fmtInr(r.cash_in_hand),
    fmtCell(r.iti),
    fmtCell(r.ramco),
    fmtCell(r.arun),
    fmtCell(r.ajith),
    fmtInr(r.total_postpaid),
    fmtInr(r.sales_from_collection),
    fmtInr(r.total_shop_sales),
    DASH,
    fmtCell(r.cash_deposited),
  ])

  autoTable(doc, {
    startY: 22,
    head,
    body,
    theme: 'grid',
    headStyles: { fillColor: [26, 115, 232], fontSize: 7 },
    bodyStyles: { fontSize: 7 },
    styles: { overflow: 'linebreak', cellWidth: 'auto' },
  })

  doc.save(`Daily_Sales_${branch}_${monthToYYYYMM(month)}.pdf`)
}

function exportDailySalesExcel(rows: DailySalesSummaryRow[], branch: PLBranch, month: Date) {
  const monthLabel = month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  const branchLabel =
    branch === 'Combined'
      ? 'Combined (KR + C2)'
      : branch === 'KR'
        ? 'Kaappi Ready'
        : 'Coffee Mate C2'

  const headers = [
    'Date',
    'Branch',
    'UPI',
    'Cash Expenses',
    'Cash in Hand',
    'ITI',
    'Ramco',
    'Arun',
    'Ajith',
    'Total Post-Paid',
    'Sales from Collection',
    'Total Shop Sales',
    'Billed Sales',
    'Cash Deposited',
    'Remarks',
  ]

  const aoa: (string | number | null)[][] = [
    ['CafeOS — Daily Sales Summary'],
    [`Branch: ${branchLabel}`],
    [`Month: ${monthLabel}`],
    [],
    headers,
    ...rows.map((r) => [
      r.date,
      r.branch,
      r.upi,
      r.cash_expenses,
      r.cash_in_hand,
      r.iti,
      r.ramco,
      r.arun,
      r.ajith,
      r.total_postpaid,
      r.sales_from_collection,
      r.total_shop_sales,
      DASH,
      r.cash_deposited,
      r.remarks,
    ]),
    [],
    [
      'Month Total',
      '',
      rows.reduce((s, r) => s + (r.upi ?? 0), 0),
      rows.reduce((s, r) => s + r.cash_expenses, 0),
      rows.reduce((s, r) => s + r.cash_in_hand, 0),
      rows.reduce((s, r) => s + (r.iti ?? 0), 0),
      rows.reduce((s, r) => s + (r.ramco ?? 0), 0),
      rows.reduce((s, r) => s + (r.arun ?? 0), 0),
      rows.reduce((s, r) => s + (r.ajith ?? 0), 0),
      rows.reduce((s, r) => s + r.total_postpaid, 0),
      rows.reduce((s, r) => s + r.sales_from_collection, 0),
      rows.reduce((s, r) => s + r.total_shop_sales, 0),
      DASH,
      rows.reduce((s, r) => s + (r.cash_deposited ?? 0), 0),
      '',
    ],
  ]

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = headers.map(() => ({ wch: 14 }))
  ws['!cols'][0] = { wch: 10 }
  ws['!cols'][14] = { wch: 20 }
  XLSX.utils.book_append_sheet(wb, ws, branchLabel.slice(0, 31))
  XLSX.writeFile(wb, `Daily_Sales_${branch}_${monthToYYYYMM(month)}.xlsx`)
}

// ─── Table ────────────────────────────────────────────────────────────────────

const cellSt: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--gray-800)',
  padding: '8px 10px',
  borderBottom: 'var(--border-default)',
  textAlign: 'right',
  whiteSpace: 'nowrap',
}

const headSt: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '10px',
  fontWeight: 600,
  color: 'var(--gray-600)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  padding: '8px 10px',
  textAlign: 'right',
  background: 'var(--gray-50)',
  borderBottom: 'var(--border-strong)',
  whiteSpace: 'nowrap',
}

interface DailySalesTableProps {
  rows: DailySalesSummaryRow[]
  showBranchCol: boolean
}

function DailySalesTable({ rows, showBranchCol }: DailySalesTableProps) {
  // Totals row
  const tot = {
    upi: rows.filter((r) => r.upi !== null).reduce((s, r) => s + (r.upi ?? 0), 0),
    cash_expenses: rows.reduce((s, r) => s + r.cash_expenses, 0),
    cash_in_hand: rows.reduce((s, r) => s + r.cash_in_hand, 0),
    iti: rows.reduce((s, r) => s + (r.iti ?? 0), 0),
    ramco: rows.reduce((s, r) => s + (r.ramco ?? 0), 0),
    arun: rows.reduce((s, r) => s + (r.arun ?? 0), 0),
    ajith: rows.reduce((s, r) => s + (r.ajith ?? 0), 0),
    total_postpaid: rows.reduce((s, r) => s + r.total_postpaid, 0),
    sales_from_collection: rows.reduce((s, r) => s + r.sales_from_collection, 0),
    total_shop_sales: rows.reduce((s, r) => s + r.total_shop_sales, 0),
    cash_deposited: rows.reduce((s, r) => s + (r.cash_deposited ?? 0), 0),
  }
  const upiMissing = rows.filter((r) => r.upi === null).length

  return (
    <div className="overflow-x-auto">
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
        <thead>
          <tr>
            <th style={{ ...headSt, textAlign: 'left', width: '70px' }}>Date</th>
            {showBranchCol && (
              <th style={{ ...headSt, textAlign: 'left', width: '50px' }}>Branch</th>
            )}
            <th style={{ ...headSt, width: '90px' }}>
              UPI
              <span
                style={{
                  marginLeft: '3px',
                  color: 'var(--gray-400)',
                  fontWeight: 400,
                  textTransform: 'none',
                  fontSize: '9px',
                }}
              >
                {upiMissing > 0 ? `(${upiMissing} missing)` : ''}
              </span>
            </th>
            <th style={{ ...headSt, width: '90px' }}>Cash Exp</th>
            <th style={{ ...headSt, width: '90px' }}>Cash in Hand</th>
            <th style={{ ...headSt, width: '75px' }}>ITI</th>
            <th style={{ ...headSt, width: '75px' }}>Ramco</th>
            <th style={{ ...headSt, width: '75px' }}>Arun</th>
            <th style={{ ...headSt, width: '75px' }}>Ajith</th>
            <th style={{ ...headSt, width: '90px' }}>Post-Paid</th>
            <th style={{ ...headSt, width: '100px' }}>Collection</th>
            <th style={{ ...headSt, width: '100px' }}>Shop Sales</th>
            <th style={{ ...headSt, width: '80px', color: 'var(--gray-400)' }}>Billed</th>
            <th style={{ ...headSt, width: '90px' }}>Deposited</th>
            <th style={{ ...headSt, textAlign: 'left', width: '120px' }}>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={`${row.date}:${row.branch}`}
              style={{ background: i % 2 === 0 ? undefined : 'var(--gray-50)' }}
            >
              <td
                style={{
                  ...cellSt,
                  textAlign: 'left',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 500,
                  fontSize: '12px',
                }}
              >
                {fmtDate(row.date)}
              </td>
              {showBranchCol && (
                <td
                  style={{
                    ...cellSt,
                    textAlign: 'left',
                    fontFamily: 'var(--font-body)',
                    fontSize: '11px',
                    color: row.branch === 'KR' ? 'var(--brand-primary)' : 'var(--color-secondary)',
                    fontWeight: 600,
                  }}
                >
                  {row.branch}
                </td>
              )}
              {/* UPI — show dash with tooltip if not entered */}
              <td style={{ ...cellSt }}>
                {row.upi !== null ? (
                  fmtInr(row.upi)
                ) : (
                  <span
                    title="UPI not yet entered for this date"
                    style={{
                      color: 'var(--gray-400)',
                      fontFamily: 'var(--font-mono)',
                      cursor: 'help',
                    }}
                    data-testid="upi-dash-cell"
                  >
                    {DASH}
                  </span>
                )}
              </td>
              <td style={cellSt}>{fmtInr(row.cash_expenses)}</td>
              <td style={cellSt}>{fmtInr(row.cash_in_hand)}</td>
              {/* KR-only columns */}
              <td style={cellSt}>
                {row.branch === 'KR' ? (
                  fmtCell(row.iti)
                ) : (
                  <span style={{ color: 'var(--gray-400)' }}>{DASH}</span>
                )}
              </td>
              <td style={cellSt}>
                {row.branch === 'KR' ? (
                  fmtCell(row.ramco)
                ) : (
                  <span style={{ color: 'var(--gray-400)' }}>{DASH}</span>
                )}
              </td>
              <td style={cellSt}>
                {row.branch === 'KR' ? (
                  fmtCell(row.arun)
                ) : (
                  <span style={{ color: 'var(--gray-400)' }}>{DASH}</span>
                )}
              </td>
              <td style={cellSt}>
                {row.branch === 'KR' ? (
                  fmtCell(row.ajith)
                ) : (
                  <span style={{ color: 'var(--gray-400)' }}>{DASH}</span>
                )}
              </td>
              <td style={cellSt}>{fmtInr(row.total_postpaid)}</td>
              <td style={cellSt}>{fmtInr(row.sales_from_collection)}</td>
              <td style={{ ...cellSt, fontWeight: 700, color: 'var(--gray-900)' }}>
                {fmtInr(row.total_shop_sales)}
              </td>
              {/* Billed Sales — Phase 12 */}
              <td
                style={{ ...cellSt, color: 'var(--gray-400)' }}
                title="Available after Phase 12 (POS)"
                data-testid="billed-sales-dash-cell"
              >
                {DASH}
              </td>
              <td style={cellSt}>{fmtCell(row.cash_deposited)}</td>
              <td
                style={{
                  ...cellSt,
                  textAlign: 'left',
                  fontFamily: 'var(--font-body)',
                  fontSize: '11px',
                  color: 'var(--gray-600)',
                  maxWidth: '120px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {row.remarks ?? ''}
              </td>
            </tr>
          ))}

          {/* Month Total row */}
          <tr
            style={{ background: 'var(--gray-100)', borderTop: '2px solid var(--gray-300)' }}
            data-testid="month-total-row"
          >
            <td
              style={{
                ...cellSt,
                textAlign: 'left',
                fontFamily: 'var(--font-body)',
                fontWeight: 700,
                fontSize: '12px',
                color: 'var(--gray-900)',
              }}
            >
              Total
            </td>
            {showBranchCol && <td style={cellSt} />}
            <td style={{ ...cellSt, fontWeight: 700 }}>
              {fmtInr(tot.upi)}
              {upiMissing > 0 && (
                <span
                  style={{
                    display: 'block',
                    color: 'var(--gray-500)',
                    fontSize: '10px',
                    fontFamily: 'var(--font-body)',
                    fontWeight: 400,
                  }}
                >
                  * {upiMissing} days missing
                </span>
              )}
            </td>
            <td style={{ ...cellSt, fontWeight: 700 }}>{fmtInr(tot.cash_expenses)}</td>
            <td style={{ ...cellSt, fontWeight: 700 }}>{fmtInr(tot.cash_in_hand)}</td>
            <td style={{ ...cellSt, fontWeight: 700 }}>{fmtInr(tot.iti)}</td>
            <td style={{ ...cellSt, fontWeight: 700 }}>{fmtInr(tot.ramco)}</td>
            <td style={{ ...cellSt, fontWeight: 700 }}>{fmtInr(tot.arun)}</td>
            <td style={{ ...cellSt, fontWeight: 700 }}>{fmtInr(tot.ajith)}</td>
            <td style={{ ...cellSt, fontWeight: 700 }}>{fmtInr(tot.total_postpaid)}</td>
            <td style={{ ...cellSt, fontWeight: 700 }}>{fmtInr(tot.sales_from_collection)}</td>
            <td style={{ ...cellSt, fontWeight: 700, color: 'var(--brand-primary)' }}>
              {fmtInr(tot.total_shop_sales)}
            </td>
            <td style={{ ...cellSt, color: 'var(--gray-400)' }}>{DASH}</td>
            <td style={{ ...cellSt, fontWeight: 700 }}>{fmtInr(tot.cash_deposited)}</td>
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DailySalesSummary() {
  const navigate = useNavigate()

  const todayStr = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }, [])

  const [monthValue, setMonthValue] = useState(todayStr)
  const [branch, setBranch] = useState<PLBranch>('KR')

  const month = useMemo(() => {
    const [y, m] = monthValue.split('-').map(Number)
    return new Date(y, m - 1, 1)
  }, [monthValue])

  const { data, isLoading } = useDailySalesSummary(branch, month)

  const rows = data?.rows ?? []
  const totals = data?.totals

  const handleExportPDF = () => exportDailySalesPDF(rows, branch, month)
  const handleExportExcel = () => exportDailySalesExcel(rows, branch, month)

  const showBranchCol = branch === 'Combined'

  return (
    <PageContainer data-testid="daily-sales-page">
      <PageHeader
        title="Daily Sales Summary"
        subtitle="Cash, UPI, delivery and post-paid by day"
        action={
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-2)',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={rows.length === 0}
              data-testid="export-pdf"
            >
              <Download size={14} className="mr-1" />
              Export PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={rows.length === 0}
              data-testid="export-excel"
            >
              <FileSpreadsheet size={14} className="mr-1" />
              Export Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/reports')}>
              <ArrowLeft size={14} className="mr-1" />
              Reports
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Total Shop Sales"
          value={totals ? fmtInr(totals.total_shop_sales) : '—'}
          subtitle={`${rows.length} day${rows.length !== 1 ? 's' : ''}`}
          status="info"
        />
        <KPICard
          title="Total UPI"
          value={totals ? fmtInr(totals.upi) : '—'}
          subtitle={totals ? `${totals.upi_days_missing} days missing` : '—'}
          status={totals && totals.upi_days_missing > 0 ? 'warning' : 'none'}
        />
        <KPICard
          title="Total Post-Paid"
          value={totals ? fmtInr(totals.total_postpaid) : '—'}
          subtitle="KR customers"
          status="none"
        />
        <KPICard
          title="Cash Deposited"
          value={totals ? fmtInr(totals.cash_deposited) : '—'}
          subtitle="Supervisor deposits"
          status="none"
        />
      </div>

      {/* Controls */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-4)',
          alignItems: 'center',
          marginBottom: 'var(--space-5)',
          flexWrap: 'wrap',
        }}
      >
        <Tabs value={branch} onValueChange={(v) => setBranch(v as PLBranch)}>
          <TabsList data-testid="branch-tabs">
            <TabsTrigger value="KR" data-testid="branch-kr">
              KR
            </TabsTrigger>
            <TabsTrigger value="C2" data-testid="branch-c2">
              C2
            </TabsTrigger>
            <TabsTrigger value="Combined" data-testid="branch-combined">
              Combined
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <label
            htmlFor="ds-month"
            style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--gray-700)' }}
          >
            Month:
          </label>
          <Input
            id="ds-month"
            type="month"
            value={monthValue}
            onChange={(e) => setMonthValue(e.target.value)}
            style={{ width: '160px' }}
            data-testid="month-picker"
          />
        </div>

        {/* Legend */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
            marginLeft: 'auto',
          }}
        >
          <Info size={13} style={{ color: 'var(--gray-400)' }} />
          <span
            style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--gray-500)' }}
          >
            {DASH} = not yet entered · Billed Sales available after Phase 12 (POS)
          </span>
        </div>
      </div>

      {/* Table */}
      <SectionCard padding="none">
        {isLoading ? (
          <div style={{ padding: 'var(--space-4)' }}>
            <TableSkeleton cols={14} />
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
            <p
              style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--gray-500)' }}
            >
              No data found for{' '}
              {month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        ) : (
          <DailySalesTable rows={rows} showBranchCol={showBranchCol} />
        )}
      </SectionCard>
    </PageContainer>
  )
}

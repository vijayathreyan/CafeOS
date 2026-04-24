import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, FileSpreadsheet, AlertTriangle, Save } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import PageContainer from '@/components/layouts/PageContainer'
import PageHeader from '@/components/layouts/PageHeader'
import SectionCard from '@/components/ui/SectionCard'
import KPICard from '@/components/ui/KPICard'
import AmountDisplay from '@/components/ui/AmountDisplay'
import { TableSkeleton } from '@/components/ui/LoadingSkeletons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { usePLReport } from '@/hooks/usePLReport'
import { useSavePLOverride, usePLMonthlyOverride } from '@/hooks/usePLMonthlyOverride'
import { useSalaryEntries, useSaveSalaryEntries } from '@/hooks/useSalaryEntries'
import type { PLBranch, PLSection, PLLineItem } from '@/types/phase8'
import { monthToYYYYMM, fmtInr, plBranchLabel } from '@/types/phase8'
import { STAFF_BY_BRANCH } from '@/types/phase4'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function varianceColor(v: number): string {
  if (v > 0) return 'var(--color-success)'
  if (v < 0) return 'var(--color-danger)'
  return 'var(--gray-600)'
}

function fmtVariance(v: number): string {
  const sign = v > 0 ? '+' : ''
  return sign + fmtInr(v)
}

// ─── PL Section Table ─────────────────────────────────────────────────────────

interface PLSectionTableProps {
  section: PLSection
  prevLabel: string
  'data-testid'?: string
}

function PLSectionTable({ section, prevLabel, 'data-testid': testId }: PLSectionTableProps) {
  const cellStyle: React.CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontSize: '13px',
    color: 'var(--gray-800)',
    padding: '10px 16px',
    borderBottom: 'var(--border-default)',
  }
  const thStyle: React.CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--gray-600)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    padding: '10px 16px',
    textAlign: 'right' as const,
    background: 'var(--gray-50)',
    borderBottom: 'var(--border-strong)',
  }

  return (
    <SectionCard title={section.title} padding="none" data-testid={testId}>
      <div className="overflow-x-auto">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: 'left', width: '45%' }}>Line Item</th>
              <th style={thStyle}>Current Month</th>
              <th style={thStyle}>{prevLabel}</th>
              <th style={thStyle}>Variance</th>
            </tr>
          </thead>
          <tbody>
            {section.lines.map((line, i) => (
              <tr
                key={i}
                style={{
                  background: line.isTotal ? 'var(--gray-50)' : undefined,
                  fontWeight: line.isTotal ? 700 : undefined,
                }}
              >
                <td style={cellStyle}>
                  {line.label}
                  {line.note && (
                    <span style={{ color: 'var(--gray-500)', fontSize: '11px', marginLeft: '6px' }}>
                      ({line.note})
                    </span>
                  )}
                </td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>
                  <AmountDisplay amount={line.current} size="sm" />
                </td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>
                  <AmountDisplay amount={line.previous} size="sm" variant="muted" />
                </td>
                <td
                  style={{
                    ...cellStyle,
                    textAlign: 'right',
                    color: varianceColor(line.variance),
                    fontFamily: 'var(--font-mono)',
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: '13px',
                  }}
                >
                  {fmtVariance(line.variance)}
                </td>
              </tr>
            ))}
            {/* Section Total */}
            <tr style={{ background: 'var(--gray-50)', borderTop: 'var(--border-strong)' }}>
              <td style={{ ...cellStyle, fontWeight: 700, color: 'var(--gray-900)' }}>
                Section Total
              </td>
              <td style={{ ...cellStyle, textAlign: 'right' }}>
                <AmountDisplay amount={section.total} size="sm" />
              </td>
              <td style={{ ...cellStyle, textAlign: 'right' }}>
                <AmountDisplay amount={section.prevTotal} size="sm" variant="muted" />
              </td>
              <td
                style={{
                  ...cellStyle,
                  textAlign: 'right',
                  color: varianceColor(section.total - section.prevTotal),
                  fontFamily: 'var(--font-mono)',
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: '13px',
                  fontWeight: 700,
                }}
              >
                {fmtVariance(section.total - section.prevTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </SectionCard>
  )
}

// ─── Salary Entry Form ────────────────────────────────────────────────────────

interface SalaryFormProps {
  branch: 'KR' | 'C2'
  monthStr: string
  userId: string
}

function SalaryEntryForm({ branch, monthStr, userId }: SalaryFormProps) {
  const { toast } = useToast()
  const staffList = STAFF_BY_BRANCH[branch]
  const { data: savedEntries } = useSalaryEntries(monthStr, branch, true)
  const saveSalary = useSaveSalaryEntries(monthStr, branch)
  const [overrides, setOverrides] = useState<Record<string, string>>({})

  const savedAmounts = useMemo<Record<string, string>>(() => {
    if (!savedEntries || savedEntries.length === 0) return {}
    const init: Record<string, string> = {}
    for (const e of savedEntries) {
      init[e.staff_name] = e.amount > 0 ? String(e.amount) : ''
    }
    return init
  }, [savedEntries])

  const amounts = { ...savedAmounts, ...overrides }
  const dirty = Object.keys(overrides).length > 0

  const handleSave = () => {
    const rows = staffList.map((name) => ({
      branch,
      month_year: monthStr,
      staff_name: name,
      amount: Number(amounts[name] ?? 0),
      notes: null,
      entered_by: userId,
    }))
    saveSalary.mutate(rows, {
      onSuccess: () => {
        toast({ title: `${branch} salaries saved`, description: monthStr })
        setOverrides({})
      },
      onError: (e) => {
        toast({ title: 'Save failed', description: (e as Error).message, variant: 'destructive' })
      },
    })
  }

  return (
    <div data-testid={`salary-form-${branch}`} style={{ marginTop: 'var(--space-4)' }}>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--gray-700)',
          marginBottom: 'var(--space-2)',
        }}
      >
        {branch} — Salary Entry
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {staffList.map((name) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                color: 'var(--gray-700)',
                minWidth: '140px',
              }}
            >
              {name}
            </span>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '13px',
                  color: 'var(--gray-500)',
                }}
              >
                ₹
              </span>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amounts[name] ?? ''}
                placeholder="0.00"
                onChange={(e) => {
                  setOverrides((p) => ({ ...p, [name]: e.target.value }))
                }}
                style={{ paddingLeft: '24px', width: '140px', fontFamily: 'var(--font-mono)' }}
                data-testid={`salary-input-${name.toLowerCase().replace(/\s/g, '-')}`}
              />
            </div>
          </div>
        ))}
      </div>
      <Button
        size="sm"
        onClick={handleSave}
        disabled={saveSalary.isLoading || !dirty}
        style={{ marginTop: 'var(--space-3)' }}
        data-testid={`salary-save-${branch}`}
      >
        <Save size={14} className="mr-1" />
        {saveSalary.isLoading ? 'Saving…' : 'Save Salaries'}
      </Button>
    </div>
  )
}

// ─── EB Bill Entry ────────────────────────────────────────────────────────────

interface EBBillEntryProps {
  branch: 'KR' | 'C2'
  month: Date
  userId: string
}

function EBBillEntry({ branch, month, userId }: EBBillEntryProps) {
  const { toast } = useToast()
  const { data: override } = usePLMonthlyOverride(branch, month)
  const saveOverride = useSavePLOverride()
  const [localAmount, setLocalAmount] = useState<string | null>(null)

  const dbAmount = override?.eb_bill_amount ?? 0
  const displayAmount = localAmount ?? (dbAmount > 0 ? String(dbAmount) : '')
  const dirty = localAmount !== null

  const handleSave = () => {
    saveOverride.mutate(
      {
        branch,
        month,
        eb_bill_amount: Number(displayAmount) || 0,
        notes: null,
        updated_by: userId,
      },
      {
        onSuccess: () => {
          toast({ title: `EB Bill saved for ${branch}` })
          setLocalAmount(null)
        },
        onError: (e) => {
          toast({ title: 'Save failed', description: (e as Error).message, variant: 'destructive' })
        },
      }
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        marginTop: 'var(--space-3)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '13px',
          color: 'var(--gray-700)',
          minWidth: '80px',
        }}
      >
        {branch} EB Bill
      </span>
      <div style={{ position: 'relative' }}>
        <span
          style={{
            position: 'absolute',
            left: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            color: 'var(--gray-500)',
          }}
        >
          ₹
        </span>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={displayAmount}
          placeholder="0.00"
          onChange={(e) => {
            setLocalAmount(e.target.value)
          }}
          style={{ paddingLeft: '24px', width: '140px', fontFamily: 'var(--font-mono)' }}
          data-testid={`eb-bill-input-${branch.toLowerCase()}`}
        />
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={handleSave}
        disabled={saveOverride.isLoading || !dirty}
        data-testid={`eb-bill-save-${branch.toLowerCase()}`}
      >
        <Save size={14} className="mr-1" />
        {saveOverride.isLoading ? 'Saving…' : 'Save'}
      </Button>
    </div>
  )
}

// ─── Export Functions ─────────────────────────────────────────────────────────

function exportPLPDF(
  data: PLReportData_Local,
  branch: PLBranch,
  month: Date,
  prevMonthLabel: string
) {
  const doc = new jsPDF()
  const monthLabel = month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('CafeOS — Monthly P&L Report', 14, 15)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Branch: ${plBranchLabel(branch)}`, 14, 22)
  doc.text(`Month: ${monthLabel}`, 14, 27)
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 32)

  let y = 38
  autoTable(doc, {
    startY: y,
    head: [['KPI', 'Value']],
    body: [
      ['Total Sales', fmtInr(data.totalSales)],
      ['Total Expenses', fmtInr(data.totalExpenses)],
      ['Gross Profit', fmtInr(data.grossProfit)],
    ],
    theme: 'striped',
    headStyles: { fillColor: [26, 115, 232] },
  })

  for (const section of data.sections) {
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
    if (y > 260) {
      doc.addPage()
      y = 14
    }
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(section.title, 14, y)
    autoTable(doc, {
      startY: y + 3,
      head: [['Line Item', 'Current', prevMonthLabel, 'Variance']],
      body: [
        ...section.lines.map((l) => [
          l.label + (l.note ? ` (${l.note})` : ''),
          fmtInr(l.current),
          fmtInr(l.previous),
          fmtVariance(l.variance),
        ]),
        [
          'Section Total',
          fmtInr(section.total),
          fmtInr(section.prevTotal),
          fmtVariance(section.total - section.prevTotal),
        ],
      ],
      theme: 'grid',
      headStyles: { fillColor: [100, 100, 100], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      didParseCell: (data) => {
        if (data.row.index === section.lines.length) {
          data.cell.styles.fontStyle = 'bold'
        }
      },
      foot: [],
    })
  }

  doc.setProperties({ title: `PL_${branch}_${monthToYYYYMM(month)}` })
  doc.save(`PL_Report_${branch}_${monthToYYYYMM(month)}.pdf`)
}

interface PLReportData_Local {
  sections: PLSection[]
  totalSales: number
  totalExpenses: number
  grossProfit: number
  capitalPurchases: PLLineItem[]
  prevTotalSales: number
  prevTotalExpenses: number
  prevGrossProfit: number
  hasFixedCostFallback: boolean
}

function exportPLExcel(
  data: PLReportData_Local,
  branch: PLBranch,
  month: Date,
  prevMonthLabel: string
) {
  const wb = XLSX.utils.book_new()
  const monthLabel = month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  const aoa: (string | number)[][] = [
    ['CafeOS — Monthly P&L Report'],
    [`Branch: ${plBranchLabel(branch)}`],
    [`Month: ${monthLabel}`],
    [],
    ['KPI Summary', 'Value'],
    ['Total Sales', data.totalSales],
    ['Total Expenses', data.totalExpenses],
    ['Gross Profit', data.grossProfit],
    [],
  ]

  for (const section of data.sections) {
    aoa.push([section.title])
    aoa.push(['Line Item', 'Current Month', prevMonthLabel, 'Variance'])
    for (const line of section.lines) {
      aoa.push([
        line.label + (line.note ? ` (${line.note})` : ''),
        line.current,
        line.previous,
        line.variance,
      ])
    }
    aoa.push(['Section Total', section.total, section.prevTotal, section.total - section.prevTotal])
    aoa.push([])
  }

  if (data.capitalPurchases.length > 0) {
    aoa.push(['Capital Purchases (not in Total Expenses)'])
    aoa.push(['Description', 'Amount'])
    for (const cp of data.capitalPurchases) {
      aoa.push([cp.label, cp.current])
    }
    aoa.push([])
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = [{ wch: 36 }, { wch: 16 }, { wch: 16 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, ws, plBranchLabel(branch).slice(0, 31))
  XLSX.writeFile(wb, `PL_Report_${branch}_${monthToYYYYMM(month)}.xlsx`)
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PLReport() {
  const navigate = useNavigate()
  const { user } = useAuth()

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

  const monthStr = monthToYYYYMM(month)
  const prevMonthDate = new Date(month.getFullYear(), month.getMonth() - 1, 1)
  const prevMonthLabel = prevMonthDate.toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  })

  const { data: plData, isLoading } = usePLReport({ branch, month })

  const salaryBranches: Array<'KR' | 'C2'> = branch === 'Combined' ? ['KR', 'C2'] : [branch]

  const handleExportPDF = () => {
    if (!plData) return
    exportPLPDF(plData, branch, month, prevMonthLabel)
  }

  const handleExportExcel = () => {
    if (!plData) return
    exportPLExcel(plData, branch, month, prevMonthLabel)
  }

  const sectionTestIds: Record<string, string> = {
    section1: 'section-1',
    section2: 'section-2',
    section3: 'section-3',
    section4: 'section-4',
    section5: 'section-5',
  }

  return (
    <PageContainer data-testid="pl-report-page">
      <PageHeader
        title="P&L Report"
        subtitle="Monthly profit & loss — all sections auto-populated"
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
              disabled={!plData}
              data-testid="export-pdf"
            >
              <Download size={14} className="mr-1" />
              Export PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={!plData}
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6" data-testid="kpi-row">
        <KPICard
          title="Total Sales"
          value={plData ? fmtInr(plData.totalSales) : '—'}
          subtitle="Revenue this month"
          status="info"
        />
        <KPICard
          title="Total Expenses"
          value={plData ? fmtInr(plData.totalExpenses) : '—'}
          subtitle="All categories"
          status="warning"
        />
        <KPICard
          title="Gross Profit"
          value={plData ? fmtInr(plData.grossProfit) : '—'}
          subtitle="Sales minus expenses"
          status={plData && plData.grossProfit >= 0 ? 'success' : 'danger'}
        />
        <KPICard
          title="Net Profit"
          value={plData ? fmtInr(plData.grossProfit) : '—'}
          subtitle="Same as Gross Profit"
          status="none"
        />
      </div>

      {/* Controls row */}
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
            htmlFor="pl-month"
            style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--gray-700)' }}
          >
            Month:
          </label>
          <Input
            id="pl-month"
            type="month"
            value={monthValue}
            onChange={(e) => setMonthValue(e.target.value)}
            style={{ width: '160px' }}
            data-testid="month-picker"
          />
        </div>
      </div>

      {/* Fixed Cost Fallback Notice */}
      {plData?.hasFixedCostFallback && (
        <div
          data-testid="fixed-cost-fallback"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--color-warning-bg)',
            border: '1px solid var(--color-warning)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-4)',
          }}
        >
          <AlertTriangle size={16} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
          <span
            style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--gray-800)' }}
          >
            Fixed costs not yet configured in Admin Settings — using defaults.
          </span>
        </div>
      )}

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <SectionCard key={i} padding="default">
              <TableSkeleton cols={4} />
            </SectionCard>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Sections 1–3 and 5 */}
          {plData?.sections
            .filter((s) => s.id !== 'section4')
            .map((section) => (
              <PLSectionTable
                key={section.id}
                section={section}
                prevLabel={prevMonthLabel}
                data-testid={sectionTestIds[section.id] ?? section.id}
              />
            ))}

          {/* Section 4 — Salary (with inline entry form) */}
          {plData?.sections
            .filter((s) => s.id === 'section4')
            .map((section) => (
              <SectionCard
                key={section.id}
                title={section.title}
                padding="none"
                data-testid="section-4"
              >
                <div className="overflow-x-auto">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr
                        style={{
                          background: 'var(--gray-50)',
                          borderBottom: 'var(--border-strong)',
                        }}
                      >
                        <th
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--gray-600)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            padding: '10px 16px',
                            textAlign: 'left',
                            width: '45%',
                          }}
                        >
                          Employee
                        </th>
                        <th
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--gray-600)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            padding: '10px 16px',
                            textAlign: 'right',
                          }}
                        >
                          Current Month
                        </th>
                        <th
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--gray-600)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            padding: '10px 16px',
                            textAlign: 'right',
                          }}
                        >
                          {prevMonthLabel}
                        </th>
                        <th
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--gray-600)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            padding: '10px 16px',
                            textAlign: 'right',
                          }}
                        >
                          Variance
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.lines.map((line, i) => (
                        <tr key={i} style={{ borderBottom: 'var(--border-default)' }}>
                          <td
                            style={{
                              fontFamily: 'var(--font-body)',
                              fontSize: '13px',
                              color: 'var(--gray-800)',
                              padding: '10px 16px',
                            }}
                          >
                            {line.label}
                          </td>
                          <td
                            style={{
                              fontFamily: 'var(--font-body)',
                              fontSize: '13px',
                              padding: '10px 16px',
                              textAlign: 'right',
                            }}
                          >
                            <AmountDisplay amount={line.current} size="sm" />
                          </td>
                          <td
                            style={{
                              fontFamily: 'var(--font-body)',
                              fontSize: '13px',
                              padding: '10px 16px',
                              textAlign: 'right',
                            }}
                          >
                            <AmountDisplay amount={line.previous} size="sm" variant="muted" />
                          </td>
                          <td
                            style={{
                              padding: '10px 16px',
                              textAlign: 'right',
                              color: varianceColor(line.variance),
                              fontFamily: 'var(--font-mono)',
                              fontSize: '13px',
                            }}
                          >
                            {fmtVariance(line.variance)}
                          </td>
                        </tr>
                      ))}
                      <tr
                        style={{ background: 'var(--gray-50)', borderTop: 'var(--border-strong)' }}
                      >
                        <td
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: '13px',
                            color: 'var(--gray-900)',
                            padding: '10px 16px',
                            fontWeight: 700,
                          }}
                        >
                          Section Total
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700 }}>
                          <AmountDisplay amount={section.total} size="sm" />
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                          <AmountDisplay amount={section.prevTotal} size="sm" variant="muted" />
                        </td>
                        <td
                          style={{
                            padding: '10px 16px',
                            textAlign: 'right',
                            color: varianceColor(section.total - section.prevTotal),
                            fontFamily: 'var(--font-mono)',
                            fontSize: '13px',
                            fontWeight: 700,
                          }}
                        >
                          {fmtVariance(section.total - section.prevTotal)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {/* Inline salary entry form — owner only */}
                <div
                  style={{ padding: 'var(--space-4)', borderTop: 'var(--border-default)' }}
                  data-testid="salary-form"
                >
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--gray-600)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: 'var(--space-3)',
                    }}
                  >
                    Enter Salaries for {monthStr}
                  </p>
                  <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
                    {salaryBranches.map((b) => (
                      <SalaryEntryForm
                        key={b}
                        branch={b}
                        monthStr={monthStr}
                        userId={user?.id ?? ''}
                      />
                    ))}
                  </div>
                </div>
              </SectionCard>
            ))}

          {/* EB Bill inline entry — embedded in Bills section footer */}
          <SectionCard
            title="EB Bill Entry"
            description="Enter monthly electricity bills per branch"
            padding="default"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {salaryBranches.map((b) => (
                <EBBillEntry key={b} branch={b} month={month} userId={user?.id ?? ''} />
              ))}
            </div>
          </SectionCard>

          {/* Capital Purchases (shown below expenses) */}
          {plData && plData.capitalPurchases.length > 0 && (
            <SectionCard
              title="Capital Purchases"
              description="Not included in Total Expenses"
              status="warning"
              padding="default"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {plData.capitalPurchases.map((cp, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '13px',
                        color: 'var(--gray-700)',
                      }}
                    >
                      {cp.label}
                    </span>
                    <AmountDisplay amount={cp.current} size="sm" />
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Summary bottom */}
          {plData && (
            <SectionCard title="Summary" padding="default">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '14px',
                      color: 'var(--gray-700)',
                    }}
                  >
                    Total Sales
                  </span>
                  <AmountDisplay amount={plData.totalSales} size="md" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '14px',
                      color: 'var(--gray-700)',
                    }}
                  >
                    Total Expenses
                  </span>
                  <AmountDisplay amount={plData.totalExpenses} size="md" />
                </div>
                <div
                  style={{
                    height: '1px',
                    background: 'var(--gray-200)',
                    margin: 'var(--space-1) 0',
                  }}
                />
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '16px',
                      fontWeight: 700,
                      color: 'var(--gray-900)',
                    }}
                  >
                    Gross Profit / Net Profit
                  </span>
                  <AmountDisplay
                    amount={plData.grossProfit}
                    size="lg"
                    variant={plData.grossProfit >= 0 ? 'positive' : 'negative'}
                  />
                </div>
              </div>
            </SectionCard>
          )}
        </div>
      )}
    </PageContainer>
  )
}

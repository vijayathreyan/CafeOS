import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExportColumn {
  header: string
  key: string
  width?: number
  align?: 'left' | 'right' | 'center'
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

/**
 * Export data to PDF using jspdf-autotable.
 * Header: "CafeOS — Unlimited Food Works" left · branch + period right
 * Footer: "Generated: <timestamp>  Page X of Y"
 * Alternating row shading, totals row bolded.
 */
export function exportToPDF(
  title: string,
  branch: string,
  period: string,
  columns: ExportColumn[],
  rows: Record<string, string | number>[],
  totalsRow?: Record<string, string | number>
): void {
  const isLandscape = columns.length > 6
  const doc = new jsPDF({ orientation: isLandscape ? 'landscape' : 'portrait' })

  // Header
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('CafeOS — Unlimited Food Works', 14, 12)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const pageWidth = isLandscape ? 297 : 210
  doc.text(`Branch: ${branch}   Period: ${period}`, pageWidth - 14, 12, { align: 'right' })

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 14, 20)

  // Table body
  const head = [columns.map((c) => c.header)]
  const body = rows.map((row) => columns.map((c) => String(row[c.key] ?? '')))

  if (totalsRow) {
    body.push(columns.map((c) => String(totalsRow[c.key] ?? '')))
  }

  const totalRowIndex = totalsRow ? rows.length : -1

  autoTable(doc, {
    startY: 24,
    head,
    body,
    theme: 'striped',
    headStyles: { fillColor: [26, 115, 232], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === totalRowIndex) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = [230, 236, 245]
      }
    },
    didDrawPage: (data) => {
      // Footer
      const pageCount = (
        doc as unknown as { internal: { getNumberOfPages: () => number } }
      ).internal.getNumberOfPages()
      const pageNum = data.pageNumber
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      const footerY = isLandscape ? 205 : 290
      doc.text(
        `Generated: ${new Date().toLocaleString('en-IN')}   Page ${pageNum} of ${pageCount}`,
        14,
        footerY
      )
    },
    columnStyles: columns.reduce(
      (acc, col, i) => {
        if (col.align) {
          acc[i] = {
            halign: col.align as 'left' | 'right' | 'center',
          }
        }
        return acc
      },
      {} as Record<number, { halign: 'left' | 'right' | 'center' }>
    ),
  })

  const safeTitle = title.replace(/[^a-zA-Z0-9_]/g, '_')
  doc.save(`${safeTitle}_${branch.replace(/\s/g, '_')}.pdf`)
}

// ─── Excel Export ─────────────────────────────────────────────────────────────

/**
 * Export data to Excel using xlsx.
 * Sheet name = title (truncated to 31 chars).
 * Row 1: branch, Row 2: period, Row 3: blank, Row 4+: table with bold header.
 * Header row: bold + light blue fill (#E8F0FE).
 * Totals row: bold.
 * Auto-fit column widths.
 */
export function exportToExcel(
  title: string,
  branch: string,
  period: string,
  columns: ExportColumn[],
  rows: Record<string, string | number>[],
  totalsRow?: Record<string, string | number>
): void {
  const headers = columns.map((c) => c.header)
  const dataRows = rows.map((row) => columns.map((c) => row[c.key] ?? ''))

  const aoa: (string | number)[][] = [
    [`Branch: ${branch}`],
    [`Period: ${period}`],
    [],
    headers,
    ...dataRows,
  ]

  if (totalsRow) {
    aoa.push(columns.map((c) => totalsRow[c.key] ?? ''))
  }

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(aoa)

  // Auto-fit column widths: use ExportColumn.width if given, else compute from content
  ws['!cols'] = columns.map((col, i) => {
    if (col.width) return { wch: col.width }
    // Estimate from header and data
    const maxLen = Math.max(
      col.header.length,
      ...rows.map((r) => String(r[col.key] ?? '').length),
      totalsRow ? String(totalsRow[columns[i].key] ?? '').length : 0
    )
    return { wch: Math.min(maxLen + 2, 40) }
  })

  const sheetName = title.slice(0, 31)
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  const safeTitle = title.replace(/[^a-zA-Z0-9_]/g, '_')
  XLSX.writeFile(wb, `${safeTitle}_${branch.replace(/\s/g, '_')}.xlsx`)
}

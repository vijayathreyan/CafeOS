import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export interface ColumnDef<T> {
  header: string
  accessor: keyof T | ((row: T) => React.ReactNode)
  align?: 'left' | 'center' | 'right'
  width?: string
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  isLoading?: boolean
  emptyState?: React.ReactNode
  className?: string
  onRowClick?: (row: T) => void
  rowKey?: (row: T, idx: number) => string | number
}

/**
 * Consistent table component for all list views.
 * Supports loading skeletons, empty states, and click handlers.
 */
export default function DataTable<T extends object>({
  columns,
  data,
  isLoading = false,
  emptyState,
  className,
  onRowClick,
  rowKey,
}: DataTableProps<T>) {
  return (
    <div
      className={cn('overflow-x-auto', className)}
      style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        {/* Header */}
        <thead>
          <tr
            style={{
              background: 'var(--gray-50)',
              borderBottom: 'var(--border-strong)',
            }}
          >
            {columns.map((col, i) => (
              <th
                key={i}
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--gray-600)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  padding: '12px 16px',
                  textAlign: col.align ?? 'left',
                  width: col.width,
                  whiteSpace: 'nowrap',
                  borderBottom: 'var(--border-strong)',
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, rowIdx) => (
              <tr key={rowIdx} style={{ borderBottom: 'var(--border-default)' }}>
                {columns.map((_, colIdx) => (
                  <td key={colIdx} style={{ padding: '14px 16px' }}>
                    <Skeleton className="h-4 w-full" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: '48px 16px', textAlign: 'center' }}>
                {emptyState ?? (
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--gray-500)',
                    }}
                  >
                    No records found
                  </span>
                )}
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr
                key={rowKey ? rowKey(row, rowIdx) : rowIdx}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={{
                  borderBottom: 'var(--border-default)',
                  cursor: onRowClick ? 'pointer' : undefined,
                  transition: 'background var(--transition-fast)',
                }}
                onMouseEnter={
                  onRowClick
                    ? (e) => {
                        ;(e.currentTarget as HTMLTableRowElement).style.background =
                          'var(--gray-50)'
                      }
                    : undefined
                }
                onMouseLeave={
                  onRowClick
                    ? (e) => {
                        ;(e.currentTarget as HTMLTableRowElement).style.background = ''
                      }
                    : undefined
                }
              >
                {columns.map((col, colIdx) => (
                  <td
                    key={colIdx}
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--gray-800)',
                      padding: '14px 16px',
                      textAlign: col.align ?? 'left',
                    }}
                  >
                    {typeof col.accessor === 'function'
                      ? col.accessor(row)
                      : (row[col.accessor] as React.ReactNode)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

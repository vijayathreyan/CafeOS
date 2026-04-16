import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Pre-built skeleton loading states for common page patterns.
 * Use these instead of spinners or "Loading…" text.
 */

/** 4 KPI stat cards in a row */
export function StatCardSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          style={{
            background: 'var(--brand-surface)',
            border: 'var(--border-default)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-sm)',
            padding: 'var(--space-4)',
          }}
        >
          <Skeleton className="h-3 w-24 mb-3" />
          <Skeleton className="h-7 w-32 mb-2" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  )
}

/** 5-row table skeleton */
export function TableSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <div
      style={{
        background: 'var(--brand-surface)',
        border: 'var(--border-default)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: '16px',
          padding: '12px 16px',
          background: 'var(--gray-50)',
          borderBottom: 'var(--border-strong)',
        }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-full max-w-[100px]" />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: 5 }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: '16px',
            padding: '14px 16px',
            borderBottom: 'var(--border-default)',
          }}
        >
          {Array.from({ length: cols }).map((_, colIdx) => (
            <Skeleton
              key={colIdx}
              className="h-4 w-full"
              style={{ maxWidth: colIdx === 0 ? '160px' : '80px' }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/** 6 card skeletons in a grid */
export function CardGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          style={{
            background: 'var(--brand-surface)',
            border: 'var(--border-default)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-sm)',
            padding: 'var(--space-5)',
          }}
        >
          <div className="flex items-start justify-between mb-3">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-2/3 mb-4" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Single detail page skeleton */
export function DetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        style={{
          background: 'var(--brand-surface)',
          border: 'var(--border-default)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-sm)',
          padding: 'var(--space-6)',
        }}
      >
        <Skeleton className="h-7 w-56 mb-2" />
        <Skeleton className="h-4 w-80 mb-4" />
        <div className="flex gap-3">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 rounded-md" />
        ))}
      </div>

      {/* Content */}
      <div
        style={{
          background: 'var(--brand-surface)',
          border: 'var(--border-default)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-sm)',
          padding: 'var(--space-6)',
        }}
      >
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

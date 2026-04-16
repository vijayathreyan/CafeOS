import React from 'react'
import { cn } from '@/lib/utils'

export type StatusType =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'pending'
  | 'settled'
  | 'overdue'
  | 'inactive'
  | 'paid'
  | 'unpaid'
  | 'active'

interface StatusBadgeProps {
  status: StatusType
  label: string
  size?: 'sm' | 'md'
  dot?: boolean
  className?: string
}

type StyleSet = { bg: string; color: string; border: string }

const styleMap: Record<string, StyleSet> = {
  success: {
    bg: 'var(--color-success-bg)',
    color: 'var(--color-success)',
    border: '1px solid var(--color-success-border)',
  },
  settled: {
    bg: 'var(--color-success-bg)',
    color: 'var(--color-success)',
    border: '1px solid var(--color-success-border)',
  },
  paid: {
    bg: 'var(--color-success-bg)',
    color: 'var(--color-success)',
    border: '1px solid var(--color-success-border)',
  },
  active: {
    bg: 'var(--color-success-bg)',
    color: 'var(--color-success)',
    border: '1px solid var(--color-success-border)',
  },
  warning: {
    bg: 'var(--color-warning-bg)',
    color: 'var(--color-warning)',
    border: '1px solid var(--color-warning-border)',
  },
  pending: {
    bg: 'var(--color-warning-bg)',
    color: 'var(--color-warning)',
    border: '1px solid var(--color-warning-border)',
  },
  danger: {
    bg: 'var(--color-danger-bg)',
    color: 'var(--color-danger)',
    border: '1px solid var(--color-danger-border)',
  },
  overdue: {
    bg: 'var(--color-danger-bg)',
    color: 'var(--color-danger)',
    border: '1px solid var(--color-danger-border)',
  },
  unpaid: {
    bg: 'var(--color-danger-bg)',
    color: 'var(--color-danger)',
    border: '1px solid var(--color-danger-border)',
  },
  info: {
    bg: 'var(--color-info-bg)',
    color: 'var(--color-info)',
    border: '1px solid var(--color-info-border)',
  },
  inactive: {
    bg: 'var(--gray-100)',
    color: 'var(--gray-600)',
    border: '1px solid var(--gray-300)',
  },
}

/**
 * Consistent status badge / pill used throughout the app.
 * Maps semantic status names to appropriate colours from the design system.
 */
export default function StatusBadge({
  status,
  label,
  size = 'md',
  dot = false,
  className,
}: StatusBadgeProps) {
  const styles = styleMap[status] ?? styleMap['inactive']
  const fontSize = size === 'sm' ? '11px' : '12px'
  const padding = size === 'sm' ? '1px 6px' : '2px 8px'

  return (
    <span
      className={cn(className)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: dot ? '5px' : undefined,
        background: styles.bg,
        color: styles.color,
        border: styles.border,
        borderRadius: 'var(--radius-full)',
        fontSize,
        fontWeight: 500,
        fontFamily: 'var(--font-body)',
        padding,
        whiteSpace: 'nowrap',
        lineHeight: '1.4',
      }}
    >
      {dot && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'currentColor',
            flexShrink: 0,
          }}
        />
      )}
      {label}
    </span>
  )
}

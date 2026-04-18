import React from 'react'
import { cn } from '@/lib/utils'

type StatusAccent = 'success' | 'warning' | 'danger' | 'info' | 'none'
type PaddingVariant = 'default' | 'compact' | 'none'

interface SectionCardProps {
  children: React.ReactNode
  title?: string
  description?: string
  action?: React.ReactNode
  padding?: PaddingVariant
  status?: StatusAccent
  className?: string
  onClick?: () => void
  hoverable?: boolean
  'data-testid'?: string
}

const statusColors: Record<StatusAccent, string> = {
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
  info: 'var(--color-info)',
  none: 'transparent',
}

const paddingMap: Record<PaddingVariant, string> = {
  default: 'var(--space-6)',
  compact: 'var(--space-4)',
  none: '0',
}

/**
 * Standard card container used throughout the app.
 * Provides consistent card styling with optional title, description, action, and status accent.
 */
export default function SectionCard({
  children,
  title,
  description,
  action,
  padding = 'default',
  status = 'none',
  className,
  onClick,
  hoverable = false,
  'data-testid': dataTestId,
}: SectionCardProps) {
  const hasHeader = !!(title || description || action)
  const contentPadding = paddingMap[padding]

  return (
    <div
      className={cn(className)}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      data-testid={dataTestId}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onClick()
            }
          : undefined
      }
      style={{
        backgroundColor: 'var(--brand-surface)',
        border: 'var(--border-default)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-sm)',
        borderTop: status !== 'none' ? `3px solid ${statusColors[status]}` : undefined,
        transition: hoverable ? 'all var(--transition-base)' : undefined,
        cursor: onClick ? 'pointer' : undefined,
        overflow: 'hidden',
      }}
      onMouseEnter={
        hoverable
          ? (e) => {
              const el = e.currentTarget as HTMLDivElement
              el.style.boxShadow = 'var(--shadow-md)'
              el.style.transform = 'translateY(-1px)'
            }
          : undefined
      }
      onMouseLeave={
        hoverable
          ? (e) => {
              const el = e.currentTarget as HTMLDivElement
              el.style.boxShadow = 'var(--shadow-sm)'
              el.style.transform = 'translateY(0)'
            }
          : undefined
      }
    >
      {hasHeader && (
        <div
          style={{
            padding: `var(--space-4) var(--space-6)`,
            borderBottom: 'var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-4)',
          }}
        >
          <div>
            {title && (
              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-base)',
                  fontWeight: 'var(--font-semibold)',
                  color: 'var(--gray-900)',
                  margin: 0,
                  lineHeight: 'var(--leading-tight)',
                }}
              >
                {title}
              </h3>
            )}
            {description && (
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--gray-500)',
                  marginTop: '2px',
                  marginBottom: 0,
                }}
              >
                {description}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {padding !== 'none' ? <div style={{ padding: contentPadding }}>{children}</div> : children}
    </div>
  )
}

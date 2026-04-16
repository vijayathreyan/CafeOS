import React from 'react'
import { type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

/**
 * Consistent empty state for all list pages.
 * Shows an icon, title, optional description, and optional CTA.
 */
export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: '4rem',
        paddingBottom: '4rem',
        textAlign: 'center',
      }}
    >
      {/* Icon background circle */}
      <div
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'var(--gray-100)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon
          style={{ width: '48px', height: '48px', color: 'var(--gray-400)' }}
          strokeWidth={1.5}
        />
      </div>

      {/* Title */}
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-lg)',
          fontWeight: 'var(--font-semibold)',
          color: 'var(--gray-800)',
          marginTop: 'var(--space-4)',
          marginBottom: 0,
        }}
      >
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            color: 'var(--gray-500)',
            marginTop: 'var(--space-2)',
            marginBottom: 0,
            maxWidth: '360px',
          }}
        >
          {description}
        </p>
      )}

      {/* Action */}
      {action && <div style={{ marginTop: 'var(--space-4)' }}>{action}</div>}
    </div>
  )
}

import React from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  breadcrumb?: BreadcrumbItem[]
  className?: string
}

/**
 * Consistent page header for every page in the app.
 * Renders title, optional subtitle, optional breadcrumb, and optional action slot.
 */
export function PageHeader({ title, subtitle, action, breadcrumb, className }: PageHeaderProps) {
  return (
    <div
      className={cn('mb-6', className)}
      style={{ borderBottom: 'var(--border-default)', paddingBottom: 'var(--space-6)' }}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left: breadcrumb + title + subtitle */}
        <div className="min-w-0">
          {breadcrumb && breadcrumb.length > 0 && (
            <div
              className="flex items-center gap-1 mb-1"
              style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)' }}
            >
              {breadcrumb.map((item, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && (
                    <ChevronRight
                      style={{ width: 12, height: 12, color: 'var(--gray-400)', flexShrink: 0 }}
                    />
                  )}
                  {item.href ? (
                    <a
                      href={item.href}
                      style={{ color: 'var(--gray-500)', textDecoration: 'none' }}
                      className="hover:underline"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <span>{item.label}</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-2xl)',
              fontWeight: 'var(--font-semibold)',
              color: 'var(--gray-900)',
              letterSpacing: '-0.025em',
              lineHeight: 'var(--leading-tight)',
              margin: 0,
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-sm)',
                color: 'var(--gray-600)',
                marginTop: '2px',
                marginBottom: 0,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* Right: action slot */}
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  )
}

export default PageHeader

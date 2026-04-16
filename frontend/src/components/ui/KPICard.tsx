import React from 'react'
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react'
import SectionCard from './SectionCard'
import { cn } from '@/lib/utils'

type StatusAccent = 'success' | 'warning' | 'danger' | 'info' | 'none'

interface TrendIndicator {
  value: number // percentage e.g. 12.5
  direction: 'up' | 'down'
  label?: string // e.g. "vs last month"
}

interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  trend?: TrendIndicator
  status?: StatusAccent
  className?: string
}

const iconBgMap: Record<StatusAccent, string> = {
  success: 'var(--color-success-bg)',
  warning: 'var(--color-warning-bg)',
  danger: 'var(--color-danger-bg)',
  info: 'var(--color-info-bg)',
  none: 'var(--gray-100)',
}

const iconColorMap: Record<StatusAccent, string> = {
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
  info: 'var(--color-info)',
  none: 'var(--gray-500)',
}

/**
 * Summary metric card for dashboards and section summaries.
 * Shows a title, large value, optional subtitle, icon, and trend chip.
 */
export default function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  status = 'none',
  className,
}: KPICardProps) {
  const iconBg = iconBgMap[status]
  const iconColor = iconColorMap[status]

  return (
    <SectionCard status={status} padding="compact" className={cn(className)}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 'var(--space-3)',
        }}
      >
        {/* Text side */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--gray-600)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              margin: 0,
            }}
          >
            {title}
          </p>

          <p
            className="tabular"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-3xl)',
              fontWeight: 'var(--font-bold)',
              color: 'var(--gray-900)',
              lineHeight: 'var(--leading-tight)',
              margin: 'var(--space-1) 0 0 0',
            }}
          >
            {value}
          </p>

          {subtitle && (
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                color: 'var(--gray-500)',
                margin: '2px 0 0 0',
              }}
            >
              {subtitle}
            </p>
          )}

          {trend && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                marginTop: 'var(--space-2)',
                fontSize: '12px',
                fontWeight: 500,
                color: trend.direction === 'up' ? 'var(--color-success)' : 'var(--color-danger)',
              }}
            >
              {trend.direction === 'up' ? (
                <TrendingUp style={{ width: 14, height: 14 }} />
              ) : (
                <TrendingDown style={{ width: 14, height: 14 }} />
              )}
              <span>{Math.abs(trend.value)}%</span>
              {trend.label && (
                <span style={{ color: 'var(--gray-500)', fontWeight: 400 }}>{trend.label}</span>
              )}
            </div>
          )}
        </div>

        {/* Icon */}
        {Icon && (
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon style={{ width: '20px', height: '20px', color: iconColor }} />
          </div>
        )}
      </div>
    </SectionCard>
  )
}

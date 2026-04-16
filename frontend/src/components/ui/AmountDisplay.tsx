import React from 'react'
import { cn } from '@/lib/utils'

type AmountSize = 'sm' | 'md' | 'lg' | 'xl'
type AmountVariant = 'default' | 'positive' | 'negative' | 'muted'

interface AmountDisplayProps {
  amount: number
  size?: AmountSize
  variant?: AmountVariant
  showSymbol?: boolean
  className?: string
}

const sizeMap: Record<AmountSize, string> = {
  sm: '14px',
  md: '16px',
  lg: '20px',
  xl: '28px',
}

const colorMap: Record<AmountVariant, string> = {
  default: 'var(--gray-900)',
  positive: 'var(--color-success)',
  negative: 'var(--color-danger)',
  muted: 'var(--gray-500)',
}

/**
 * Consistent currency amount display using JetBrains Mono for tabular numbers.
 * Supports size and colour variants for different contexts.
 */
export default function AmountDisplay({
  amount,
  size = 'md',
  variant = 'default',
  showSymbol = true,
  className,
}: AmountDisplayProps) {
  const formatted = Math.abs(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const isNegative = amount < 0
  const color = colorMap[variant]
  const fontSize = sizeMap[size]
  const symbolSize = `calc(${fontSize} * 0.85)`

  return (
    <span
      className={cn('tabular', className)}
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize,
        color,
        fontVariantNumeric: 'tabular-nums',
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: '1px',
      }}
    >
      {isNegative && <span style={{ fontSize }}>-</span>}
      {showSymbol && <span style={{ fontSize: symbolSize, color, lineHeight: 1 }}>₹</span>}
      <span>{formatted}</span>
    </span>
  )
}

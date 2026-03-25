import React from 'react'

type ChipVariant = 'done' | 'pending' | 'warning' | 'error' | 'grey'

interface Props {
  variant: ChipVariant
  label: string
}

const icons: Record<ChipVariant, string> = {
  done:    '✅',
  pending: '⏳',
  warning: '⚠',
  error:   '🔴',
  grey:    '⚫',
}

export default function StatusChip({ variant, label }: Props) {
  return (
    <span className={`chip-${variant}`}>
      <span>{icons[variant]}</span>
      <span>{label}</span>
    </span>
  )
}

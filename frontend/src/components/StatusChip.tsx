import React from 'react'
import { CheckCircle2, Clock, AlertTriangle, XCircle, Circle } from 'lucide-react'

type ChipVariant = 'done' | 'pending' | 'warning' | 'error' | 'grey'

interface Props {
  variant: ChipVariant
  label: string
}

const icons: Record<ChipVariant, React.ReactNode> = {
  done: <CheckCircle2 className="w-3.5 h-3.5" />,
  pending: <Clock className="w-3.5 h-3.5" />,
  warning: <AlertTriangle className="w-3.5 h-3.5" />,
  error: <XCircle className="w-3.5 h-3.5" />,
  grey: <Circle className="w-3.5 h-3.5" />,
}

export default function StatusChip({ variant, label }: Props) {
  return (
    <span className={`chip-${variant}`}>
      {icons[variant]}
      <span>{label}</span>
    </span>
  )
}

import React, { useCallback } from 'react'
import { Input } from '@/components/ui/input'

interface KgGramsInputProps {
  /** Current kg value */
  kg: number
  /** Current grams value (0-999) */
  grams: number
  /** Called whenever kg or grams change; receives (kg, grams, totalGrams) */
  onChange: (kg: number, grams: number, totalGrams: number) => void
  /** Whether the inputs are disabled */
  disabled?: boolean
  /** Optional ARIA label prefix */
  label?: string
}

/**
 * Dual-field kg + grams input with auto-conversion.
 * When grams >= 1000 the excess is folded into kg automatically.
 * onFocus selects all text so typing immediately replaces the value.
 */
export default function KgGramsInput({
  kg,
  grams,
  onChange,
  disabled = false,
  label = 'Weight',
}: KgGramsInputProps) {
  const notify = useCallback(
    (newKg: number, newGrams: number) => {
      // Auto-convert: fold grams >= 1000 into kg
      const extraKg = Math.floor(newGrams / 1000)
      const finalGrams = newGrams % 1000
      const finalKg = newKg + extraKg
      onChange(finalKg, finalGrams, finalKg * 1000 + finalGrams)
    },
    [onChange]
  )

  const handleKgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(0, Math.floor(Number(e.target.value) || 0))
    notify(val, grams)
  }

  const handleGramsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(0, Math.floor(Number(e.target.value) || 0))
    notify(kg, val)
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select()
  }

  const totalGrams = kg * 1000 + grams

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <div className="relative flex-1">
          <Input
            type="number"
            min="0"
            value={kg}
            onChange={handleKgChange}
            onFocus={handleFocus}
            disabled={disabled}
            aria-label={`${label} kg`}
            className="pr-7 text-sm h-8"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
            kg
          </span>
        </div>
        <div className="relative flex-1">
          <Input
            type="number"
            min="0"
            max="9999"
            value={grams}
            onChange={handleGramsChange}
            onFocus={handleFocus}
            disabled={disabled}
            aria-label={`${label} grams`}
            className="pr-6 text-sm h-8"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
            g
          </span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">= {totalGrams.toLocaleString('en-IN')} grams</p>
    </div>
  )
}

import React from 'react'

interface Props { title: string; subtitle?: string }

export default function PlaceholderPage({ title, subtitle }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-64 p-8">
      <div className="card p-8 text-center max-w-sm">
        <div className="text-4xl mb-4">🚧</div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">{title}</h2>
        {subtitle && <p className="text-text-secondary text-sm">Coming in {subtitle}</p>}
      </div>
    </div>
  )
}

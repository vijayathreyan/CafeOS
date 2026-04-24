import React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import SectionCard from '@/components/ui/SectionCard'
import type { ReportFilters } from '@/types/phase7'

interface ReportFilterBarProps {
  filters: ReportFilters
  onChange: (next: ReportFilters) => void
  /** Extra filter controls to render after the standard ones */
  extra?: React.ReactNode
  /** Total record count to display */
  count?: number
}

/**
 * Shared filter bar for all Phase 7 owner reports.
 * Provides branch selector, from/to date pickers, and an optional extra slot.
 */
export default function ReportFilterBar({ filters, onChange, extra, count }: ReportFilterBarProps) {
  return (
    <SectionCard className="mb-4">
      <div className="flex flex-wrap items-end gap-4">
        {/* Branch */}
        <div style={{ minWidth: '160px' }}>
          <Label
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--gray-600)',
              marginBottom: '4px',
              display: 'block',
            }}
          >
            Branch
          </Label>
          <Select value={filters.branch} onValueChange={(v) => onChange({ ...filters, branch: v })}>
            <SelectTrigger style={{ width: '160px' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              <SelectItem value="KR">Kaappi Ready</SelectItem>
              <SelectItem value="C2">Coffee Mate C2</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* From date */}
        <div style={{ minWidth: '150px' }}>
          <Label
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--gray-600)',
              marginBottom: '4px',
              display: 'block',
            }}
          >
            From
          </Label>
          <Input
            type="date"
            value={filters.from_date}
            onChange={(e) => onChange({ ...filters, from_date: e.target.value })}
            style={{ width: '150px', fontFamily: 'var(--font-mono)' }}
          />
        </div>

        {/* To date */}
        <div style={{ minWidth: '150px' }}>
          <Label
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--gray-600)',
              marginBottom: '4px',
              display: 'block',
            }}
          >
            To
          </Label>
          <Input
            type="date"
            value={filters.to_date}
            onChange={(e) => onChange({ ...filters, to_date: e.target.value })}
            style={{ width: '150px', fontFamily: 'var(--font-mono)' }}
          />
        </div>

        {extra}

        {count !== undefined && (
          <span
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--gray-500)',
              fontFamily: 'var(--font-body)',
              alignSelf: 'flex-end',
              paddingBottom: '8px',
            }}
          >
            {count} {count === 1 ? 'row' : 'rows'}
          </span>
        )}
      </div>
    </SectionCard>
  )
}

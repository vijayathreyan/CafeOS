import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useVendors, useToggleVendorActive } from '../../hooks/useVendors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useConfirm, showToast } from '@/lib/dialogs'
import { Phone, Plus, Download, Upload, ChevronRight } from 'lucide-react'
import { PageContainer } from '@/components/layouts/PageContainer'
import { PageHeader } from '@/components/layouts/PageHeader'
import SectionCard from '@/components/ui/SectionCard'
import StatusBadge from '@/components/ui/StatusBadge'
import EmptyState from '@/components/ui/EmptyState'
import { TableSkeleton } from '@/components/ui/LoadingSkeletons'
import type { Vendor } from '../../types/vendor'

const CYCLE_LABELS: Record<string, string> = {
  mon_thu: 'Mon / Thu',
  fixed_dates: '1st · 11th · 21st',
  prepaid: 'Prepaid',
  same_day_cash: 'Same Day Cash',
}

function cycleColor(v: Vendor): string {
  if (v.is_same_day_cash) return 'bg-gray-100 text-gray-600'
  if (v.is_prepaid) return 'bg-blue-50 text-blue-700'
  if (v.payment_cycle_type === 'fixed_dates') return 'bg-purple-50 text-purple-700'
  return 'bg-green-50 text-green-700'
}

/** Download a CSV template for bulk vendor import */
function downloadTemplate() {
  const headers = [
    'Vendor Name',
    'Business Type',
    'Contact Name',
    'WhatsApp',
    'Alternate Phone',
    'Email',
    'Address',
    'Payment Cycle',
    'Bank Name',
    'Account Number',
    'IFSC Code',
    'Account Holder',
    'UPI ID',
    'Payment Notes',
    'Active',
  ]
  const example = [
    'Example Vendor',
    'individual',
    'Contact Person',
    '9999999999',
    '',
    '',
    'Address here',
    'mon_thu',
    'SBI',
    '1234567890',
    'SBIN0001234',
    'Account Holder Name',
    'upi@bank',
    '',
    'true',
  ]
  const csv = [headers.join(','), example.join(',')].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'vendor_import_template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

/** Parse a CSV string into an array of row objects */
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim())
  return lines.slice(1).map((line) => {
    const vals = line.split(',').map((v) => v.trim())
    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      row[h] = vals[i] ?? ''
    })
    return row
  })
}

export default function VendorMaster() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { confirm, ConfirmDialog } = useConfirm()
  const [search, setSearch] = useState('')
  const [filterActive, setFilterActive] = useState<'active' | 'inactive'>('active')
  const [filterCycle, setFilterCycle] = useState<string>('all')
  const [importing, setImporting] = useState(false)
  const [importSummary, setImportSummary] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const toggle = useToggleVendorActive()
  const { data: vendors = [], isLoading, error } = useVendors(!!user)

  const filtered = vendors.filter((v) => {
    if (filterActive === 'active' && !v.active) return false
    if (filterActive === 'inactive' && v.active) return false
    if (filterCycle !== 'all' && v.payment_cycle_type !== filterCycle) return false
    const q = search.toLowerCase()
    if (
      q &&
      !v.business_name.toLowerCase().includes(q) &&
      !(v.contact_name ?? '').toLowerCase().includes(q) &&
      !(v.vendor_code ?? '').toLowerCase().includes(q)
    )
      return false
    return true
  })

  async function handleToggleActive(v: Vendor) {
    const isDeactivating = v.active
    const ok = await confirm({
      title: isDeactivating ? 'Deactivate Vendor' : 'Reactivate Vendor',
      description: isDeactivating
        ? 'Deactivating this vendor will remove them from all payment cycles. Are you sure?'
        : 'Reactivating this vendor will restore them to active status.',
      confirmLabel: isDeactivating ? 'Deactivate' : 'Reactivate',
      confirmVariant: isDeactivating ? 'destructive' : 'default',
    })
    if (!ok) return
    try {
      await toggle.mutateAsync({ id: v.id, active: !v.active })
      showToast(
        isDeactivating ? 'Vendor deactivated successfully' : 'Vendor reactivated successfully',
        isDeactivating ? 'info' : 'success'
      )
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update vendor', 'error')
    }
  }

  async function handleImportCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportSummary(null)
    try {
      const text = await file.text()
      const rows = parseCSV(text)
      if (rows.length === 0) {
        showToast('CSV is empty or invalid', 'error')
        return
      }

      let created = 0
      let skipped = 0

      for (const row of rows) {
        const name = row['Vendor Name']?.trim()
        if (!name) {
          skipped++
          continue
        }

        // Check if already exists
        const existing = vendors.find((v) => v.business_name.toLowerCase() === name.toLowerCase())
        if (existing) {
          skipped++
          continue
        }

        // Dynamic import to avoid circular dependency
        const { supabase } = await import('../../lib/supabase')
        const { error: err } = await supabase.from('vendors').insert({
          business_name: name,
          contact_name: row['Contact Name'] || null,
          whatsapp_number: row['WhatsApp'] || null,
          alternate_phone: row['Alternate Phone'] || null,
          email: row['Email'] || null,
          address: row['Address'] || null,
          business_type: row['Business Type'] || null,
          payment_cycle_type: row['Payment Cycle'] || 'mon_thu',
          active: row['Active']?.toLowerCase() !== 'false',
        })
        if (!err) created++
        else skipped++
      }

      setImportSummary(`Import complete: ${created} created · ${skipped} skipped`)
      showToast(`Imported: ${created} created, ${skipped} skipped`, 'success')
    } catch {
      showToast('Failed to parse CSV', 'error')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (isLoading) {
    return (
      <PageContainer>
        <TableSkeleton cols={4} />
      </PageContainer>
    )
  }

  if (error) {
    return (
      <PageContainer>
        <p className="text-destructive text-sm">Failed to load vendors. Please try again.</p>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title="Vendor Master"
        subtitle={`${vendors.filter((v) => v.active).length} active vendors`}
        action={
          <Button onClick={() => navigate('/vendors/new')}>
            <Plus className="w-4 h-4 mr-1" /> Add Vendor
          </Button>
        }
      />

      {/* Active / Inactive tabs */}
      <div className="flex gap-1 mb-4 bg-muted rounded-lg p-1 w-fit">
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            filterActive === 'active'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setFilterActive('active')}
          data-testid="tab-active-vendors"
        >
          Active Vendors
        </button>
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            filterActive === 'inactive'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setFilterActive('inactive')}
          data-testid="tab-inactive-vendors"
        >
          Inactive Vendors
        </button>
      </div>

      {/* Filters */}
      <SectionCard className="mb-4" padding="compact">
        <div className="p-4 flex flex-wrap gap-3">
          <Input
            className="flex-1 min-w-40"
            placeholder="Search vendor name, contact, code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={filterCycle}
            onChange={(e) => setFilterCycle(e.target.value)}
          >
            <option value="all">All Cycles</option>
            <option value="mon_thu">Mon / Thu</option>
            <option value="fixed_dates">1st · 11th · 21st</option>
            <option value="prepaid">Prepaid</option>
            <option value="same_day_cash">Same Day Cash</option>
          </select>
        </div>
      </SectionCard>

      {/* Bulk Import */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="w-4 h-4 mr-1" /> Download Template
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
        >
          <Upload className="w-4 h-4 mr-1" />
          {importing ? 'Importing...' : 'Import CSV'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleImportCSV}
        />
        {importSummary && <span className="text-sm text-muted-foreground">{importSummary}</span>}
      </div>

      {/* Vendor list */}
      <div className="space-y-3">
        {filtered.map((vendor) => {
          const activeItems = vendor.vendor_items?.filter((vi) => vi.active) ?? []
          return (
            <SectionCard
              key={vendor.id}
              className={`transition-all ${!vendor.active ? 'opacity-60' : ''}`}
              padding="compact"
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    {/* Name + code + status */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-foreground text-base">
                        {vendor.business_name}
                      </span>
                      <span className="text-xs text-muted-foreground">{vendor.vendor_code}</span>
                      {!vendor.active && (
                        <StatusBadge status="inactive" label="Inactive" size="sm" />
                      )}
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${cycleColor(vendor)}`}
                      >
                        {CYCLE_LABELS[vendor.payment_cycle_type]}
                      </span>
                    </div>

                    {/* Contact */}
                    {vendor.contact_name && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{vendor.contact_name}</span>
                        {vendor.whatsapp_number && (
                          <a
                            href={`tel:${vendor.whatsapp_number}`}
                            className="text-primary hover:underline ml-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {vendor.whatsapp_number}
                          </a>
                        )}
                      </div>
                    )}

                    {/* Items */}
                    {activeItems.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {activeItems.map((vi) => (
                          <span
                            key={vi.id}
                            className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                          >
                            {vi.item_master?.name_en}
                            {vi.branch ? ` (${vi.branch})` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/vendors/${vendor.id}/edit`)}
                    >
                      Edit
                    </Button>
                    {vendor.active ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleToggleActive(vendor)}
                      >
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-600 hover:text-green-700 border-green-200 hover:border-green-300"
                        onClick={() => handleToggleActive(vendor)}
                      >
                        Reactivate
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/vendors/${vendor.id}`)}
                    >
                      View <ChevronRight className="w-4 h-4 ml-0.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </SectionCard>
          )
        })}

        {filtered.length === 0 && (
          <EmptyState
            icon={Plus}
            title={vendors.length === 0 ? 'No vendors yet' : 'No vendors match your filters'}
            description={
              vendors.length === 0
                ? 'Add your first vendor to get started.'
                : 'Try adjusting the filter criteria.'
            }
            action={
              vendors.length === 0 ? (
                <Button onClick={() => navigate('/vendors/new')}>
                  <Plus className="w-4 h-4 mr-1" /> Add Vendor
                </Button>
              ) : undefined
            }
          />
        )}
      </div>

      {ConfirmDialog}
    </PageContainer>
  )
}

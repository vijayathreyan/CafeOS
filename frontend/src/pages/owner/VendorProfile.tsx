import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../../contexts/AuthContext'
import { useVendor } from '../../hooks/useVendors'
import { useAddVendorItem, useDeactivateVendorItem } from '../../hooks/useVendorItems'
import { useAddVendorItemRate } from '../../hooks/useVendorItemRates'
import { useItemMaster } from '../../hooks/useItemMaster'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useConfirm, showToast } from '@/lib/dialogs'
import { ExternalLink, Phone, Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import type { VendorItem, VendorItemRate } from '../../types/vendor'

const CYCLE_LABELS: Record<string, string> = {
  mon_thu: 'Mon / Thu',
  fixed_dates: '1st · 11th · 21st',
  prepaid: 'Prepaid',
  same_day_cash: 'Same Day Cash',
}

const today = new Date().toISOString().split('T')[0]

// ─── Add Rate form schema ─────────────────────────────────────────────────────

const addRateSchema = z.object({
  cost_price: z.number().min(0, 'Required'),
  selling_price: z.number().min(0).optional(),
  unit: z.string().min(1, 'Required'),
  effective_from: z.string().min(1, 'Required'),
  notes: z.string().optional(),
})

type AddRateValues = z.infer<typeof addRateSchema>

const UNITS = ['per_piece', 'per_kg', 'per_gram', 'per_packet', 'per_box', 'per_litre', 'per_bunch']

// ─── Add Item form schema ─────────────────────────────────────────────────────

const addItemSchema = z.object({
  item_id: z.string().min(1, 'Select an item'),
  branch_kr: z.boolean(),
  branch_c2: z.boolean(),
  calc_type: z.enum(['auto', 'manual']),
  cost_price: z.number().min(0),
  selling_price: z.number().min(0).optional(),
  unit: z.string().min(1, 'Unit is required'),
  effective_from: z.string().min(1, 'Date is required'),
  notes: z.string().optional(),
})

type AddItemValues = z.infer<typeof addItemSchema>

// ─── Rate history card ────────────────────────────────────────────────────────

function RateHistoryRow({ rate }: { rate: VendorItemRate }) {
  const isCurrent = !rate.effective_to
  return (
    <div
      className={`p-3 rounded-md border text-sm ${isCurrent ? 'border-primary bg-primary/5' : 'border-border'}`}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {isCurrent && (
            <Badge className="text-xs bg-primary text-primary-foreground">Current</Badge>
          )}
          <span className="font-medium">
            ₹{rate.cost_price.toFixed(2)}
            {rate.unit ? ` / ${rate.unit}` : ''}
          </span>
          {rate.selling_price != null && (
            <span className="text-muted-foreground">
              → sells at ₹{rate.selling_price.toFixed(2)}
            </span>
          )}
          {rate.cost_price_per_gram != null && (
            <span className="text-muted-foreground text-xs">
              (₹{rate.cost_price_per_gram.toFixed(4)}/g)
            </span>
          )}
        </div>
        <div className="text-muted-foreground text-xs">
          From {rate.effective_from}
          {rate.effective_to ? ` → ${rate.effective_to}` : ' (current)'}
        </div>
      </div>
      {rate.notes && <p className="text-muted-foreground text-xs mt-1">{rate.notes}</p>}
    </div>
  )
}

// ─── Vendor item card ─────────────────────────────────────────────────────────

function VendorItemCard({ vi, vendorId }: { vi: VendorItem; vendorId: string }) {
  const { confirm, ConfirmDialog } = useConfirm()
  const addRate = useAddVendorItemRate()
  const deactivate = useDeactivateVendorItem()
  const [showAddRate, setShowAddRate] = useState(false)

  const rates = (vi.vendor_item_rates ?? []).sort(
    (a, b) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime()
  )
  const currentRate = rates.find((r) => !r.effective_to)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddRateValues>({
    resolver: zodResolver(addRateSchema),
    defaultValues: {
      cost_price: currentRate?.cost_price ?? 0,
      selling_price: currentRate?.selling_price ?? undefined,
      unit: currentRate?.unit ?? 'per_piece',
      effective_from: today,
      notes: '',
    },
  })

  async function onAddRate(values: AddRateValues) {
    try {
      await addRate.mutateAsync({
        vendorItemId: vi.id,
        vendorId,
        costPrice: values.cost_price,
        sellingPrice: values.selling_price,
        unit: values.unit,
        effectiveFrom: values.effective_from,
        notes: values.notes,
      })
      showToast('New rate added successfully', 'success')
      setShowAddRate(false)
      reset()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to add rate', 'error')
    }
  }

  async function handleDeactivate() {
    const ok = await confirm({
      title: 'Remove Item from Vendor',
      description: `Remove ${vi.item_master?.name_en} from this vendor? This is reversible — contact support to restore.`,
      confirmLabel: 'Remove',
      confirmVariant: 'destructive',
    })
    if (!ok) return
    try {
      await deactivate.mutateAsync({ vendorItemId: vi.id, vendorId })
      showToast('Item removed from vendor', 'info')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to remove item', 'error')
    }
  }

  const branchLabel =
    vi.branch === null
      ? 'KR + C2'
      : vi.branch === 'KR'
        ? 'Kaappi Ready only'
        : 'Coffee Mate C2 only'

  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      {/* Item header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-foreground">{vi.item_master?.name_en}</span>
          {vi.item_master?.name_ta && (
            <span className="text-sm text-muted-foreground">{vi.item_master.name_ta}</span>
          )}
          <Badge variant="outline" className="text-xs">
            {branchLabel}
          </Badge>
          <Badge variant="secondary" className="text-xs capitalize">
            {vi.calc_type === 'auto' ? 'Auto-calculated' : 'Manual bill'}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAddRate(!showAddRate)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> New Rate
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeactivate}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Add rate form */}
      {showAddRate && (
        <form onSubmit={handleSubmit(onAddRate)} className="bg-muted/40 rounded-md p-3 space-y-3">
          <p className="text-sm font-medium">Add New Rate</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Cost Price (₹)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                {...register('cost_price', { valueAsNumber: true })}
                className="mt-1 h-8 text-sm"
              />
              {errors.cost_price && (
                <p className="text-destructive text-xs">{errors.cost_price.message}</p>
              )}
            </div>
            <div>
              <Label className="text-xs">Selling Price (₹)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                {...register('selling_price', { valueAsNumber: true })}
                placeholder="Optional"
                className="mt-1 h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Unit</Label>
              <select
                {...register('unit')}
                className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Effective From</Label>
              <Input type="date" {...register('effective_from')} className="mt-1 h-8 text-sm" />
              {errors.effective_from && (
                <p className="text-destructive text-xs">{errors.effective_from.message}</p>
              )}
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Notes</Label>
              <Input
                {...register('notes')}
                placeholder="Optional note"
                className="mt-1 h-8 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Add Rate'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowAddRate(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Rate history */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Rate History</p>
        {rates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rates recorded</p>
        ) : (
          rates.map((rate) => <RateHistoryRow key={rate.id} rate={rate} />)
        )}
      </div>

      {ConfirmDialog}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function VendorProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { ConfirmDialog } = useConfirm()

  const { data: vendor, isLoading, error } = useVendor(id, !!user)
  const { data: allItems = [] } = useItemMaster(!!user)
  const addItem = useAddVendorItem()

  const [bankRevealed, setBankRevealed] = useState(false)
  const [showAddItem, setShowAddItem] = useState(false)

  const {
    register,
    handleSubmit,
    reset: resetAddItem,
    formState: { errors: addItemErrors, isSubmitting: addingItem },
  } = useForm<AddItemValues>({
    resolver: zodResolver(addItemSchema),
    defaultValues: {
      item_id: '',
      branch_kr: true,
      branch_c2: true,
      calc_type: 'auto',
      cost_price: 0,
      unit: 'per_piece',
      effective_from: today,
    },
  })

  async function onAddItem(values: AddItemValues) {
    if (!id) return
    try {
      await addItem.mutateAsync({ vendorId: id, item: values })
      showToast('Item added to vendor', 'success')
      setShowAddItem(false)
      resetAddItem()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to add item', 'error')
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (error || !vendor) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <p className="text-destructive text-sm">Vendor not found or failed to load.</p>
        <Button variant="outline" className="mt-3" onClick={() => navigate('/vendors')}>
          Back to Vendor Master
        </Button>
      </div>
    )
  }

  const activeItems = vendor.vendor_items?.filter((vi) => vi.active) ?? []
  const bd = vendor.vendor_bank_details

  return (
    <div className="p-4 max-w-4xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold text-foreground">{vendor.business_name}</h1>
              <span className="text-sm text-muted-foreground">{vendor.vendor_code}</span>
              {!vendor.active && <Badge variant="secondary">Inactive</Badge>}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {CYCLE_LABELS[vendor.payment_cycle_type]} · Onboarded{' '}
              {new Date(vendor.onboarded_date).toLocaleDateString('en-IN')}
            </p>
          </div>
        </div>
        <Button onClick={() => navigate(`/vendors/${id}/edit`)}>Edit Vendor</Button>
      </div>

      <Tabs defaultValue="business" className="w-full">
        <TabsList className="w-full grid grid-cols-4 mb-5">
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="items">Items & Rates</TabsTrigger>
          <TabsTrigger value="bank">Bank</TabsTrigger>
        </TabsList>

        {/* ── Business tab ──────────────────────────────────────── */}
        <TabsContent value="business">
          <Card>
            <CardContent className="p-5 space-y-3">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs text-muted-foreground uppercase tracking-wide">
                    Business Name
                  </dt>
                  <dd className="font-medium text-foreground mt-1">{vendor.business_name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground uppercase tracking-wide">
                    Vendor Code
                  </dt>
                  <dd className="font-medium text-foreground mt-1">{vendor.vendor_code}</dd>
                </div>
                {vendor.business_type && (
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide">
                      Business Type
                    </dt>
                    <dd className="font-medium text-foreground mt-1 capitalize">
                      {vendor.business_type}
                    </dd>
                  </div>
                )}
                {vendor.gstin && (
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide">GSTIN</dt>
                    <dd className="font-mono text-foreground mt-1">{vendor.gstin}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-muted-foreground uppercase tracking-wide">
                    Payment Cycle
                  </dt>
                  <dd className="font-medium text-foreground mt-1">
                    {CYCLE_LABELS[vendor.payment_cycle_type]}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground uppercase tracking-wide">Status</dt>
                  <dd className="mt-1">
                    {vendor.active ? (
                      <Badge className="bg-green-600 text-white">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </dd>
                </div>
                {vendor.is_prepaid && (
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide">
                      Payment Terms
                    </dt>
                    <dd className="font-medium text-blue-700 mt-1">
                      Prepaid (pays before delivery)
                    </dd>
                  </div>
                )}
                {vendor.is_same_day_cash && (
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide">
                      Payment Terms
                    </dt>
                    <dd className="font-medium text-foreground mt-1">Same Day Cash</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Contact tab ───────────────────────────────────────── */}
        <TabsContent value="contact">
          <Card>
            <CardContent className="p-5 space-y-3">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {vendor.contact_name && (
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide">
                      Contact Name
                    </dt>
                    <dd className="font-medium text-foreground mt-1">{vendor.contact_name}</dd>
                  </div>
                )}
                {vendor.whatsapp_number && (
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide">
                      WhatsApp
                    </dt>
                    <dd className="mt-1">
                      <a
                        href={`tel:${vendor.whatsapp_number}`}
                        className="flex items-center gap-1 text-primary hover:underline font-medium"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        {vendor.whatsapp_number}
                      </a>
                    </dd>
                  </div>
                )}
                {vendor.alternate_phone && (
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide">
                      Alternate Phone
                    </dt>
                    <dd className="mt-1">
                      <a
                        href={`tel:${vendor.alternate_phone}`}
                        className="text-primary hover:underline"
                      >
                        {vendor.alternate_phone}
                      </a>
                    </dd>
                  </div>
                )}
                {vendor.email && (
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide">Email</dt>
                    <dd className="font-medium text-foreground mt-1">{vendor.email}</dd>
                  </div>
                )}
              </dl>
              {vendor.address && (
                <div>
                  <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Address
                  </dt>
                  <dd className="text-sm text-foreground whitespace-pre-wrap">{vendor.address}</dd>
                </div>
              )}
              {vendor.google_maps_url && (
                <a
                  href={vendor.google_maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary text-sm hover:underline"
                >
                  <ExternalLink className="w-4 h-4" /> Open in Google Maps
                </a>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Items & Rates tab ─────────────────────────────────── */}
        <TabsContent value="items">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">
                Items Supplied ({activeItems.length})
              </h2>
              <Button variant="outline" size="sm" onClick={() => setShowAddItem(!showAddItem)}>
                <Plus className="w-4 h-4 mr-1" /> Add Item
              </Button>
            </div>

            {/* Add item form */}
            {showAddItem && (
              <Card>
                <CardContent className="p-4">
                  <form onSubmit={handleSubmit(onAddItem)} className="space-y-3">
                    <p className="font-medium text-sm">Add Item to Vendor</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <Label className="text-xs">Item</Label>
                        <select
                          {...register('item_id')}
                          className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">Select item</option>
                          {allItems
                            .filter((i) => i.active)
                            .map((i) => (
                              <option key={i.id} value={i.id}>
                                {i.name_en}
                              </option>
                            ))}
                        </select>
                        {addItemErrors.item_id && (
                          <p className="text-destructive text-xs mt-0.5">
                            {addItemErrors.item_id.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs">Cost Price (₹)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...register('cost_price', { valueAsNumber: true })}
                          className="mt-1 h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Unit</Label>
                        <select
                          {...register('unit')}
                          className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          {UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs">Effective From</Label>
                        <Input
                          type="date"
                          {...register('effective_from')}
                          className="mt-1 h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={addingItem}>
                        {addingItem ? 'Adding...' : 'Add Item'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddItem(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Item cards */}
            {activeItems.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                No items linked. Click &quot;Add Item&quot; to link items to this vendor.
              </p>
            ) : (
              activeItems.map((vi) => <VendorItemCard key={vi.id} vi={vi} vendorId={vendor.id} />)
            )}
          </div>
        </TabsContent>

        {/* ── Bank Details tab ──────────────────────────────────── */}
        <TabsContent value="bank">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-foreground">Bank & Payment Details</h2>
                <Button variant="outline" size="sm" onClick={() => setBankRevealed((r) => !r)}>
                  {bankRevealed ? (
                    <>
                      <EyeOff className="w-4 h-4 mr-1" /> Hide
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-1" /> Reveal Details
                    </>
                  )}
                </Button>
              </div>

              {!bankRevealed ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
                  <Eye className="w-5 h-5 mr-2" />
                  Tap &quot;Reveal Details&quot; to view bank information
                </div>
              ) : !bd ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No bank details on file.
                  <Button
                    variant="link"
                    className="ml-1 p-0 h-auto"
                    onClick={() => navigate(`/vendors/${id}/edit`)}
                  >
                    Add bank details →
                  </Button>
                </div>
              ) : (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {bd.payment_preference && (
                    <div>
                      <dt className="text-xs text-muted-foreground uppercase tracking-wide">
                        Payment Preference
                      </dt>
                      <dd className="font-medium text-foreground mt-1 capitalize">
                        {bd.payment_preference.replace('_', ' ')}
                      </dd>
                    </div>
                  )}
                  {bd.bank_name && (
                    <div>
                      <dt className="text-xs text-muted-foreground uppercase tracking-wide">
                        Bank
                      </dt>
                      <dd className="font-medium text-foreground mt-1">{bd.bank_name}</dd>
                    </div>
                  )}
                  {bd.account_holder_name && (
                    <div>
                      <dt className="text-xs text-muted-foreground uppercase tracking-wide">
                        Account Holder
                      </dt>
                      <dd className="font-medium text-foreground mt-1">{bd.account_holder_name}</dd>
                    </div>
                  )}
                  {bd.account_number && (
                    <div>
                      <dt className="text-xs text-muted-foreground uppercase tracking-wide">
                        Account Number
                      </dt>
                      <dd className="font-mono font-medium text-foreground mt-1">
                        {bd.account_number}
                      </dd>
                    </div>
                  )}
                  {bd.ifsc_code && (
                    <div>
                      <dt className="text-xs text-muted-foreground uppercase tracking-wide">
                        IFSC Code
                      </dt>
                      <dd className="font-mono font-medium text-foreground mt-1">{bd.ifsc_code}</dd>
                    </div>
                  )}
                  {bd.upi_id && (
                    <div>
                      <dt className="text-xs text-muted-foreground uppercase tracking-wide">
                        UPI ID
                      </dt>
                      <dd className="font-medium text-foreground mt-1">{bd.upi_id}</dd>
                    </div>
                  )}
                </dl>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {ConfirmDialog}
    </div>
  )
}

import React, { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../../contexts/AuthContext'
import {
  useVendor,
  useNextVendorCode,
  useCreateVendor,
  useUpdateVendor,
} from '../../hooks/useVendors'
import { useItemMaster } from '../../hooks/useItemMaster'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { showToast } from '@/lib/dialogs'
import { Plus, Trash2, ArrowLeft } from 'lucide-react'
import type { VendorFormValues } from '../../types/vendor'

// ─── Validation schema ────────────────────────────────────────────────────────

const itemRowSchema = z.object({
  item_id: z.string().min(1, 'Select an item'),
  branch_kr: z.boolean(),
  branch_c2: z.boolean(),
  calc_type: z.enum(['auto', 'manual']),
  cost_price: z.number().min(0, 'Cost price must be ≥ 0'),
  selling_price: z.number().min(0).optional(),
  unit: z.string().min(1, 'Unit is required'),
  effective_from: z.string().min(1, 'Date is required'),
  notes: z.string().optional(),
})

const vendorSchema = z.object({
  business_name: z.string().min(1, 'Business name is required'),
  vendor_code: z.string().optional(),
  business_type: z.string().optional(),
  gstin: z.string().optional(),
  active: z.boolean(),
  payment_cycle_type: z.enum(['mon_thu', 'fixed_dates', 'prepaid', 'same_day_cash']),
  is_prepaid: z.boolean(),
  is_same_day_cash: z.boolean(),
  contact_name: z.string().min(1, 'Contact name is required'),
  whatsapp_number: z.string().regex(/^\d{10}$/, '10-digit Indian mobile number required'),
  alternate_phone: z
    .string()
    .regex(/^\d{10}$/, '10-digit number')
    .optional()
    .or(z.literal('')),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  address: z.string().optional(),
  google_maps_url: z.string().optional(),
  items: z.array(itemRowSchema),
  payment_preference: z.string().optional(),
  bank_name: z.string().optional(),
  account_number: z.string().optional(),
  ifsc_code: z.string().optional(),
  account_holder_name: z.string().optional(),
  upi_id: z.string().optional(),
  payment_notes: z.string().optional(),
})

type FormValues = z.infer<typeof vendorSchema>

const today = new Date().toISOString().split('T')[0]

const UNITS = ['per_piece', 'per_kg', 'per_gram', 'per_packet', 'per_box', 'per_litre', 'per_bunch']

export default function VendorOnboarding() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const isEdit = Boolean(id)
  const { user } = useAuth()

  const { data: nextCode } = useNextVendorCode(!!user && !isEdit)
  const { data: existingVendor, isLoading: loadingVendor } = useVendor(id, !!user && isEdit)
  const { data: allItems = [] } = useItemMaster(!!user)
  const createVendor = useCreateVendor()
  const updateVendor = useUpdateVendor()

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      active: true,
      payment_cycle_type: 'mon_thu',
      is_prepaid: false,
      is_same_day_cash: false,
      items: [],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  // Pre-fill vendor_code on create
  useEffect(() => {
    if (!isEdit && nextCode) {
      reset((prev) => ({ ...prev, vendor_code: nextCode }))
    }
  }, [nextCode, isEdit, reset])

  // Pre-fill form on edit
  useEffect(() => {
    if (isEdit && existingVendor) {
      const bd = existingVendor.vendor_bank_details
      const activeItems = existingVendor.vendor_items?.filter((vi) => vi.active) ?? []
      reset({
        business_name: existingVendor.business_name,
        vendor_code: existingVendor.vendor_code,
        business_type: existingVendor.business_type ?? '',
        gstin: existingVendor.gstin ?? '',
        active: existingVendor.active,
        payment_cycle_type: existingVendor.payment_cycle_type,
        is_prepaid: existingVendor.is_prepaid,
        is_same_day_cash: existingVendor.is_same_day_cash,
        contact_name: existingVendor.contact_name ?? '',
        whatsapp_number: existingVendor.whatsapp_number ?? '',
        alternate_phone: existingVendor.alternate_phone ?? '',
        email: existingVendor.email ?? '',
        address: existingVendor.address ?? '',
        google_maps_url: existingVendor.google_maps_url ?? '',
        // Don't pre-fill items on edit — managed via VendorProfile
        items: activeItems.map((vi) => {
          const latestRate = vi.vendor_item_rates?.find((r) => !r.effective_to)
          return {
            item_id: vi.item_id,
            branch_kr: vi.branch === null || vi.branch === 'KR',
            branch_c2: vi.branch === null || vi.branch === 'C2',
            calc_type: vi.calc_type,
            cost_price: latestRate?.cost_price ?? 0,
            selling_price: latestRate?.selling_price ?? undefined,
            unit: latestRate?.unit ?? 'per_piece',
            effective_from: latestRate?.effective_from ?? today,
            notes: latestRate?.notes ?? '',
          }
        }),
        payment_preference: bd?.payment_preference ?? '',
        bank_name: bd?.bank_name ?? '',
        account_number: '',
        ifsc_code: bd?.ifsc_code ?? '',
        account_holder_name: bd?.account_holder_name ?? '',
        upi_id: bd?.upi_id ?? '',
        payment_notes: '',
      })
    }
  }, [isEdit, existingVendor, reset])

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit && id) {
        await updateVendor.mutateAsync({ id, values: values as VendorFormValues })
        showToast('Vendor updated successfully', 'success')
        navigate(`/vendors/${id}`)
      } else {
        const vendorId = await createVendor.mutateAsync({
          values: values as VendorFormValues,
          items: values.items as VendorFormValues['items'],
        })
        showToast('Vendor created successfully', 'success')
        navigate(`/vendors/${vendorId}`)
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to save vendor', 'error')
    }
  }

  const cycleValue = useWatch({ control, name: 'payment_cycle_type' })

  if (isEdit && loadingVendor) {
    return (
      <div className="p-4 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="p-4 max-w-3xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {isEdit ? 'Edit Vendor' : 'Add Vendor'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isEdit ? existingVendor?.business_name : 'Fill all sections and save'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Tabs defaultValue="business" className="w-full">
          <TabsList className="w-full grid grid-cols-4 mb-6">
            <TabsTrigger value="business">Business</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="items">Items</TabsTrigger>
            <TabsTrigger value="bank">Bank</TabsTrigger>
          </TabsList>

          {/* ── Section 1: Business Details ───────────────────────── */}
          <TabsContent value="business">
            <Card>
              <CardContent className="p-5 space-y-4">
                <h2 className="font-semibold text-foreground">Business Details</h2>
                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="business_name">
                      Business / Vendor Name <span className="text-destructive">*</span>
                    </Label>
                    <Input id="business_name" {...register('business_name')} className="mt-1" />
                    {errors.business_name && (
                      <p className="text-destructive text-xs mt-1">
                        {errors.business_name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="vendor_code">Vendor Code</Label>
                    <Input
                      id="vendor_code"
                      {...register('vendor_code')}
                      placeholder="Auto-generated"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave blank to auto-generate (e.g. VEN-015)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="business_type">Business Type</Label>
                    <select
                      id="business_type"
                      {...register('business_type')}
                      className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Select type</option>
                      <option value="individual">Individual</option>
                      <option value="proprietor">Proprietor</option>
                      <option value="partnership">Partnership</option>
                      <option value="company">Company</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="gstin">GSTIN (optional)</Label>
                    <Input
                      id="gstin"
                      {...register('gstin')}
                      placeholder="e.g. 33ABCDE1234F1Z5"
                      className="mt-1"
                    />
                  </div>
                </div>

                <Separator />

                {/* Payment cycle */}
                <div>
                  <Label>Payment Cycle</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                    {(['mon_thu', 'fixed_dates', 'prepaid', 'same_day_cash'] as const).map(
                      (cycle) => {
                        const labels: Record<string, string> = {
                          mon_thu: 'Mon / Thu',
                          fixed_dates: '1st · 11th · 21st',
                          prepaid: 'Prepaid',
                          same_day_cash: 'Same Day Cash',
                        }
                        return (
                          <label
                            key={cycle}
                            className={`flex items-center justify-center p-3 rounded-md border cursor-pointer text-sm transition-colors ${
                              cycleValue === cycle
                                ? 'border-primary bg-primary/5 text-primary font-medium'
                                : 'border-input text-muted-foreground hover:border-primary/50'
                            }`}
                          >
                            <input
                              type="radio"
                              {...register('payment_cycle_type')}
                              value={cycle}
                              className="sr-only"
                            />
                            {labels[cycle]}
                          </label>
                        )
                      }
                    )}
                  </div>
                </div>

                {/* Flags */}
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Controller
                      control={control}
                      name="is_prepaid"
                      render={({ field }) => (
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      )}
                    />
                    <span className="text-sm">Prepaid vendor (pays before delivery)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Controller
                      control={control}
                      name="is_same_day_cash"
                      render={({ field }) => (
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      )}
                    />
                    <span className="text-sm">Same day cash vendor</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Controller
                      control={control}
                      name="active"
                      render={({ field }) => (
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      )}
                    />
                    <span className="text-sm">Active</span>
                  </label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Section 2: Contact Details ─────────────────────────── */}
          <TabsContent value="contact">
            <Card>
              <CardContent className="p-5 space-y-4">
                <h2 className="font-semibold text-foreground">Contact Details</h2>
                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contact_name">
                      Primary Contact Name <span className="text-destructive">*</span>
                    </Label>
                    <Input id="contact_name" {...register('contact_name')} className="mt-1" />
                    {errors.contact_name && (
                      <p className="text-destructive text-xs mt-1">{errors.contact_name.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="whatsapp_number">
                      WhatsApp Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="whatsapp_number"
                      {...register('whatsapp_number')}
                      placeholder="10-digit mobile"
                      maxLength={10}
                      className="mt-1"
                    />
                    {errors.whatsapp_number && (
                      <p className="text-destructive text-xs mt-1">
                        {errors.whatsapp_number.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="alternate_phone">Alternate Phone (optional)</Label>
                    <Input
                      id="alternate_phone"
                      {...register('alternate_phone')}
                      placeholder="10-digit"
                      maxLength={10}
                      className="mt-1"
                    />
                    {errors.alternate_phone && (
                      <p className="text-destructive text-xs mt-1">
                        {errors.alternate_phone.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email">Email (optional)</Label>
                    <Input id="email" type="email" {...register('email')} className="mt-1" />
                    {errors.email && (
                      <p className="text-destructive text-xs mt-1">{errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Address (optional)</Label>
                  <Textarea
                    id="address"
                    {...register('address')}
                    placeholder="Full vendor address"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="google_maps_url">Google Maps URL (optional)</Label>
                  <Input
                    id="google_maps_url"
                    {...register('google_maps_url')}
                    placeholder="Paste Google Maps share link"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Stored as clickable link on vendor profile
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Section 3: Items Supplied ──────────────────────────── */}
          <TabsContent value="items">
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-foreground">Items Supplied</h2>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      append({
                        item_id: '',
                        branch_kr: true,
                        branch_c2: true,
                        calc_type: 'auto',
                        cost_price: 0,
                        selling_price: undefined,
                        unit: 'per_piece',
                        effective_from: today,
                        notes: '',
                      })
                    }
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Item
                  </Button>
                </div>
                <Separator />

                {fields.length === 0 && (
                  <p className="text-muted-foreground text-sm text-center py-6">
                    No items added yet. Click &quot;Add Item&quot; to link items to this vendor.
                  </p>
                )}

                {fields.map((field, idx) => (
                  <div key={field.id} className="border border-border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Item {idx + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(idx)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Item selector */}
                      <div className="sm:col-span-2">
                        <Label>
                          Item <span className="text-destructive">*</span>
                        </Label>
                        <select
                          {...register(`items.${idx}.item_id`)}
                          className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">Select item from Item Master</option>
                          {allItems
                            .filter((item) => item.active)
                            .map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name_en} ({item.item_type} · {item.unit})
                              </option>
                            ))}
                        </select>
                        {errors.items?.[idx]?.item_id && (
                          <p className="text-destructive text-xs mt-1">
                            {errors.items[idx]?.item_id?.message}
                          </p>
                        )}
                      </div>

                      {/* Branch availability */}
                      <div className="sm:col-span-2">
                        <Label>Branch Availability</Label>
                        <div className="flex gap-4 mt-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Controller
                              control={control}
                              name={`items.${idx}.branch_kr`}
                              render={({ field }) => (
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              )}
                            />
                            <span className="text-sm">Kaappi Ready (KR)</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Controller
                              control={control}
                              name={`items.${idx}.branch_c2`}
                              render={({ field }) => (
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              )}
                            />
                            <span className="text-sm">Coffee Mate C2</span>
                          </label>
                        </div>
                      </div>

                      {/* Calc type */}
                      <div className="sm:col-span-2">
                        <Label>Calculation Type</Label>
                        <div className="flex gap-4 mt-2">
                          {(['auto', 'manual'] as const).map((ct) => (
                            <label key={ct} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                {...register(`items.${idx}.calc_type`)}
                                value={ct}
                                className="w-4 h-4 accent-primary"
                              />
                              <span className="text-sm capitalize">
                                {ct === 'auto'
                                  ? 'Auto (daily qty tracked)'
                                  : 'Manual (WhatsApp bill)'}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Cost & selling price */}
                      <div>
                        <Label>
                          Cost Price (₹) <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...register(`items.${idx}.cost_price`, { valueAsNumber: true })}
                          className="mt-1"
                        />
                        {errors.items?.[idx]?.cost_price && (
                          <p className="text-destructive text-xs mt-1">
                            {errors.items[idx]?.cost_price?.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label>Selling Price (₹)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...register(`items.${idx}.selling_price`, { valueAsNumber: true })}
                          placeholder="Optional"
                          className="mt-1"
                        />
                      </div>

                      {/* Unit */}
                      <div>
                        <Label>
                          Unit <span className="text-destructive">*</span>
                        </Label>
                        <select
                          {...register(`items.${idx}.unit`)}
                          className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          {UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Effective from */}
                      <div>
                        <Label>
                          Effective From <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          type="date"
                          {...register(`items.${idx}.effective_from`)}
                          className="mt-1"
                        />
                        {errors.items?.[idx]?.effective_from && (
                          <p className="text-destructive text-xs mt-1">
                            {errors.items[idx]?.effective_from?.message}
                          </p>
                        )}
                      </div>

                      {/* Notes */}
                      <div className="sm:col-span-2">
                        <Label>Notes (optional)</Label>
                        <Input
                          {...register(`items.${idx}.notes`)}
                          placeholder="e.g. Rate revised verbally after Diwali"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Section 5: Bank & Payment Details ─────────────────── */}
          <TabsContent value="bank">
            <Card>
              <CardContent className="p-5 space-y-4">
                <h2 className="font-semibold text-foreground">Bank & Payment Details</h2>
                <Separator />

                <div>
                  <Label htmlFor="payment_preference">Payment Preference</Label>
                  <select
                    id="payment_preference"
                    {...register('payment_preference')}
                    className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select preference</option>
                    <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
                    <option value="upi">UPI / GPay / PhonePe</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bank_name">Bank Name</Label>
                    <Input
                      id="bank_name"
                      {...register('bank_name')}
                      placeholder="e.g. SBI, IOB, Indian Bank"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="account_number">Account Number</Label>
                    <Input
                      id="account_number"
                      {...register('account_number')}
                      placeholder="Bank account number"
                      className="mt-1"
                    />
                    {isEdit && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Leave blank to keep existing (not shown for security)
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="ifsc_code">IFSC Code</Label>
                    <Input
                      id="ifsc_code"
                      {...register('ifsc_code')}
                      placeholder="e.g. SBIN0001234"
                      className="mt-1 uppercase"
                    />
                  </div>

                  <div>
                    <Label htmlFor="account_holder_name">Account Holder Name</Label>
                    <Input
                      id="account_holder_name"
                      {...register('account_holder_name')}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="upi_id">UPI ID</Label>
                    <Input
                      id="upi_id"
                      {...register('upi_id')}
                      placeholder="e.g. vendor@okaxis"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="payment_notes">Payment Notes</Label>
                  <Textarea
                    id="payment_notes"
                    {...register('payment_notes')}
                    placeholder='e.g. "Pay via GPay to Vasanth", "Jhanani handles this payment"'
                    className="mt-1"
                  />
                </div>

                {isEdit && (
                  <div className="p-3 rounded-md bg-blue-50 border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> To add new rates for items, go to{' '}
                      <button
                        type="button"
                        className="underline font-medium"
                        onClick={() => navigate(`/vendors/${id}`)}
                      >
                        Vendor Profile → Items & Rates
                      </button>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Sticky submit */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 flex justify-end gap-3 z-10">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEdit ? 'Update Vendor' : 'Create Vendor'}
          </Button>
        </div>
      </form>
    </div>
  )
}

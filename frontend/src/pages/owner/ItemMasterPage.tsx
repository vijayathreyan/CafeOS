import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  useItemMaster,
  useCreateItem,
  useUpdateItem,
  useToggleItemActive,
  useToggleItemBranch,
  useItemVendorLinks,
} from '../../hooks/useItemMaster'
import { useVendors } from '../../hooks/useVendors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useConfirm, showToast } from '@/lib/dialogs'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil } from 'lucide-react'
import type { ItemMaster } from '../../types/vendor'

const ITEM_TYPES = ['vendor_supplied', 'made_in_shop', 'stock', 'beverage']
const UNITS = ['piece', 'kg', 'gram', 'packet', 'box', 'litre', 'bunch', 'cup', 'pack']
const CATEGORIES = ['Tea/Coffee', 'Snacks', 'Buns', 'Beverages', 'Ladoos', 'Combo', 'Bakery']
const PRICE_GROUPS = ['₹5-10', '₹10-20', '₹20-30', '₹30-50', '₹50-100', '₹100+']

function suggestPriceGroup(priceStr: string): string {
  const p = parseFloat(priceStr)
  if (Number.isNaN(p) || p <= 0) return ''
  if (p <= 10) return '₹5-10'
  if (p <= 20) return '₹10-20'
  if (p <= 30) return '₹20-30'
  if (p <= 50) return '₹30-50'
  if (p <= 100) return '₹50-100'
  return '₹100+'
}

const RECON_METHODS = [
  { value: 'consumed_litres', label: 'Consumed Litres' },
  { value: 'received_wastage_diff', label: 'Received – Wastage Diff' },
  { value: 'stock_balance', label: 'Stock Balance' },
  { value: 'consumed_pieces', label: 'Consumed Pieces' },
  { value: 'pack_of_bottle', label: 'Pack / Bottle Count' },
  { value: 'remaining_weight_bottle', label: 'Remaining Weight (Bottle)' },
  { value: 'remaining_weight_peanut', label: 'Remaining Weight (Peanut)' },
  { value: 'remaining_cups', label: 'Remaining Cups' },
  { value: 'big_box_opened', label: 'Big Box Opened' },
  { value: 'preparation_staff', label: 'Preparation by Staff' },
]

const RECON_BY_TYPE: Record<string, string[]> = {
  vendor_supplied: [
    'stock_balance',
    'consumed_pieces',
    'pack_of_bottle',
    'remaining_weight_bottle',
    'remaining_weight_peanut',
    'received_wastage_diff',
  ],
  made_in_shop: [
    'consumed_pieces',
    'big_box_opened',
    'preparation_staff',
    'remaining_weight_peanut',
  ],
  stock: [
    'stock_balance',
    'consumed_litres',
    'remaining_weight_bottle',
    'remaining_weight_peanut',
    'remaining_cups',
    'pack_of_bottle',
    'received_wastage_diff',
  ],
  beverage: ['consumed_litres', 'remaining_cups', 'remaining_weight_bottle'],
}

// Numeric fields stored as strings in the form; converted to numbers on submit.
const itemSchema = z.object({
  name_en: z.string().min(1, 'English name is required'),
  name_ta: z.string().optional(),
  item_type: z.string().min(1, 'Item type is required'),
  category: z.string().min(1, 'Category is required'),
  unit: z.string().min(1, 'Unit is required'),
  selling_price: z.string().min(1, 'Selling price is required'),
  cost_price: z.string().optional(),
  price_group: z.string().optional(),
  ml_per_serving: z.string().optional(),
  estimated_cost_per_piece: z.string().optional(),
  reconciliation_method: z.string().optional(),
  branch_kr: z.boolean(),
  branch_c2: z.boolean(),
  is_pos_item: z.boolean(),
  is_stock_item: z.boolean(),
  is_snack_item: z.boolean(),
  active: z.boolean(),
  vendor_id: z.string().optional(),
  // Phase 5 — alert threshold fields
  alert_days_threshold: z.string().optional(),
  wastage_threshold_percent: z.string().optional(),
})

type ItemFormValues = z.infer<typeof itemSchema>

/** Convert a string form value to a nullable number. */
function parseOptNum(v?: string): number | null {
  if (!v || v.trim() === '') return null
  const n = parseFloat(v)
  return Number.isNaN(n) ? null : n
}

/** Empty defaults for the Add Item form. */
const EMPTY_FORM: ItemFormValues = {
  name_en: '',
  name_ta: '',
  item_type: 'vendor_supplied',
  category: '',
  branch_kr: true,
  branch_c2: true,
  unit: 'piece',
  selling_price: '',
  cost_price: '',
  price_group: '',
  reconciliation_method: '',
  is_pos_item: true,
  is_stock_item: true,
  is_snack_item: false,
  active: true,
  ml_per_serving: '',
  estimated_cost_per_piece: '',
  vendor_id: '',
  alert_days_threshold: '',
  wastage_threshold_percent: '5',
}

/** Map a DB item record to form values. */
function itemToForm(item: ItemMaster): ItemFormValues {
  return {
    name_en: item.name_en,
    name_ta: item.name_ta ?? '',
    item_type: item.item_type,
    category: item.category ?? '',
    branch_kr: item.branch_kr,
    branch_c2: item.branch_c2,
    unit: item.unit,
    selling_price: item.selling_price?.toString() ?? '',
    cost_price: item.cost_price?.toString() ?? '',
    price_group: item.price_group ?? '',
    reconciliation_method: item.reconciliation_method ?? '',
    is_pos_item: item.is_pos_item ?? true,
    is_stock_item: item.is_stock_item ?? true,
    is_snack_item: item.is_snack_item ?? false,
    active: item.active ?? true,
    ml_per_serving: item.ml_per_serving?.toString() ?? '',
    estimated_cost_per_piece: item.estimated_cost_per_piece?.toString() ?? '',
    vendor_id: '',
    alert_days_threshold: item.alert_days_threshold?.toString() ?? '',
    wastage_threshold_percent: item.wastage_threshold_percent?.toString() ?? '5',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ItemFormDialog — handles the Dialog shell.
//
// Strategy: pass `editingItem` (the full list object, already in React Query
// cache) directly to the form as `existing`. No async fetch needed before
// opening — the list query already uses select('*') so all fields are present.
// ─────────────────────────────────────────────────────────────────────────────
function ItemFormDialog({
  open,
  onClose,
  editingItem,
}: {
  open: boolean
  onClose: () => void
  editingItem?: ItemMaster
}) {
  const isEdit = !!editingItem

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Item' : 'Add Item to Master'}</DialogTitle>
        </DialogHeader>

        {/* key forces a fresh form mount per item / add-vs-edit switch */}
        <ItemFormContent
          key={editingItem?.id ?? 'new'}
          existing={editingItem}
          editingItem={editingItem}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ItemFormContent — the actual form.
// Mounts with correct `defaultValues` from the very first render because
// `existing` (from the list cache) is synchronously available before mount.
// ─────────────────────────────────────────────────────────────────────────────
function ItemFormContent({
  existing,
  editingItem,
  onClose,
}: {
  existing?: ItemMaster
  editingItem?: ItemMaster
  onClose: () => void
}) {
  const { user } = useAuth()
  const isEdit = !!editingItem
  const createItem = useCreateItem()
  const updateItem = useUpdateItem()
  const { data: vendors = [] } = useVendors(!!user)
  const { data: existingVendorLink } = useItemVendorLinks(editingItem?.id, !!user && isEdit)

  const activeVendors = vendors.filter((v) => v.active)

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: EMPTY_FORM,
    // `values` reactively re-syncs the form whenever `existing` changes.
    // This is the correct pattern for forms that display server data — it works
    // with React StrictMode, Radix portals, and async DB fetches without any
    // useEffect + reset() machinery. keepDirtyValues prevents overwriting fields
    // the user has already edited when the background DB fetch completes.
    values: existing ? itemToForm(existing) : undefined,
    resetOptions: { keepDirtyValues: true },
  })

  // Pre-fill vendor_id once the async vendor-link query resolves
  useEffect(() => {
    if (existingVendorLink?.vendor_id) {
      setValue('vendor_id', existingVendorLink.vendor_id)
    }
  }, [existingVendorLink, setValue])

  const watchedType = useWatch({ control, name: 'item_type' })
  const watchedCategory = useWatch({ control, name: 'category' })
  const watchedSellingPrice = useWatch({ control, name: 'selling_price' })

  const isMadeInShop = watchedType === 'made_in_shop'
  const isVendorSupplied = watchedType === 'vendor_supplied'
  const showMlPerServing = watchedCategory === 'Tea/Coffee' || watchedCategory === 'Beverages'

  const reconOptions = RECON_BY_TYPE[watchedType] ?? RECON_METHODS.map((m) => m.value)
  const filteredReconMethods = RECON_METHODS.filter((m) => reconOptions.includes(m.value))

  // Auto-suggest price_group when selling_price changes
  useEffect(() => {
    if (watchedSellingPrice) {
      const suggested = suggestPriceGroup(watchedSellingPrice)
      if (suggested) setValue('price_group', suggested)
    }
  }, [watchedSellingPrice, setValue])

  async function onSubmit(values: ItemFormValues) {
    try {
      const payload = {
        name_en: values.name_en,
        name_ta: values.name_ta,
        item_type: values.item_type,
        category: values.category,
        branch_kr: values.branch_kr,
        branch_c2: values.branch_c2,
        active_kr: values.active && values.branch_kr,
        active_c2: values.active && values.branch_c2,
        active: values.active,
        unit: values.unit,
        selling_price: parseOptNum(values.selling_price),
        cost_price: parseOptNum(values.cost_price),
        price_group: values.price_group || null,
        reconciliation_method: values.reconciliation_method,
        is_pos_item: values.is_pos_item,
        is_stock_item: values.is_stock_item,
        is_snack_item: values.is_snack_item,
        ml_per_serving: values.ml_per_serving ? parseInt(values.ml_per_serving, 10) : null,
        estimated_cost_per_piece: parseOptNum(values.estimated_cost_per_piece),
        vendor_id: isVendorSupplied ? values.vendor_id || undefined : undefined,
        alert_days_threshold: parseOptNum(values.alert_days_threshold),
        wastage_threshold_percent: parseOptNum(values.wastage_threshold_percent) ?? 5.0,
      }
      if (isEdit && editingItem) {
        await updateItem.mutateAsync({ id: editingItem.id, ...payload })
        showToast('Item updated successfully', 'success')
      } else {
        await createItem.mutateAsync(payload)
        showToast('Item created', 'success')
      }
      reset()
      onClose()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to save item', 'error')
    }
  }

  const selectCls =
    'mt-1 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* ── Basic Details ─────────────────────────────────────── */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Basic Details
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>
              Name (English) <span className="text-destructive">*</span>
            </Label>
            <Controller
              control={control}
              name="name_en"
              render={({ field }) => (
                <Input
                  {...field}
                  className="mt-1"
                  placeholder="e.g. Medu Vada"
                  data-testid="input-name-en"
                />
              )}
            />
            {errors.name_en && (
              <p className="text-destructive text-xs mt-1">{errors.name_en.message}</p>
            )}
          </div>
          <div>
            <Label>Name (Tamil)</Label>
            <Input {...register('name_ta')} className="mt-1" placeholder="e.g. மேது வடை" />
          </div>
          <div>
            <Label>
              Item Type <span className="text-destructive">*</span>
            </Label>
            <select {...register('item_type')} className={selectCls} data-testid="select-item-type">
              {ITEM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>
              Category <span className="text-destructive">*</span>
            </Label>
            <select {...register('category')} className={selectCls} data-testid="select-category">
              <option value="">— Select —</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="text-destructive text-xs mt-1">{errors.category.message}</p>
            )}
          </div>
          <div>
            <Label>
              Unit <span className="text-destructive">*</span>
            </Label>
            <select {...register('unit')} className={selectCls}>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <Separator />

      {/* ── Pricing ───────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Pricing
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>
              Selling Price (₹) <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              {...register('selling_price')}
              className="mt-1"
              placeholder="0.00"
              data-testid="input-selling-price"
            />
            {errors.selling_price && (
              <p className="text-destructive text-xs mt-1">{errors.selling_price.message}</p>
            )}
          </div>
          <div>
            <Label>
              Cost Price (₹)
              {isVendorSupplied && (
                <span className="text-muted-foreground text-xs ml-1">(auto from vendor rates)</span>
              )}
            </Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              {...register('cost_price')}
              className="mt-1"
              placeholder="0.00"
            />
          </div>
          <div>
            <Label>Price Group</Label>
            <select
              {...register('price_group')}
              className={selectCls}
              data-testid="select-price-group"
            >
              <option value="">— Select —</option>
              {PRICE_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <p className="text-muted-foreground text-xs mt-1">Auto-suggested from selling price</p>
          </div>
          {showMlPerServing && (
            <div>
              <Label>ml per Serving</Label>
              <Input
                type="number"
                min="0"
                {...register('ml_per_serving')}
                className="mt-1"
                placeholder="e.g. 150"
                data-testid="input-ml-per-serving"
              />
              <p className="text-muted-foreground text-xs mt-1">
                Used by Milk Report cross-check algorithm
              </p>
            </div>
          )}
          {isMadeInShop && (
            <div>
              <Label>Estimated Cost per Piece (₹)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                {...register('estimated_cost_per_piece')}
                className="mt-1"
                placeholder="0.00"
                data-testid="input-estimated-cost"
              />
              <p className="text-muted-foreground text-xs mt-1">
                Approximate raw material cost for made-in-shop items
              </p>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* ── Availability ──────────────────────────────────────── */}
      <div className="space-y-5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Availability
        </p>

        {/* Part 1 — Available at */}
        <div>
          <p className="text-sm text-muted-foreground mb-2">Available at</p>
          <div className="flex gap-5 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <Controller
                control={control}
                name="branch_kr"
                render={({ field }) => (
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <span className="text-sm">Kaappi Ready</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Controller
                control={control}
                name="branch_c2"
                render={({ field }) => (
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <span className="text-sm">Coffee Mate C2</span>
            </label>
          </div>
        </div>

        {/* Part 2 — Used in */}
        <div>
          <p className="text-sm text-muted-foreground mb-2">Used in</p>
          <div className="flex gap-5 flex-wrap">
            <label
              className="flex items-center gap-2 cursor-pointer"
              title="Shows on the billing screen at the counter"
            >
              <Controller
                control={control}
                name="is_pos_item"
                render={({ field }) => (
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <span className="text-sm">POS Billing</span>
            </label>
            <label
              className="flex items-center gap-2 cursor-pointer"
              title="Shows in daily stock levels entry"
            >
              <Controller
                control={control}
                name="is_stock_item"
                render={({ field }) => (
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <span className="text-sm">Stock Entry</span>
            </label>
            <label
              className="flex items-center gap-2 cursor-pointer"
              title="Shows in shift snacks data entry"
            >
              <Controller
                control={control}
                name="is_snack_item"
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="checkbox-snack-item"
                  />
                )}
              />
              <span className="text-sm">Snacks Card</span>
            </label>
          </div>
        </div>

        {/* Part 3 — Status */}
        <div>
          <p className="text-sm text-muted-foreground mb-2">Status</p>
          <Controller
            control={control}
            name="active"
            render={({ field }) => (
              <label className="flex items-center gap-3 cursor-pointer w-fit">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="checkbox-item-active"
                />
                <div>
                  <span className="text-sm font-medium">{field.value ? 'Active' : 'Inactive'}</span>
                  <p className="text-xs text-muted-foreground">
                    {field.value
                      ? 'Item is visible across all modules and branches'
                      : 'Item is hidden everywhere — use to temporarily disable'}
                  </p>
                </div>
              </label>
            )}
          />
        </div>
      </div>

      <Separator />

      {/* ── Reconciliation ────────────────────────────────────── */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Reconciliation
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Reconciliation Method</Label>
            <select
              {...register('reconciliation_method')}
              className={selectCls}
              data-testid="select-recon-method"
            >
              <option value="">— Select —</option>
              {filteredReconMethods.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <Separator />

      {/* ── Alerts & Thresholds (Phase 10 Alert Manager) ─────── */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
          Alerts &amp; Thresholds
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          Alert logic fires in Phase 10 Alert Manager. Configure thresholds now.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Purchase Alert (days)</Label>
            <Input
              type="number"
              min="0"
              step="1"
              {...register('alert_days_threshold')}
              className="mt-1"
              placeholder="Leave empty for no alert"
              data-testid="input-alert-days"
            />
            <p className="text-muted-foreground text-xs mt-1">
              Alert if not purchased for X days (leave empty for no alert)
            </p>
          </div>
          <div>
            <Label>Wastage Alert Threshold %</Label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              {...register('wastage_threshold_percent')}
              className="mt-1"
              placeholder="5"
              data-testid="input-wastage-threshold"
            />
            <p className="text-muted-foreground text-xs mt-1">
              Alert if daily wastage exceeds X% (default 5%)
            </p>
          </div>
        </div>
      </div>

      {/* ── Vendor Link (vendor_supplied only) ────────────────── */}
      {isVendorSupplied && (
        <>
          <Separator />
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Vendor Link
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Primary Vendor</Label>
                <select
                  {...register('vendor_id')}
                  className={selectCls}
                  data-testid="select-vendor-link"
                >
                  <option value="">— None —</option>
                  {activeVendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.business_name}
                    </option>
                  ))}
                </select>
                <p className="text-muted-foreground text-xs mt-1">
                  Creates a vendor_items link for this item
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Item'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export default function ItemMasterPage() {
  const { user } = useAuth()
  const { confirm, ConfirmDialog } = useConfirm()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  // editingItem carries the full list record — available synchronously for instant pre-fill
  const [editingItem, setEditingItem] = useState<ItemMaster | undefined>()

  const { data: items = [], isLoading } = useItemMaster(!!user)
  const toggleActive = useToggleItemActive()
  const toggleBranch = useToggleItemBranch()

  const filtered = items.filter((item) => {
    if (filterType !== 'all' && item.item_type !== filterType) return false
    if (
      search &&
      !item.name_en.toLowerCase().includes(search.toLowerCase()) &&
      !(item.name_ta ?? '').toLowerCase().includes(search.toLowerCase())
    )
      return false
    return true
  })

  function openAddDialog() {
    setEditingItem(undefined)
    setDialogOpen(true)
  }

  function openEditDialog(item: ItemMaster) {
    setEditingItem(item)
    setDialogOpen(true)
  }

  async function handleToggleActive(item: ItemMaster) {
    const ok = await confirm({
      title: item.active ? 'Deactivate Item' : 'Activate Item',
      description: `${item.active ? 'Deactivate' : 'Activate'} "${item.name_en}"? ${
        item.active ? 'It will be hidden from all entry forms and vendor lists.' : ''
      }`,
      confirmLabel: item.active ? 'Deactivate' : 'Activate',
      confirmVariant: item.active ? 'destructive' : 'default',
    })
    if (!ok) return
    try {
      await toggleActive.mutateAsync({ id: item.id, active: !item.active })
      showToast(
        `"${item.name_en}" ${item.active ? 'deactivated' : 'activated'}`,
        item.active ? 'info' : 'success'
      )
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update item', 'error')
    }
  }

  async function handleToggleBranch(item: ItemMaster, field: 'branch_kr' | 'branch_c2') {
    try {
      await toggleBranch.mutateAsync({ id: item.id, field, value: !item[field] })
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update branch', 'error')
    }
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Item Master</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {items.filter((i) => i.active).length} active items · shared across POS, vendor
              payments, reconciliation
            </p>
          </div>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="w-4 h-4 mr-1" /> Add Item
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="p-4 flex flex-wrap gap-3">
          <Input
            className="flex-1 min-w-40"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All Types</option>
            {ITEM_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name (EN)</TableHead>
                <TableHead>Tamil</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Sell ₹</TableHead>
                <TableHead className="text-center">KR</TableHead>
                <TableHead className="text-center">C2</TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id} className={!item.active ? 'opacity-50' : ''}>
                  <TableCell className="font-medium">{item.name_en}</TableCell>
                  <TableCell className="text-muted-foreground">{item.name_ta ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">
                      {item.item_type.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {item.category ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{item.unit}</TableCell>
                  <TableCell className="text-right text-sm">
                    {item.selling_price != null ? `₹${item.selling_price}` : '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={item.branch_kr}
                      onCheckedChange={() => handleToggleBranch(item, 'branch_kr')}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={item.branch_c2}
                      onCheckedChange={() => handleToggleBranch(item, 'branch_c2')}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={item.active}
                      onCheckedChange={() => handleToggleActive(item)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(item)}
                      data-testid="btn-edit-item"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    No items found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <ItemFormDialog
        key={editingItem?.id ?? 'new'}
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setEditingItem(undefined)
        }}
        editingItem={editingItem}
      />
      {ConfirmDialog}
    </div>
  )
}

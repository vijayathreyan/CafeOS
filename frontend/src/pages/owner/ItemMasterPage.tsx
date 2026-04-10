import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  useItemMaster,
  useCreateItem,
  useUpdateItem,
  useToggleItemActive,
  useToggleItemBranch,
} from '../../hooks/useItemMaster'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
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
import { Plus, Pencil, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { ItemMaster } from '../../types/vendor'

const ITEM_TYPES = ['vendor_supplied', 'made_in_shop', 'stock', 'beverage']
const UNITS = ['piece', 'kg', 'gram', 'packet', 'box', 'litre', 'bunch', 'cup', 'pack']
const CATEGORIES = ['Tea/Coffee', 'Snacks', 'Buns', 'Beverages', 'Ladoos', 'Combo', 'Bakery']
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

// Numeric fields are kept as strings in the form to avoid zod inference issues,
// and converted to numbers on submit.
const itemSchema = z.object({
  name_en: z.string().min(1, 'English name is required'),
  name_ta: z.string().optional(),
  item_type: z.string().min(1, 'Item type is required'),
  category: z.string().optional(),
  unit: z.string().min(1, 'Unit is required'),
  selling_price: z.string().optional(),
  cost_price: z.string().optional(),
  reconciliation_method: z.string().optional(),
  is_pos_item: z.boolean(),
  is_stock_item: z.boolean(),
  is_snack_item: z.boolean(),
  ml_per_serving: z.string().optional(),
  estimated_cost_per_piece: z.string().optional(),
  branch_kr: z.boolean(),
  branch_c2: z.boolean(),
})

type ItemFormValues = z.infer<typeof itemSchema>

/** Convert a string form value to a nullable number. */
function parseOptNum(v?: string): number | null {
  if (!v || v.trim() === '') return null
  const n = parseFloat(v)
  return Number.isNaN(n) ? null : n
}

function ItemFormDialog({
  open,
  onClose,
  existing,
}: {
  open: boolean
  onClose: () => void
  existing?: ItemMaster
}) {
  const isEdit = Boolean(existing)
  const createItem = useCreateItem()
  const updateItem = useUpdateItem()

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: existing
      ? {
          name_en: existing.name_en,
          name_ta: existing.name_ta ?? '',
          item_type: existing.item_type,
          category: existing.category ?? '',
          branch_kr: existing.branch_kr,
          branch_c2: existing.branch_c2,
          unit: existing.unit,
          selling_price: existing.selling_price?.toString() ?? '',
          cost_price: existing.cost_price?.toString() ?? '',
          reconciliation_method: existing.reconciliation_method ?? '',
          is_pos_item: existing.is_pos_item ?? true,
          is_stock_item: existing.is_stock_item ?? true,
          is_snack_item: existing.is_snack_item ?? true,
          ml_per_serving: existing.ml_per_serving?.toString() ?? '',
          estimated_cost_per_piece: existing.estimated_cost_per_piece?.toString() ?? '',
        }
      : {
          name_en: '',
          name_ta: '',
          item_type: 'vendor_supplied',
          category: '',
          branch_kr: true,
          branch_c2: true,
          unit: 'piece',
          selling_price: '',
          cost_price: '',
          reconciliation_method: '',
          is_pos_item: true,
          is_stock_item: true,
          is_snack_item: true,
          ml_per_serving: '',
          estimated_cost_per_piece: '',
        },
  })

  const watchedType = useWatch({ control, name: 'item_type' })
  const watchedCategory = useWatch({ control, name: 'category' })

  const isMadeInShop = watchedType === 'made_in_shop'
  const showMlPerServing = watchedCategory === 'Tea/Coffee' || watchedCategory === 'Beverages'

  async function onSubmit(values: ItemFormValues) {
    try {
      const payload = {
        name_en: values.name_en,
        name_ta: values.name_ta,
        item_type: values.item_type,
        category: values.category,
        branch_kr: values.branch_kr,
        branch_c2: values.branch_c2,
        unit: values.unit,
        selling_price: parseOptNum(values.selling_price),
        cost_price: parseOptNum(values.cost_price),
        reconciliation_method: values.reconciliation_method,
        is_pos_item: values.is_pos_item,
        is_stock_item: values.is_stock_item,
        is_snack_item: values.is_snack_item,
        ml_per_serving: values.ml_per_serving ? parseInt(values.ml_per_serving, 10) : null,
        estimated_cost_per_piece: parseOptNum(values.estimated_cost_per_piece),
      }
      if (isEdit && existing) {
        await updateItem.mutateAsync({ id: existing.id, ...payload })
        showToast('Item updated', 'success')
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* ── Basic Info ────────────────────────────────────────── */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Basic Info
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>
                  Name (English) <span className="text-destructive">*</span>
                </Label>
                <Input
                  {...register('name_en')}
                  className="mt-1"
                  placeholder="e.g. Medu Vada"
                  data-testid="input-name-en"
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
                <select
                  {...register('item_type')}
                  className={selectCls}
                  data-testid="select-item-type"
                >
                  {ITEM_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Category</Label>
                <select
                  {...register('category')}
                  className={selectCls}
                  data-testid="select-category"
                >
                  <option value="">— Select —</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
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

          {/* ── Pricing ───────────────────────────────────────────── */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Pricing
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Selling Price (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('selling_price')}
                  className="mt-1"
                  placeholder="0.00"
                  data-testid="input-selling-price"
                />
              </div>
              <div>
                <Label>
                  Cost Price (₹)
                  {watchedType === 'vendor_supplied' && (
                    <span className="text-muted-foreground text-xs ml-1">
                      (auto from vendor rates)
                    </span>
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
                  {RECON_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
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
            </div>
          </div>

          {/* ── Module Flags ──────────────────────────────────────── */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Module Flags
            </p>
            <div className="flex flex-wrap gap-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <Controller
                  control={control}
                  name="is_pos_item"
                  render={({ field }) => (
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
                <span className="text-sm">POS Item</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Controller
                  control={control}
                  name="is_stock_item"
                  render={({ field }) => (
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
                <span className="text-sm">Stock Item</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
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
                <span className="text-sm">Snack Item</span>
              </label>
            </div>
          </div>

          {/* ── Branch Availability ───────────────────────────────── */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Branch Availability
            </p>
            <div className="flex gap-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <Controller
                  control={control}
                  name="branch_kr"
                  render={({ field }) => (
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
                <span className="text-sm">Kaappi Ready (KR)</span>
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEdit ? 'Update Item' : 'Create Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function ItemMasterPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { confirm, ConfirmDialog } = useConfirm()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
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
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
          </Button>
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
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(item)}>
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
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setEditingItem(undefined)
        }}
        existing={editingItem}
      />
      {ConfirmDialog}
    </div>
  )
}

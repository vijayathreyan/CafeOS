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
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { ItemMaster } from '../../types/vendor'

const ITEM_TYPES = ['vendor_supplied', 'made_in_shop', 'stock', 'beverage']
const UNITS = ['piece', 'kg', 'gram', 'packet', 'box', 'litre', 'bunch', 'cup', 'pack']

const itemSchema = z.object({
  name_en: z.string().min(1, 'English name is required'),
  name_ta: z.string().optional(),
  item_type: z.string().min(1, 'Item type is required'),
  category: z.string().optional(),
  branch_kr: z.boolean(),
  branch_c2: z.boolean(),
  unit: z.string().min(1, 'Unit is required'),
})

type ItemFormValues = z.infer<typeof itemSchema>

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
        }
      : {
          name_en: '',
          name_ta: '',
          item_type: 'vendor_supplied',
          category: '',
          branch_kr: true,
          branch_c2: true,
          unit: 'piece',
        },
  })

  async function onSubmit(values: ItemFormValues) {
    try {
      if (isEdit && existing) {
        await updateItem.mutateAsync({
          id: existing.id,
          name_en: values.name_en,
          name_ta: values.name_ta,
          item_type: values.item_type,
          category: values.category,
          branch_kr: values.branch_kr,
          branch_c2: values.branch_c2,
          unit: values.unit,
        })
        showToast('Item updated', 'success')
      } else {
        await createItem.mutateAsync({
          name_en: values.name_en,
          name_ta: values.name_ta,
          item_type: values.item_type,
          category: values.category,
          branch_kr: values.branch_kr,
          branch_c2: values.branch_c2,
          unit: values.unit,
        })
        showToast('Item created', 'success')
      }
      reset()
      onClose()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to save item', 'error')
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Item' : 'Add Item to Master'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>
                Name (English) <span className="text-destructive">*</span>
              </Label>
              <Input {...register('name_en')} className="mt-1" placeholder="e.g. Medu Vada" />
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
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {ITEM_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Category</Label>
              <Input
                {...register('category')}
                className="mt-1"
                placeholder="e.g. snacks, beverages"
              />
            </div>
            <div>
              <Label>
                Unit <span className="text-destructive">*</span>
              </Label>
              <select
                {...register('unit')}
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label>Branch Availability</Label>
            <div className="flex gap-5 mt-2">
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
    <div className="p-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/vendors')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Vendors
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
                {t.replace('_', ' ')}
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
                <TableHead>Unit</TableHead>
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
                      {item.item_type.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{item.unit}</TableCell>
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
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
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

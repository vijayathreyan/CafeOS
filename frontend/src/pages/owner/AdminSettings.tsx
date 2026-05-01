import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useForm, useWatch, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Pencil,
  Check,
  X,
  Plus,
  Phone,
  Trash2,
  Package,
  Tags,
  ShoppingCart,
  Users,
  Gauge,
  DollarSign,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import PageContainer from '@/components/layouts/PageContainer'
import PageHeader from '@/components/layouts/PageHeader'
import SectionCard from '@/components/ui/SectionCard'
import DataTable from '@/components/ui/DataTable'
import EmptyState from '@/components/ui/EmptyState'
import AmountDisplay from '@/components/ui/AmountDisplay'
import { TableSkeleton } from '@/components/ui/LoadingSkeletons'
import type { ColumnDef } from '@/components/ui/DataTable'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useStockItemConfig, useUpdateStockItemConfig } from '@/hooks/useStockItemConfig'
import { useSnackItems, useCreateSnackItem, useUpdateSnackItem } from '@/hooks/useSnackItemConfig'
import {
  useCashExpenseCategories,
  useCreateCashExpenseCategory,
  useUpdateCashExpenseCategory,
} from '@/hooks/useCashExpenseCategories'
import {
  useSupervisorExpenseCategories,
  useCreateSupervisorExpenseCategory,
  useUpdateSupervisorExpenseCategory,
} from '@/hooks/useSupervisorExpenseCategories'
import {
  useReconciliationConfig,
  useUpdateReconciliationConfig,
} from '@/hooks/useReconciliationConfig'
import {
  usePLSalaryConfig,
  useCreatePLSalaryConfig,
  useUpdatePLSalaryConfig,
} from '@/hooks/usePLSalaryConfig'
import {
  useServiceContacts,
  useCreateServiceContact,
  useUpdateServiceContact,
  useDeleteServiceContact,
} from '@/hooks/useServiceContacts'
import { useFixedExpenses, useUpdateFixedExpense } from '@/hooks/useFixedExpenses'
import {
  usePOSItems,
  useCreatePOSItem,
  useUpdatePOSItem,
  usePOSCategories,
  useCreatePOSCategory,
  useUpdatePOSCategory,
  usePostPaidCustomerConfig,
  useCreatePostPaidCustomer,
  useUpdatePostPaidCustomer,
} from '@/hooks/usePOSConfig'
import {
  useMonthEndStockConfig,
  useCreateMonthEndStockItem,
  useUpdateMonthEndStockItem,
} from '@/hooks/useMonthEndStockConfig'
import type {
  SnackItemConfig,
  CashExpenseCategory,
  SupervisorExpenseCategory,
  PLSalaryConfig,
  ServiceContact,
  POSItem,
  POSCategory,
  FixedExpenseRow,
  MonthEndStockConfigItem,
} from '@/types/phase11'
import type { PostPaidCustomer } from '@/types/phase5'

// ─── helpers ─────────────────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: 'blue' | 'green' | 'amber' | 'gray' }) {
  const map = {
    blue: 'background:#EBF3FF;color:#1A73E8',
    green: 'background:#E8F5E9;color:#2E7D32',
    amber: 'background:#FFF8E1;color:#F29900',
    gray: 'background:#F1F3F4;color:#6B7280',
  }
  return (
    <span
      style={{
        padding: '2px 8px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 500,
        ...Object.fromEntries(map[color].split(';').map((s) => s.split(':'))),
      }}
    >
      {label}
    </span>
  )
}

function ActiveSwitch({
  checked,
  onToggle,
  disabled,
}: {
  checked: boolean
  onToggle: (v: boolean) => void
  disabled?: boolean
}) {
  return <Switch checked={checked} onCheckedChange={onToggle} disabled={disabled} />
}

// ─── TAB 1: SNACK ITEMS ───────────────────────────────────────────────────────

const snackSchema = z.object({
  item_name: z.string().min(1, 'Required'),
  item_name_tamil: z.string().optional(),
  branch: z.enum(['KR', 'C2', 'Both']),
  input_type: z.enum(['qty', 'prepared']),
  sort_order: z.coerce.number().int().min(0),
})
type SnackForm = z.infer<typeof snackSchema>

function SnackItemsSection({ session }: { session: boolean }) {
  const { toast } = useToast()
  const [drawer, setDrawer] = useState<{ open: boolean; item: SnackItemConfig | null }>({
    open: false,
    item: null,
  })
  const { data: rows, isLoading } = useSnackItems(session)
  const createMut = useCreateSnackItem()
  const updateMut = useUpdateSnackItem()

  const form = useForm<SnackForm>({
    resolver: zodResolver(snackSchema) as unknown as Resolver<SnackForm>,
    defaultValues: { branch: 'KR', input_type: 'qty', sort_order: 0 },
  })

  const open = (item: SnackItemConfig | null) => {
    form.reset(
      item
        ? {
            item_name: item.item_name,
            item_name_tamil: item.item_name_tamil ?? '',
            branch: item.branch as 'KR' | 'C2' | 'Both',
            input_type: item.input_type,
            sort_order: item.sort_order,
          }
        : { item_name: '', item_name_tamil: '', branch: 'KR', input_type: 'qty', sort_order: 0 }
    )
    setDrawer({ open: true, item })
  }

  const onSubmit = (vals: SnackForm) => {
    const done = () => {
      setDrawer({ open: false, item: null })
      toast({ title: drawer.item ? 'Updated' : 'Added' })
    }
    const err = (e: unknown) => {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed',
        variant: 'destructive',
      })
    }
    if (drawer.item)
      updateMut.mutate({ id: drawer.item.id, ...vals }, { onSuccess: done, onError: err })
    else createMut.mutate(vals, { onSuccess: done, onError: err })
  }

  const cols: ColumnDef<SnackItemConfig>[] = [
    {
      header: 'Item Name',
      accessor: (r) => <span className="font-medium text-sm">{r.item_name}</span>,
    },
    {
      header: 'Tamil Name',
      accessor: (r) => (
        <span className="text-sm text-muted-foreground">{r.item_name_tamil ?? '—'}</span>
      ),
    },
    {
      header: 'Branch',
      accessor: (r) => (
        <Badge
          label={r.branch}
          color={r.branch === 'KR' ? 'blue' : r.branch === 'C2' ? 'green' : 'gray'}
        />
      ),
    },
    {
      header: 'Input Type',
      accessor: (r) => (
        <Badge
          label={r.input_type === 'qty' ? 'Vendor Supplied' : 'Made in Shop'}
          color={r.input_type === 'qty' ? 'blue' : 'green'}
        />
      ),
    },
    {
      header: 'Active',
      accessor: (r) => (
        <ActiveSwitch
          checked={r.active}
          onToggle={(v) => updateMut.mutate({ id: r.id, active: v })}
        />
      ),
    },
    {
      header: 'Actions',
      accessor: (r) => (
        <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => open(r)}>
          <Pencil size={14} />
        </Button>
      ),
      align: 'right',
    },
  ]

  return (
    <SectionCard
      title="Snack Items"
      action={
        <Button size="sm" onClick={() => open(null)}>
          <Plus size={14} className="mr-1" />
          Add Snack Item
        </Button>
      }
    >
      {isLoading ? (
        <TableSkeleton cols={6} />
      ) : (
        <DataTable
          columns={cols as unknown as ColumnDef<Record<string, unknown>>[]}
          data={(rows ?? []) as unknown as Record<string, unknown>[]}
          rowKey={(r) => (r as unknown as SnackItemConfig).id}
          emptyState={
            <EmptyState
              icon={Package}
              title="No snack items"
              description="Add your first snack item."
            />
          }
        />
      )}
      <Sheet open={drawer.open} onOpenChange={(o) => setDrawer((d) => ({ ...d, open: o }))}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{drawer.item ? 'Edit Snack Item' : 'Add Snack Item'}</SheetTitle>
          </SheetHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-4">
            <div>
              <Label>Item Name (EN)</Label>
              <Input {...form.register('item_name')} className="mt-1" />
              {form.formState.errors.item_name && (
                <p className="text-xs text-destructive mt-1">
                  {form.formState.errors.item_name.message}
                </p>
              )}
            </div>
            <div>
              <Label>Item Name (Tamil)</Label>
              <Input {...form.register('item_name_tamil')} className="mt-1" />
            </div>
            <div>
              <Label>Branch</Label>
              <Select
                onValueChange={(v) => form.setValue('branch', v as 'KR' | 'C2' | 'Both')}
                defaultValue={form.getValues('branch')}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KR">KR — Kaappi Ready</SelectItem>
                  <SelectItem value="C2">C2 — Coffee Mate</SelectItem>
                  <SelectItem value="Both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Input Type</Label>
              <Select
                onValueChange={(v) => form.setValue('input_type', v as 'qty' | 'prepared')}
                defaultValue={form.getValues('input_type')}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="qty">Vendor Supplied</SelectItem>
                  <SelectItem value="prepared">Made in Shop</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sort Order</Label>
              <Input type="number" {...form.register('sort_order')} className="mt-1" />
            </div>
            <SheetFooter>
              <Button type="submit" disabled={createMut.isLoading || updateMut.isLoading}>
                Save
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </SectionCard>
  )
}

// ─── TAB 1: STOCK ITEM WEIGHT CONFIG (existing) ───────────────────────────────

function StockWeightSection({ session }: { session: boolean }) {
  const { toast } = useToast()
  const { data: configs, isLoading } = useStockItemConfig(session)
  const updateMut = useUpdateStockItemConfig()
  const [editing, setEditing] = useState<Record<string, string>>({})

  const latest = configs
    ? Object.values(
        configs.reduce<Record<string, (typeof configs)[number]>>((acc, cfg) => {
          const ex = acc[cfg.item_id]
          if (!ex || cfg.weight_per_unit_effective_from > ex.weight_per_unit_effective_from)
            acc[cfg.item_id] = cfg
          return acc
        }, {})
      )
    : []

  const save = (itemId: string, entryUnit: string) => {
    const val = Number(editing[itemId])
    if (!val || val <= 0) {
      toast({ title: 'Invalid', description: 'Weight must be > 0', variant: 'destructive' })
      return
    }
    updateMut.mutate(
      { itemId, weightPerUnitGrams: val, entryUnit },
      {
        onSuccess: () => {
          setEditing((p) => {
            const n = { ...p }
            delete n[itemId]
            return n
          })
          toast({ title: 'Weight updated' })
        },
        onError: (e) => {
          toast({
            title: 'Failed',
            description: e instanceof Error ? e.message : 'Error',
            variant: 'destructive',
          })
        },
      }
    )
  }

  return (
    <SectionCard
      title="Stock Item Weight Configuration"
      description="Weight per unit for ladoo bottles, sundal, and sweet corn"
    >
      {isLoading ? (
        <TableSkeleton cols={3} />
      ) : latest.length === 0 ? (
        <EmptyState icon={Package} title="No config" description="Apply migration 005 first." />
      ) : (
        <div className="divide-y">
          {latest.map((cfg) => {
            const isEditing = editing[cfg.item_id] !== undefined
            return (
              <div
                key={cfg.id}
                className="px-4 py-3 flex items-center gap-3"
                data-testid={`weight-config-${cfg.item_master?.name_en?.replace(/\s+/g, '-').toLowerCase()}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{cfg.item_master?.name_en ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">per {cfg.entry_unit}</p>
                </div>
                {isEditing ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="relative">
                      <Input
                        type="number"
                        min="1"
                        value={editing[cfg.item_id]}
                        onChange={(e) =>
                          setEditing((p) => ({ ...p, [cfg.item_id]: e.target.value }))
                        }
                        className="h-8 w-24 text-right pr-8 text-sm"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                        g
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-green-600"
                      onClick={() => save(cfg.item_id, cfg.entry_unit)}
                      disabled={updateMut.isLoading}
                    >
                      <Check size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-destructive"
                      onClick={() =>
                        setEditing((p) => {
                          const n = { ...p }
                          delete n[cfg.item_id]
                          return n
                        })
                      }
                      disabled={updateMut.isLoading}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold">{cfg.weight_per_unit_grams}g</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10"
                      onClick={() =>
                        setEditing((p) => ({
                          ...p,
                          [cfg.item_id]: String(cfg.weight_per_unit_grams),
                        }))
                      }
                    >
                      <Pencil size={14} />
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </SectionCard>
  )
}

// ─── TAB 1: MONTH END STOCK CONFIG ───────────────────────────────────────────

const meSchema = z.object({
  item_name: z.string().min(1, 'Required'),
  unit: z.string().optional(),
  branch_flag: z.string().min(1, 'Required'),
  section: z.string().min(1, 'Required'),
  sort_order: z.coerce.number().int().min(0),
})
type MEForm = z.infer<typeof meSchema>

function MonthEndStockSection({ session }: { session: boolean }) {
  const { toast } = useToast()
  const [drawer, setDrawer] = useState<{ open: boolean; item: MonthEndStockConfigItem | null }>({
    open: false,
    item: null,
  })
  const { data: rows, isLoading } = useMonthEndStockConfig(session)
  const createMut = useCreateMonthEndStockItem()
  const updateMut = useUpdateMonthEndStockItem()

  const form = useForm<MEForm>({
    resolver: zodResolver(meSchema) as unknown as Resolver<MEForm>,
    defaultValues: { branch_flag: 'Both', section: 'General', sort_order: 0 },
  })

  const open = (item: MonthEndStockConfigItem | null) => {
    form.reset(
      item
        ? {
            item_name: item.item_name,
            unit: item.unit ?? '',
            branch_flag: item.branch_flag,
            section: item.section,
            sort_order: item.sort_order,
          }
        : { item_name: '', unit: '', branch_flag: 'Both', section: 'General', sort_order: 0 }
    )
    setDrawer({ open: true, item })
  }

  const onSubmit = (vals: MEForm) => {
    const done = () => {
      setDrawer({ open: false, item: null })
      toast({ title: drawer.item ? 'Updated' : 'Added' })
    }
    const err = (e: unknown) => {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed',
        variant: 'destructive',
      })
    }
    if (drawer.item)
      updateMut.mutate({ id: drawer.item.id, ...vals }, { onSuccess: done, onError: err })
    else createMut.mutate(vals, { onSuccess: done, onError: err })
  }

  const cols: ColumnDef<MonthEndStockConfigItem>[] = [
    {
      header: 'Item Name',
      accessor: (r) => <span className="text-sm font-medium">{r.item_name}</span>,
    },
    {
      header: 'Unit',
      accessor: (r) => <span className="text-sm text-muted-foreground">{r.unit ?? '—'}</span>,
    },
    { header: 'Branch', accessor: (r) => <Badge label={r.branch_flag} color="gray" /> },
    { header: 'Section', accessor: (r) => <span className="text-sm">{r.section}</span> },
    {
      header: 'Active',
      accessor: (r) => (
        <ActiveSwitch
          checked={r.active}
          onToggle={(v) => updateMut.mutate({ id: r.id, active: v })}
        />
      ),
    },
    {
      header: 'Actions',
      accessor: (r) => (
        <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => open(r)}>
          <Pencil size={14} />
        </Button>
      ),
      align: 'right',
    },
  ]

  return (
    <SectionCard
      title="Month End Stock Items"
      action={
        <Button size="sm" onClick={() => open(null)}>
          <Plus size={14} className="mr-1" />
          Add Item
        </Button>
      }
    >
      {isLoading ? (
        <TableSkeleton cols={6} />
      ) : (
        <DataTable
          columns={cols as unknown as ColumnDef<Record<string, unknown>>[]}
          data={(rows ?? []) as unknown as Record<string, unknown>[]}
          rowKey={(r) => (r as unknown as MonthEndStockConfigItem).id}
          emptyState={
            <EmptyState icon={Package} title="No items" description="Add month-end stock items." />
          }
        />
      )}
      <Sheet open={drawer.open} onOpenChange={(o) => setDrawer((d) => ({ ...d, open: o }))}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{drawer.item ? 'Edit Item' : 'Add Item'}</SheetTitle>
          </SheetHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-4">
            <div>
              <Label>Item Name</Label>
              <Input {...form.register('item_name')} className="mt-1" />
              {form.formState.errors.item_name && (
                <p className="text-xs text-destructive mt-1">
                  {form.formState.errors.item_name.message}
                </p>
              )}
            </div>
            <div>
              <Label>Unit</Label>
              <Input {...form.register('unit')} placeholder="e.g. kg, pcs" className="mt-1" />
            </div>
            <div>
              <Label>Branch Flag</Label>
              <Select
                onValueChange={(v) => form.setValue('branch_flag', v)}
                defaultValue={form.getValues('branch_flag')}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Both">Both</SelectItem>
                  <SelectItem value="KR Only">KR Only</SelectItem>
                  <SelectItem value="C2 Only">C2 Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Section</Label>
              <Input {...form.register('section')} placeholder="e.g. Beverages" className="mt-1" />
            </div>
            <div>
              <Label>Sort Order</Label>
              <Input type="number" {...form.register('sort_order')} className="mt-1" />
            </div>
            <SheetFooter>
              <Button type="submit">Save</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </SectionCard>
  )
}

// ─── TAB 2: CASH EXPENSE CATEGORIES ──────────────────────────────────────────

const catSchema = z.object({
  category_name: z.string().min(1, 'Required'),
  category_name_tamil: z.string().optional(),
  gas_for_pl_gas_bill: z.boolean(),
  sort_order: z.coerce.number().int().min(0),
})
type CatForm = z.infer<typeof catSchema>

function CashExpenseCatSection({ session, branch }: { session: boolean; branch: 'KR' | 'C2' }) {
  const { toast } = useToast()
  const [drawer, setDrawer] = useState<{ open: boolean; item: CashExpenseCategory | null }>({
    open: false,
    item: null,
  })
  const { data: rows, isLoading } = useCashExpenseCategories(session, branch)
  const createMut = useCreateCashExpenseCategory()
  const updateMut = useUpdateCashExpenseCategory()

  const form = useForm<CatForm>({
    resolver: zodResolver(catSchema) as unknown as Resolver<CatForm>,
    defaultValues: { gas_for_pl_gas_bill: false, sort_order: 0 },
  })
  const gasFlag = useWatch({ control: form.control, name: 'gas_for_pl_gas_bill' })

  const open = (item: CashExpenseCategory | null) => {
    form.reset(
      item
        ? {
            category_name: item.category_name,
            category_name_tamil: item.category_name_tamil ?? '',
            gas_for_pl_gas_bill: item.gas_for_pl_gas_bill,
            sort_order: item.sort_order,
          }
        : { category_name: '', category_name_tamil: '', gas_for_pl_gas_bill: false, sort_order: 0 }
    )
    setDrawer({ open: true, item })
  }

  const onSubmit = (vals: CatForm) => {
    const done = () => {
      setDrawer({ open: false, item: null })
      toast({ title: drawer.item ? 'Updated' : 'Added' })
    }
    const err = (e: unknown) => {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed',
        variant: 'destructive',
      })
    }
    if (drawer.item)
      updateMut.mutate({ id: drawer.item.id, ...vals }, { onSuccess: done, onError: err })
    else createMut.mutate({ ...vals, branch }, { onSuccess: done, onError: err })
  }

  const cols: ColumnDef<CashExpenseCategory>[] = [
    {
      header: 'Category Name',
      accessor: (r) => <span className="text-sm font-medium">{r.category_name}</span>,
    },
    {
      header: 'Tamil Name',
      accessor: (r) => (
        <span className="text-sm text-muted-foreground">{r.category_name_tamil ?? '—'}</span>
      ),
    },
    {
      header: 'Gas Bill Flag',
      accessor: (r) =>
        r.gas_for_pl_gas_bill ? (
          <Badge label="Gas → P&L" color="amber" />
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    {
      header: 'Active',
      accessor: (r) => (
        <ActiveSwitch
          checked={r.active}
          onToggle={(v) => updateMut.mutate({ id: r.id, active: v })}
        />
      ),
    },
    {
      header: 'Actions',
      accessor: (r) => (
        <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => open(r)}>
          <Pencil size={14} />
        </Button>
      ),
      align: 'right',
    },
  ]

  return (
    <SectionCard
      title={`Cash Expense Categories — ${branch}`}
      action={
        <Button size="sm" onClick={() => open(null)}>
          <Plus size={14} className="mr-1" />
          Add Category
        </Button>
      }
    >
      {isLoading ? (
        <TableSkeleton cols={5} />
      ) : (
        <DataTable
          columns={cols as unknown as ColumnDef<Record<string, unknown>>[]}
          data={(rows ?? []) as unknown as Record<string, unknown>[]}
          rowKey={(r) => (r as unknown as CashExpenseCategory).id}
          emptyState={
            <EmptyState icon={Tags} title="No categories" description="Add expense categories." />
          }
        />
      )}
      <Sheet open={drawer.open} onOpenChange={(o) => setDrawer((d) => ({ ...d, open: o }))}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{drawer.item ? 'Edit Category' : `Add ${branch} Category`}</SheetTitle>
          </SheetHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-4">
            <div>
              <Label>Category Name (EN)</Label>
              <Input {...form.register('category_name')} className="mt-1" />
              {form.formState.errors.category_name && (
                <p className="text-xs text-destructive mt-1">
                  {form.formState.errors.category_name.message}
                </p>
              )}
            </div>
            <div>
              <Label>Category Name (Tamil)</Label>
              <Input {...form.register('category_name_tamil')} className="mt-1" />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={gasFlag}
                onCheckedChange={(v) => form.setValue('gas_for_pl_gas_bill', v)}
              />
              <Label>Gas Bill → P&L Gas line</Label>
            </div>
            <div>
              <Label>Sort Order</Label>
              <Input type="number" {...form.register('sort_order')} className="mt-1" />
            </div>
            <SheetFooter>
              <Button type="submit">Save</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </SectionCard>
  )
}

// ─── TAB 2: SUPERVISOR EXPENSE CATEGORIES ────────────────────────────────────

const supCatSchema = z.object({
  category_name: z.string().min(1, 'Required'),
  flows_to_hk_misc: z.boolean(),
  sort_order: z.coerce.number().int().min(0),
})
type SupCatForm = z.infer<typeof supCatSchema>

function SupervisorExpenseCatSection({ session }: { session: boolean }) {
  const { toast } = useToast()
  const [drawer, setDrawer] = useState<{ open: boolean; item: SupervisorExpenseCategory | null }>({
    open: false,
    item: null,
  })
  const { data: rows, isLoading } = useSupervisorExpenseCategories(session)
  const createMut = useCreateSupervisorExpenseCategory()
  const updateMut = useUpdateSupervisorExpenseCategory()

  const form = useForm<SupCatForm>({
    resolver: zodResolver(supCatSchema) as unknown as Resolver<SupCatForm>,
    defaultValues: { flows_to_hk_misc: false, sort_order: 0 },
  })
  const flowsFlag = useWatch({ control: form.control, name: 'flows_to_hk_misc' })

  const open = (item: SupervisorExpenseCategory | null) => {
    form.reset(
      item
        ? {
            category_name: item.category_name,
            flows_to_hk_misc: item.flows_to_hk_misc,
            sort_order: item.sort_order,
          }
        : { category_name: '', flows_to_hk_misc: false, sort_order: 0 }
    )
    setDrawer({ open: true, item })
  }

  const onSubmit = (vals: SupCatForm) => {
    const done = () => {
      setDrawer({ open: false, item: null })
      toast({ title: drawer.item ? 'Updated' : 'Added' })
    }
    const err = (e: unknown) => {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed',
        variant: 'destructive',
      })
    }
    if (drawer.item)
      updateMut.mutate({ id: drawer.item.id, ...vals }, { onSuccess: done, onError: err })
    else createMut.mutate(vals, { onSuccess: done, onError: err })
  }

  const cols: ColumnDef<SupervisorExpenseCategory>[] = [
    {
      header: 'Category Name',
      accessor: (r) => <span className="text-sm font-medium">{r.category_name}</span>,
    },
    {
      header: 'HK & Misc Flag',
      accessor: (r) =>
        r.flows_to_hk_misc ? (
          <Badge label="→ HK & Misc" color="amber" />
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    {
      header: 'Active',
      accessor: (r) => (
        <ActiveSwitch
          checked={r.active}
          onToggle={(v) => updateMut.mutate({ id: r.id, active: v })}
        />
      ),
    },
    {
      header: 'Actions',
      accessor: (r) => (
        <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => open(r)}>
          <Pencil size={14} />
        </Button>
      ),
      align: 'right',
    },
  ]

  return (
    <SectionCard
      title="Supervisor Expense Categories"
      action={
        <Button size="sm" onClick={() => open(null)}>
          <Plus size={14} className="mr-1" />
          Add Category
        </Button>
      }
    >
      {isLoading ? (
        <TableSkeleton cols={4} />
      ) : (
        <DataTable
          columns={cols as unknown as ColumnDef<Record<string, unknown>>[]}
          data={(rows ?? []) as unknown as Record<string, unknown>[]}
          rowKey={(r) => (r as unknown as SupervisorExpenseCategory).id}
          emptyState={
            <EmptyState
              icon={Tags}
              title="No categories"
              description="Add supervisor expense categories."
            />
          }
        />
      )}
      <p className="text-xs text-muted-foreground mt-3 px-1">
        Housekeeping category flows to P&L HK &amp; Misc Total line. All other categories flow to HO
        Expenses.
      </p>
      <Sheet open={drawer.open} onOpenChange={(o) => setDrawer((d) => ({ ...d, open: o }))}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{drawer.item ? 'Edit Category' : 'Add Category'}</SheetTitle>
          </SheetHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-4">
            <div>
              <Label>Category Name</Label>
              <Input {...form.register('category_name')} className="mt-1" />
              {form.formState.errors.category_name && (
                <p className="text-xs text-destructive mt-1">
                  {form.formState.errors.category_name.message}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={flowsFlag}
                onCheckedChange={(v) => form.setValue('flows_to_hk_misc', v)}
              />
              <Label>Flows to HK &amp; Misc P&amp;L line</Label>
            </div>
            <div>
              <Label>Sort Order</Label>
              <Input type="number" {...form.register('sort_order')} className="mt-1" />
            </div>
            <SheetFooter>
              <Button type="submit">Save</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </SectionCard>
  )
}

// ─── TAB 3: POS ITEMS ────────────────────────────────────────────────────────

const posItemSchema = z.object({
  name_en: z.string().min(1, 'Required'),
  name_ta: z.string().optional(),
  selling_price: z.coerce.number().min(0),
  sort_order: z.coerce.number().int().min(0),
})
type POSItemForm = z.infer<typeof posItemSchema>

function POSItemsSection({ session }: { session: boolean }) {
  const { toast } = useToast()
  const [drawer, setDrawer] = useState<{ open: boolean; item: POSItem | null }>({
    open: false,
    item: null,
  })
  const { data: rows, isLoading } = usePOSItems(session)
  const createMut = useCreatePOSItem()
  const updateMut = useUpdatePOSItem()

  const form = useForm<POSItemForm>({
    resolver: zodResolver(posItemSchema) as unknown as Resolver<POSItemForm>,
    defaultValues: { selling_price: 0, sort_order: 0 },
  })

  const open = (item: POSItem | null) => {
    form.reset(
      item
        ? {
            name_en: item.name_en,
            name_ta: item.name_ta ?? '',
            selling_price: item.selling_price,
            sort_order: item.sort_order,
          }
        : { name_en: '', name_ta: '', selling_price: 0, sort_order: 0 }
    )
    setDrawer({ open: true, item })
  }

  const onSubmit = (vals: POSItemForm) => {
    const done = () => {
      setDrawer({ open: false, item: null })
      toast({ title: drawer.item ? 'Updated' : 'Added' })
    }
    const err = (e: unknown) => {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed',
        variant: 'destructive',
      })
    }
    if (drawer.item)
      updateMut.mutate({ id: drawer.item.id, ...vals }, { onSuccess: done, onError: err })
    else
      createMut.mutate(
        { ...vals, active_kr: true, active_c2: true },
        { onSuccess: done, onError: err }
      )
  }

  const cols: ColumnDef<POSItem>[] = [
    {
      header: 'Item Name',
      accessor: (r) => <span className="text-sm font-medium">{r.name_en}</span>,
    },
    {
      header: 'Tamil',
      accessor: (r) => <span className="text-sm text-muted-foreground">{r.name_ta ?? '—'}</span>,
    },
    {
      header: 'Price',
      accessor: (r) => <AmountDisplay amount={r.selling_price} />,
      align: 'right',
    },
    {
      header: 'KR',
      accessor: (r) => (
        <ActiveSwitch
          checked={r.active_kr}
          onToggle={(v) => updateMut.mutate({ id: r.id, active_kr: v })}
        />
      ),
    },
    {
      header: 'C2',
      accessor: (r) => (
        <ActiveSwitch
          checked={r.active_c2}
          onToggle={(v) => updateMut.mutate({ id: r.id, active_c2: v })}
        />
      ),
    },
    {
      header: 'Actions',
      accessor: (r) => (
        <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => open(r)}>
          <Pencil size={14} />
        </Button>
      ),
      align: 'right',
    },
  ]

  return (
    <SectionCard
      title="POS Items"
      action={
        <Button size="sm" onClick={() => open(null)}>
          <Plus size={14} className="mr-1" />
          Add POS Item
        </Button>
      }
    >
      {isLoading ? (
        <TableSkeleton cols={6} />
      ) : (
        <DataTable
          columns={cols as unknown as ColumnDef<Record<string, unknown>>[]}
          data={(rows ?? []) as unknown as Record<string, unknown>[]}
          rowKey={(r) => (r as unknown as POSItem).id}
          emptyState={
            <EmptyState
              icon={ShoppingCart}
              title="No POS items"
              description="Add items for the billing system."
            />
          }
        />
      )}
      <Sheet open={drawer.open} onOpenChange={(o) => setDrawer((d) => ({ ...d, open: o }))}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{drawer.item ? 'Edit POS Item' : 'Add POS Item'}</SheetTitle>
          </SheetHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-4">
            <div>
              <Label>Item Name (EN)</Label>
              <Input {...form.register('name_en')} className="mt-1" />
              {form.formState.errors.name_en && (
                <p className="text-xs text-destructive mt-1">
                  {form.formState.errors.name_en.message}
                </p>
              )}
            </div>
            <div>
              <Label>Item Name (Tamil)</Label>
              <Input {...form.register('name_ta')} className="mt-1" />
            </div>
            <div>
              <Label>Selling Price (₹)</Label>
              <Input
                type="number"
                step="0.01"
                {...form.register('selling_price')}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Price change takes effect from next bill only.
              </p>
            </div>
            <div>
              <Label>Sort Order</Label>
              <Input type="number" {...form.register('sort_order')} className="mt-1" />
            </div>
            <SheetFooter>
              <Button type="submit">Save</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </SectionCard>
  )
}

// ─── TAB 3: POS CATEGORIES ───────────────────────────────────────────────────

const posCatSchema = z.object({
  name_en: z.string().min(1, 'Required'),
  name_ta: z.string().optional(),
})
type POSCatForm = z.infer<typeof posCatSchema>

function POSCategoriesSection({ session }: { session: boolean }) {
  const { toast } = useToast()
  const [drawer, setDrawer] = useState<{ open: boolean; item: POSCategory | null }>({
    open: false,
    item: null,
  })
  const { data: rows, isLoading } = usePOSCategories(session)
  const createMut = useCreatePOSCategory()
  const updateMut = useUpdatePOSCategory()

  const form = useForm<POSCatForm>({
    resolver: zodResolver(posCatSchema),
    defaultValues: { name_en: '', name_ta: '' },
  })

  const open = (item: POSCategory | null) => {
    form.reset(
      item ? { name_en: item.name_en, name_ta: item.name_ta ?? '' } : { name_en: '', name_ta: '' }
    )
    setDrawer({ open: true, item })
  }

  const cols: ColumnDef<POSCategory>[] = [
    {
      header: 'Category Name',
      accessor: (r) => <span className="text-sm font-medium">{r.name_en}</span>,
    },
    {
      header: 'Tamil',
      accessor: (r) => <span className="text-sm text-muted-foreground">{r.name_ta ?? '—'}</span>,
    },
    {
      header: 'Active',
      accessor: (r) => (
        <ActiveSwitch
          checked={r.active}
          onToggle={(v) => updateMut.mutate({ id: r.id, active: v })}
        />
      ),
    },
    {
      header: 'Actions',
      accessor: (r) => (
        <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => open(r)}>
          <Pencil size={14} />
        </Button>
      ),
      align: 'right',
    },
  ]

  return (
    <SectionCard
      title="POS Categories"
      action={
        <Button size="sm" onClick={() => open(null)}>
          <Plus size={14} className="mr-1" />
          Add Category
        </Button>
      }
    >
      {isLoading ? (
        <TableSkeleton cols={4} />
      ) : (
        <DataTable
          columns={cols as unknown as ColumnDef<Record<string, unknown>>[]}
          data={(rows ?? []) as unknown as Record<string, unknown>[]}
          rowKey={(r) => (r as unknown as POSCategory).id}
          emptyState={
            <EmptyState icon={Tags} title="No categories" description="Add POS categories." />
          }
        />
      )}
      <Sheet open={drawer.open} onOpenChange={(o) => setDrawer((d) => ({ ...d, open: o }))}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{drawer.item ? 'Edit Category' : 'Add Category'}</SheetTitle>
          </SheetHeader>
          <form
            onSubmit={form.handleSubmit((v) => {
              const done = () => {
                setDrawer({ open: false, item: null })
                toast({ title: drawer.item ? 'Updated' : 'Added' })
              }
              const err = (e: unknown) => {
                toast({
                  title: 'Error',
                  description: e instanceof Error ? e.message : 'Failed',
                  variant: 'destructive',
                })
              }
              if (drawer.item)
                updateMut.mutate({ id: drawer.item.id, ...v }, { onSuccess: done, onError: err })
              else createMut.mutate(v, { onSuccess: done, onError: err })
            })}
            className="flex flex-col gap-4 mt-4"
          >
            <div>
              <Label>Category Name (EN)</Label>
              <Input {...form.register('name_en')} className="mt-1" />
              {form.formState.errors.name_en && (
                <p className="text-xs text-destructive mt-1">
                  {form.formState.errors.name_en.message}
                </p>
              )}
            </div>
            <div>
              <Label>Category Name (Tamil)</Label>
              <Input {...form.register('name_ta')} className="mt-1" />
            </div>
            <SheetFooter>
              <Button type="submit">Save</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </SectionCard>
  )
}

// ─── TAB 3: POST-PAID CUSTOMERS ───────────────────────────────────────────────

const ppSchema = z.object({ name: z.string().min(1, 'Required'), branch: z.enum(['KR', 'C2']) })
type PPForm = z.infer<typeof ppSchema>

function PostPaidCustomerSection({ session }: { session: boolean }) {
  const { toast } = useToast()
  const [drawer, setDrawer] = useState<{ open: boolean; item: PostPaidCustomer | null }>({
    open: false,
    item: null,
  })
  const { data: rows, isLoading } = usePostPaidCustomerConfig(session)
  const createMut = useCreatePostPaidCustomer()
  const updateMut = useUpdatePostPaidCustomer()

  const form = useForm<PPForm>({ resolver: zodResolver(ppSchema), defaultValues: { branch: 'KR' } })

  const open = (item: PostPaidCustomer | null) => {
    form.reset(
      item
        ? { name: item.name, branch: (item.branch as 'KR' | 'C2') ?? 'KR' }
        : { name: '', branch: 'KR' }
    )
    setDrawer({ open: true, item })
  }

  const cols: ColumnDef<PostPaidCustomer>[] = [
    {
      header: 'Customer Name',
      accessor: (r) => <span className="text-sm font-medium">{r.name}</span>,
    },
    { header: 'Branch', accessor: (r) => <Badge label={String(r.branch ?? 'KR')} color="blue" /> },
    {
      header: 'Active',
      accessor: (r) => (
        <ActiveSwitch
          checked={r.active !== false}
          onToggle={(v) => updateMut.mutate({ id: r.id, active: v })}
        />
      ),
    },
    {
      header: 'Actions',
      accessor: (r) => (
        <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => open(r)}>
          <Pencil size={14} />
        </Button>
      ),
      align: 'right',
    },
  ]

  return (
    <SectionCard
      title="Post-Paid Customers"
      action={
        <Button size="sm" onClick={() => open(null)}>
          <Plus size={14} className="mr-1" />
          Add Customer
        </Button>
      }
    >
      {isLoading ? (
        <TableSkeleton cols={4} />
      ) : (
        <DataTable
          columns={cols as unknown as ColumnDef<Record<string, unknown>>[]}
          data={(rows ?? []) as unknown as Record<string, unknown>[]}
          rowKey={(r) => (r as unknown as PostPaidCustomer).id}
          emptyState={
            <EmptyState icon={Users} title="No customers" description="Add post-paid customers." />
          }
        />
      )}
      <p className="text-xs text-muted-foreground mt-2 px-1">
        Post-paid customers currently available at Kaappi Ready only.
      </p>
      <Sheet open={drawer.open} onOpenChange={(o) => setDrawer((d) => ({ ...d, open: o }))}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{drawer.item ? 'Edit Customer' : 'Add Customer'}</SheetTitle>
          </SheetHeader>
          <form
            onSubmit={form.handleSubmit((v) => {
              const done = () => {
                setDrawer({ open: false, item: null })
                toast({ title: drawer.item ? 'Updated' : 'Added' })
              }
              const err = (e: unknown) => {
                toast({
                  title: 'Error',
                  description: e instanceof Error ? e.message : 'Failed',
                  variant: 'destructive',
                })
              }
              if (drawer.item)
                updateMut.mutate({ id: drawer.item.id, ...v }, { onSuccess: done, onError: err })
              else createMut.mutate(v, { onSuccess: done, onError: err })
            })}
            className="flex flex-col gap-4 mt-4"
          >
            <div>
              <Label>Customer Name</Label>
              <Input {...form.register('name')} className="mt-1" />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive mt-1">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div>
              <Label>Branch</Label>
              <Select
                onValueChange={(v) => form.setValue('branch', v as 'KR' | 'C2')}
                defaultValue="KR"
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KR">KR — Kaappi Ready</SelectItem>
                  <SelectItem value="C2">C2 — Coffee Mate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <SheetFooter>
              <Button type="submit">Save</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </SectionCard>
  )
}

// ─── TAB 4: PL SALARY CONFIG ─────────────────────────────────────────────────

const salarySchema = z.object({
  staff_name: z.string().min(1, 'Required'),
  branch: z.enum(['KR', 'C2']),
  sort_order: z.coerce.number().int().min(0),
})
type SalaryForm = z.infer<typeof salarySchema>

function PLSalarySection({ session }: { session: boolean }) {
  const { toast } = useToast()
  const [drawer, setDrawer] = useState<{ open: boolean; item: PLSalaryConfig | null }>({
    open: false,
    item: null,
  })
  const { data: rows, isLoading } = usePLSalaryConfig(session)
  const createMut = useCreatePLSalaryConfig()
  const updateMut = useUpdatePLSalaryConfig()

  const form = useForm<SalaryForm>({
    resolver: zodResolver(salarySchema) as unknown as Resolver<SalaryForm>,
    defaultValues: { branch: 'KR', sort_order: 0 },
  })

  const open = (item: PLSalaryConfig | null) => {
    form.reset(
      item
        ? {
            staff_name: item.staff_name,
            branch: item.branch as 'KR' | 'C2',
            sort_order: item.sort_order,
          }
        : { staff_name: '', branch: 'KR', sort_order: 0 }
    )
    setDrawer({ open: true, item })
  }

  const cols: ColumnDef<PLSalaryConfig>[] = [
    {
      header: 'Staff Name',
      accessor: (r) => <span className="text-sm font-medium">{r.staff_name}</span>,
    },
    {
      header: 'Branch',
      accessor: (r) => <Badge label={r.branch} color={r.branch === 'KR' ? 'blue' : 'green'} />,
    },
    {
      header: 'Active',
      accessor: (r) => (
        <ActiveSwitch
          checked={r.active}
          onToggle={(v) => updateMut.mutate({ id: r.id, active: v })}
        />
      ),
    },
    {
      header: 'Actions',
      accessor: (r) => (
        <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => open(r)}>
          <Pencil size={14} />
        </Button>
      ),
      align: 'right',
    },
  ]

  return (
    <SectionCard
      title="P&L Salary Staff List"
      action={
        <Button size="sm" onClick={() => open(null)}>
          <Plus size={14} className="mr-1" />
          Add Staff Row
        </Button>
      }
    >
      {isLoading ? (
        <TableSkeleton cols={4} />
      ) : (
        <DataTable
          columns={cols as unknown as ColumnDef<Record<string, unknown>>[]}
          data={(rows ?? []) as unknown as Record<string, unknown>[]}
          rowKey={(r) => (r as unknown as PLSalaryConfig).id}
          emptyState={
            <EmptyState icon={Users} title="No staff" description="Add P&L salary rows." />
          }
        />
      )}
      <Sheet open={drawer.open} onOpenChange={(o) => setDrawer((d) => ({ ...d, open: o }))}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{drawer.item ? 'Edit Staff Row' : 'Add Staff Row'}</SheetTitle>
          </SheetHeader>
          <form
            onSubmit={form.handleSubmit((v) => {
              const done = () => {
                setDrawer({ open: false, item: null })
                toast({ title: drawer.item ? 'Updated' : 'Added' })
              }
              const err = (e: unknown) => {
                toast({
                  title: 'Error',
                  description: e instanceof Error ? e.message : 'Failed',
                  variant: 'destructive',
                })
              }
              if (drawer.item)
                updateMut.mutate({ id: drawer.item.id, ...v }, { onSuccess: done, onError: err })
              else createMut.mutate(v, { onSuccess: done, onError: err })
            })}
            className="flex flex-col gap-4 mt-4"
          >
            <div>
              <Label>Staff Name</Label>
              <Input {...form.register('staff_name')} className="mt-1" />
              {form.formState.errors.staff_name && (
                <p className="text-xs text-destructive mt-1">
                  {form.formState.errors.staff_name.message}
                </p>
              )}
            </div>
            <div>
              <Label>Branch</Label>
              <Select
                onValueChange={(v) => form.setValue('branch', v as 'KR' | 'C2')}
                defaultValue={form.getValues('branch')}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KR">KR — Kaappi Ready</SelectItem>
                  <SelectItem value="C2">C2 — Coffee Mate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sort Order</Label>
              <Input type="number" {...form.register('sort_order')} className="mt-1" />
            </div>
            <SheetFooter>
              <Button type="submit">Save</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </SectionCard>
  )
}

// ─── TAB 4: SERVICE CONTACTS ─────────────────────────────────────────────────

const contactSchema = z.object({
  service_type: z.string().min(1, 'Required'),
  branch: z.enum(['KR', 'C2', 'Both']),
  contact_name: z.string(),
  phone: z.string(),
})
type ContactForm = z.infer<typeof contactSchema>

function ServiceContactsSection({ session }: { session: boolean }) {
  const { toast } = useToast()
  const [drawer, setDrawer] = useState<{ open: boolean; item: ServiceContact | null }>({
    open: false,
    item: null,
  })
  const { data: rows, isLoading } = useServiceContacts(session)
  const createMut = useCreateServiceContact()
  const updateMut = useUpdateServiceContact()
  const deleteMut = useDeleteServiceContact()

  const form = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: { branch: 'Both', contact_name: '', phone: '' },
  })

  const open = (item: ServiceContact | null) => {
    form.reset(
      item
        ? {
            service_type: item.service_type,
            branch: item.branch as 'KR' | 'C2' | 'Both',
            contact_name: item.contact_name,
            phone: item.phone,
          }
        : { service_type: '', branch: 'Both', contact_name: '', phone: '' }
    )
    setDrawer({ open: true, item })
  }

  const onSubmit = (vals: ContactForm) => {
    const done = () => {
      setDrawer({ open: false, item: null })
      toast({ title: drawer.item ? 'Updated' : 'Added' })
    }
    const err = (e: unknown) => {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed',
        variant: 'destructive',
      })
    }
    if (drawer.item)
      updateMut.mutate({ id: drawer.item.id, ...vals }, { onSuccess: done, onError: err })
    else createMut.mutate(vals, { onSuccess: done, onError: err })
  }

  const cols: ColumnDef<ServiceContact>[] = [
    {
      header: 'Service Type',
      accessor: (r) => <span className="text-sm font-medium">{r.service_type}</span>,
    },
    { header: 'Branch', accessor: (r) => <Badge label={r.branch} color="gray" /> },
    {
      header: 'Contact',
      accessor: (r) => <span className="text-sm">{r.contact_name || '—'}</span>,
    },
    {
      header: 'Phone',
      accessor: (r) =>
        r.phone ? (
          <a
            href={`tel:${r.phone}`}
            className="text-sm text-blue-600 flex items-center gap-1"
            style={{ textDecoration: 'none' }}
          >
            <Phone size={12} />
            {r.phone}
          </a>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    {
      header: 'Actions',
      align: 'right',
      accessor: (r) => (
        <div className="flex gap-1 justify-end">
          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => open(r)}>
            <Pencil size={14} />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-destructive hover:text-destructive"
              >
                <Trash2 size={14} />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {r.service_type}?</AlertDialogTitle>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    deleteMut.mutate(r.id, {
                      onSuccess: () => {
                        toast({ title: 'Deleted' })
                      },
                      onError: (e) => {
                        toast({
                          title: 'Error',
                          description: e instanceof Error ? e.message : 'Failed',
                          variant: 'destructive',
                        })
                      },
                    })
                  }
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ]

  return (
    <SectionCard
      title="Service Contacts"
      action={
        <Button size="sm" onClick={() => open(null)}>
          <Plus size={14} className="mr-1" />
          Add Contact
        </Button>
      }
    >
      {isLoading ? (
        <TableSkeleton cols={5} />
      ) : (
        <DataTable
          columns={cols as unknown as ColumnDef<Record<string, unknown>>[]}
          data={(rows ?? []) as unknown as Record<string, unknown>[]}
          rowKey={(r) => (r as unknown as ServiceContact).id}
          emptyState={
            <EmptyState
              icon={Phone}
              title="No contacts"
              description="Add maintenance service contacts."
            />
          }
        />
      )}
      <Sheet open={drawer.open} onOpenChange={(o) => setDrawer((d) => ({ ...d, open: o }))}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{drawer.item ? 'Edit Contact' : 'Add Contact'}</SheetTitle>
          </SheetHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-4">
            <div>
              <Label>Service Type</Label>
              <Input {...form.register('service_type')} className="mt-1" />
              {form.formState.errors.service_type && (
                <p className="text-xs text-destructive mt-1">
                  {form.formState.errors.service_type.message}
                </p>
              )}
            </div>
            <div>
              <Label>Branch</Label>
              <Select
                onValueChange={(v) => form.setValue('branch', v as 'KR' | 'C2' | 'Both')}
                defaultValue={form.getValues('branch')}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Both">Both</SelectItem>
                  <SelectItem value="KR">KR — Kaappi Ready</SelectItem>
                  <SelectItem value="C2">C2 — Coffee Mate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Contact Name</Label>
              <Input {...form.register('contact_name')} className="mt-1" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input {...form.register('phone')} type="tel" className="mt-1" />
            </div>
            <SheetFooter>
              <Button type="submit">Save</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </SectionCard>
  )
}

// ─── TAB 5: THRESHOLDS ───────────────────────────────────────────────────────

const thresholdSchema = z.object({
  amber_threshold: z.coerce.number().min(0),
  red_threshold: z.coerce.number().min(0),
  cash_discrepancy_tolerance: z.coerce.number().min(0),
  upi_drop_alert_percent: z.coerce.number().min(0).max(100),
  wastage_alert_percent: z.coerce.number().min(0).max(100),
  supervisor_deposit_history_count: z.coerce.number().int().min(1),
})
type ThresholdForm = z.infer<typeof thresholdSchema>

function ThresholdSection({ session, branch }: { session: boolean; branch: 'KR' | 'C2' }) {
  const { toast } = useToast()
  const { data: config, isLoading } = useReconciliationConfig(session, branch)
  const updateMut = useUpdateReconciliationConfig()

  const form = useForm<ThresholdForm>({
    resolver: zodResolver(thresholdSchema) as unknown as Resolver<ThresholdForm>,
    defaultValues: {
      amber_threshold: 200,
      red_threshold: 500,
      cash_discrepancy_tolerance: 50,
      upi_drop_alert_percent: 20,
      wastage_alert_percent: 15,
      supervisor_deposit_history_count: 5,
    },
  })

  React.useEffect(() => {
    if (config)
      form.reset({
        amber_threshold: config.amber_threshold,
        red_threshold: config.red_threshold,
        cash_discrepancy_tolerance: config.cash_discrepancy_tolerance,
        upi_drop_alert_percent: config.upi_drop_alert_percent,
        wastage_alert_percent: config.wastage_alert_percent,
        supervisor_deposit_history_count: config.supervisor_deposit_history_count,
      })
  }, [config, form])

  const onSave = form.handleSubmit((vals) => {
    if (!config) return
    updateMut.mutate(
      { id: config.id, ...vals },
      {
        onSuccess: () => {
          toast({ title: `${branch} thresholds saved` })
        },
        onError: (e) => {
          toast({
            title: 'Error',
            description: e instanceof Error ? e.message : 'Failed',
            variant: 'destructive',
          })
        },
      }
    )
  })

  if (isLoading)
    return (
      <SectionCard title={`Reconciliation Thresholds — ${branch}`}>
        <TableSkeleton cols={2} />
      </SectionCard>
    )

  return (
    <SectionCard title={`Reconciliation Thresholds — ${branch}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(
          [
            ['amber_threshold', 'Amber Threshold ₹'],
            ['red_threshold', 'Red Threshold ₹'],
            ['cash_discrepancy_tolerance', 'Cash Discrepancy Tolerance ₹'],
            ['upi_drop_alert_percent', 'UPI Drop Alert %'],
            ['wastage_alert_percent', 'Wastage Alert %'],
            ['supervisor_deposit_history_count', 'Supervisor Deposit History Count'],
          ] as [keyof ThresholdForm, string][]
        ).map(([field, label]) => (
          <div key={field}>
            <Label className="text-sm">{label}</Label>
            <Input type="number" step="0.01" {...form.register(field)} className="mt-1 h-10" />
          </div>
        ))}
      </div>
      <div className="mt-4">
        <Button onClick={onSave} disabled={updateMut.isLoading}>
          Save Changes
        </Button>
      </div>
    </SectionCard>
  )
}

// ─── TAB 6: FIXED COSTS ──────────────────────────────────────────────────────

function FixedCostsSection({ session, branch }: { session: boolean; branch: 'KR' | 'C2' }) {
  const { toast } = useToast()
  const { data: rows, isLoading } = useFixedExpenses(session, branch)
  const updateMut = useUpdateFixedExpense()
  const [editing, setEditing] = useState<Record<string, string>>({})

  const startEdit = (id: string, monthly: number) =>
    setEditing((p) => ({ ...p, [id]: String(monthly) }))
  const cancelEdit = (id: string) =>
    setEditing((p) => {
      const n = { ...p }
      delete n[id]
      return n
    })

  const saveEdit = (row: FixedExpenseRow) => {
    const monthly = Number(editing[row.id])
    if (isNaN(monthly) || monthly <= 0) {
      toast({ title: 'Invalid amount', variant: 'destructive' })
      return
    }
    updateMut.mutate(
      { id: row.id, annual_amount: monthly * row.months_divisor },
      {
        onSuccess: () => {
          cancelEdit(row.id)
          toast({ title: 'Fixed cost updated' })
        },
        onError: (e) => {
          toast({
            title: 'Error',
            description: e instanceof Error ? e.message : 'Failed',
            variant: 'destructive',
          })
        },
      }
    )
  }

  const cols: ColumnDef<FixedExpenseRow>[] = [
    {
      header: 'Expense Name',
      accessor: (r) => <span className="text-sm font-medium">{r.label}</span>,
    },
    {
      header: 'Monthly Amount (₹)',
      align: 'right',
      accessor: (r) => {
        const isEditing = editing[r.id] !== undefined
        return isEditing ? (
          <div className="flex items-center gap-1 justify-end">
            <Input
              type="number"
              step="0.01"
              value={editing[r.id]}
              onChange={(e) => setEditing((p) => ({ ...p, [r.id]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEdit(r)
                if (e.key === 'Escape') cancelEdit(r.id)
              }}
              className="h-8 w-28 text-right text-sm"
              autoFocus
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-green-600"
              onClick={() => saveEdit(r)}
            >
              <Check size={14} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-destructive"
              onClick={() => cancelEdit(r.id)}
            >
              <X size={14} />
            </Button>
          </div>
        ) : (
          <AmountDisplay amount={r.monthly_amount} />
        )
      },
    },
    {
      header: 'Annual Basis',
      accessor: (r) => (
        <span className="text-sm text-muted-foreground">{r.annual_basis ?? '—'}</span>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      accessor: (r) =>
        editing[r.id] === undefined ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onClick={() => startEdit(r.id, r.monthly_amount)}
          >
            <Pencil size={14} />
          </Button>
        ) : null,
    },
  ]

  return (
    <SectionCard title={`Fixed Costs — ${branch}`}>
      {isLoading ? (
        <TableSkeleton cols={4} />
      ) : (
        <DataTable
          columns={cols as unknown as ColumnDef<Record<string, unknown>>[]}
          data={(rows ?? []) as unknown as Record<string, unknown>[]}
          rowKey={(r) => (r as unknown as FixedExpenseRow).id}
          emptyState={
            <EmptyState
              icon={DollarSign}
              title="No fixed costs"
              description="Apply migration 017 first."
            />
          }
        />
      )}
      <p className="text-xs text-muted-foreground mt-3 px-1">
        Changes take effect in P&L from the current month onwards.
      </p>
    </SectionCard>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function AdminSettings() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const session = !!user

  return (
    <PageContainer>
      <PageHeader
        title="Admin Settings"
        subtitle="System configuration — changes take effect immediately"
      />

      <Tabs defaultValue="items-stock" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 mb-6">
          <TabsTrigger value="items-stock" className="flex items-center gap-1">
            <Package size={14} />
            Items &amp; Stock
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex items-center gap-1">
            <Tags size={14} />
            Expenses &amp; Categories
          </TabsTrigger>
          <TabsTrigger value="pos" className="flex items-center gap-1">
            <ShoppingCart size={14} />
            POS Configuration
          </TabsTrigger>
          <TabsTrigger value="people" className="flex items-center gap-1">
            <Users size={14} />
            People &amp; Access
          </TabsTrigger>
          <TabsTrigger value="thresholds" className="flex items-center gap-1">
            <Gauge size={14} />
            Thresholds &amp; Limits
          </TabsTrigger>
          <TabsTrigger value="fixed-costs" className="flex items-center gap-1">
            <DollarSign size={14} />
            Fixed Costs
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Items & Stock ── */}
        <TabsContent value="items-stock" className="flex flex-col gap-6">
          <SnackItemsSection session={session} />
          <StockWeightSection session={session} />
          <MonthEndStockSection session={session} />
        </TabsContent>

        {/* ── Tab 2: Expenses & Categories ── */}
        <TabsContent value="expenses" className="flex flex-col gap-6">
          <CashExpenseCatSection session={session} branch="KR" />
          <CashExpenseCatSection session={session} branch="C2" />
          <SupervisorExpenseCatSection session={session} />
        </TabsContent>

        {/* ── Tab 3: POS Configuration ── */}
        <TabsContent value="pos" className="flex flex-col gap-6">
          <POSItemsSection session={session} />
          <POSCategoriesSection session={session} />
          <PostPaidCustomerSection session={session} />
        </TabsContent>

        {/* ── Tab 4: People & Access ── */}
        <TabsContent value="people" className="flex flex-col gap-6">
          <SectionCard
            title="User Accounts"
            description="Manage staff logins, roles and branch access"
          >
            <p className="text-sm text-muted-foreground mb-4">
              User account management is handled on the dedicated Users page.
            </p>
            <Button variant="outline" onClick={() => navigate('/users')}>
              Open User Management →
            </Button>
          </SectionCard>
          <PLSalarySection session={session} />
          <ServiceContactsSection session={session} />
        </TabsContent>

        {/* ── Tab 5: Thresholds & Limits ── */}
        <TabsContent value="thresholds" className="flex flex-col gap-6">
          <ThresholdSection session={session} branch="KR" />
          <ThresholdSection session={session} branch="C2" />
        </TabsContent>

        {/* ── Tab 6: Fixed Costs ── */}
        <TabsContent value="fixed-costs" className="flex flex-col gap-6">
          <FixedCostsSection session={session} branch="KR" />
          <FixedCostsSection session={session} branch="C2" />
        </TabsContent>
      </Tabs>
    </PageContainer>
  )
}

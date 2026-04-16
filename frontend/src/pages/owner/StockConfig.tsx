import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useStockItemConfig, useUpdateStockItemConfig } from '../../hooks/useStockItemConfig'
import { useToast } from '../../hooks/use-toast'
import { useAuth } from '../../contexts/AuthContext'
import { Check, Pencil, X } from 'lucide-react'
import { PageContainer } from '@/components/layouts/PageContainer'
import { PageHeader } from '@/components/layouts/PageHeader'

export default function StockConfig() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { data: configs, isLoading, error } = useStockItemConfig(!!user)
  const updateMutation = useUpdateStockItemConfig()

  // itemId → pending input value
  const [editing, setEditing] = useState<Record<string, string>>({})

  const startEdit = (itemId: string, currentWeight: number) => {
    setEditing((prev) => ({ ...prev, [itemId]: String(currentWeight) }))
  }

  const cancelEdit = (itemId: string) => {
    setEditing((prev) => {
      const next = { ...prev }
      delete next[itemId]
      return next
    })
  }

  const saveEdit = (itemId: string, entryUnit: string) => {
    const val = Number(editing[itemId])
    if (!val || val <= 0) {
      toast({
        title: 'Invalid weight',
        description: 'Weight must be greater than 0.',
        variant: 'destructive',
      })
      return
    }

    updateMutation.mutate(
      { itemId, weightPerUnitGrams: val, entryUnit },
      {
        onSuccess: () => {
          cancelEdit(itemId)
          toast({
            title: 'Saved successfully',
            description: 'New weight takes effect immediately.',
          })
        },
        onError: (err: unknown) => {
          toast({
            title: 'Save failed',
            description: err instanceof Error ? err.message : 'Could not save weight.',
            variant: 'destructive',
          })
        },
      }
    )
  }

  // One row per item — latest active config only
  const latestByItem = configs
    ? Object.values(
        configs.reduce<Record<string, (typeof configs)[number]>>((acc, cfg) => {
          const existing = acc[cfg.item_id]
          if (
            !existing ||
            cfg.weight_per_unit_effective_from > existing.weight_per_unit_effective_from
          ) {
            acc[cfg.item_id] = cfg
          }
          return acc
        }, {})
      )
    : []

  const unitLabel = (entryUnit: string) =>
    entryUnit === 'cup' ? 'grams per cup' : 'grams per piece'

  return (
    <PageContainer>
      <PageHeader title="Stock Configuration" subtitle="Weight per unit settings" />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Weight per Unit</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Used by the Sales Reconciliation engine to calculate predicted revenue from closing
            stock weights.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          )}

          {!!error && (
            <div className="p-4 text-destructive text-sm">
              Failed to load configuration. Please refresh the page.
            </div>
          )}

          {!isLoading && !error && latestByItem.length === 0 && (
            <div className="p-4 text-muted-foreground text-sm text-center">
              No weight configurations found. Apply migration 005 first.
            </div>
          )}

          {!isLoading && latestByItem.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Weight per Unit</TableHead>
                  <TableHead className="text-right w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latestByItem.map((cfg) => {
                  const isEditing = editing[cfg.item_id] !== undefined
                  const isSaving = updateMutation.isLoading

                  return (
                    <TableRow
                      key={cfg.id}
                      data-testid={`stock-config-${cfg.item_master?.name_en?.replace(/\s+/g, '-').toLowerCase()}`}
                    >
                      <TableCell className="font-medium">
                        {cfg.item_master?.name_en ?? '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {unitLabel(cfg.entry_unit)}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <Label className="sr-only">
                              Weight in grams for {cfg.item_master?.name_en}
                            </Label>
                            <div className="relative">
                              <Input
                                type="number"
                                min="1"
                                value={editing[cfg.item_id]}
                                onChange={(e) =>
                                  setEditing((prev) => ({
                                    ...prev,
                                    [cfg.item_id]: e.target.value,
                                  }))
                                }
                                onFocus={(e) => e.target.select()}
                                className="h-8 w-24 text-right pr-7 text-sm"
                                aria-label={`${cfg.item_master?.name_en} weight in grams`}
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                                g
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="font-semibold">{cfg.weight_per_unit_grams}g</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600 hover:text-green-700"
                              onClick={() => saveEdit(cfg.item_id, cfg.entry_unit)}
                              disabled={isSaving}
                              aria-label="Save weight"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive/70"
                              onClick={() => cancelEdit(cfg.item_id)}
                              disabled={isSaving}
                              aria-label="Cancel edit"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(cfg.item_id, cfg.weight_per_unit_grams)}
                            aria-label={`Edit ${cfg.item_master?.name_en} weight`}
                          >
                            <Pencil className="w-3.5 h-3.5 mr-1" />
                            Edit
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  )
}

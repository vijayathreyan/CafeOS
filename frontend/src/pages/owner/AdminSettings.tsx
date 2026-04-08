import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useStockItemConfig, useUpdateStockItemConfig } from '../../hooks/useStockItemConfig'
import { useToast } from '../../hooks/use-toast'
import { useAuth } from '../../contexts/AuthContext'
import { Pencil, Check, X } from 'lucide-react'

/**
 * Admin Settings page — Phase 2 scope: weight-per-unit configuration
 * for ladoo/sundal/corn stock items. Owner can edit values at any time;
 * each edit inserts a new stock_item_config row, preserving history.
 */
export default function AdminSettings() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { data: configs, isLoading, error } = useStockItemConfig(!!user)
  const updateMutation = useUpdateStockItemConfig()

  // Track which row is being edited: itemId → pending weight value
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
          toast({ title: 'Weight updated', description: 'New weight takes effect immediately.' })
        },
        onError: (err: unknown) => {
          toast({
            title: 'Update failed',
            description: err instanceof Error ? err.message : 'Could not update weight.',
            variant: 'destructive',
          })
        },
      }
    )
  }

  // Deduplicate: show only the latest active config per item
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

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Admin Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">System configuration for owners</p>
      </div>

      {/* Stock Item Weight Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Stock Item Weight Configuration</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Weight per unit for ladoo bottles, sundal, and sweet corn. Changes take effect
            immediately and the history of all changes is retained.
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
              Failed to load configuration. Please refresh.
            </div>
          )}

          {!isLoading && !error && latestByItem.length === 0 && !error && (
            <div className="p-4 text-muted-foreground text-sm text-center">
              No weight configurations found. Apply migration 005 first.
            </div>
          )}

          {!isLoading && latestByItem.length > 0 && (
            <div className="divide-y">
              {latestByItem.map((cfg) => {
                const isEditing = editing[cfg.item_id] !== undefined
                const isSaving = updateMutation.isLoading

                return (
                  <div
                    key={cfg.id}
                    className="px-4 py-3 flex items-center gap-3"
                    data-testid={`weight-config-${cfg.item_master?.name_en?.replace(/\s+/g, '-').toLowerCase()}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {cfg.item_master?.name_en ?? '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        per {cfg.entry_unit} · effective from{' '}
                        {new Date(cfg.weight_per_unit_effective_from).toLocaleDateString('en-IN')}
                      </p>
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <Label className="sr-only">Weight in grams</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            min="1"
                            value={editing[cfg.item_id]}
                            onChange={(e) =>
                              setEditing((prev) => ({ ...prev, [cfg.item_id]: e.target.value }))
                            }
                            onFocus={(e) => e.target.select()}
                            className="h-8 w-24 text-right pr-8 text-sm"
                            aria-label={`${cfg.item_master?.name_en} weight in grams`}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                            g
                          </span>
                        </div>
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
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-semibold text-foreground">
                          {cfg.weight_per_unit_grams}g
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => startEdit(cfg.item_id, cfg.weight_per_unit_grams)}
                          aria-label={`Edit ${cfg.item_master?.name_en} weight`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Placeholder for future settings sections */}
      <Card className="mt-4 opacity-50">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground text-center">
            More settings coming in Phase 11 (Vendor Management, Alerts, PDF export)
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

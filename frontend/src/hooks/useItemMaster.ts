import { useQuery, useMutation, useQueryClient } from 'react-query'
import { supabase } from '../lib/supabase'
import type { ItemMaster } from '../types/vendor'

/**
 * Fetches all items from item_master, ordered by type then name.
 * Used by vendor item selector and item master admin page.
 *
 * @param session - Auth session guard
 */
export function useItemMaster(session: boolean) {
  return useQuery<ItemMaster[]>(
    'item_master',
    async () => {
      const { data, error } = await supabase
        .from('item_master')
        .select('*')
        .order('item_type')
        .order('name_en')
      if (error) throw new Error(error.message)
      return (data ?? []) as ItemMaster[]
    },
    { enabled: !!session, retry: 2, staleTime: 30000 }
  )
}

interface CreateItemPayload {
  name_en: string
  name_ta?: string
  item_type: string
  category?: string
  branch_kr: boolean
  branch_c2: boolean
  active_kr: boolean
  active_c2: boolean
  active?: boolean
  unit: string
  selling_price?: number | null
  cost_price?: number | null
  price_group?: string | null
  reconciliation_method?: string
  is_pos_item: boolean
  is_stock_item: boolean
  is_snack_item: boolean
  ml_per_serving?: number | null
  estimated_cost_per_piece?: number | null
  vendor_id?: string
}

/**
 * Mutation that creates a new item in item_master.
 * Validates that no active item with the same name_en already exists.
 * Returns the created item's id.
 */
export function useCreateItem() {
  const qc = useQueryClient()

  return useMutation(
    async (payload: CreateItemPayload): Promise<string> => {
      const { data: existing } = await supabase
        .from('item_master')
        .select('id')
        .ilike('name_en', payload.name_en)
        .limit(1)

      if (existing && existing.length > 0) {
        throw new Error(`Item "${payload.name_en}" already exists`)
      }

      const { data, error } = await supabase
        .from('item_master')
        .insert({
          name_en: payload.name_en,
          name_ta: payload.name_ta || null,
          item_type: payload.item_type,
          category: payload.category || null,
          branch_kr: payload.branch_kr,
          branch_c2: payload.branch_c2,
          active_kr: payload.active_kr,
          active_c2: payload.active_c2,
          unit: payload.unit,
          selling_price: payload.selling_price ?? null,
          cost_price: payload.cost_price ?? null,
          price_group: payload.price_group ?? null,
          reconciliation_method: payload.reconciliation_method || null,
          is_pos_item: payload.is_pos_item,
          is_stock_item: payload.is_stock_item,
          is_snack_item: payload.is_snack_item,
          ml_per_serving: payload.ml_per_serving ?? null,
          estimated_cost_per_piece: payload.estimated_cost_per_piece ?? null,
          active: payload.active ?? true,
        })
        .select('id')
        .single()
      if (error) throw new Error(error.message)

      // Link vendor if provided
      if (payload.vendor_id && data?.id) {
        await supabase.from('vendor_items').insert({
          vendor_id: payload.vendor_id,
          item_id: data.id,
          branch: null,
          calc_type: 'manual',
          start_date: new Date().toISOString().split('T')[0],
          active: true,
        })
      }

      return data?.id ?? ''
    },
    {
      onSuccess: () => {
        qc.invalidateQueries('item_master')
      },
    }
  )
}

interface UpdateItemPayload {
  id: string
  name_en: string
  name_ta?: string
  item_type: string
  category?: string
  branch_kr: boolean
  branch_c2: boolean
  active_kr: boolean
  active_c2: boolean
  active?: boolean
  unit: string
  selling_price?: number | null
  cost_price?: number | null
  price_group?: string | null
  reconciliation_method?: string
  is_pos_item: boolean
  is_stock_item: boolean
  is_snack_item: boolean
  ml_per_serving?: number | null
  estimated_cost_per_piece?: number | null
  vendor_id?: string
}

/**
 * Mutation that updates an existing item_master record.
 */
export function useUpdateItem() {
  const qc = useQueryClient()

  return useMutation(
    async (payload: UpdateItemPayload) => {
      const { error } = await supabase
        .from('item_master')
        .update({
          name_en: payload.name_en,
          name_ta: payload.name_ta || null,
          item_type: payload.item_type,
          category: payload.category || null,
          branch_kr: payload.branch_kr,
          branch_c2: payload.branch_c2,
          active_kr: payload.active_kr,
          active_c2: payload.active_c2,
          unit: payload.unit,
          selling_price: payload.selling_price ?? null,
          cost_price: payload.cost_price ?? null,
          price_group: payload.price_group ?? null,
          reconciliation_method: payload.reconciliation_method || null,
          is_pos_item: payload.is_pos_item,
          is_stock_item: payload.is_stock_item,
          is_snack_item: payload.is_snack_item,
          ml_per_serving: payload.ml_per_serving ?? null,
          estimated_cost_per_piece: payload.estimated_cost_per_piece ?? null,
          ...(payload.active !== undefined ? { active: payload.active } : {}),
        })
        .eq('id', payload.id)
      if (error) throw new Error(error.message)

      // Update vendor link: deactivate old links, create new one if vendor_id provided
      if (payload.vendor_id) {
        // Deactivate existing vendor_items for this item
        await supabase.from('vendor_items').update({ active: false }).eq('item_id', payload.id)
        // Insert new active link
        await supabase.from('vendor_items').insert({
          vendor_id: payload.vendor_id,
          item_id: payload.id,
          branch: null,
          calc_type: 'manual',
          start_date: new Date().toISOString().split('T')[0],
          active: true,
        })
      } else if (payload.vendor_id === '') {
        // Explicit clear — deactivate all vendor links
        await supabase.from('vendor_items').update({ active: false }).eq('item_id', payload.id)
      }
    },
    {
      onSuccess: () => {
        qc.invalidateQueries('item_master')
        qc.invalidateQueries('vendors')
      },
    }
  )
}

/**
 * Fetches a single item_master record by ID from the database.
 * Used by the edit form to guarantee fresh data (bypasses list cache).
 *
 * @param id      - Item UUID to fetch
 * @param enabled - Auth session guard
 */
export function useItemById(id: string | undefined, enabled: boolean) {
  return useQuery<ItemMaster>(
    ['item_master', 'single', id],
    async () => {
      const { data, error } = await supabase.from('item_master').select('*').eq('id', id!).single()
      if (error) throw new Error(error.message)
      return data as ItemMaster
    },
    { enabled: !!enabled && !!id, staleTime: 0, retry: 2 }
  )
}

/**
 * Fetches the active vendor_items record for a given item so the form
 * can pre-fill the Vendor Link dropdown in edit mode.
 */
export function useItemVendorLinks(itemId: string | undefined, session: boolean) {
  return useQuery<{ vendor_id: string } | null>(
    ['item_vendor_link', itemId],
    async () => {
      if (!itemId) return null
      const { data, error } = await supabase
        .from('vendor_items')
        .select('vendor_id')
        .eq('item_id', itemId)
        .eq('active', true)
        .limit(1)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return data ?? null
    },
    { enabled: !!session && !!itemId, staleTime: 30000 }
  )
}

/**
 * Mutation that toggles the active state of an item globally.
 * Use branch-specific fields (branch_kr / branch_c2) for per-branch deactivation.
 */
export function useToggleItemActive() {
  const qc = useQueryClient()

  return useMutation(
    async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('item_master').update({ active }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    {
      onSuccess: () => {
        qc.invalidateQueries('item_master')
      },
    }
  )
}

/**
 * Mutation to toggle branch-specific availability for an item.
 * Sets branch_kr or branch_c2 independently.
 */
export function useToggleItemBranch() {
  const qc = useQueryClient()

  return useMutation(
    async ({
      id,
      field,
      value,
    }: {
      id: string
      field: 'branch_kr' | 'branch_c2'
      value: boolean
    }) => {
      const { error } = await supabase
        .from('item_master')
        .update({ [field]: value })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    {
      onSuccess: () => {
        qc.invalidateQueries('item_master')
      },
    }
  )
}

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
  unit: string
}

/**
 * Mutation that creates a new item in item_master.
 * Validates that no active item with the same name_en already exists.
 */
export function useCreateItem() {
  const qc = useQueryClient()

  return useMutation(
    async (payload: CreateItemPayload) => {
      const { data: existing } = await supabase
        .from('item_master')
        .select('id')
        .ilike('name_en', payload.name_en)
        .limit(1)

      if (existing && existing.length > 0) {
        throw new Error(`Item "${payload.name_en}" already exists`)
      }

      const { error } = await supabase.from('item_master').insert({
        name_en: payload.name_en,
        name_ta: payload.name_ta || null,
        item_type: payload.item_type,
        category: payload.category || null,
        branch_kr: payload.branch_kr,
        branch_c2: payload.branch_c2,
        unit: payload.unit,
        active: true,
      })
      if (error) throw new Error(error.message)
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
  unit: string
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
          unit: payload.unit,
        })
        .eq('id', payload.id)
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

import { useMutation, useQueryClient } from 'react-query'
import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '../lib/supabase'
import type {
  POSItem,
  POSCategory,
  CreatePOSItemPayload,
  UpdatePOSItemPayload,
  CreatePOSCategoryPayload,
  UpdatePOSCategoryPayload,
  CreatePostPaidCustomerPayload,
  UpdatePostPaidCustomerPayload,
} from '../types/phase11'
import type { PostPaidCustomer } from '../types/phase5'

// ── POS Items ──────────────────────────────────────────────────────────────────

/**
 * Fetches all pos_items rows ordered by sort_order ascending.
 *
 * @param session - Auth session guard
 */
export function usePOSItems(session: boolean) {
  return useSupabaseQuery<POSItem[]>(
    ['pos_items'],
    async () => {
      const { data, error } = await supabase
        .from('pos_items')
        .select('*')
        .order('sort_order', { ascending: true })
      if (error) throw new Error(error.message)
      return (data ?? []) as POSItem[]
    },
    { enabled: !!session, retry: 2, staleTime: 30000 }
  )
}

/**
 * Mutation that inserts a new pos_items row.
 * Also creates the linked item_master row (used_in_pos_billing=true) so the
 * new item keeps showing up in the billing grid, which now reads from
 * item_master — see CONTEXT.md follow-up note on the planned FK migration.
 * Invalidates the ['pos_items'] query cache on success.
 */
export function useCreatePOSItem() {
  const qc = useQueryClient()

  return useMutation(
    async (payload: CreatePOSItemPayload) => {
      let categoryName: string | null = null
      if (payload.category_id) {
        const { data: cat } = await supabase
          .from('pos_categories')
          .select('name_en')
          .eq('id', payload.category_id)
          .maybeSingle()
        categoryName = cat?.name_en ?? null
      }

      const { data: masterRow, error: masterErr } = await supabase
        .from('item_master')
        .insert({
          name_en: payload.name_en,
          name_ta: payload.name_ta ?? null,
          item_type: 'vendor_supplied',
          category: categoryName,
          unit: 'piece',
          branch_kr: payload.branch_kr,
          branch_c2: payload.branch_c2,
          selling_price: payload.selling_price,
          ml_per_serving: payload.ml_per_serving ?? null,
          used_in_pos_billing: true,
          pos_sort_order: payload.sort_order,
          active: true,
        })
        .select('id')
        .single()
      if (masterErr) throw new Error(masterErr.message)

      const { error } = await supabase.from('pos_items').insert({
        name_en: payload.name_en,
        name_ta: payload.name_ta ?? null,
        category_id: payload.category_id ?? null,
        selling_price: payload.selling_price,
        branch_kr: payload.branch_kr,
        branch_c2: payload.branch_c2,
        sort_order: payload.sort_order,
        ml_per_serving: payload.ml_per_serving ?? null,
        item_id: masterRow?.id ?? null,
      })
      if (error) throw new Error(error.message)
    },
    {
      onSuccess: () => {
        qc.invalidateQueries(['pos_items'])
        qc.invalidateQueries('pos_items_billing')
        qc.invalidateQueries('item_master')
      },
    }
  )
}

/**
 * Mutation that partially updates a pos_items row by id.
 * Supports toggling active_kr and active_c2 independently.
 * Mirrors price/branch/active changes into the linked item_master row (the
 * source POS billing reads from) — until the FK migration (see CONTEXT.md
 * follow-up note) lets item_master be the only place these are edited.
 * Invalidates the ['pos_items'] query cache on success.
 */
export function useUpdatePOSItem() {
  const qc = useQueryClient()

  return useMutation(
    async ({ id, ...rest }: UpdatePOSItemPayload) => {
      const { data: updated, error } = await supabase
        .from('pos_items')
        .update(rest)
        .eq('id', id)
        .select('item_id')
        .single()
      if (error) throw new Error(error.message)

      if (updated?.item_id) {
        const mirrored: Record<string, unknown> = {}
        if (rest.selling_price !== undefined) mirrored.selling_price = rest.selling_price
        if (rest.branch_kr !== undefined) mirrored.branch_kr = rest.branch_kr
        if (rest.branch_c2 !== undefined) mirrored.branch_c2 = rest.branch_c2
        if (rest.active !== undefined) mirrored.active = rest.active
        if (Object.keys(mirrored).length > 0) {
          const { error: masterErr } = await supabase
            .from('item_master')
            .update(mirrored)
            .eq('id', updated.item_id)
          if (masterErr) throw new Error(masterErr.message)
        }
      }
    },
    {
      onSuccess: () => {
        qc.invalidateQueries(['pos_items'])
        qc.invalidateQueries('pos_items_billing')
        qc.invalidateQueries('item_master')
      },
    }
  )
}

// ── POS Categories ─────────────────────────────────────────────────────────────

/**
 * Fetches all pos_categories rows ordered by name_en ascending.
 *
 * @param session - Auth session guard
 */
export function usePOSCategories(session: boolean) {
  return useSupabaseQuery<POSCategory[]>(
    ['pos_categories'],
    async () => {
      const { data, error } = await supabase
        .from('pos_categories')
        .select('*')
        .order('name_en', { ascending: true })
      if (error) throw new Error(error.message)
      return (data ?? []) as POSCategory[]
    },
    { enabled: !!session, retry: 2, staleTime: 30000 }
  )
}

/**
 * Mutation that inserts a new pos_categories row.
 * Invalidates the ['pos_categories'] query cache on success.
 */
export function useCreatePOSCategory() {
  const qc = useQueryClient()

  return useMutation(
    async (payload: CreatePOSCategoryPayload) => {
      const { error } = await supabase.from('pos_categories').insert({
        name_en: payload.name_en,
        name_ta: payload.name_ta ?? null,
        active: true,
      })
      if (error) throw new Error(error.message)
    },
    {
      onSuccess: () => {
        qc.invalidateQueries(['pos_categories'])
      },
    }
  )
}

/**
 * Mutation that partially updates a pos_categories row by id.
 * Accepts any subset of CreatePOSCategoryPayload plus active flag.
 * Invalidates the ['pos_categories'] query cache on success.
 */
export function useUpdatePOSCategory() {
  const qc = useQueryClient()

  return useMutation(
    async ({ id, ...rest }: UpdatePOSCategoryPayload) => {
      const { error } = await supabase.from('pos_categories').update(rest).eq('id', id)
      if (error) throw new Error(error.message)
    },
    {
      onSuccess: () => {
        qc.invalidateQueries(['pos_categories'])
      },
    }
  )
}

// ── Post-Paid Customers (admin config) ─────────────────────────────────────────

/**
 * Fetches all postpaid_customers rows ordered by name ascending.
 * Includes inactive rows so admins can re-activate them.
 *
 * @param session - Auth session guard
 */
export function usePostPaidCustomerConfig(session: boolean) {
  return useSupabaseQuery<PostPaidCustomer[]>(
    ['postpaid_customers_config'],
    async () => {
      const { data, error } = await supabase
        .from('postpaid_customers')
        .select('*')
        .order('name', { ascending: true })
      if (error) throw new Error(error.message)
      return (data ?? []) as PostPaidCustomer[]
    },
    { enabled: !!session, retry: 2, staleTime: 30000 }
  )
}

/**
 * Mutation that inserts a new postpaid_customers row.
 * Invalidates both ['postpaid_customers_config'] and ['postpaid_customers'] on success.
 */
export function useCreatePostPaidCustomer() {
  const qc = useQueryClient()

  return useMutation(
    async (payload: CreatePostPaidCustomerPayload) => {
      const { error } = await supabase.from('postpaid_customers').insert({
        name: payload.name,
        branch: payload.branch,
        active: true,
      })
      if (error) throw new Error(error.message)
    },
    {
      onSuccess: () => {
        qc.invalidateQueries(['postpaid_customers_config'])
        qc.invalidateQueries('postpaid_customers')
      },
    }
  )
}

/**
 * Mutation that partially updates a postpaid_customers row by id.
 * Accepts any subset of CreatePostPaidCustomerPayload plus active flag.
 * Invalidates both ['postpaid_customers_config'] and ['postpaid_customers'] on success.
 */
export function useUpdatePostPaidCustomer() {
  const qc = useQueryClient()

  return useMutation(
    async ({ id, ...rest }: UpdatePostPaidCustomerPayload) => {
      const { error } = await supabase.from('postpaid_customers').update(rest).eq('id', id)
      if (error) throw new Error(error.message)
    },
    {
      onSuccess: () => {
        qc.invalidateQueries(['postpaid_customers_config'])
        qc.invalidateQueries('postpaid_customers')
      },
    }
  )
}

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
 * Invalidates the ['pos_items'] query cache on success.
 */
export function useCreatePOSItem() {
  const qc = useQueryClient()

  return useMutation(
    async (payload: CreatePOSItemPayload) => {
      const { error } = await supabase.from('pos_items').insert({
        name_en: payload.name_en,
        name_ta: payload.name_ta ?? null,
        category_id: payload.category_id ?? null,
        selling_price: payload.selling_price,
        active_kr: payload.active_kr,
        active_c2: payload.active_c2,
        sort_order: payload.sort_order,
      })
      if (error) throw new Error(error.message)
    },
    {
      onSuccess: () => {
        qc.invalidateQueries(['pos_items'])
      },
    }
  )
}

/**
 * Mutation that partially updates a pos_items row by id.
 * Supports toggling active_kr and active_c2 independently.
 * Invalidates the ['pos_items'] query cache on success.
 */
export function useUpdatePOSItem() {
  const qc = useQueryClient()

  return useMutation(
    async ({ id, ...rest }: UpdatePOSItemPayload) => {
      const { error } = await supabase.from('pos_items').update(rest).eq('id', id)
      if (error) throw new Error(error.message)
    },
    {
      onSuccess: () => {
        qc.invalidateQueries(['pos_items'])
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

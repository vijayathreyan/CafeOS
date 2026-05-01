import { useMutation, useQueryClient } from 'react-query'
import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '../lib/supabase'
import type {
  ServiceContact,
  CreateServiceContactPayload,
  UpdateServiceContactPayload,
} from '../types/phase11'

/**
 * Fetches all service_contacts rows, optionally filtered by branch.
 * Ordered by service_type then contact_name.
 *
 * @param session - Auth session guard
 * @param branch  - Optional branch code to filter results (KR or C2)
 */
export function useServiceContacts(session: boolean, branch?: string) {
  return useSupabaseQuery<ServiceContact[]>(
    ['service_contacts', branch ?? 'all'],
    async () => {
      let query = supabase
        .from('service_contacts')
        .select('*')
        .order('service_type', { ascending: true })
        .order('contact_name', { ascending: true })

      if (branch) {
        query = query.eq('branch', branch)
      }

      const { data, error } = await query
      if (error) throw new Error(error.message)
      return (data ?? []) as ServiceContact[]
    },
    { enabled: !!session, retry: 2, staleTime: 30000 }
  )
}

/**
 * Mutation that inserts a new service_contacts row.
 * Invalidates the ['service_contacts'] query cache on success.
 */
export function useCreateServiceContact() {
  const qc = useQueryClient()

  return useMutation(
    async (payload: CreateServiceContactPayload) => {
      const { error } = await supabase.from('service_contacts').insert({
        service_type: payload.service_type,
        branch: payload.branch,
        contact_name: payload.contact_name,
        phone: payload.phone,
      })
      if (error) throw new Error(error.message)
    },
    {
      onSuccess: () => {
        qc.invalidateQueries(['service_contacts'])
      },
    }
  )
}

/**
 * Mutation that partially updates a service_contacts row by id.
 * Accepts any subset of CreateServiceContactPayload fields.
 * Invalidates the ['service_contacts'] query cache on success.
 */
export function useUpdateServiceContact() {
  const qc = useQueryClient()

  return useMutation(
    async ({ id, ...rest }: UpdateServiceContactPayload) => {
      const { error } = await supabase
        .from('service_contacts')
        .update({ ...rest, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    {
      onSuccess: () => {
        qc.invalidateQueries(['service_contacts'])
      },
    }
  )
}

/**
 * Mutation that deletes a service_contacts row by id.
 * Invalidates the ['service_contacts'] query cache on success.
 */
export function useDeleteServiceContact() {
  const qc = useQueryClient()

  return useMutation(
    async (id: string) => {
      const { error } = await supabase.from('service_contacts').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    {
      onSuccess: () => {
        qc.invalidateQueries(['service_contacts'])
      },
    }
  )
}

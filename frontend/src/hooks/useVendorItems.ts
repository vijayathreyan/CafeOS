import { useMutation, useQueryClient } from 'react-query'
import { supabase } from '../lib/supabase'
import type { VendorItemFormRow } from '../types/vendor'

/**
 * Mutation that adds a new item to an existing vendor.
 * Creates both the vendor_items row and the initial vendor_item_rates row.
 *
 * @returns useMutation result — call `.mutate({ vendorId, item })`
 */
export function useAddVendorItem() {
  const qc = useQueryClient()

  return useMutation(
    async ({ vendorId, item }: { vendorId: string; item: VendorItemFormRow }) => {
      const branchVal = item.branch_kr && item.branch_c2 ? null : item.branch_kr ? 'KR' : 'C2'

      const { data: vi, error: viErr } = await supabase
        .from('vendor_items')
        .insert({
          vendor_id: vendorId,
          item_id: item.item_id,
          branch: branchVal,
          calc_type: item.calc_type,
          start_date: item.effective_from,
          active: true,
        })
        .select('id')
        .single()

      if (viErr) throw new Error(viErr.message)

      const { error: rateErr } = await supabase.from('vendor_item_rates').insert({
        vendor_item_id: vi.id,
        cost_price: item.cost_price,
        selling_price: item.selling_price ?? null,
        unit: item.unit,
        effective_from: item.effective_from,
        notes: item.notes || null,
      })

      if (rateErr) throw new Error(rateErr.message)
      return vi.id as string
    },
    {
      onSuccess: (_data, vars) => {
        qc.invalidateQueries('vendors')
        qc.invalidateQueries(['vendor', vars.vendorId])
      },
    }
  )
}

/**
 * Mutation that deactivates a vendor_items row (soft remove).
 * Sets active = false and end_date = today.
 */
export function useDeactivateVendorItem() {
  const qc = useQueryClient()

  return useMutation(
    async ({ vendorItemId, vendorId }: { vendorItemId: string; vendorId: string }) => {
      const { error } = await supabase
        .from('vendor_items')
        .update({ active: false, end_date: new Date().toISOString().split('T')[0] })
        .eq('id', vendorItemId)
      if (error) throw new Error(error.message)
      return vendorId
    },
    {
      onSuccess: (_data, vars) => {
        qc.invalidateQueries('vendors')
        qc.invalidateQueries(['vendor', vars.vendorId])
      },
    }
  )
}

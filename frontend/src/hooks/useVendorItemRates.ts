import { useMutation, useQueryClient } from 'react-query'
import { supabase } from '../lib/supabase'

interface AddRatePayload {
  vendorItemId: string
  vendorId: string
  costPrice: number
  sellingPrice?: number
  unit: string
  effectiveFrom: string
  notes?: string
}

/**
 * Mutation that adds a new rate record for a vendor item.
 * The DB trigger automatically sets the previous rate's effective_to date
 * to effectiveFrom - 1 day, preserving full rate history.
 *
 * @returns useMutation — call `.mutate(payload)`
 */
export function useAddVendorItemRate() {
  const qc = useQueryClient()

  return useMutation(
    async ({
      vendorItemId,
      vendorId,
      costPrice,
      sellingPrice,
      unit,
      effectiveFrom,
      notes,
    }: AddRatePayload) => {
      const { error } = await supabase.from('vendor_item_rates').insert({
        vendor_item_id: vendorItemId,
        cost_price: costPrice,
        selling_price: sellingPrice ?? null,
        unit,
        effective_from: effectiveFrom,
        notes: notes || null,
      })
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

import { useQuery, useMutation, useQueryClient } from 'react-query'
import { supabase } from '../lib/supabase'
import type { Vendor, VendorFormValues, VendorItemFormRow } from '../types/vendor'

/**
 * Fetches all vendors with their items (joined with item_master) and latest rates.
 * Does NOT include bank details for security — fetched separately in VendorProfile.
 *
 * @param session - Auth session guard (only fetches when truthy)
 */
export function useVendors(session: boolean) {
  return useQuery<Vendor[]>(
    'vendors',
    async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select(
          `
          *,
          vendor_items (
            *,
            item_master ( id, name_en, name_ta, unit, branch_kr, branch_c2 ),
            vendor_item_rates ( * )
          )
        `
        )
        .order('vendor_code')
      if (error) throw new Error(error.message)
      return (data ?? []) as Vendor[]
    },
    { enabled: !!session, retry: 2, staleTime: 30000 }
  )
}

/**
 * Fetches a single vendor by ID, including bank details (for VendorProfile reveal).
 *
 * @param id - Vendor UUID
 * @param session - Auth session guard
 */
export function useVendor(id: string | undefined, session: boolean) {
  return useQuery<Vendor>(
    ['vendor', id],
    async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select(
          `
          *,
          vendor_bank_details ( * ),
          vendor_items (
            *,
            item_master ( id, name_en, name_ta, unit, branch_kr, branch_c2 ),
            vendor_item_rates ( * )
          )
        `
        )
        .eq('id', id as string)
        .single()
      if (error) throw new Error(error.message)
      return data as Vendor
    },
    { enabled: !!session && !!id, retry: 2, staleTime: 30000 }
  )
}

/**
 * Fetches the next available vendor code (VEN-XXX) by checking existing codes.
 * Used to auto-fill the vendor code field on the form.
 *
 * @param session - Auth session guard
 */
export function useNextVendorCode(session: boolean) {
  return useQuery<string>(
    'next_vendor_code',
    async () => {
      const { data } = await supabase
        .from('vendors')
        .select('vendor_code')
        .order('vendor_code', { ascending: false })
        .limit(1)
      if (!data || data.length === 0) return 'VEN-001'
      const last = data[0].vendor_code as string
      const num = parseInt(last.replace('VEN-', ''), 10)
      return `VEN-${String(num + 1).padStart(3, '0')}`
    },
    { enabled: !!session, retry: 2, staleTime: 30000 }
  )
}

interface CreateVendorPayload {
  values: VendorFormValues
  items: VendorItemFormRow[]
}

/**
 * Mutation that creates a new vendor with bank details and item/rate rows.
 * Saves: vendors → vendor_bank_details → vendor_items → vendor_item_rates
 */
export function useCreateVendor() {
  const qc = useQueryClient()

  return useMutation(
    async ({ values, items }: CreateVendorPayload) => {
      // 1. Insert vendor
      const { data: vendor, error: vendorErr } = await supabase
        .from('vendors')
        .insert({
          business_name: values.business_name,
          vendor_code: values.vendor_code || undefined, // let trigger generate if empty
          contact_name: values.contact_name || null,
          whatsapp_number: values.whatsapp_number,
          alternate_phone: values.alternate_phone || null,
          email: values.email || null,
          address: values.address || null,
          google_maps_url: values.google_maps_url || null,
          business_type: values.business_type || null,
          gstin: values.gstin || null,
          payment_cycle_type: values.payment_cycle_type,
          is_prepaid: values.is_prepaid,
          is_same_day_cash: values.is_same_day_cash,
          active: values.active,
        })
        .select('id')
        .single()

      if (vendorErr) throw new Error(vendorErr.message)
      const vendorId = vendor.id as string

      // 2. Insert bank details if any field is filled
      const hasBankDetails =
        values.bank_name || values.account_number || values.ifsc_code || values.upi_id
      if (hasBankDetails) {
        const { error: bankErr } = await supabase.from('vendor_bank_details').insert({
          vendor_id: vendorId,
          bank_name: values.bank_name || null,
          account_number: values.account_number || null,
          ifsc_code: values.ifsc_code || null,
          account_holder_name: values.account_holder_name || null,
          upi_id: values.upi_id || null,
          payment_preference: values.payment_preference || null,
        })
        if (bankErr) throw new Error(bankErr.message)
      }

      // 3. Insert each vendor item + its initial rate
      for (const item of items) {
        if (!item.item_id) continue
        const branchVal =
          item.branch_kr && item.branch_c2
            ? null // both = NULL in DB
            : item.branch_kr
              ? 'KR'
              : 'C2'

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

        if (viErr) {
          // Skip duplicate (same vendor+item+branch already exists)
          if (viErr.code === '23505') continue
          throw new Error(viErr.message)
        }

        const { error: rateErr } = await supabase.from('vendor_item_rates').insert({
          vendor_item_id: vi.id,
          cost_price: item.cost_price,
          selling_price: item.selling_price ?? null,
          unit: item.unit,
          effective_from: item.effective_from,
          notes: item.notes || null,
        })
        if (rateErr) throw new Error(rateErr.message)
      }

      return vendorId
    },
    {
      onSuccess: () => {
        qc.invalidateQueries('vendors')
        qc.invalidateQueries('next_vendor_code')
      },
    }
  )
}

interface UpdateVendorPayload {
  id: string
  values: Partial<VendorFormValues>
}

/**
 * Mutation that updates vendor fields and bank details.
 * Does not modify items/rates — those are handled separately.
 */
export function useUpdateVendor() {
  const qc = useQueryClient()

  return useMutation(
    async ({ id, values }: UpdateVendorPayload) => {
      const { error: vendorErr } = await supabase
        .from('vendors')
        .update({
          business_name: values.business_name,
          contact_name: values.contact_name || null,
          whatsapp_number: values.whatsapp_number,
          alternate_phone: values.alternate_phone || null,
          email: values.email || null,
          address: values.address || null,
          google_maps_url: values.google_maps_url || null,
          business_type: values.business_type || null,
          gstin: values.gstin || null,
          payment_cycle_type: values.payment_cycle_type,
          is_prepaid: values.is_prepaid,
          is_same_day_cash: values.is_same_day_cash,
          active: values.active,
        })
        .eq('id', id)

      if (vendorErr) throw new Error(vendorErr.message)

      // Upsert bank details
      const hasBankData =
        values.bank_name || values.account_number || values.ifsc_code || values.upi_id
      if (hasBankData) {
        const { data: existing } = await supabase
          .from('vendor_bank_details')
          .select('id')
          .eq('vendor_id', id)
          .single()

        if (existing) {
          await supabase
            .from('vendor_bank_details')
            .update({
              bank_name: values.bank_name || null,
              account_number: values.account_number || null,
              ifsc_code: values.ifsc_code || null,
              account_holder_name: values.account_holder_name || null,
              upi_id: values.upi_id || null,
              payment_preference: values.payment_preference || null,
            })
            .eq('vendor_id', id)
        } else {
          await supabase.from('vendor_bank_details').insert({
            vendor_id: id,
            bank_name: values.bank_name || null,
            account_number: values.account_number || null,
            ifsc_code: values.ifsc_code || null,
            account_holder_name: values.account_holder_name || null,
            upi_id: values.upi_id || null,
            payment_preference: values.payment_preference || null,
          })
        }
      }
    },
    {
      onSuccess: (_data, vars) => {
        qc.invalidateQueries('vendors')
        qc.invalidateQueries(['vendor', vars.id])
      },
    }
  )
}

/**
 * Mutation to toggle a vendor's active status (deactivate / reactivate).
 */
export function useToggleVendorActive() {
  const qc = useQueryClient()

  return useMutation(
    async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('vendors').update({ active }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    {
      onSuccess: () => {
        qc.invalidateQueries('vendors')
      },
    }
  )
}

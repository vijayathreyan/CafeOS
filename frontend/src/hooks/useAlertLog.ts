import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '../lib/supabase'
import type { AlertLog } from '../types/phase10'

/**
 * Fetches the last 50 alert log entries, optionally filtered by date range.
 */
export function useAlertLog(session: boolean, fromDate?: string, toDate?: string) {
  return useSupabaseQuery<AlertLog[]>(
    ['alert_log', fromDate, toDate],
    async () => {
      let q = supabase
        .from('alert_log')
        .select(
          'id, trigger_event, rule_id, recipient_phone, message_sent, delivery_status, error_message, branch, reference_date, created_at'
        )
        .order('created_at', { ascending: false })
        .limit(50)

      if (fromDate) q = q.gte('created_at', fromDate)
      if (toDate) q = q.lte('created_at', toDate + 'T23:59:59Z')

      const { data, error } = await q
      if (error) throw new Error(error.message)
      return (data ?? []) as AlertLog[]
    },
    { enabled: !!session, retry: 2, staleTime: 30000 }
  )
}

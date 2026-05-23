import { useMutation, useQueryClient } from 'react-query'
import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '../lib/supabase'
import type { AlertLevel } from '../types/phase9'

export interface DashboardAlert {
  id: string
  type: 'cash_discrepancy' | 'reconciliation'
  message: string
  branch: 'KR' | 'C2'
  level: AlertLevel
  createdAt: string
}

/**
 * Fetches unacknowledged cash discrepancy alerts (amber + red) for the owner dashboard.
 * Refetches every 60 seconds.
 */
export function useActiveAlerts() {
  return useSupabaseQuery<DashboardAlert[]>(
    'active_dashboard_alerts',
    async () => {
      const { data, error } = await supabase
        .from('cash_discrepancy')
        .select('id, branch, alert_level, difference, shift_date, staff_name, created_at')
        .eq('acknowledged', false)
        .in('alert_level', ['amber', 'red'])
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw new Error(error.message)

      return (data ?? []).map((d) => {
        const diff = Number(d.difference ?? 0)
        const label =
          diff > 0
            ? `Cash short by ₹${Math.abs(diff).toFixed(0)}`
            : `Cash over by ₹${Math.abs(diff).toFixed(0)}`
        const staffPart = d.staff_name ? ` · ${d.staff_name}` : ''
        const datePart = d.shift_date
          ? ` · ${new Date(d.shift_date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`
          : ''
        return {
          id: d.id,
          type: 'cash_discrepancy' as const,
          message: `${label}${staffPart}${datePart}`,
          branch: d.branch as 'KR' | 'C2',
          level: d.alert_level as AlertLevel,
          createdAt: d.created_at,
        }
      })
    },
    { retry: 2, staleTime: 30000, refetchInterval: 60000 }
  )
}

/**
 * Counts total unacknowledged alerts across cash_discrepancy and reconciliation.
 * Used for dashboard summary — amber + red combined.
 */
export function useUnacknowledgedAlertCount() {
  return useSupabaseQuery<number>(
    'unacknowledged_alert_count',
    async () => {
      const { count, error } = await supabase
        .from('cash_discrepancy')
        .select('*', { count: 'exact', head: true })
        .eq('acknowledged', false)
        .in('alert_level', ['amber', 'red'])

      if (error) throw new Error(error.message)
      return count ?? 0
    },
    { retry: 2, staleTime: 30000, refetchInterval: 60000 }
  )
}

/**
 * Acknowledges a cash discrepancy alert by ID, setting acknowledged = true.
 */
export function useAcknowledgeAlert() {
  const qc = useQueryClient()
  return useMutation(
    async ({ id, acknowledgedBy }: { id: string; acknowledgedBy: string }) => {
      const { error } = await supabase
        .from('cash_discrepancy')
        .update({
          acknowledged: true,
          acknowledged_by: acknowledgedBy,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    {
      onSuccess: () => {
        qc.invalidateQueries('active_dashboard_alerts')
        qc.invalidateQueries('unacknowledged_alert_count')
        qc.invalidateQueries('cash_discrepancy_unacked_count')
      },
    }
  )
}

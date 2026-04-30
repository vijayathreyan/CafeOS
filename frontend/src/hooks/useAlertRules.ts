import { useMutation, useQueryClient } from 'react-query'
import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '../lib/supabase'
import { sendWhatsAppAlert } from '../lib/alertService'
import type { AlertRule, UpdateAlertRulePayload } from '../types/phase10'

/**
 * Fetches all alert rules ordered by rule_name.
 */
export function useAlertRules(session: boolean) {
  return useSupabaseQuery<AlertRule[]>(
    'alert_rules',
    async () => {
      const { data, error } = await supabase
        .from('alert_rules')
        .select('*')
        .order('rule_name', { ascending: true })
      if (error) throw new Error(error.message)
      return (data ?? []) as AlertRule[]
    },
    { enabled: !!session, retry: 2, staleTime: 30000 }
  )
}

/**
 * Toggle or update an alert rule. Partial updates — only provided fields are changed.
 */
export function useUpdateAlertRule() {
  const qc = useQueryClient()
  return useMutation(
    async (payload: UpdateAlertRulePayload) => {
      const { id, ...fields } = payload
      const { error } = await supabase
        .from('alert_rules')
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    {
      onSuccess: () => qc.invalidateQueries('alert_rules'),
    }
  )
}

/**
 * Send a test WhatsApp message to the first recipient on a rule.
 * Uses dummy placeholder values.
 */
export function useSendTestAlert() {
  const qc = useQueryClient()
  const DUMMY: Record<string, string> = {
    branch: 'KR (Test)',
    amount: '999',
    date: new Date().toISOString().slice(0, 10),
    staff_name: 'Test Staff',
    vendor_name: 'Test Vendor',
    item_name: 'Test Item',
    customer_name: 'Test Customer',
    platform: 'Swiggy',
  }

  return useMutation(
    async (rule: AlertRule) => {
      const phones = rule.recipient_phones ?? []
      if (phones.length === 0) throw new Error('No recipients configured for this rule.')

      const template = rule.message_template ?? ''
      const message = template.replace(/\{(\w+)\}/g, (_, k) => DUMMY[k] ?? `{${k}}`)
      const result = await sendWhatsAppAlert(phones[0], message)

      // Log the test attempt in alert_log even if not sent
      await supabase.from('alert_log').insert({
        trigger_event: `test_${rule.trigger_event}`,
        rule_id: rule.id,
        recipient: phones[0],
        recipient_phone: phones[0],
        channel: 'whatsapp',
        message,
        message_sent: message,
        delivery_status: result ? 'sent' : 'failed',
        status: result ? 'sent' : 'failed',
      })

      return result
    },
    { onSuccess: () => qc.invalidateQueries('alert_log') }
  )
}

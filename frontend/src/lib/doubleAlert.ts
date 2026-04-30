// ─── Phase 9 — Double Alert Logic ─────────────────────────────────────────────
//
// Fires when BOTH a cash discrepancy AND a reconciliation gap are flagged for
// the same branch on the same date. Inserts a record into alert_log with
// delivery_status = 'pending'. Phase 10 Alert Manager will dispatch it.

import { supabase } from './supabase'

export interface DoubleAlertResult {
  doubleAlertTriggered: boolean
  message: string
}

/**
 * Checks if both a reconciliation gap and a cash discrepancy exist for
 * the given branch and date. If both are flagged (amber or red), inserts
 * a double-alert record into alert_log for Phase 10 to dispatch.
 */
export async function checkDoubleAlert(
  branch: 'KR' | 'C2',
  date: string
): Promise<DoubleAlertResult> {
  const [reconRes, cashRes] = await Promise.all([
    supabase
      .from('reconciliation_results')
      .select('status')
      .eq('branch', branch)
      .eq('entry_date', date)
      .maybeSingle(),
    supabase
      .from('cash_discrepancy')
      .select('alert_level')
      .eq('branch', branch)
      .eq('shift_date', date)
      .in('alert_level', ['amber', 'red']),
  ])

  const reconFlagged = reconRes.data?.status === 'amber' || reconRes.data?.status === 'red'
  const cashFlagged = (cashRes.data ?? []).length > 0

  if (!reconFlagged || !cashFlagged) {
    return { doubleAlertTriggered: false, message: '' }
  }

  const branchLabel = branch === 'KR' ? 'Kaappi Ready' : 'Coffee Mate C2'
  const message = `⚠️⚠️ ${branchLabel} — ${date} — Cash discrepancy AND Sales gap both flagged. Investigate immediately.`

  await supabase.from('alert_log').insert({
    trigger_event: 'double_alert',
    recipient: 'owner',
    channel: 'whatsapp',
    message,
    status: 'pending',
    branch,
    entry_date: date,
    delivery_status: 'pending',
  })

  return { doubleAlertTriggered: true, message }
}

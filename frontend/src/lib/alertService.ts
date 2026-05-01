/**
 * alertService — Meta WhatsApp Cloud API alert dispatch + alert_log persistence.
 * Never throws — all errors are caught and logged to alert_log.
 */

import { supabase } from './supabase'

const WHATSAPP_TOKEN = import.meta.env.VITE_WHATSAPP_TOKEN as string | undefined
const WHATSAPP_PHONE_NUMBER_ID = import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID as string | undefined

/** Strip non-digits, add 91 prefix for India */
function normalizePhone(phone: string): string {
  let p = phone.replace(/\D/g, '')
  if (p.startsWith('0')) p = p.slice(1)
  if (!p.startsWith('91') && p.length === 10) p = '91' + p
  return p
}

/** Replace {placeholders} in template */
function applyTemplate(template: string, data: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => data[key] ?? `{${key}}`)
}

interface LogEntry {
  trigger_event: string
  rule_id?: string | null
  recipient: string
  recipient_phone: string
  channel: string
  message: string
  message_sent: string
  delivery_status: string
  status: string
  error_message?: string | null
  branch?: string | null
  reference_date?: string | null
}

async function writeLog(entry: LogEntry): Promise<void> {
  try {
    await supabase.from('alert_log').insert(entry)
  } catch {
    // best-effort logging — never throw
  }
}

/** POST to Meta WhatsApp Cloud API; returns { ok, errorMessage } */
async function callMetaWhatsApp(
  normalizedPhone: string,
  message: string
): Promise<{ ok: boolean; errorMessage?: string }> {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    return { ok: false, errorMessage: 'WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID not configured' }
  }
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: normalizedPhone,
          type: 'text',
          text: { body: message },
        }),
        signal: AbortSignal.timeout(10000),
      }
    )
    return res.ok ? { ok: true } : { ok: false, errorMessage: `HTTP ${res.status}` }
  } catch (err) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Network error' }
  }
}

/**
 * Send a WhatsApp message via Meta Cloud API and log the result.
 * Returns true on successful delivery, false otherwise.
 */
export async function sendWhatsAppAlert(phone: string, message: string): Promise<boolean> {
  const normalizedPhone = normalizePhone(phone)
  const { ok, errorMessage } = await callMetaWhatsApp(normalizedPhone, message)
  const deliveryStatus = ok ? 'sent' : 'failed'

  await writeLog({
    trigger_event: 'manual_send',
    recipient: phone,
    recipient_phone: normalizedPhone,
    channel: 'whatsapp',
    message,
    message_sent: message,
    delivery_status: deliveryStatus,
    status: deliveryStatus,
    error_message: errorMessage ?? null,
  })

  return ok
}

/**
 * Look up active alert rules for a trigger event and send to all configured recipients.
 * Placeholders: {branch} {amount} {date} {staff_name} {vendor_name} {item_name} {customer_name} {platform}
 */
export async function sendAlertForTrigger(
  triggerEvent: string,
  data: Record<string, string>,
  meta?: { branch?: string; referenceDate?: string }
): Promise<void> {
  let rules: Array<{
    id: string
    recipient_phones: string[]
    message_template: string | null
  }> = []

  try {
    const { data: rows } = await supabase
      .from('alert_rules')
      .select('id, recipient_phones, message_template')
      .eq('trigger_event', triggerEvent)
      .eq('active', true)
    rules = rows ?? []
  } catch {
    return
  }

  for (const rule of rules) {
    const phones: string[] = rule.recipient_phones ?? []
    if (phones.length === 0) continue

    const message = applyTemplate(rule.message_template ?? '', data)

    for (const phone of phones) {
      const normalizedPhone = normalizePhone(phone)
      const { ok, errorMessage } = await callMetaWhatsApp(normalizedPhone, message)
      const deliveryStatus = ok ? 'sent' : 'failed'

      await writeLog({
        trigger_event: triggerEvent,
        rule_id: rule.id,
        recipient: phone,
        recipient_phone: normalizedPhone,
        channel: 'whatsapp',
        message,
        message_sent: message,
        delivery_status: deliveryStatus,
        status: deliveryStatus,
        error_message: errorMessage ?? null,
        branch: meta?.branch ?? null,
        reference_date: meta?.referenceDate ?? null,
      })
    }
  }
}

/**
 * Check if a given trigger already fired today (to prevent duplicates).
 * @param triggerEvent - The trigger event name
 * @param branch - Optional branch filter
 */
export async function alreadyFiredToday(triggerEvent: string, branch?: string): Promise<boolean> {
  try {
    const today = new Date().toISOString().slice(0, 10)
    let q = supabase
      .from('alert_log')
      .select('id', { count: 'exact', head: true })
      .eq('trigger_event', triggerEvent)
      .gte('created_at', today)

    if (branch) q = q.eq('branch', branch)

    const { count } = await q
    return (count ?? 0) > 0
  } catch {
    return false
  }
}

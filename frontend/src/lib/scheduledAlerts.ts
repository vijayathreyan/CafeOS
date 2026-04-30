/**
 * scheduledAlerts — Evaluates time-based alert conditions on owner dashboard load.
 * Called once per session; deduplication handled via alreadyFiredToday().
 */

import { supabase } from './supabase'
import { sendAlertForTrigger, alreadyFiredToday } from './alertService'

const today = new Date()
const todayISO = today.toISOString().slice(0, 10)
const dayOfMonth = today.getDate()
const dayOfWeek = today.getDay() // 0=Sun, 1=Mon, ..., 4=Thu

/** Compute previous Monday ISO date */
function prevMonday(): string {
  const d = new Date(today)
  const diff = (d.getDay() + 6) % 7 // days since last Monday
  d.setDate(d.getDate() - diff)
  return d.toISOString().slice(0, 10)
}

/** Compute previous Sunday ISO date */
function prevSunday(): string {
  const mon = new Date(prevMonday())
  mon.setDate(mon.getDate() - 1)
  return mon.toISOString().slice(0, 10)
}

async function checkVendorPaymentDue(): Promise<void> {
  if (dayOfWeek !== 1 && dayOfWeek !== 4) return // Only Mon and Thu
  if (await alreadyFiredToday('vendor_payment_due_mon_thu')) return
  await sendAlertForTrigger('vendor_payment_due_mon_thu', { date: todayISO })
}

async function checkMilkVendorPaymentDue(): Promise<void> {
  if (dayOfMonth !== 1 && dayOfMonth !== 11 && dayOfMonth !== 21) return
  if (await alreadyFiredToday('milk_vendor_payment_due')) return
  await sendAlertForTrigger('milk_vendor_payment_due', { date: todayISO })
}

async function checkMonthEndStockNotSubmitted(): Promise<void> {
  if (dayOfMonth < 25) return // Only fire from 25th onwards

  for (const branch of ['KR', 'C2'] as const) {
    if (await alreadyFiredToday('month_end_stock_not_submitted', branch)) continue

    const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
    const { data } = await supabase
      .from('month_end_stock')
      .select('id, status')
      .eq('branch', branch)
      .eq('entry_month', monthStr)
      .limit(1)

    const submitted = data && data.length > 0 && data[0].status === 'submitted'
    if (!submitted) {
      await sendAlertForTrigger(
        'month_end_stock_not_submitted',
        { branch, date: todayISO },
        { branch }
      )
    }
  }
}

async function checkUpiNotEntered(): Promise<void> {
  if (dayOfWeek < 3) return // Only fire Wed-Sun (give Mon/Tue time to enter)
  if (await alreadyFiredToday('upi_not_entered_weekly')) return

  const monday = prevMonday()
  const { data } = await supabase
    .from('upi_entries')
    .select('id')
    .gte('entry_date', monday)
    .lt('entry_date', todayISO)
    .limit(1)

  if (!data || data.length === 0) {
    await sendAlertForTrigger('upi_not_entered_weekly', { date: todayISO })
  }
}

async function checkSwiggyZomatoNotEntered(): Promise<void> {
  if (dayOfWeek < 2) return // Only fire Tue+
  if (await alreadyFiredToday('swiggy_zomato_not_entered')) return

  const monday = prevMonday()
  const sunday = prevSunday()

  const { data } = await supabase
    .from('delivery_platform_entries')
    .select('id, platform')
    .gte('payout_date', monday)
    .lte('payout_date', sunday)
    .limit(1)

  if (!data || data.length === 0) {
    await sendAlertForTrigger('swiggy_zomato_not_entered', {
      platform: 'Swiggy/Zomato',
      date: todayISO,
    })
  }
}

async function checkPostpaidOverdue(): Promise<void> {
  if (await alreadyFiredToday('postpaid_outstanding_overdue')) return

  const cutoff = new Date(today)
  cutoff.setDate(cutoff.getDate() - 30)
  const cutoffISO = cutoff.toISOString().slice(0, 10)

  const { data: customers } = await supabase
    .from('postpaid_customers')
    .select('id, customer_name')
    .eq('active', true)

  if (!customers) return

  for (const c of customers) {
    const { data: payments } = await supabase
      .from('postpaid_payments')
      .select('payment_date')
      .eq('customer_id', c.id)
      .order('payment_date', { ascending: false })
      .limit(1)

    const lastPayment = payments && payments.length > 0 ? payments[0].payment_date : null
    if (!lastPayment || lastPayment < cutoffISO) {
      await sendAlertForTrigger('postpaid_outstanding_overdue', {
        customer_name: c.customer_name,
        date: todayISO,
      })
      break // Fire once per day max
    }
  }
}

async function checkOverdueTasks(): Promise<void> {
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, due_date, assigned_to_emp:assigned_to(full_name, phone)')
    .neq('status', 'done')
    .lt('due_date', todayISO)
    .is('overdue_alerted_at', null)

  if (!tasks) return

  for (const task of tasks) {
    const empArr = task.assigned_to_emp as { full_name: string; phone: string }[] | null
    const assignee = Array.isArray(empArr) ? (empArr[0] ?? null) : empArr
    await sendAlertForTrigger('task_overdue', {
      item_name: task.title,
      date: task.due_date ?? todayISO,
      staff_name: assignee?.full_name ?? 'Unassigned',
    })

    await supabase
      .from('tasks')
      .update({ overdue_alerted_at: new Date().toISOString() })
      .eq('id', task.id)
  }
}

async function generateRecurringTasks(): Promise<void> {
  const { data: recurrences } = await supabase
    .from('task_recurrences')
    .select(
      'id, task_template_id, frequency, custom_days, next_due_date, task_template:task_template_id(title, description, branch, priority, task_type, assigned_to)'
    )
    .eq('active', true)
    .lte('next_due_date', todayISO)

  if (!recurrences) return

  for (const rec of recurrences) {
    type TmplShape = {
      title: string
      description: string | null
      branch: string | null
      priority: string
      task_type: string
      assigned_to: string | null
    }
    const tmplRaw = rec.task_template as TmplShape | TmplShape[] | null
    const tmpl = Array.isArray(tmplRaw) ? (tmplRaw[0] ?? null) : tmplRaw
    if (!tmpl) continue

    // Create new task instance
    const { data: newTask } = await supabase
      .from('tasks')
      .insert({
        task_type: tmpl.task_type,
        title: tmpl.title,
        description: tmpl.description,
        branch: tmpl.branch,
        priority: tmpl.priority,
        assigned_to: tmpl.assigned_to,
        due_date: rec.next_due_date,
        status: 'pending',
      })
      .select('id')
      .single()

    // Compute next due date
    const nextDue = new Date(rec.next_due_date ?? todayISO)
    switch (rec.frequency) {
      case 'daily':
        nextDue.setDate(nextDue.getDate() + 1)
        break
      case 'weekly':
        nextDue.setDate(nextDue.getDate() + 7)
        break
      case 'monthly':
        nextDue.setMonth(nextDue.getMonth() + 1)
        break
      case 'custom':
        nextDue.setDate(nextDue.getDate() + (rec.custom_days ?? 7))
        break
    }

    await supabase
      .from('task_recurrences')
      .update({
        last_generated_at: new Date().toISOString(),
        next_due_date: nextDue.toISOString().slice(0, 10),
      })
      .eq('id', rec.id)

    // Fire task_assigned alert if assigned
    if (newTask && tmpl.assigned_to) {
      await sendAlertForTrigger('task_assigned', {
        item_name: tmpl.title,
        date: rec.next_due_date ?? todayISO,
      })
    }
  }
}

/**
 * Run all scheduled alert checks. Called on owner dashboard mount.
 * Fire-and-forget — never awaited in the component.
 */
export async function checkScheduledAlerts(): Promise<void> {
  try {
    await Promise.allSettled([
      checkVendorPaymentDue(),
      checkMilkVendorPaymentDue(),
      checkMonthEndStockNotSubmitted(),
      checkUpiNotEntered(),
      checkSwiggyZomatoNotEntered(),
      checkPostpaidOverdue(),
      checkOverdueTasks(),
      generateRecurringTasks(),
    ])
  } catch {
    // Silent — never break dashboard load
  }
}

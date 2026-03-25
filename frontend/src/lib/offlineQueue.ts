import { v4 as uuidv4 } from 'uuid'
import { supabase } from './supabase'

interface QueuedAction {
  id: string
  table: string
  operation: 'insert' | 'update' | 'upsert'
  data: Record<string, unknown>
  filter?: { column: string; value: string }
  timestamp: number
}

const QUEUE_KEY = 'cafeos_offline_queue'
const DRAFT_PREFIX = 'cafeos_draft_'

// ---- Queue management ----

export function getQueue(): QueuedAction[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveQueue(queue: QueuedAction[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

export function enqueue(
  table: string,
  operation: 'insert' | 'update' | 'upsert',
  data: Record<string, unknown>,
  filter?: { column: string; value: string }
): string {
  const id = uuidv4()
  const queue = getQueue()
  // Deduplicate: remove existing item with same idempotency key if present
  const dedupeKey = data._idempotency_key as string | undefined
  const filtered = dedupeKey
    ? queue.filter(q => (q.data as any)._idempotency_key !== dedupeKey)
    : queue
  filtered.push({ id, table, operation, data, filter, timestamp: Date.now() })
  saveQueue(filtered)
  return id
}

export async function flushQueue(): Promise<{ success: number; failed: number }> {
  const queue = getQueue()
  if (queue.length === 0) return { success: 0, failed: 0 }

  let success = 0
  let failed = 0
  const remaining: QueuedAction[] = []

  for (const action of queue) {
    try {
      const { _idempotency_key, ...cleanData } = action.data as any

      let result
      if (action.operation === 'insert') {
        result = await supabase.from(action.table).insert(cleanData)
      } else if (action.operation === 'upsert') {
        result = await supabase.from(action.table).upsert(cleanData)
      } else if (action.operation === 'update' && action.filter) {
        result = await supabase.from(action.table).update(cleanData).eq(action.filter.column, action.filter.value)
      }

      if (result?.error) {
        // 409 conflict = duplicate (server-side dedup) — treat as success
        if (result.error.code === '23505' || result.error.code === '409') {
          success++
        } else {
          failed++
          remaining.push(action)
        }
      } else {
        success++
      }
    } catch {
      failed++
      remaining.push(action)
    }
  }

  saveQueue(remaining)
  return { success, failed }
}

// ---- Draft management ----

export function saveDraft(key: string, data: unknown) {
  localStorage.setItem(DRAFT_PREFIX + key, JSON.stringify({ data, savedAt: Date.now() }))
}

export function loadDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(DRAFT_PREFIX + key)
    if (!raw) return null
    const { data } = JSON.parse(raw)
    return data as T
  } catch {
    return null
  }
}

export function clearDraft(key: string) {
  localStorage.removeItem(DRAFT_PREFIX + key)
}

// ---- Auto-sync on reconnect ----

export function startOnlineListener(onSync?: (result: { success: number; failed: number }) => void) {
  const handleOnline = async () => {
    const result = await flushQueue()
    onSync?.(result)
  }
  window.addEventListener('online', handleOnline)
  return () => window.removeEventListener('online', handleOnline)
}

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

/**
 * Returns the current offline action queue from localStorage.
 * @returns Array of queued actions waiting to be synced
 */
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

/**
 * Adds a database write action to the offline queue with idempotency deduplication.
 * @param table - Supabase table name to write to
 * @param operation - Type of write: insert, update, or upsert
 * @param data - Row data; include _idempotency_key for deduplication
 * @param filter - For update operations: column/value pair for the WHERE clause
 * @returns UUID of the queued action
 * @example
 * enqueue('snack_entries', 'upsert', { daily_entry_id: id, _idempotency_key: key, qty: 5 })
 */
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
    ? queue.filter((q) => (q.data._idempotency_key as string | undefined) !== dedupeKey)
    : queue
  filtered.push({ id, table, operation, data, filter, timestamp: Date.now() })
  saveQueue(filtered)
  return id
}

/**
 * Flushes all queued offline actions to Supabase. Retains failed items for the next attempt.
 * 409/23505 conflict errors are treated as success (server-side deduplication).
 * @returns Counts of successfully synced and failed actions
 * @example
 * const { success, failed } = await flushQueue()
 */
export async function flushQueue(): Promise<{ success: number; failed: number }> {
  const queue = getQueue()
  if (queue.length === 0) return { success: 0, failed: 0 }

  let success = 0
  let failed = 0
  const remaining: QueuedAction[] = []

  for (const action of queue) {
    try {
      const cleanData = Object.fromEntries(
        Object.entries(action.data).filter(([k]) => k !== '_idempotency_key')
      )

      let result
      if (action.operation === 'insert') {
        result = await supabase.from(action.table).insert(cleanData)
      } else if (action.operation === 'upsert') {
        result = await supabase.from(action.table).upsert(cleanData)
      } else if (action.operation === 'update' && action.filter) {
        result = await supabase
          .from(action.table)
          .update(cleanData)
          .eq(action.filter.column, action.filter.value)
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

/**
 * Persists a form draft to localStorage so data survives a page refresh.
 * @param key - Unique draft key (e.g. `snacks_${dailyEntryId}`)
 * @param data - Any serialisable value to store
 */
export function saveDraft(key: string, data: unknown) {
  localStorage.setItem(DRAFT_PREFIX + key, JSON.stringify({ data, savedAt: Date.now() }))
}

/**
 * Retrieves a previously saved draft from localStorage.
 * @param key - Draft key matching the one used in saveDraft
 * @returns The stored value cast to T, or null if absent or parse fails
 * @example
 * const draft = loadDraft<SnackData>(`snacks_${dailyEntryId}`)
 */
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

/**
 * Removes a draft from localStorage (call after successful server save).
 * @param key - Draft key to remove
 */
export function clearDraft(key: string) {
  localStorage.removeItem(DRAFT_PREFIX + key)
}

// ---- Auto-sync on reconnect ----

/**
 * Registers a window 'online' listener that auto-flushes the offline queue on reconnect.
 * @param onSync - Optional callback invoked with flush results after each sync
 * @returns Cleanup function to remove the listener
 * @example
 * const cleanup = startOnlineListener(({ success }) => console.log(`Synced ${success} items`))
 */
export function startOnlineListener(
  onSync?: (result: { success: number; failed: number }) => void
) {
  const handleOnline = async () => {
    const result = await flushQueue()
    onSync?.(result)
  }
  window.addEventListener('online', handleOnline)
  return () => window.removeEventListener('online', handleOnline)
}

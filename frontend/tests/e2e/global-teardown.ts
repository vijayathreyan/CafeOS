import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

/**
 * Reads a single KEY=VALUE from a .env file string.
 * Handles quoted values and ignores comments.
 */
function parseEnvVar(raw: string, key: string): string {
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const eqIdx = trimmed.indexOf('=')
    const k = trimmed.slice(0, eqIdx).trim()
    if (k !== key) continue
    const v = trimmed
      .slice(eqIdx + 1)
      .trim()
      .replace(/^["']|["']$/g, '')
    return v
  }
  return ''
}

/**
 * Global teardown — hard-deletes any employees whose phone starts with '00000'.
 * These are created by the security, edge-cases, and state-combinations test suites.
 * Each serial suite also cleans up within itself; this is a safety net for partial runs.
 */
export default async function globalTeardown() {
  // Resolve env from repo root (.env is two levels above frontend/)
  const envPath = resolve(process.cwd(), '../.env')
  if (!existsSync(envPath)) {
    process.stderr.write(`[teardown] .env not found at ${envPath} — skipping 00000 cleanup\n`)
    return
  }

  const raw = readFileSync(envPath, 'utf-8')
  const supabaseUrl = parseEnvVar(raw, 'VITE_SUPABASE_URL')
  const anonKey = parseEnvVar(raw, 'VITE_SUPABASE_ANON_KEY')

  if (!supabaseUrl || !anonKey) {
    process.stderr.write(
      '[teardown] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing — skipping\n'
    )
    return
  }

  try {
    // Hard-delete all employees with 00000 prefix (test-only phones)
    const res = await fetch(`${supabaseUrl}/rest/v1/employees?phone=like.00000%25`, {
      method: 'DELETE',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
    })
    if (!res.ok) {
      const body = await res.text()
      process.stderr.write(`[teardown] Cleanup failed: ${res.status} ${body}\n`)
    }
  } catch (err) {
    process.stderr.write(`[teardown] Cleanup fetch error (non-fatal): ${err}\n`)
  }
}

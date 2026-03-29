import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string

// Admin client — uses service_role key, only for owner operations (create/reset auth users).
// persistSession: false so it never interferes with the logged-in owner session.
export const supabaseAdmin = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null

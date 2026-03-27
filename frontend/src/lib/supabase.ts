import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: localStorage,
  },
})

// ---- Types ----

export type BranchCode = 'KR' | 'C2'
export type UserRole = 'staff' | 'supervisor' | 'owner'

export interface AppUser {
  id: string
  employee_id: string
  full_name: string
  phone: string
  role: UserRole
  branch_access: BranchCode[]
  language_pref: string
  first_login_done: boolean
  active: boolean
  auth_user_id: string
}

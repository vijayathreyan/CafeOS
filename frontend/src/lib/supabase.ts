import { createClient } from '@supabase/supabase-js'
import { env } from './env'

const supabaseUrl = env.supabaseUrl
const supabaseKey = env.supabaseAnonKey

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

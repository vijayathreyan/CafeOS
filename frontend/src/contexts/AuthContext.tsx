import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, AppUser, BranchCode } from '../lib/supabase'
import i18n from '../i18n/i18n'

interface AuthContextValue {
  user: AppUser | null
  activeBranch: BranchCode | null
  loading: boolean
  login: (phone: string, password: string) => Promise<{ error: string | null }>
  logout: () => Promise<void>
  setActiveBranch: (branch: BranchCode) => void
  setFirstLoginDone: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [activeBranch, setActiveBranchState] = useState<BranchCode | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchEmployee = useCallback(async (authUserId: string): Promise<AppUser | null> => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('auth_user_id', authUserId)
      .eq('active', true)
      .single()
    if (error || !data) return null
    return data as AppUser
  }, [])

  const applyUser = useCallback((emp: AppUser | null) => {
    setUser(emp)
    if (emp) {
      i18n.changeLanguage(emp.language_pref || 'en')
      // Auto-set branch for single-branch users
      if (emp.branch_access.length === 1) {
        setActiveBranchState(emp.branch_access[0])
      }
    }
  }, [])

  // Auth initialisation — onAuthStateChange only, no getSession()
  // INITIAL_SESSION fires once on mount with the existing session (or null).
  useEffect(() => {
    let mounted = true

    // Hard 3-second fallback in case INITIAL_SESSION never fires (GoTrue slow to start)
    const timeoutId = setTimeout(() => {
      if (mounted) setLoading(false)
    }, 3000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      if (event === 'INITIAL_SESSION') {
        clearTimeout(timeoutId)
        if (session?.user) {
          const emp = await fetchEmployee(session.user.id)
          if (mounted) applyUser(emp)
        }
        if (mounted) setLoading(false)
      } else if (event === 'SIGNED_IN' && session?.user) {
        const emp = await fetchEmployee(session.user.id)
        if (mounted) applyUser(emp)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setActiveBranchState(null)
      }
    })

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [fetchEmployee, applyUser])

  const login = async (phone: string, password: string): Promise<{ error: string | null }> => {
    // Phone number is the email in GoTrue (stored as phone@cafeos.local)
    const email = `${phone.replace(/\D/g, '')}@cafeos.local`
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: 'Invalid phone number or password' }
    const emp = await fetchEmployee(data.user.id)
    if (!emp) return { error: 'Account not found or inactive' }
    applyUser(emp)
    return { error: null }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setActiveBranchState(null)
  }

  const setActiveBranch = (branch: BranchCode) => {
    setActiveBranchState(branch)
  }

  const setFirstLoginDone = async () => {
    if (!user) return
    await supabase.from('employees').update({ first_login_done: true }).eq('id', user.id)
    setUser({ ...user, first_login_done: true })
  }

  return (
    <AuthContext.Provider value={{ user, activeBranch, loading, login, logout, setActiveBranch, setFirstLoginDone }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

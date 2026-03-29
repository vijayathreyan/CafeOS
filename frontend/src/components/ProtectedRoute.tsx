import React, { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { UserRole, BranchCode } from '../lib/supabase'
import { supabase } from '../lib/supabase'

interface Props {
  children: React.ReactNode
  allowedRoles?: UserRole[]
  requireBranch?: BranchCode
}

// Bug 1 fix: App.tsx's onAuthStateChange sets `session` before AuthContext finishes fetchEmployee,
// causing a redirect loop (ProtectedRoute sees user=null, loading=false → /login → session exists → /
// → loop). Fix: track session state here so we can show a spinner while AuthContext is mid-fetch.
export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user, loading } = useAuth()
  const [hasSession, setHasSession] = useState<boolean | null>(null)

  useEffect(() => {
    let mounted = true
    // Initial session check
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setHasSession(!!data.session)
    })
    // Keep in sync with auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setHasSession(!!session)
    })
    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // AuthContext still initialising or session check not done yet
  if (loading || hasSession === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-text-secondary text-sm">Loading...</div>
      </div>
    )
  }

  // Session exists but AuthContext hasn't finished loading the employee record yet — wait
  if (hasSession && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-text-secondary text-sm">Loading...</div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

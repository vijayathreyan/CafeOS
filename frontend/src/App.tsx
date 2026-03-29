import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import BranchSelect from './pages/BranchSelect'
import StaffDashboard from './pages/staff/StaffDashboard'
import ShiftDashboard from './pages/staff/ShiftDashboard'
import OwnerDashboard from './pages/owner/OwnerDashboard'
import SupervisorDashboard from './pages/supervisor/SupervisorDashboard'
import UserManagement from './pages/owner/UserManagement'
import EmployeeOnboarding from './pages/owner/EmployeeOnboarding'
import TaskInbox from './pages/shared/TaskInbox'
import PlaceholderPage from './pages/PlaceholderPage'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    // Hard 3-second timeout — unblocks the UI if the first auth event is late
    const timeout = setTimeout(() => setAuthReady(true), 3000)

    // Use ONLY onAuthStateChange — no getSession() call.
    // INITIAL_SESSION fires once on mount with the current session (or null),
    // which is the reliable signal that the client is fully initialised.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      clearTimeout(timeout)
      setSession(session)
      setAuthReady(true)
    })

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  // Global loading gate — show spinner until first auth event fires (max 3s)
  if (!authReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-text-secondary text-sm">Loading CafeOS...</div>
      </div>
    )
  }

  return (
    <AuthProvider>
      <LanguageProvider>
        <Routes>
          {/* /login: redirect away if already authenticated */}
          <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />

          <Route path="/branch-select" element={
            <ProtectedRoute>
              <BranchSelect />
            </ProtectedRoute>
          } />

          {/* Protected layout routes */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            {/* / → redirect to role-specific dashboard */}
            <Route path="/" element={<RoleHome />} />

            {/* Role-specific home routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute allowedRoles={['owner']}>
                <OwnerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/staff-dashboard" element={
              <ProtectedRoute allowedRoles={['staff']}>
                <StaffDashboard />
              </ProtectedRoute>
            } />
            <Route path="/supervisor-dashboard" element={
              <ProtectedRoute allowedRoles={['supervisor']}>
                <SupervisorDashboard />
              </ProtectedRoute>
            } />

            <Route path="/shift" element={
              <ProtectedRoute allowedRoles={['staff']}>
                <ShiftDashboard />
              </ProtectedRoute>
            } />

            <Route path="/reports" element={
              <ProtectedRoute allowedRoles={['owner']}>
                <PlaceholderPage title="Reports" subtitle="Phase 7–9" />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute allowedRoles={['owner']}>
                <PlaceholderPage title="Admin Settings" subtitle="Phase 11" />
              </ProtectedRoute>
            } />
            <Route path="/users" element={
              <ProtectedRoute allowedRoles={['owner']}>
                <UserManagement />
              </ProtectedRoute>
            } />
            <Route path="/users/new" element={
              <ProtectedRoute allowedRoles={['owner']}>
                <EmployeeOnboarding />
              </ProtectedRoute>
            } />
            <Route path="/users/:id/edit" element={
              <ProtectedRoute allowedRoles={['owner']}>
                <EmployeeOnboarding />
              </ProtectedRoute>
            } />

            <Route path="/tasks" element={<TaskInbox />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </LanguageProvider>
    </AuthProvider>
  )
}

// Bug 1/2: redirect to role-specific dashboard. Never renders a blank page.
// Unknown role falls back to /login with the auth context clearing the session.
function RoleHome() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'owner') return <Navigate to="/dashboard" replace />
  if (user.role === 'supervisor') return <Navigate to="/supervisor-dashboard" replace />
  if (user.role === 'staff') return <Navigate to="/staff-dashboard" replace />
  return <Navigate to="/login" replace />
}

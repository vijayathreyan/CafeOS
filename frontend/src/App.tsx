import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import BranchSelect from './pages/BranchSelect'
import StaffDashboard from './pages/staff/StaffDashboard'
import ShiftDashboard from './pages/staff/ShiftDashboard'
import OwnerDashboard from './pages/owner/OwnerDashboard'
import UserManagement from './pages/owner/UserManagement'
import EmployeeOnboarding from './pages/owner/EmployeeOnboarding'
import TaskInbox from './pages/shared/TaskInbox'
import PlaceholderPage from './pages/PlaceholderPage'

function AppRoutes() {
  const { user, activeBranch, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-text-secondary text-sm">Loading CafeOS...</div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  // Multi-branch users with no branch selected — go to branch selector
  if (user.branch_access.length > 1 && !activeBranch) {
    return <Navigate to="/branch-select" replace />
  }

  return null
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/branch-select" element={
            <ProtectedRoute>
              <BranchSelect />
            </ProtectedRoute>
          } />

          {/* Protected layout routes */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            {/* Root — role-based redirect */}
            <Route path="/" element={<RoleHome />} />

            {/* Staff routes */}
            <Route path="/shift" element={
              <ProtectedRoute allowedRoles={['staff', 'supervisor']}>
                <ShiftDashboard />
              </ProtectedRoute>
            } />

            {/* Owner routes */}
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

            {/* Shared routes */}
            <Route path="/tasks" element={<TaskInbox />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </LanguageProvider>
    </AuthProvider>
  )
}

function RoleHome() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'owner') return <OwnerDashboard />
  return <StaffDashboard />
}

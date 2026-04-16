import React from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import BottomNav from './BottomNav'
import OwnerLayout from './layouts/OwnerLayout'
import AppHeader from './layouts/AppHeader'

export default function Layout() {
  const { user } = useAuth()
  if (!user) return null

  if (user.role === 'owner') {
    return (
      <OwnerLayout>
        <Outlet />
      </OwnerLayout>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <Outlet />
      </main>
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        <BottomNav />
      </div>
    </div>
  )
}

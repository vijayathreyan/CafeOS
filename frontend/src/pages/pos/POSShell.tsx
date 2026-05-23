import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useActiveSession } from '../../hooks/usePOSBilling'
import ShiftOpenScreen from './ShiftOpenScreen'
import POSBillingScreen from './POSBillingScreen'
import type { BranchCode } from '../../lib/supabase'

export default function POSShell() {
  const { user, activeBranch, setActiveBranch } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // Resolve branch at mount time — avoids calling setState inside effects
  const [selectedBranch, setSelectedBranch] = useState<BranchCode | null>(() => {
    if (!user) return null
    if (user.branch_access.length === 1) return user.branch_access[0] as BranchCode
    return activeBranch ?? null
  })
  const [branchDialogOpen, setBranchDialogOpen] = useState(
    () => !!user && user.branch_access.length > 1 && !activeBranch
  )

  // Auth guard — redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate(`/login?returnUrl=${encodeURIComponent(location.pathname)}`, { replace: true })
    }
  }, [user, navigate, location.pathname])

  // Persist single-branch selection to shared context (external system — not local setState)
  useEffect(() => {
    if (user?.branch_access.length === 1) {
      setActiveBranch(user.branch_access[0])
    }
  }, [user, setActiveBranch])

  const { data: activeSession, isLoading: sessionLoading } = useActiveSession(
    user?.id,
    selectedBranch ?? undefined
  )

  if (!user) return null

  const branch = selectedBranch ?? activeBranch

  // Render branch selector dialog for multi-branch users
  const renderBranchSelector = () => (
    <Dialog open={branchDialogOpen} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-sm"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        data-testid="branch-selector-dialog"
      >
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)' }}>
            Which shop today?
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-2">
          <Button
            className="h-14 text-base"
            onClick={() => {
              setSelectedBranch('KR')
              setActiveBranch('KR')
              setBranchDialogOpen(false)
            }}
            data-testid="branch-btn-kr"
          >
            Kaappi Ready — KR
          </Button>
          <Button
            variant="outline"
            className="h-14 text-base"
            onClick={() => {
              setSelectedBranch('C2')
              setActiveBranch('C2')
              setBranchDialogOpen(false)
            }}
            data-testid="branch-btn-c2"
          >
            Coffee Mate C2 — C2
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )

  if (branchDialogOpen || !branch) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        {renderBranchSelector()}
      </div>
    )
  }

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)' }}>
            Checking shift status…
          </p>
        </div>
      </div>
    )
  }

  if (!activeSession || activeSession.is_closed) {
    return <ShiftOpenScreen branch={branch} user={user} />
  }

  return <POSBillingScreen session={activeSession} branch={branch} user={user} />
}

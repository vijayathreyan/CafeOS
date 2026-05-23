import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ShoppingCart, Coffee } from 'lucide-react'
import { useOpenSession } from '../../hooks/usePOSBilling'
import { useToast } from '@/hooks/use-toast'
import type { AppUser, BranchCode } from '../../lib/supabase'

interface Props {
  branch: BranchCode
  user: AppUser
}

const BRANCH_LABELS: Record<BranchCode, string> = {
  KR: 'Kaappi Ready',
  C2: 'Coffee Mate C2',
}

export default function ShiftOpenScreen({ branch, user }: Props) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const openSession = useOpenSession()

  const handleOpenShift = async () => {
    try {
      await openSession.mutateAsync({
        branch,
        staff_id: user.id,
        staff_name: user.full_name,
      })
      // POSShell will detect the new session and render POSBillingScreen
    } catch (err) {
      toast({
        title: 'Failed to open shift',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6 px-6"
      style={{ background: 'var(--brand-bg)' }}
      data-testid="shift-open-screen"
    >
      {/* Brand mark */}
      <div className="flex items-center gap-2">
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, #C67C4E 0%, #E07B39 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Coffee size={22} style={{ color: '#fff' }} />
        </div>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-xl)',
            fontWeight: 'var(--font-semibold)',
            color: 'var(--gray-900)',
          }}
        >
          CafeOS
        </span>
      </div>

      {/* Card */}
      <div
        style={{
          background: 'var(--brand-surface)',
          borderRadius: 'var(--radius-2xl)',
          boxShadow: 'var(--shadow-md)',
          padding: 'var(--space-8)',
          maxWidth: '360px',
          width: '100%',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--brand-primary-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto var(--space-4)',
          }}
        >
          <ShoppingCart size={32} style={{ color: 'var(--brand-primary)' }} />
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-xl)',
            fontWeight: 'var(--font-semibold)',
            color: 'var(--gray-900)',
            margin: '0 0 var(--space-2)',
          }}
        >
          No active shift
        </h1>
        <p
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--gray-500)',
            margin: '0 0 var(--space-1)',
          }}
        >
          {BRANCH_LABELS[branch]}
        </p>
        <p
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--gray-400)',
            margin: '0 0 var(--space-6)',
          }}
        >
          {user.full_name}
        </p>

        <Button
          className="w-full h-12 text-base"
          onClick={handleOpenShift}
          disabled={openSession.isLoading}
          data-testid="open-shift-btn"
        >
          {openSession.isLoading ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Opening…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <ShoppingCart size={18} />
              Open New Shift
            </span>
          )}
        </Button>
      </div>

      <button
        onClick={() => navigate('/staff-dashboard')}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--gray-500)',
          fontSize: 'var(--text-sm)',
          cursor: 'pointer',
          padding: 'var(--space-2)',
        }}
      >
        ← Back to Dashboard
      </button>
    </div>
  )
}

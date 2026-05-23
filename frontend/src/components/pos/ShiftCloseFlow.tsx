import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useCloseSession } from '../../hooks/usePOSBilling'
import { DENOMINATION_LIST } from '../../types/phase12'
import type { ShiftBillCounts, CashDenomination } from '../../types/phase12'
import type { POSSession } from '../../types/phase12'
import type { AppUser, BranchCode } from '../../lib/supabase'

interface Props {
  session: POSSession
  branch: BranchCode
  user: AppUser
  billCounts: ShiftBillCounts
  onClose: () => void
  onDone: () => void
}

type Step = 'summary' | 'cash-count' | 'confirm'

export default function ShiftCloseFlow({
  session,
  branch,
  user,
  billCounts,
  onClose,
  onDone,
}: Props) {
  const { toast } = useToast()
  const closeSession = useCloseSession()
  const [step, setStep] = useState<Step>('summary')
  const [denoms, setDenoms] = useState<CashDenomination[]>(
    DENOMINATION_LIST.map((d) => ({ ...d, count: 0 }))
  )
  const [declaredTotal, setDeclaredTotal] = useState(0)

  const updateDenom = (value: number, count: number) => {
    const updated = denoms.map((d) => (d.value === value ? { ...d, count: Math.max(0, count) } : d))
    setDenoms(updated)
    setDeclaredTotal(updated.reduce((s, d) => s + d.value * d.count, 0))
  }

  const handleSubmit = async () => {
    try {
      await closeSession.mutateAsync({
        sessionId: session.id,
        branch,
        staffId: user.id,
        staffName: user.full_name,
        declaredCash: declaredTotal,
      })
      setStep('confirm')
    } catch (err) {
      toast({
        title: 'Failed to close shift',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--brand-surface)',
    borderRadius: 'var(--radius-2xl)',
    boxShadow: 'var(--shadow-xl)',
    maxWidth: '420px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    padding: 'var(--space-6)',
  }

  const headingStyle: React.CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-xl)',
    fontWeight: 700,
    color: 'var(--gray-900)',
    margin: '0 0 var(--space-2)',
  }

  const subStyle: React.CSSProperties = {
    fontSize: 'var(--text-sm)',
    color: 'var(--gray-500)',
    margin: '0 0 var(--space-5)',
  }

  // ── Step 1: Bill count summary ────────────────────────────────────────────

  if (step === 'summary') {
    const total = Object.values(billCounts).reduce((s, n) => s + n, 0)
    return (
      <div style={overlayStyle} data-testid="shift-close-summary">
        <div style={cardStyle}>
          <h2 style={headingStyle}>Close Shift</h2>
          <p style={subStyle}>Review your shift before closing.</p>

          <div
            style={{
              background: 'var(--gray-50)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-4)',
              marginBottom: 'var(--space-5)',
            }}
          >
            {[
              { label: 'Cash bills', count: billCounts.cash, testId: 'count-cash' },
              { label: 'UPI bills', count: billCounts.upi, testId: 'count-upi' },
              { label: 'Post-Paid bills', count: billCounts.postpaid, testId: 'count-postpaid' },
              {
                label: 'Complimentary bills',
                count: billCounts.complimentary,
                testId: 'count-comp',
              },
              { label: 'Delivery bills', count: billCounts.delivery, testId: 'count-delivery' },
            ].map(({ label, count, testId }) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: 'var(--space-2) 0',
                  borderBottom: '1px solid var(--gray-100)',
                }}
              >
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-700)' }}>
                  {label}
                </span>
                <span
                  style={{
                    fontSize: 'var(--text-sm)',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    color: 'var(--gray-900)',
                  }}
                  data-testid={testId}
                >
                  {count}
                </span>
              </div>
            ))}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: 'var(--space-3)',
              }}
            >
              <span
                style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--gray-900)' }}
              >
                Total bills
              </span>
              <span
                style={{
                  fontSize: 'var(--text-sm)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  color: 'var(--brand-primary)',
                }}
                data-testid="count-total"
              >
                {total}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={() => setStep('cash-count')}
              disabled={total === 0}
              data-testid="proceed-cash-count-btn"
            >
              Proceed to Cash Count
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Step 2: Cash denomination entry ──────────────────────────────────────

  if (step === 'cash-count') {
    return (
      <div style={overlayStyle} data-testid="shift-close-cash-count">
        <div style={cardStyle}>
          <h2 style={headingStyle}>Count Your Cash</h2>
          <p style={subStyle}>Enter the number of notes in your drawer.</p>

          <div style={{ marginBottom: 'var(--space-5)' }}>
            {denoms.map((d) => (
              <div
                key={d.value}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr 80px',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 0',
                  borderBottom: '1px solid var(--gray-100)',
                }}
              >
                <span
                  style={{
                    fontSize: 'var(--text-sm)',
                    fontWeight: 600,
                    color: 'var(--gray-700)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {d.label}
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={d.count || ''}
                  onChange={(e) => updateDenom(d.value, parseInt(e.target.value, 10) || 0)}
                  placeholder="0"
                  data-testid={`denom-${d.value}`}
                  style={{
                    width: '100%',
                    height: '44px',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--gray-300)',
                    padding: '0 12px',
                    fontSize: 'var(--text-base)',
                    fontFamily: 'var(--font-mono)',
                    textAlign: 'right',
                    outline: 'none',
                    background: 'var(--brand-surface)',
                  }}
                />
                <span
                  style={{
                    fontSize: 'var(--text-sm)',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--gray-600)',
                    textAlign: 'right',
                  }}
                >
                  = ₹{d.value * d.count}
                </span>
              </div>
            ))}
          </div>

          {/* Declared total — shows only what staff entered */}
          <div
            style={{
              background: 'var(--brand-primary-subtle)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-4)',
              marginBottom: 'var(--space-5)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                color: 'var(--brand-primary)',
              }}
            >
              You are declaring:
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-2xl)',
                fontWeight: 700,
                color: 'var(--brand-primary)',
              }}
              data-testid="declared-total"
            >
              ₹{declaredTotal}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <Button variant="outline" className="flex-1" onClick={() => setStep('summary')}>
              Back
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={closeSession.isLoading}
              data-testid="submit-close-shift-btn"
            >
              {closeSession.isLoading ? 'Closing…' : 'Submit & Close Shift'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Step 3: Confirmation ──────────────────────────────────────────────────

  return (
    <div style={overlayStyle} data-testid="shift-close-confirm">
      <div style={{ ...cardStyle, textAlign: 'center' }}>
        <div style={{ fontSize: '52px', marginBottom: 'var(--space-3)' }}>✅</div>
        <h2 style={headingStyle}>Shift Closed</h2>
        <p
          style={{
            fontSize: 'var(--text-base)',
            color: 'var(--gray-600)',
            margin: '0 0 var(--space-2)',
          }}
        >
          Cash declared:{' '}
          <span
            style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--gray-900)' }}
            data-testid="confirmed-declared-cash"
          >
            ₹{declaredTotal}
          </span>
        </p>
        <p
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--gray-500)',
            margin: '0 0 var(--space-6)',
          }}
        >
          Thank you — have a good day!
        </p>
        <Button className="w-full" onClick={onDone} data-testid="back-to-dashboard-btn">
          Back to Dashboard
        </Button>
      </div>
    </div>
  )
}

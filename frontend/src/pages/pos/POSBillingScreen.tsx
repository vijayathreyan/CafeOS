import React, { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Coffee, ChevronUp, Wifi, WifiOff } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import ItemGrid from '../../components/pos/ItemGrid'
import BillPanel from '../../components/pos/BillPanel'
import ShiftCloseFlow from '../../components/pos/ShiftCloseFlow'
import {
  usePOSItemsForBilling,
  usePostPaidCustomersForBranch,
  useSaveBill,
  useShiftBillCounts,
  enqueueBill,
  getQueuedBills,
  dequeueBill,
} from '../../hooks/usePOSBilling'
import { usePOSCategories } from '../../hooks/usePOSConfig'
import type { BillLineItem, SaveBillPayload } from '../../types/phase12'
import type { POSItem } from '../../types/phase11'
import type { POSSession } from '../../types/phase12'
import type { AppUser, BranchCode } from '../../lib/supabase'

interface Props {
  session: POSSession
  branch: BranchCode
  user: AppUser
}

export default function POSBillingScreen({ session, branch, user }: Props) {
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [bill, setBill] = useState<BillLineItem[]>([])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [shiftCloseOpen, setShiftCloseOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [syncBanner, setSyncBanner] = useState<string | null>(null)

  const { data: items = [] } = usePOSItemsForBilling(branch)
  const { data: categories = [] } = usePOSCategories(!!session)
  const { data: postpaidCustomers = [] } = usePostPaidCustomersForBranch(branch)
  const billCounts = useShiftBillCounts(session.id)
  const saveBill = useSaveBill()

  const runningTotal = bill.reduce((s, li) => s + li.unitPrice * li.quantity, 0)
  const totalItems = bill.reduce((s, li) => s + li.quantity, 0)

  // Online/offline tracking and queue flush
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true)
      const queue = getQueuedBills()
      if (queue.length === 0) return
      setSyncBanner(`Syncing ${queue.length} offline bill${queue.length > 1 ? 's' : ''}…`)
      let synced = 0
      for (const queued of queue) {
        try {
          await saveBill.mutateAsync(queued.payload)
          dequeueBill(queued.clientId)
          synced++
        } catch {
          /* individual bill sync failure — skip and continue */
        }
      }
      setSyncBanner(`${synced} bill${synced > 1 ? 's' : ''} synced ✓`)
      setTimeout(() => setSyncBanner(null), 3000)
    }
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [saveBill])

  const addItem = useCallback((item: POSItem) => {
    setBill((prev) => {
      const existing = prev.find((li) => li.itemId === item.id)
      if (existing) {
        return prev.map((li) => (li.itemId === item.id ? { ...li, quantity: li.quantity + 1 } : li))
      }
      return [
        ...prev,
        {
          itemId: item.id,
          itemName: item.name_en,
          itemNameTamil: item.name_ta,
          unitPrice: item.selling_price,
          quantity: 1,
        },
      ]
    })
  }, [])

  const increment = useCallback((itemId: string) => {
    setBill((prev) =>
      prev.map((li) => (li.itemId === itemId ? { ...li, quantity: li.quantity + 1 } : li))
    )
  }, [])

  const decrement = useCallback((itemId: string) => {
    setBill((prev) => {
      const item = prev.find((li) => li.itemId === itemId)
      if (!item) return prev
      if (item.quantity <= 1) return prev.filter((li) => li.itemId !== itemId)
      return prev.map((li) => (li.itemId === itemId ? { ...li, quantity: li.quantity - 1 } : li))
    })
  }, [])

  const removeItem = useCallback((itemId: string) => {
    setBill((prev) => prev.filter((li) => li.itemId !== itemId))
  }, [])

  const clearBill = useCallback(() => {
    setBill([])
  }, [])

  const handlePayment = useCallback(
    async (payload: SaveBillPayload) => {
      if (!isOnline) {
        enqueueBill(payload)
        setBill([])
        setSheetOpen(false)
        toast({ title: 'Bill saved locally — will sync when online.' })
        return
      }
      try {
        await saveBill.mutateAsync(payload)
        setBill([])
        setSheetOpen(false)
        toast({ title: 'Bill saved ✓' })
      } catch {
        // Fallback: save to offline queue
        enqueueBill(payload)
        setBill([])
        setSheetOpen(false)
        toast({ title: 'Saved offline — will sync when online.', variant: 'destructive' })
      }
    },
    [isOnline, saveBill, toast]
  )

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'ta' ? 'en' : 'ta')
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        background: 'var(--brand-bg)',
        overflow: 'hidden',
      }}
      data-testid="pos-billing-screen"
    >
      {/* ── Top bar ── */}
      <div
        style={{
          height: '52px',
          background: 'var(--brand-surface)',
          borderBottom: 'var(--border-default)',
          boxShadow: 'var(--shadow-xs)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          gap: '8px',
          flexShrink: 0,
          zIndex: 20,
        }}
        data-testid="pos-top-bar"
      >
        {/* Left: brand + branch + shift */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
          <Coffee size={18} style={{ color: '#C67C4E', flexShrink: 0 }} />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 'var(--text-sm)',
              color: 'var(--gray-900)',
              flexShrink: 0,
            }}
          >
            CafeOS
          </span>
          <span
            style={{
              background:
                branch === 'KR' ? 'var(--brand-primary-subtle)' : 'var(--color-success-bg)',
              color: branch === 'KR' ? 'var(--brand-primary)' : 'var(--color-success)',
              borderRadius: 'var(--radius-full)',
              padding: '1px 8px',
              fontSize: '11px',
              fontWeight: 700,
              flexShrink: 0,
            }}
            data-testid="branch-chip"
          >
            {branch}
          </span>
          <span
            style={{
              fontSize: '11px',
              color: 'var(--gray-500)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            Shift #{session.shift_number}
          </span>
        </div>

        {/* Centre: staff name */}
        <span
          style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            color: 'var(--gray-700)',
            flex: 1,
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {user.full_name}
        </span>

        {/* Right: lang toggle + close shift */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flex: 1,
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={toggleLanguage}
            style={{
              background: 'var(--gray-100)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              color: 'var(--gray-700)',
              minHeight: '28px',
            }}
            data-testid="lang-toggle"
          >
            {i18n.language === 'ta' ? 'EN' : 'தமிழ்'}
          </button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => setShiftCloseOpen(true)}
            data-testid="close-shift-btn"
          >
            Close Shift
          </Button>
        </div>
      </div>

      {/* ── Offline / sync banner ── */}
      {(!isOnline || syncBanner) && (
        <div
          style={{
            background: !isOnline ? 'var(--color-warning-bg)' : 'var(--color-success-bg)',
            color: !isOnline ? 'var(--color-warning)' : 'var(--color-success)',
            padding: '6px 16px',
            fontSize: 'var(--text-xs)',
            fontWeight: 500,
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            flexShrink: 0,
          }}
          data-testid="offline-banner"
        >
          {!isOnline ? (
            <>
              <WifiOff size={12} />
              You are offline — bills are being saved locally
            </>
          ) : (
            <>
              <Wifi size={12} />
              {syncBanner}
            </>
          )}
        </div>
      )}

      {/* ── Main content area ── */}
      {/*
        KR (≥768px): side-by-side split layout
        C2 (<768px): full-screen item grid + sticky bottom sheet trigger
      */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Left panel — item grid (always rendered, full width on mobile) */}
        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <ItemGrid items={items} categories={categories} onAddItem={addItem} currentBill={bill} />
        </div>

        {/* Right panel — bill panel (desktop ≥768px only, KR split layout) */}
        <div
          className="hidden md:flex"
          style={{
            width: '35%',
            minWidth: '280px',
            maxWidth: '380px',
            flexDirection: 'column',
            flexShrink: 0,
          }}
        >
          <BillPanel
            branch={branch}
            user={user}
            sessionId={session.id}
            bill={bill}
            onIncrement={increment}
            onDecrement={decrement}
            onRemove={removeItem}
            onClear={clearBill}
            onPayment={handlePayment}
            postpaidCustomers={postpaidCustomers}
            isSaving={saveBill.isLoading}
          />
        </div>
      </div>

      {/* ── C2 mobile sticky bottom bar (hidden on md+) ── */}
      <div
        className="flex md:hidden"
        style={{
          height: '56px',
          background: 'var(--brand-primary)',
          alignItems: 'center',
          paddingLeft: '16px',
          paddingRight: '16px',
          cursor: bill.length > 0 ? 'pointer' : 'default',
          flexShrink: 0,
          userSelect: 'none',
        }}
        onClick={() => {
          if (bill.length > 0) setSheetOpen(true)
        }}
        data-testid="mobile-bill-bar"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <span style={{ fontSize: '18px' }}>🛒</span>
          <span
            style={{
              color: '#fff',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
            }}
          >
            {totalItems > 0 ? `${totalItems} item${totalItems > 1 ? 's' : ''}` : 'No items'}{' '}
            {totalItems > 0 && (
              <span
                style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                data-testid="mobile-running-total"
              >
                · ₹{runningTotal}
              </span>
            )}
          </span>
        </div>
        {bill.length > 0 && <ChevronUp size={20} style={{ color: 'rgba(255,255,255,0.8)' }} />}
      </div>

      {/* ── C2 mobile bill sheet (hidden on md+) ── */}
      {sheetOpen && (
        <div
          className="flex md:hidden"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            background: 'rgba(0,0,0,0.4)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSheetOpen(false)
          }}
        >
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '65vh',
              borderTopLeftRadius: 'var(--radius-2xl)',
              borderTopRightRadius: 'var(--radius-2xl)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-lg)',
            }}
            data-testid="mobile-bill-sheet"
          >
            <BillPanel
              branch={branch}
              user={user}
              sessionId={session.id}
              bill={bill}
              onIncrement={increment}
              onDecrement={decrement}
              onRemove={removeItem}
              onClear={clearBill}
              onPayment={async (payload) => {
                await handlePayment(payload)
                setSheetOpen(false)
              }}
              postpaidCustomers={postpaidCustomers}
              isSaving={saveBill.isLoading}
            />
          </div>
        </div>
      )}

      {/* ── Shift close flow ── */}
      {shiftCloseOpen && (
        <ShiftCloseFlow
          session={session}
          branch={branch}
          user={user}
          billCounts={billCounts}
          onClose={() => setShiftCloseOpen(false)}
          onDone={() => navigate('/staff-dashboard')}
        />
      )}
    </div>
  )
}

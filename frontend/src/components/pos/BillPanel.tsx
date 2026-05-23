import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import EmptyState from '@/components/ui/EmptyState'
import { ShoppingCart, Minus, Plus, Trash2 } from 'lucide-react'
import type { BillLineItem, PaymentMode, SaveBillPayload } from '../../types/phase12'
import type { PostPaidCustomer } from '../../types/phase5'
import type { AppUser, BranchCode } from '../../lib/supabase'

interface Props {
  branch: BranchCode
  user: AppUser
  sessionId: string | null
  bill: BillLineItem[]
  onIncrement: (itemId: string) => void
  onDecrement: (itemId: string) => void
  onRemove: (itemId: string) => void
  onClear: () => void
  onPayment: (payload: SaveBillPayload) => Promise<void>
  postpaidCustomers: PostPaidCustomer[]
  isSaving: boolean
}

export default function BillPanel({
  branch,
  user,
  sessionId,
  bill,
  onIncrement,
  onDecrement,
  onRemove,
  onClear,
  onPayment,
  postpaidCustomers,
  isSaving,
}: Props) {
  const { i18n } = useTranslation()
  const isTamil = i18n.language === 'ta'
  const [postpaidDialog, setPostpaidDialog] = useState(false)
  const [deliveryDialog, setDeliveryDialog] = useState(false)
  const [freeDialog, setFreeDialog] = useState(false)

  const runningTotal = bill.reduce((s, li) => s + li.unitPrice * li.quantity, 0)

  const buildPayload = (mode: PaymentMode, extra?: Partial<SaveBillPayload>): SaveBillPayload => ({
    session_id: sessionId,
    branch,
    staff_id: user.id,
    staff_name: user.full_name,
    total_amount: runningTotal,
    payment_mode: mode,
    items: bill.map((li) => ({
      pos_item_id: li.itemId,
      item_name: li.itemName,
      unit_price: li.unitPrice,
      quantity: li.quantity,
    })),
    ...extra,
  })

  const pay = async (mode: PaymentMode, extra?: Partial<SaveBillPayload>) => {
    if (bill.length === 0) return
    await onPayment(buildPayload(mode, extra))
  }

  const paymentBtnStyle: React.CSSProperties = {
    minHeight: '48px',
    fontFamily: 'var(--font-body)',
    fontWeight: 600,
    fontSize: 'var(--text-sm)',
    flex: 1,
    borderRadius: 'var(--radius-lg)',
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--brand-surface)',
        borderLeft: 'var(--border-default)',
      }}
      data-testid="bill-panel"
    >
      {/* Bill header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: 'var(--border-default)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 'var(--text-base)',
            color: 'var(--gray-900)',
          }}
        >
          Current Bill
        </span>
        {bill.length > 0 && (
          <button
            onClick={onClear}
            data-testid="clear-bill-btn"
            style={{
              background: 'none',
              border: '1px solid var(--gray-300)',
              borderRadius: 'var(--radius-md)',
              padding: '4px 10px',
              fontSize: 'var(--text-xs)',
              color: 'var(--gray-600)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              minHeight: '28px',
            }}
          >
            <Trash2 size={12} />
            Clear
          </button>
        )}
      </div>

      {/* Line items */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {bill.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="No items added yet"
            description="Tap an item to add it to the bill."
          />
        ) : (
          bill.map((li) => (
            <div
              key={li.itemId}
              data-testid={`bill-line-${li.itemId}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderBottom: '1px solid var(--gray-50)',
              }}
            >
              {/* Item name — tap to remove */}
              <button
                onClick={() => onRemove(li.itemId)}
                style={{
                  flex: 1,
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  minHeight: '32px',
                }}
                data-testid={`remove-item-${li.itemId}`}
              >
                <span
                  style={{
                    fontSize: 'var(--text-sm)',
                    color: 'var(--gray-800)',
                    fontWeight: 500,
                    display: 'block',
                  }}
                >
                  {isTamil && li.itemNameTamil ? li.itemNameTamil : li.itemName}
                </span>
                <span
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--gray-500)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  ₹{li.unitPrice} × {li.quantity}
                </span>
              </button>

              {/* Qty controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                <button
                  onClick={() => onDecrement(li.itemId)}
                  data-testid={`decrement-${li.itemId}`}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    border: '1px solid var(--gray-300)',
                    background: 'var(--brand-surface)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Minus size={12} />
                </button>
                <span
                  style={{
                    fontSize: 'var(--text-sm)',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    minWidth: '20px',
                    textAlign: 'center',
                    color: 'var(--gray-900)',
                  }}
                  data-testid={`qty-${li.itemId}`}
                >
                  {li.quantity}
                </span>
                <button
                  onClick={() => onIncrement(li.itemId)}
                  data-testid={`increment-${li.itemId}`}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    border: 'none',
                    background: 'var(--brand-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Plus size={12} style={{ color: '#fff' }} />
                </button>
              </div>

              {/* Line total */}
              <span
                style={{
                  fontSize: 'var(--text-sm)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  color: 'var(--gray-900)',
                  minWidth: '44px',
                  textAlign: 'right',
                  flexShrink: 0,
                }}
              >
                ₹{li.unitPrice * li.quantity}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Running total */}
      {bill.length > 0 && (
        <div
          style={{
            padding: '12px 16px',
            borderTop: 'var(--border-default)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--gray-700)' }}>
            Total
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-2xl)',
              fontWeight: 700,
              color: 'var(--gray-900)',
            }}
            data-testid="bill-total"
          >
            ₹{runningTotal}
          </span>
        </div>
      )}

      {/* Payment buttons */}
      <div
        style={{
          padding: '12px',
          borderTop: 'var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', gap: '6px' }}>
          <Button
            style={{ ...paymentBtnStyle, background: '#34A853', borderColor: '#34A853' }}
            onClick={() => pay('cash')}
            disabled={bill.length === 0 || isSaving}
            data-testid="pay-cash"
          >
            CASH
          </Button>
          <Button
            style={{ ...paymentBtnStyle }}
            onClick={() => pay('upi')}
            disabled={bill.length === 0 || isSaving}
            data-testid="pay-upi"
          >
            UPI
          </Button>
          <Button
            variant="outline"
            style={{ ...paymentBtnStyle }}
            onClick={() => {
              if (bill.length === 0) return
              setPostpaidDialog(true)
            }}
            disabled={bill.length === 0 || isSaving}
            data-testid="pay-postpaid"
          >
            POST-PAID
          </Button>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {branch === 'KR' && (
            <Button
              variant="outline"
              style={{ ...paymentBtnStyle }}
              onClick={() => {
                if (bill.length === 0) return
                setDeliveryDialog(true)
              }}
              disabled={bill.length === 0 || isSaving}
              data-testid="pay-delivery"
            >
              DELIVERY
            </Button>
          )}
          <Button
            variant="outline"
            style={{
              ...paymentBtnStyle,
              borderColor: 'var(--gray-300)',
              color: 'var(--gray-700)',
            }}
            onClick={() => {
              if (bill.length === 0) return
              setFreeDialog(true)
            }}
            disabled={bill.length === 0 || isSaving}
            data-testid="pay-free"
          >
            FREE
          </Button>
        </div>
      </div>

      {/* POST-PAID dialog */}
      <Dialog open={postpaidDialog} onOpenChange={setPostpaidDialog}>
        <DialogContent
          className="sm:max-w-sm"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          data-testid="postpaid-dialog"
        >
          <DialogHeader>
            <DialogTitle>Who is this for?</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            {postpaidCustomers.length === 0 ? (
              <p
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--gray-500)',
                  textAlign: 'center',
                }}
              >
                No post-paid customers configured for {branch}.
              </p>
            ) : (
              postpaidCustomers.map((c) => (
                <Button
                  key={c.id}
                  className="h-14 text-base"
                  onClick={() => {
                    setPostpaidDialog(false)
                    pay('postpaid', {
                      postpaid_customer_id: c.id,
                      postpaid_customer_name: c.name,
                    })
                  }}
                  data-testid={`postpaid-customer-${c.id}`}
                >
                  {c.name}
                </Button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* DELIVERY dialog */}
      <Dialog open={deliveryDialog} onOpenChange={setDeliveryDialog}>
        <DialogContent
          className="sm:max-w-sm"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          data-testid="delivery-dialog"
        >
          <DialogHeader>
            <DialogTitle>Which platform?</DialogTitle>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button
              className="flex-1 h-14 text-base"
              style={{ background: '#FF6600', borderColor: '#FF6600' }}
              onClick={() => {
                setDeliveryDialog(false)
                pay('swiggy', { delivery_platform: 'swiggy' })
              }}
              data-testid="delivery-swiggy"
            >
              🟠 Swiggy
            </Button>
            <Button
              className="flex-1 h-14 text-base"
              style={{ background: '#E23744', borderColor: '#E23744' }}
              onClick={() => {
                setDeliveryDialog(false)
                pay('zomato', { delivery_platform: 'zomato' })
              }}
              data-testid="delivery-zomato"
            >
              🔴 Zomato
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* FREE dialog */}
      <Dialog open={freeDialog} onOpenChange={setFreeDialog}>
        <DialogContent
          className="sm:max-w-sm"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          data-testid="free-dialog"
        >
          <DialogHeader>
            <DialogTitle>Complimentary for?</DialogTitle>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button
              className="flex-1 h-14 text-base"
              variant="outline"
              onClick={() => {
                setFreeDialog(false)
                pay('free_staff', { comp_type: 'staff' })
              }}
              data-testid="free-staff"
            >
              👤 Staff
            </Button>
            <Button
              className="flex-1 h-14 text-base"
              variant="outline"
              onClick={() => {
                setFreeDialog(false)
                pay('free_others', { comp_type: 'others' })
              }}
              data-testid="free-others"
            >
              🎁 Others
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

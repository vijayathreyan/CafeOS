import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from 'react-query'
import { supabase } from '../../lib/supabase'
import { Lock, CheckCircle2 } from 'lucide-react'

interface DailyEntry {
  id: string
  branch: string
  shift_number: number
}

interface Props {
  dailyEntry: DailyEntry
  branch: string
  onClose: () => void
  onConfirmed: () => void
}

type Step = 'review' | 'cash_count' | 'done'

interface DenomCounts {
  d500: number
  d200: number
  d100: number
  d50: number
  d20: number
  d10: number
}
const DENOMS = [
  { key: 'd500' as const, label: '₹500', value: 500 },
  { key: 'd200' as const, label: '₹200', value: 200 },
  { key: 'd100' as const, label: '₹100', value: 100 },
  { key: 'd50' as const, label: '₹50', value: 50 },
  { key: 'd20' as const, label: '₹20', value: 20 },
  { key: 'd10' as const, label: '₹10', value: 10 },
]

export default function ShiftCloseModal({ dailyEntry, onClose, onConfirmed }: Props) {
  const { t } = useTranslation()
  const [step, setStep] = useState<Step>('review')
  const [declared, setDeclared] = useState<DenomCounts>({
    d500: 0,
    d200: 0,
    d100: 0,
    d50: 0,
    d20: 0,
    d10: 0,
  })
  const [submitting, setSubmitting] = useState(false)

  // Fetch bill counts (NOT amounts — staff never see amounts)
  const { data: billCounts } = useQuery(['bill_counts', dailyEntry.id], async () => {
    const { data } = await supabase
      .from('bills')
      .select('payment_mode', { count: 'exact' })
      .eq('pos_session_id', dailyEntry.id)
    // Group by payment_mode
    const counts: Record<string, number> = {}
    if (data) {
      data.forEach((b: { payment_mode: string }) => {
        counts[b.payment_mode] = (counts[b.payment_mode] || 0) + 1
      })
    }
    return counts
  })

  const declaredTotal =
    declared.d500 * 500 +
    declared.d200 * 200 +
    declared.d100 * 100 +
    declared.d50 * 50 +
    declared.d20 * 20 +
    declared.d10 * 10

  const handleCloseShift = async () => {
    setSubmitting(true)
    try {
      await supabase
        .from('daily_entries')
        .update({
          is_closed: true,
          closed_at: new Date().toISOString(),
        })
        .eq('id', dailyEntry.id)
      // The discrepancy is computed server-side silently — staff never see it
      setStep('done')
      setTimeout(() => onConfirmed(), 1500)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-surface w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        {step === 'review' && (
          <>
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              {t('shift.confirmClose')}
            </h2>
            <p className="text-text-secondary text-sm mb-4">{t('shift.reviewBeforeClose')}</p>

            {/* Bill counts ONLY — no rupee amounts */}
            {billCounts && Object.keys(billCounts).length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Bills Recorded
                </p>
                {Object.entries(billCounts).map(([mode, count]) => (
                  <div key={mode} className="flex justify-between text-sm">
                    <span className="capitalize text-text-primary">{mode} bills:</span>
                    <span className="font-semibold text-text-primary">{count}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button onClick={onClose} className="btn-secondary flex-1">
                {t('common.cancel')}
              </button>
              <button onClick={() => setStep('cash_count')} className="btn-primary flex-1">
                Next: Cash Count →
              </button>
            </div>
          </>
        )}

        {step === 'cash_count' && (
          <>
            <h2 className="text-xl font-semibold text-text-primary mb-2">Cash Count Declaration</h2>
            <p className="text-text-secondary text-sm mb-4">
              Count all cash in your drawer and enter denomination counts.
            </p>

            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="text-muted-foreground text-xs bg-muted/50">
                  <th className="text-left py-2 pl-1 font-semibold rounded-l">Denomination</th>
                  <th className="text-center py-2 font-semibold">Count</th>
                  <th className="text-right py-2 font-semibold rounded-r">Total</th>
                </tr>
              </thead>
              <tbody>
                {DENOMS.map(({ key, label, value }) => (
                  <tr key={key} className="border-b border-border last:border-b-0">
                    <td className="py-3 font-medium pl-1">{label}</td>
                    <td className="py-3 px-2 text-center">
                      <input
                        type="number"
                        min={0}
                        className="w-14 h-9 sm:w-16 sm:h-10 rounded-md border border-input bg-background text-center text-sm px-1 focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="0"
                        value={declared[key] || ''}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) =>
                          setDeclared((prev) => ({ ...prev, [key]: Number(e.target.value) }))
                        }
                      />
                    </td>
                    <td className="py-3 text-right text-muted-foreground">
                      ₹{(declared[key] * value).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Show ONLY what staff declared — NOT what system expects */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="font-medium text-text-primary">You are declaring:</span>
                <span className="text-2xl font-bold text-primary">
                  ₹{declaredTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <p className="text-xs text-text-secondary mb-4 text-center">
              This is final. You cannot change this after submission.
            </p>

            <div className="flex gap-3">
              <button onClick={() => setStep('review')} className="btn-secondary flex-1">
                ← Back
              </button>
              <button
                onClick={handleCloseShift}
                className="btn-primary flex-1 bg-error hover:bg-red-700"
                disabled={submitting}
              >
                {submitting ? (
                  t('shift.closing')
                ) : (
                  <>
                    <Lock className="w-4 h-4 inline mr-1" />
                    Submit & Close Shift
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {step === 'done' && (
          <div className="text-center py-4">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="w-16 h-16 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">Shift Closed</h2>
            <p className="text-text-secondary text-sm">
              Cash declared: ₹{declaredTotal.toLocaleString('en-IN')}
            </p>
            <p className="text-text-secondary text-sm mt-1">Have a good day!</p>
          </div>
        )}
      </div>
    </div>
  )
}

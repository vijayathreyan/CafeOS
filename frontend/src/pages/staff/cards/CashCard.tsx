import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../../lib/supabase'
import { saveDraft, loadDraft } from '../../../lib/offlineQueue'

interface DenomCounts {
  d500: number; d200: number; d100: number; d50: number; d20: number; d10: number
}

const EMPTY: DenomCounts = { d500: 0, d200: 0, d100: 0, d50: 0, d20: 0, d10: 0 }
const DENOMS = [
  { key: 'd500' as const, label: '₹500', value: 500 },
  { key: 'd200' as const, label: '₹200', value: 200 },
  { key: 'd100' as const, label: '₹100', value: 100 },
  { key: 'd50'  as const, label: '₹50',  value: 50 },
  { key: 'd20'  as const, label: '₹20',  value: 20 },
  { key: 'd10'  as const, label: '₹10',  value: 10 },
]

const calcTotal = (d: DenomCounts) =>
  d.d500*500 + d.d200*200 + d.d100*100 + d.d50*50 + d.d20*20 + d.d10*10

interface Props { dailyEntryId: string; onDone: (done: boolean) => void }

export default function CashCard({ dailyEntryId, onDone }: Props) {
  const { t } = useTranslation()
  const [shift1, setShift1] = useState<DenomCounts>(() => loadDraft(`cash_s1_${dailyEntryId}`) || EMPTY)
  const [shift2, setShift2] = useState<DenomCounts>(() => loadDraft(`cash_s2_${dailyEntryId}`) || EMPTY)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const s1Total = calcTotal(shift1)
  const s2Total = calcTotal(shift2)
  const grandTotal = s1Total + s2Total

  useEffect(() => { onDone(s1Total > 0) }, [s1Total, onDone])

  useEffect(() => {
    const i = setInterval(() => {
      saveDraft(`cash_s1_${dailyEntryId}`, shift1)
      saveDraft(`cash_s2_${dailyEntryId}`, shift2)
    }, 30_000)
    return () => clearInterval(i)
  }, [shift1, shift2, dailyEntryId])

  const updateShift = (shift: 1 | 2, key: keyof DenomCounts, val: number) => {
    const setter = shift === 1 ? setShift1 : setShift2
    setter(prev => ({ ...prev, [key]: val < 0 ? 0 : val }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await supabase.from('cash_entries').delete().eq('daily_entry_id', dailyEntryId)
      await supabase.from('cash_entries').insert([
        { daily_entry_id: dailyEntryId, shift_number: 1, denom_500: shift1.d500, denom_200: shift1.d200, denom_100: shift1.d100, denom_50: shift1.d50, denom_20: shift1.d20, denom_10: shift1.d10 },
        { daily_entry_id: dailyEntryId, shift_number: 2, denom_500: shift2.d500, denom_200: shift2.d200, denom_100: shift2.d100, denom_50: shift2.d50, denom_20: shift2.d20, denom_10: shift2.d10 },
      ])
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } finally { setSaving(false) }
  }

  return (
    <div className="p-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-text-secondary text-xs border-b border-border">
              <th className="text-left pb-2 font-medium">{t('cash.denomination')}</th>
              <th className="text-center pb-2 font-medium">{t('cash.shift1Total')}</th>
              <th className="text-center pb-2 font-medium"></th>
              <th className="text-center pb-2 font-medium">{t('cash.shift2Total')}</th>
              <th className="text-center pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {DENOMS.map(({ key, label, value }) => (
              <tr key={key} className="border-t border-border">
                <td className="py-2 font-medium text-text-primary w-16">{label}</td>
                <td className="py-2 px-1">
                  <input type="number" min={0}
                    className="input-field text-center p-2 text-sm w-20"
                    value={shift1[key]}
                    onChange={e => updateShift(1, key, Number(e.target.value))}
                  />
                </td>
                <td className="py-2 px-1 text-right text-xs text-text-secondary w-20">
                  ₹{(shift1[key] * value).toLocaleString('en-IN')}
                </td>
                <td className="py-2 px-1">
                  <input type="number" min={0}
                    className="input-field text-center p-2 text-sm w-20"
                    value={shift2[key]}
                    onChange={e => updateShift(2, key, Number(e.target.value))}
                  />
                </td>
                <td className="py-2 px-1 text-right text-xs text-text-secondary w-20">
                  ₹{(shift2[key] * value).toLocaleString('en-IN')}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-gray-50">
              <td className="py-3 font-semibold text-text-primary text-sm">Shift Total</td>
              <td colSpan={2} className="py-3 text-right font-semibold text-text-primary pr-2">
                ₹{s1Total.toLocaleString('en-IN')}
              </td>
              <td colSpan={2} className="py-3 text-right font-semibold text-text-primary pr-2">
                ₹{s2Total.toLocaleString('en-IN')}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
        <span className="font-semibold text-text-primary">{t('cash.grandTotal')}</span>
        <span className="text-2xl font-bold text-primary">₹{grandTotal.toLocaleString('en-IN')}</span>
      </div>

      <div className="flex justify-end mt-4">
        <button onClick={handleSave} className={`btn-primary text-sm px-4 py-2 ${saved ? 'bg-secondary' : ''}`} disabled={saving}>
          {saved ? '✓ Saved' : saving ? t('shift.saving') : t('common.save')}
        </button>
      </div>
    </div>
  )
}

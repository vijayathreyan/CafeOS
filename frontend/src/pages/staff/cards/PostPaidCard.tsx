import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from 'react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { saveDraft, loadDraft } from '../../../lib/offlineQueue'

interface CustomerEntry { customer_id: string; name: string; shift1: number; shift2: number }

const INPUT = 'w-20 h-9 sm:w-24 sm:h-10 rounded-md border border-input bg-background text-center text-sm px-1 focus:outline-none focus:ring-2 focus:ring-ring'

interface Props { dailyEntryId: string; onDone: (done: boolean) => void }

export default function PostPaidCard({ dailyEntryId, onDone }: Props) {
  const { t } = useTranslation()
  const { user } = useAuth()

  const { data: customers = [] } = useQuery(
    ['postpaid_customers', user?.id],
    async () => {
      const { data } = await supabase.from('postpaid_customers').select('*').eq('branch', 'KR').eq('active', true)
      return data || []
    },
    { enabled: !!user, retry: 2, staleTime: 30_000 }
  )

  const [entries, setEntries] = useState<CustomerEntry[]>(() =>
    loadDraft(`postpaid_${dailyEntryId}`) || []
  )
  const [saving, setSaving] = useState(false); const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (customers.length > 0 && entries.length === 0) {
      setEntries(customers.map(c => ({ customer_id: c.id, name: c.name, shift1: 0, shift2: 0 })))
    }
  }, [customers])

  const isDone = entries.some(e => e.shift1 > 0 || e.shift2 > 0)
  useEffect(() => { onDone(isDone) }, [isDone, onDone])
  useEffect(() => {
    const i = setInterval(() => saveDraft(`postpaid_${dailyEntryId}`, entries), 30_000)
    return () => clearInterval(i)
  }, [entries, dailyEntryId])

  const update = (idx: number, field: 'shift1' | 'shift2', val: number) =>
    setEntries(prev => { const n = [...prev]; n[idx] = { ...n[idx], [field]: val < 0 ? 0 : val }; return n })

  const handleSave = async () => {
    setSaving(true)
    try {
      await supabase.from('postpaid_entries').delete().eq('daily_entry_id', dailyEntryId)
      const inserts = entries.filter(e => e.shift1 > 0 || e.shift2 > 0).map(e => ({
        daily_entry_id: dailyEntryId,
        customer_id: e.customer_id,
        customer_name: e.name,
        shift1_amount: e.shift1,
        shift2_amount: e.shift2,
      }))
      if (inserts.length > 0) await supabase.from('postpaid_entries').insert(inserts)
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } finally { setSaving(false) }
  }

  return (
    <div className="px-4 pb-4 pt-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground text-xs bg-muted/50">
            <th className="text-left py-2 pl-1 font-semibold rounded-l">{t('postpaid.customer')}</th>
            <th className="text-center py-2 font-semibold w-24 sm:w-28">{t('postpaid.shift1')}</th>
            <th className="text-center py-2 font-semibold w-24 sm:w-28">{t('postpaid.shift2')}</th>
            <th className="text-right py-2 font-semibold w-24 rounded-r">{t('postpaid.dailyTotal')}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={e.customer_id} className="border-b border-border last:border-b-0">
              <td className="py-3 font-medium text-foreground pl-1">{e.name}</td>
              <td className="py-3 px-1 text-center">
                <input type="number" min={0} className={INPUT}
                  placeholder="0"
                  value={e.shift1 || ''}
                  onFocus={ev => ev.target.select()}
                  onChange={ev => update(i, 'shift1', Number(ev.target.value))} />
              </td>
              <td className="py-3 px-1 text-center">
                <input type="number" min={0} className={INPUT}
                  placeholder="0"
                  value={e.shift2 || ''}
                  onFocus={ev => ev.target.select()}
                  onChange={ev => update(i, 'shift2', Number(ev.target.value))} />
              </td>
              <td className="py-3 text-right font-semibold text-foreground">
                ₹{(e.shift1 + e.shift2).toLocaleString('en-IN')}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border bg-muted/30">
            <td className="py-3 font-semibold pl-1">Total</td>
            <td className="py-3 text-center font-semibold">
              ₹{entries.reduce((s,e) => s+e.shift1, 0).toLocaleString('en-IN')}
            </td>
            <td className="py-3 text-center font-semibold">
              ₹{entries.reduce((s,e) => s+e.shift2, 0).toLocaleString('en-IN')}
            </td>
            <td className="py-3 text-right font-bold text-primary">
              ₹{entries.reduce((s,e) => s+e.shift1+e.shift2, 0).toLocaleString('en-IN')}
            </td>
          </tr>
        </tfoot>
      </table>
      <div className="flex justify-end mt-4">
        <button onClick={handleSave} className={`btn-primary text-sm px-4 py-2 ${saved ? 'bg-secondary' : ''}`} disabled={saving}>
          {saved ? '✓ Saved' : saving ? t('shift.saving') : t('common.save')}
        </button>
      </div>
    </div>
  )
}

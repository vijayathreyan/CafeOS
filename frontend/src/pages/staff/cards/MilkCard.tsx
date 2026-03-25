import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../../lib/supabase'
import { saveDraft, loadDraft } from '../../../lib/offlineQueue'

interface MilkData {
  coffee_s1: number; tea_s1: number
  coffee_s2: number; tea_s2: number
}

const EMPTY: MilkData = { coffee_s1: 0, tea_s1: 0, coffee_s2: 0, tea_s2: 0 }

interface Props { dailyEntryId: string; onDone: (done: boolean) => void }

export default function MilkCard({ dailyEntryId, onDone }: Props) {
  const { t } = useTranslation()
  const [data, setData] = useState<MilkData>(() => loadDraft(`milk_${dailyEntryId}`) || EMPTY)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const dailyTotal = data.coffee_s1 + data.tea_s1 + data.coffee_s2 + data.tea_s2
  const isDone = data.coffee_s1 > 0 || data.tea_s1 > 0

  useEffect(() => { onDone(isDone) }, [isDone, onDone])
  useEffect(() => {
    const i = setInterval(() => saveDraft(`milk_${dailyEntryId}`, data), 30_000)
    return () => clearInterval(i)
  }, [data, dailyEntryId])

  const update = (field: keyof MilkData, val: number) =>
    setData(prev => ({ ...prev, [field]: val < 0 ? 0 : val }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await supabase.from('milk_entries').delete().eq('daily_entry_id', dailyEntryId)
      await supabase.from('milk_entries').insert([
        { daily_entry_id: dailyEntryId, shift_number: 1, coffee_milk_litres: data.coffee_s1, tea_milk_litres: data.tea_s1 },
        { daily_entry_id: dailyEntryId, shift_number: 2, coffee_milk_litres: data.coffee_s2, tea_milk_litres: data.tea_s2 },
      ])
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } finally { setSaving(false) }
  }

  const Row = ({ label, s1Key, s2Key }: { label: string; s1Key: keyof MilkData; s2Key: keyof MilkData }) => (
    <tr className="border-t border-border">
      <td className="py-3 font-medium text-text-primary text-sm">{label}</td>
      <td className="py-3 px-2">
        <div className="flex items-center gap-1">
          <input type="number" min={0} step={0.5} className="input-field text-center p-2 text-sm w-24"
            value={data[s1Key]} onChange={e => update(s1Key, parseFloat(e.target.value) || 0)} />
          <span className="text-xs text-text-secondary">{t('milk.litres')}</span>
        </div>
      </td>
      <td className="py-3 px-2">
        <div className="flex items-center gap-1">
          <input type="number" min={0} step={0.5} className="input-field text-center p-2 text-sm w-24"
            value={data[s2Key]} onChange={e => update(s2Key, parseFloat(e.target.value) || 0)} />
          <span className="text-xs text-text-secondary">{t('milk.litres')}</span>
        </div>
      </td>
      <td className="py-3 px-2 text-right font-semibold text-text-primary">
        {(data[s1Key] + data[s2Key]).toFixed(1)}L
      </td>
    </tr>
  )

  return (
    <div className="p-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-text-secondary text-xs border-b border-border">
            <th className="text-left pb-2 font-medium">Type</th>
            <th className="text-center pb-2 font-medium">{t('milk.shift1')}</th>
            <th className="text-center pb-2 font-medium">{t('milk.shift2')}</th>
            <th className="text-right pb-2 font-medium">{t('milk.dailyTotal')}</th>
          </tr>
        </thead>
        <tbody>
          <Row label={t('milk.coffeeMilk')} s1Key="coffee_s1" s2Key="coffee_s2" />
          <Row label={t('milk.teaMilk')}    s1Key="tea_s1"    s2Key="tea_s2"    />
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border bg-gray-50">
            <td className="py-3 font-semibold text-sm">{t('milk.dailyTotal')}</td>
            <td className="py-3 text-center font-semibold">{(data.coffee_s1+data.tea_s1).toFixed(1)}L</td>
            <td className="py-3 text-center font-semibold">{(data.coffee_s2+data.tea_s2).toFixed(1)}L</td>
            <td className="py-3 text-right font-bold text-primary">{dailyTotal.toFixed(1)}L</td>
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

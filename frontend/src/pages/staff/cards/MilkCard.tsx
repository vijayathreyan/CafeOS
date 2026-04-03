import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../../lib/supabase'
import { saveDraft, loadDraft } from '../../../lib/offlineQueue'

interface MilkData {
  coffee_s1: number
  tea_s1: number
  coffee_s2: number
  tea_s2: number
}

const EMPTY: MilkData = { coffee_s1: 0, tea_s1: 0, coffee_s2: 0, tea_s2: 0 }

const INPUT =
  'w-16 h-9 sm:w-20 sm:h-10 rounded-md border border-input bg-background text-center text-sm px-1 focus:outline-none focus:ring-2 focus:ring-ring'

interface Props {
  dailyEntryId: string
  onDone: (done: boolean) => void
}

export default function MilkCard({ dailyEntryId, onDone }: Props) {
  const { t } = useTranslation()
  const [data, setData] = useState<MilkData>(() => loadDraft(`milk_${dailyEntryId}`) || EMPTY)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const dailyTotal = data.coffee_s1 + data.tea_s1 + data.coffee_s2 + data.tea_s2
  const isDone = data.coffee_s1 > 0 || data.tea_s1 > 0

  useEffect(() => {
    onDone(isDone)
  }, [isDone, onDone])
  useEffect(() => {
    const i = setInterval(() => saveDraft(`milk_${dailyEntryId}`, data), 30_000)
    return () => clearInterval(i)
  }, [data, dailyEntryId])

  const update = (field: keyof MilkData, val: number) =>
    setData((prev) => ({ ...prev, [field]: val < 0 ? 0 : val }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await supabase.from('milk_entries').delete().eq('daily_entry_id', dailyEntryId)
      await supabase.from('milk_entries').insert([
        {
          daily_entry_id: dailyEntryId,
          shift_number: 1,
          coffee_milk_litres: data.coffee_s1,
          tea_milk_litres: data.tea_s1,
        },
        {
          daily_entry_id: dailyEntryId,
          shift_number: 2,
          coffee_milk_litres: data.coffee_s2,
          tea_milk_litres: data.tea_s2,
        },
      ])
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const Row = ({
    label,
    s1Key,
    s2Key,
  }: {
    label: string
    s1Key: keyof MilkData
    s2Key: keyof MilkData
  }) => (
    <tr className="border-b border-border last:border-b-0">
      <td className="py-3 font-medium text-foreground text-sm pl-1">{label}</td>
      <td className="py-3 px-2 text-center">
        <div className="flex items-center justify-center gap-1">
          <input
            type="number"
            min={0}
            step={0.5}
            className={INPUT}
            placeholder="0"
            value={data[s1Key] || ''}
            onFocus={(e) => e.target.select()}
            onChange={(e) => update(s1Key, parseFloat(e.target.value) || 0)}
          />
          <span className="text-xs text-muted-foreground">{t('milk.litres')}</span>
        </div>
      </td>
      <td className="py-3 px-2 text-center">
        <div className="flex items-center justify-center gap-1">
          <input
            type="number"
            min={0}
            step={0.5}
            className={INPUT}
            placeholder="0"
            value={data[s2Key] || ''}
            onFocus={(e) => e.target.select()}
            onChange={(e) => update(s2Key, parseFloat(e.target.value) || 0)}
          />
          <span className="text-xs text-muted-foreground">{t('milk.litres')}</span>
        </div>
      </td>
      <td className="py-3 px-2 text-right font-semibold text-foreground">
        {(data[s1Key] + data[s2Key]).toFixed(1)}L
      </td>
    </tr>
  )

  return (
    <div className="px-4 pb-4 pt-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground text-xs bg-muted/50">
            <th className="text-left py-2 pl-1 font-semibold rounded-l">Type</th>
            <th className="text-center py-2 font-semibold">{t('milk.shift1')}</th>
            <th className="text-center py-2 font-semibold">{t('milk.shift2')}</th>
            <th className="text-right py-2 font-semibold rounded-r">{t('milk.dailyTotal')}</th>
          </tr>
        </thead>
        <tbody>
          <Row label={t('milk.coffeeMilk')} s1Key="coffee_s1" s2Key="coffee_s2" />
          <Row label={t('milk.teaMilk')} s1Key="tea_s1" s2Key="tea_s2" />
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border bg-muted/30">
            <td className="py-3 font-semibold text-sm pl-1">{t('milk.dailyTotal')}</td>
            <td className="py-3 text-center font-semibold">
              {(data.coffee_s1 + data.tea_s1).toFixed(1)}L
            </td>
            <td className="py-3 text-center font-semibold">
              {(data.coffee_s2 + data.tea_s2).toFixed(1)}L
            </td>
            <td className="py-3 text-right font-bold text-primary">{dailyTotal.toFixed(1)}L</td>
          </tr>
        </tfoot>
      </table>

      <div className="flex justify-end mt-4">
        <button
          onClick={handleSave}
          className={`btn-primary text-sm px-4 py-2 ${saved ? 'bg-secondary' : ''}`}
          disabled={saving}
        >
          {saved ? '✓ Saved' : saving ? t('shift.saving') : t('common.save')}
        </button>
      </div>
    </div>
  )
}

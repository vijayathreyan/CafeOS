import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../../lib/supabase'
import { saveDraft, loadDraft } from '../../../lib/offlineQueue'
import { showToast } from '../../../lib/dialogs'

interface AssetRow {
  current: number
  new: number
  broken: number
}
interface AssetData {
  tea_small: AssetRow
  tea_big: AssetRow
  dawara: AssetRow
  black_tea: AssetRow
}

const EMPTY_ROW: AssetRow = { current: 0, new: 0, broken: 0 }
const EMPTY: AssetData = {
  tea_small: { ...EMPTY_ROW },
  tea_big: { ...EMPTY_ROW },
  dawara: { ...EMPTY_ROW },
  black_tea: { ...EMPTY_ROW },
}

const INPUT =
  'w-14 h-9 sm:w-16 sm:h-10 rounded-md border border-input bg-background text-center text-sm px-1 focus:outline-none focus:ring-2 focus:ring-ring'

interface Props {
  dailyEntryId: string
  onDone: (done: boolean) => void
}

export default function AssetsCard({ dailyEntryId, onDone }: Props) {
  const { t } = useTranslation()
  const [data, setData] = useState<AssetData>(() => loadDraft(`assets_${dailyEntryId}`) || EMPTY)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Load existing DB data on mount if no localStorage draft
  useEffect(() => {
    async function loadFromDb() {
      const hasDraft = !!loadDraft(`assets_${dailyEntryId}`)
      if (hasDraft) return
      const { data: row } = await supabase
        .from('asset_entries')
        .select('*')
        .eq('daily_entry_id', dailyEntryId)
        .maybeSingle()
      if (row) {
        setData({
          tea_small: {
            current: row.tea_glass_small_curr ?? 0,
            new: row.tea_glass_small_new ?? 0,
            broken: row.tea_glass_small_broke ?? 0,
          },
          tea_big: {
            current: row.tea_glass_big_curr ?? 0,
            new: row.tea_glass_big_new ?? 0,
            broken: row.tea_glass_big_broke ?? 0,
          },
          dawara: {
            current: row.dawara_set_curr ?? 0,
            new: row.dawara_set_new ?? 0,
            broken: row.dawara_set_broke ?? 0,
          },
          black_tea: {
            current: row.black_tea_glass_curr ?? 0,
            new: row.black_tea_glass_new ?? 0,
            broken: row.black_tea_glass_broke ?? 0,
          },
        })
      }
    }
    loadFromDb()
  }, [dailyEntryId])

  const isDone = Object.values(data).some((r) => r.current > 0)

  // Ref pattern prevents re-render storm when parent passes inline arrow prop
  const onDoneRef = useRef(onDone)
  useEffect(() => {
    onDoneRef.current = onDone
  })
  useEffect(() => {
    onDoneRef.current(isDone)
  }, [isDone])

  useEffect(() => {
    const i = setInterval(() => saveDraft(`assets_${dailyEntryId}`, data), 30_000)
    return () => clearInterval(i)
  }, [data, dailyEntryId])

  const update = (asset: keyof AssetData, field: keyof AssetRow, val: number) =>
    setData((prev) => ({ ...prev, [asset]: { ...prev[asset], [field]: val < 0 ? 0 : val } }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error: delError } = await supabase
        .from('asset_entries')
        .delete()
        .eq('daily_entry_id', dailyEntryId)
      if (delError) {
        showToast(delError.message, 'error')
        return
      }
      const { error } = await supabase.from('asset_entries').insert({
        daily_entry_id: dailyEntryId,
        tea_glass_small_curr: data.tea_small.current,
        tea_glass_small_new: data.tea_small.new,
        tea_glass_small_broke: data.tea_small.broken,
        tea_glass_big_curr: data.tea_big.current,
        tea_glass_big_new: data.tea_big.new,
        tea_glass_big_broke: data.tea_big.broken,
        dawara_set_curr: data.dawara.current,
        dawara_set_new: data.dawara.new,
        dawara_set_broke: data.dawara.broken,
        black_tea_glass_curr: data.black_tea.current,
        black_tea_glass_new: data.black_tea.new,
        black_tea_glass_broke: data.black_tea.broken,
      })
      if (error) {
        showToast(error.message, 'error')
        return
      }
      setSaved(true)
      onDoneRef.current(true)
      showToast('Assets saved', 'success')
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const ROWS: { key: keyof AssetData; label: string }[] = [
    { key: 'tea_small', label: t('assets.teaSmall') },
    { key: 'tea_big', label: t('assets.teaBig') },
    { key: 'dawara', label: t('assets.dawara') },
    { key: 'black_tea', label: t('assets.blackTea') },
  ]

  return (
    <div className="px-4 pb-4 pt-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground text-xs bg-muted/50">
            <th className="text-left py-2 pl-1 font-semibold rounded-l">{t('assets.item')}</th>
            <th className="text-center py-2 font-semibold w-16 sm:w-20">{t('assets.current')}</th>
            <th className="text-center py-2 font-semibold w-16 sm:w-20">{t('assets.new')}</th>
            <th className="text-center py-2 font-semibold w-16 sm:w-20 rounded-r">
              {t('assets.broken')}
            </th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map(({ key, label }) => (
            <tr key={key} className="border-b border-border last:border-b-0">
              <td className="py-3 text-sm font-medium text-foreground pl-1">{label}</td>
              {(['current', 'new', 'broken'] as (keyof AssetRow)[]).map((field) => (
                <td key={field} className="py-3 px-1 text-center">
                  <input
                    type="number"
                    min={0}
                    className={INPUT}
                    placeholder="0"
                    value={data[key][field] || ''}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => update(key, field, Number(e.target.value))}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex justify-end mt-4">
        <button
          onClick={handleSave}
          data-testid="assets-save-btn"
          className={`btn-primary text-sm px-4 py-2 ${saved ? 'bg-secondary' : ''}`}
          disabled={saving}
        >
          {saved ? '✓ Saved' : saving ? t('shift.saving') : t('common.save')}
        </button>
      </div>
    </div>
  )
}

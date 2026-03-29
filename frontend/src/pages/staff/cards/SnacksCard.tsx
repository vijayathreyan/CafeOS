import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation } from 'react-query'
import { supabase } from '../../../lib/supabase'
import { saveDraft, loadDraft } from '../../../lib/offlineQueue'
import { AlertTriangle } from 'lucide-react'

interface SnackItem {
  id?: string
  item_name: string
  input_type: 'qty' | 'prepared'
  qty: number
  prepared: number
  sold: number
  wastage: number
  complimentary: number
}

const KR_SNACKS: SnackItem[] = [
  { item_name: 'Medu Vada', input_type: 'qty', qty: 0, prepared: 0, sold: 0, wastage: 0, complimentary: 0 },
  { item_name: 'Onion Samosa', input_type: 'qty', qty: 0, prepared: 0, sold: 0, wastage: 0, complimentary: 0 },
  { item_name: 'Aloo Samosa', input_type: 'qty', qty: 0, prepared: 0, sold: 0, wastage: 0, complimentary: 0 },
  { item_name: 'Cutlet', input_type: 'qty', qty: 0, prepared: 0, sold: 0, wastage: 0, complimentary: 0 },
  { item_name: 'Elai Adai', input_type: 'qty', qty: 0, prepared: 0, sold: 0, wastage: 0, complimentary: 0 },
  { item_name: 'Kozhukattai', input_type: 'qty', qty: 0, prepared: 0, sold: 0, wastage: 0, complimentary: 0 },
  { item_name: 'Bajji', input_type: 'prepared', qty: 0, prepared: 0, sold: 0, wastage: 0, complimentary: 0 },
  { item_name: 'Masala Bonda', input_type: 'prepared', qty: 0, prepared: 0, sold: 0, wastage: 0, complimentary: 0 },
  { item_name: 'Cauliflower 65', input_type: 'prepared', qty: 0, prepared: 0, sold: 0, wastage: 0, complimentary: 0 },
  { item_name: 'Chinese Bonda', input_type: 'prepared', qty: 0, prepared: 0, sold: 0, wastage: 0, complimentary: 0 },
]

const C2_SNACKS: SnackItem[] = [
  { item_name: 'Medu Vada', input_type: 'qty', qty: 0, prepared: 0, sold: 0, wastage: 0, complimentary: 0 },
  { item_name: 'Masal Vada', input_type: 'qty', qty: 0, prepared: 0, sold: 0, wastage: 0, complimentary: 0 },
  { item_name: 'Onion Samosa', input_type: 'qty', qty: 0, prepared: 0, sold: 0, wastage: 0, complimentary: 0 },
  { item_name: 'Aloo Samosa', input_type: 'qty', qty: 0, prepared: 0, sold: 0, wastage: 0, complimentary: 0 },
  { item_name: 'Cutlet', input_type: 'qty', qty: 0, prepared: 0, sold: 0, wastage: 0, complimentary: 0 },
  { item_name: 'Bajji', input_type: 'prepared', qty: 0, prepared: 0, sold: 0, wastage: 0, complimentary: 0 },
  { item_name: 'Masala Bonda', input_type: 'prepared', qty: 0, prepared: 0, sold: 0, wastage: 0, complimentary: 0 },
  { item_name: 'Cauliflower 65', input_type: 'prepared', qty: 0, prepared: 0, sold: 0, wastage: 0, complimentary: 0 },
  { item_name: 'Chinese Bonda', input_type: 'prepared', qty: 0, prepared: 0, sold: 0, wastage: 0, complimentary: 0 },
]

interface Props {
  dailyEntryId: string
  branch: string
  onDone: (done: boolean) => void
}

export default function SnacksCard({ dailyEntryId, branch, onDone }: Props) {
  const { t } = useTranslation()
  const defaultItems = branch === 'KR' ? KR_SNACKS : C2_SNACKS
  const [items, setItems] = useState<SnackItem[]>(() => {
    const draft = loadDraft<SnackItem[]>(`snacks_${dailyEntryId}`)
    return draft || defaultItems
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Check if any item has been filled
  const anyFilled = items.some(i => i.qty > 0 || i.prepared > 0 || i.sold > 0 || i.wastage > 0)
  useEffect(() => { onDone(anyFilled) }, [anyFilled, onDone])

  // Auto-save draft every 30s
  useEffect(() => {
    const interval = setInterval(() => saveDraft(`snacks_${dailyEntryId}`, items), 30_000)
    return () => clearInterval(interval)
  }, [items, dailyEntryId])

  const update = (index: number, field: keyof SnackItem, value: number) => {
    setItems(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const getWarning = (item: SnackItem) => {
    const primary = item.input_type === 'qty' ? item.qty : item.prepared
    const used = item.sold + item.wastage + item.complimentary
    return primary > 0 && used !== primary
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Delete existing entries for this daily_entry
      await supabase.from('snack_entries').delete().eq('daily_entry_id', dailyEntryId)
      // Insert all
      const inserts = items.map(item => ({
        daily_entry_id: dailyEntryId,
        item_name: item.item_name,
        input_type: item.input_type,
        qty: item.qty,
        prepared: item.prepared,
        sold: item.sold,
        wastage: item.wastage,
        complimentary: item.complimentary,
      }))
      await supabase.from('snack_entries').insert(inserts)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-text-secondary text-xs">
              <th className="text-left pb-2 pr-2 font-medium w-32">{t('snacks.item')}</th>
              <th className="text-center pb-2 px-1 font-medium w-16">{t('snacks.qty')}/{t('snacks.prepared')}</th>
              <th className="text-center pb-2 px-1 font-medium w-16">{t('snacks.sold')}</th>
              <th className="text-center pb-2 px-1 font-medium w-16">{t('snacks.wastage')}</th>
              <th className="text-center pb-2 px-1 font-medium w-16">{t('snacks.complimentary')}</th>
              <th className="w-4"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.item_name} className={`border-t border-border ${getWarning(item) ? 'bg-yellow-50' : ''}`}>
                <td className="py-2 pr-2">
                  <div className="flex flex-col">
                    <span className="font-medium text-text-primary text-xs">{item.item_name}</span>
                    <span className="text-xs text-text-secondary">
                      {item.input_type === 'qty' ? t('snacks.qty') : t('snacks.prepared')}
                    </span>
                  </div>
                </td>
                <td className="py-2 px-1">
                  <input
                    type="number" min={0}
                    className="input-field text-center p-2 text-sm w-16"
                    value={item.input_type === 'qty' ? item.qty : item.prepared}
                    onChange={e => update(i, item.input_type === 'qty' ? 'qty' : 'prepared', Number(e.target.value))}
                  />
                </td>
                <td className="py-2 px-1">
                  <input type="number" min={0} className="input-field text-center p-2 text-sm w-16"
                    value={item.sold} onChange={e => update(i, 'sold', Number(e.target.value))} />
                </td>
                <td className="py-2 px-1">
                  <input type="number" min={0} className="input-field text-center p-2 text-sm w-16"
                    value={item.wastage} onChange={e => update(i, 'wastage', Number(e.target.value))} />
                </td>
                <td className="py-2 px-1">
                  <input type="number" min={0} className="input-field text-center p-2 text-sm w-16"
                    value={item.complimentary} onChange={e => update(i, 'complimentary', Number(e.target.value))} />
                </td>
                <td className="py-2 pl-1">
                  {getWarning(item) && <AlertTriangle className="w-4 h-4 text-yellow-500" aria-label={t('snacks.warning')} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <p className="text-xs text-text-secondary">
          {t('snacks.warning').slice(0, 35)}...
        </p>
        <button
          onClick={handleSave}
          className={`btn-primary text-sm px-4 py-2 ${saved ? 'bg-secondary' : ''}`}
          disabled={saving}
        >
          {saved ? '✓ Saved' : saving ? t('shift.closing') : t('common.save')}
        </button>
      </div>
    </div>
  )
}

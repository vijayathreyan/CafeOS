import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../../lib/supabase'
import { saveDraft, loadDraft } from '../../../lib/offlineQueue'
import { getItemName } from '../../../lib/itemName'
import { AlertTriangle } from 'lucide-react'

interface SnackItem {
  id?: string
  item_name: string
  name_ta?: string
  input_type: 'qty' | 'prepared'
  qty: number
  prepared: number
  sold: number
  wastage: number
  complimentary: number
}

const KR_SNACKS: SnackItem[] = [
  { item_name: 'Medu Vada',      name_ta: 'மேது வடை',        input_type: 'qty',      qty: 0, prepared: 0, sold: 0, wastage: 0, complimentary: 0 },
  { item_name: 'Onion Samosa',   name_ta: 'வெங்காய சமோசா',  input_type: 'qty',      qty: 0, prepared: 0, sold: 0, wastage: 0, complimentary: 0 },
  { item_name: 'Aloo Samosa',    name_ta: 'உருளை சமோசா',    input_type: 'qty',      qty: 0, prepared: 0, sold: 0, wastage: 0, complimentary: 0 },
  { item_name: 'Cutlet',         name_ta: 'கட்லெட்',        input_type: 'qty',      qty: 0, prepared: 0, sold: 0, wastage: 0, complimentary: 0 },
  { item_name: 'Elai Adai',      name_ta: 'இலை அடை',        input_type: 'qty',      qty: 0, prepared: 0, sold: 0, wastage: 0, complimentary: 0 },
  { item_name: 'Kozhukattai',    name_ta: 'கொழுக்கட்டை',   input_type: 'qty',      qty: 0, prepared: 0, sold: 0, wastage: 0, complimentary: 0 },
  { item_name: 'Bajji',          name_ta: 'பஜ்ஜி',          input_type: 'prepared', qty: 0, prepared: 0, sold: 0, wastage: 0, complimentary: 0 },
  { item_name: 'Masala Bonda',   name_ta: 'மசாலா போண்டா',  input_type: 'prepared', qty: 0, prepared: 0, sold: 0, wastage: 0, complimentary: 0 },
  { item_name: 'Cauliflower 65', name_ta: 'காலிஃப்ளவர் 65', input_type: 'prepared', qty: 0, prepared: 0, sold: 0, wastage: 0, complimentary: 0 },
  { item_name: 'Chinese Bonda',  name_ta: 'சைனீஸ் போண்டா', input_type: 'prepared', qty: 0, prepared: 0, sold: 0, wastage: 0, complimentary: 0 },
]

const C2_SNACKS: SnackItem[] = [
  { item_name: 'Medu Vada',      name_ta: 'மேது வடை',        input_type: 'qty',      qty: 0, prepared: 0, sold: 0, wastage: 0, complimentary: 0 },
  { item_name: 'Masal Vada',     input_type: 'qty',      qty: 0, prepared: 0, sold: 0, wastage: 0, complimentary: 0 },
  { item_name: 'Onion Samosa',   name_ta: 'வெங்காய சமோசா',  input_type: 'qty',      qty: 0, prepared: 0, sold: 0, wastage: 0, complimentary: 0 },
  { item_name: 'Aloo Samosa',    name_ta: 'உருளை சமோசா',    input_type: 'qty',      qty: 0, prepared: 0, sold: 0, wastage: 0, complimentary: 0 },
  { item_name: 'Cutlet',         name_ta: 'கட்லெட்',        input_type: 'qty',      qty: 0, prepared: 0, sold: 0, wastage: 0, complimentary: 0 },
  { item_name: 'Bajji',          name_ta: 'பஜ்ஜி',          input_type: 'prepared', qty: 0, prepared: 0, sold: 0, wastage: 0, complimentary: 0 },
  { item_name: 'Masala Bonda',   name_ta: 'மசாலா போண்டா',  input_type: 'prepared', qty: 0, prepared: 0, sold: 0, wastage: 0, complimentary: 0 },
  { item_name: 'Cauliflower 65', name_ta: 'காலிஃப்ளவர் 65', input_type: 'prepared', qty: 0, prepared: 0, sold: 0, wastage: 0, complimentary: 0 },
  { item_name: 'Chinese Bonda',  name_ta: 'சைனீஸ் போண்டா', input_type: 'prepared', qty: 0, prepared: 0, sold: 0, wastage: 0, complimentary: 0 },
]

// Shared input class: empty by default, clean focus ring, mobile-smaller
const INPUT = 'w-12 h-9 sm:w-14 sm:h-10 rounded-md border border-input bg-background text-center text-sm px-1 focus:outline-none focus:ring-2 focus:ring-ring'

interface Props {
  dailyEntryId: string
  branch: string
  onDone: (done: boolean) => void
}

export default function SnacksCard({ dailyEntryId, branch, onDone }: Props) {
  const { t, i18n } = useTranslation()
  const defaultItems = branch === 'KR' ? KR_SNACKS : C2_SNACKS
  const [items, setItems] = useState<SnackItem[]>(() => {
    const draft = loadDraft<SnackItem[]>(`snacks_${dailyEntryId}`)
    return draft || defaultItems
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const anyFilled = items.some(i => i.qty > 0 || i.prepared > 0 || i.sold > 0 || i.wastage > 0)
  useEffect(() => { onDone(anyFilled) }, [anyFilled, onDone])

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
      await supabase.from('snack_entries').delete().eq('daily_entry_id', dailyEntryId)
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
    <div className="px-4 pb-4 pt-2">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground text-xs bg-muted/50">
              <th className="text-left py-2 pr-2 pl-1 font-semibold rounded-l">{t('snacks.item')}</th>
              <th className="text-center py-2 px-1 font-semibold">{t('snacks.qty')}/{t('snacks.prepared')}</th>
              <th className="text-center py-2 px-1 font-semibold">{t('snacks.sold')}</th>
              <th className="text-center py-2 px-1 font-semibold">{t('snacks.wastage')}</th>
              <th className="text-center py-2 px-1 font-semibold rounded-r">{t('snacks.complimentary')}</th>
              <th className="w-5"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.item_name} className={`border-b border-border last:border-b-0 ${getWarning(item) ? 'bg-yellow-50' : ''}`}>
                <td className="py-3 pr-2">
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground text-sm leading-tight">{getItemName(item, i18n.language)}</span>
                    <span className="text-xs text-muted-foreground mt-0.5">
                      {item.input_type === 'qty' ? t('snacks.qty') : t('snacks.prepared')}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-1 text-center">
                  <input
                    type="number" min={0}
                    className={INPUT}
                    placeholder="0"
                    value={(item.input_type === 'qty' ? item.qty : item.prepared) || ''}
                    onFocus={e => e.target.select()}
                    onChange={e => update(i, item.input_type === 'qty' ? 'qty' : 'prepared', Number(e.target.value))}
                  />
                </td>
                <td className="py-3 px-1 text-center">
                  <input type="number" min={0} className={INPUT} placeholder="0"
                    value={item.sold || ''}
                    onFocus={e => e.target.select()}
                    onChange={e => update(i, 'sold', Number(e.target.value))} />
                </td>
                <td className="py-3 px-1 text-center">
                  <input type="number" min={0} className={INPUT} placeholder="0"
                    value={item.wastage || ''}
                    onFocus={e => e.target.select()}
                    onChange={e => update(i, 'wastage', Number(e.target.value))} />
                </td>
                <td className="py-3 px-1 text-center">
                  <input type="number" min={0} className={INPUT} placeholder="0"
                    value={item.complimentary || ''}
                    onFocus={e => e.target.select()}
                    onChange={e => update(i, 'complimentary', Number(e.target.value))} />
                </td>
                <td className="py-3 pl-1">
                  {getWarning(item) && <AlertTriangle className="w-4 h-4 text-yellow-500" aria-label={t('snacks.warning')} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <p className="text-xs text-muted-foreground">
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

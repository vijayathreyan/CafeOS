import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../../lib/supabase'
import { saveDraft, loadDraft } from '../../../lib/offlineQueue'
import { showToast } from '../../../lib/dialogs'

interface MilkData {
  coffee_s1: number
  tea_s1: number
  coffee_s2: number
  tea_s2: number
  bought_litres: number
}

const EMPTY: MilkData = { coffee_s1: 0, tea_s1: 0, coffee_s2: 0, tea_s2: 0, bought_litres: 0 }

const INPUT =
  'w-16 h-9 sm:w-20 sm:h-10 rounded-md border border-input bg-background text-center text-sm px-1 focus:outline-none focus:ring-2 focus:ring-ring'

interface Props {
  dailyEntryId: string
  branch: string
  entryDate: string
  onDone: (done: boolean) => void
}

// ─── Shift row for C2 (2-shift per day) ────────────────────────────────────
// Defined OUTSIDE MilkCard so React never treats it as a new component type
// on each parent render — prevents unmount/remount that would lose focus.
interface MilkRowProps {
  label: string
  s1Key: keyof MilkData
  s2Key: keyof MilkData
  s1TestId?: string
  s2TestId?: string
  data: MilkData
  onUpdate: (field: keyof MilkData, val: number) => void
}

function MilkRow({ label, s1Key, s2Key, s1TestId, s2TestId, data, onUpdate }: MilkRowProps) {
  return (
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
            onChange={(e) => onUpdate(s1Key, parseFloat(e.target.value) || 0)}
            data-testid={s1TestId}
          />
          <span className="text-xs text-muted-foreground">L</span>
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
            onChange={(e) => onUpdate(s2Key, parseFloat(e.target.value) || 0)}
            data-testid={s2TestId}
          />
          <span className="text-xs text-muted-foreground">L</span>
        </div>
      </td>
      <td className="py-3 px-2 text-right font-semibold text-foreground">
        {(Number(data[s1Key]) + Number(data[s2Key])).toFixed(1)}L
      </td>
    </tr>
  )
}

export default function MilkCard({ dailyEntryId, branch, entryDate, onDone }: Props) {
  const { t } = useTranslation()
  const [data, setData] = useState<MilkData>(
    () => loadDraft(`milk_${branch}_${entryDate}`) || EMPTY
  )
  const [openingBalance, setOpeningBalance] = useState<number>(0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const isKR = branch === 'KR'
  const totalConsumed = data.coffee_s1 + data.tea_s1 + data.coffee_s2 + data.tea_s2
  const closingBalance = Math.max(0, openingBalance + data.bought_litres - totalConsumed)
  const isDone = totalConsumed > 0 || data.bought_litres > 0

  // Load existing entry (opening balance + saved values)
  useEffect(() => {
    async function load() {
      const { data: existing } = await supabase
        .from('milk_entries')
        .select(
          'coffee_s1_litres, tea_s1_litres, coffee_s2_litres, tea_s2_litres, bought_litres, opening_balance_litres'
        )
        .eq('branch', branch)
        .eq('entry_date', entryDate)
        .maybeSingle()

      if (existing) {
        setOpeningBalance(Number(existing.opening_balance_litres ?? 0))
        const hasDraft = !!loadDraft(`milk_${branch}_${entryDate}`)
        if (!hasDraft) {
          setData({
            coffee_s1: Number(existing.coffee_s1_litres ?? 0),
            tea_s1: Number(existing.tea_s1_litres ?? 0),
            coffee_s2: Number(existing.coffee_s2_litres ?? 0),
            tea_s2: Number(existing.tea_s2_litres ?? 0),
            bought_litres: Number(existing.bought_litres ?? 0),
          })
        }
      } else {
        // No entry for today — fetch previous day closing as opening balance
        const yesterday = new Date(entryDate)
        yesterday.setDate(yesterday.getDate() - 1)
        const ymd = yesterday.toISOString().split('T')[0]
        const { data: prev } = await supabase
          .from('milk_entries')
          .select('closing_balance_litres')
          .eq('branch', branch)
          .eq('entry_date', ymd)
          .maybeSingle()
        setOpeningBalance(Number(prev?.closing_balance_litres ?? 0))
      }
    }
    load()
  }, [branch, entryDate])

  // Keep a ref to onDone so the effect below never re-triggers from a new
  // inline function prop — prevents the ShiftDashboard ↔ MilkCard re-render storm.
  const onDoneRef = useRef(onDone)
  useEffect(() => {
    onDoneRef.current = onDone
  })
  useEffect(() => {
    onDoneRef.current(isDone)
  }, [isDone])

  useEffect(() => {
    const i = setInterval(() => saveDraft(`milk_${branch}_${entryDate}`, data), 30_000)
    return () => clearInterval(i)
  }, [data, branch, entryDate])

  const update = useCallback((field: keyof MilkData, val: number) => {
    setData((prev) => ({ ...prev, [field]: val < 0 ? 0 : val }))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const closing = Math.max(0, openingBalance + data.bought_litres - totalConsumed)
      const { error } = await supabase.from('milk_entries').upsert(
        {
          daily_entry_id: dailyEntryId,
          branch,
          entry_date: entryDate,
          shift_number: 1,
          coffee_milk_litres: data.coffee_s1 + data.coffee_s2,
          tea_milk_litres: data.tea_s1 + data.tea_s2,
          coffee_s1_litres: data.coffee_s1,
          tea_s1_litres: data.tea_s1,
          coffee_s2_litres: isKR ? 0 : data.coffee_s2,
          tea_s2_litres: isKR ? 0 : data.tea_s2,
          bought_litres: data.bought_litres,
          opening_balance_litres: openingBalance,
          closing_balance_litres: closing,
        },
        { onConflict: 'branch,entry_date' }
      )
      if (error) {
        showToast(error.message, 'error')
      } else {
        setSaved(true)
        onDoneRef.current(true)
        showToast('Milk details saved', 'success')
        setTimeout(() => setSaved(false), 2000)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-4 pb-4 pt-2">
      {/* Opening balance info */}
      <div
        className="mb-3 px-3 py-2 rounded-md bg-muted/50 text-sm text-muted-foreground"
        data-testid="milk-opening-balance"
      >
        Opening balance:{' '}
        <span className="font-semibold text-foreground">{openingBalance.toFixed(2)} L</span>{' '}
        <span className="text-xs">(carried from yesterday)</span>
      </div>

      {/* Litres Bought Today */}
      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm font-medium text-foreground whitespace-nowrap">
          Litres Bought Today
        </label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            step={0.5}
            className={INPUT}
            placeholder="0"
            value={data.bought_litres || ''}
            onFocus={(e) => e.target.select()}
            onChange={(e) => update('bought_litres', parseFloat(e.target.value) || 0)}
            data-testid="milk-bought-input"
          />
          <span className="text-xs text-muted-foreground">L</span>
        </div>
      </div>

      {/* KR: single daily entry — no shift split */}
      {isKR ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground text-xs bg-muted/50">
              <th className="text-left py-2 pl-1 font-semibold rounded-l">Type</th>
              <th className="text-center py-2 font-semibold">Today</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <td className="py-3 font-medium text-foreground text-sm pl-1">
                {t('milk.coffeeMilk')}
              </td>
              <td className="py-3 px-2 text-center">
                <div className="flex items-center justify-center gap-1">
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    className={INPUT}
                    placeholder="0"
                    value={data.coffee_s1 || ''}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => update('coffee_s1', parseFloat(e.target.value) || 0)}
                    data-testid="milk-coffee-s1"
                  />
                  <span className="text-xs text-muted-foreground">L</span>
                </div>
              </td>
            </tr>
            <tr className="border-b border-border last:border-b-0">
              <td className="py-3 font-medium text-foreground text-sm pl-1">{t('milk.teaMilk')}</td>
              <td className="py-3 px-2 text-center">
                <div className="flex items-center justify-center gap-1">
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    className={INPUT}
                    placeholder="0"
                    value={data.tea_s1 || ''}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => update('tea_s1', parseFloat(e.target.value) || 0)}
                    data-testid="milk-tea-s1"
                  />
                  <span className="text-xs text-muted-foreground">L</span>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-muted/30">
              <td className="py-3 font-semibold text-sm pl-1">{t('milk.dailyTotal')}</td>
              <td className="py-3 text-center font-bold text-primary">
                {totalConsumed.toFixed(1)}L
              </td>
            </tr>
          </tfoot>
        </table>
      ) : (
        /* C2: shift-split entry */
        <table className="w-full text-sm" data-testid="milk-shift-table">
          <thead>
            <tr className="text-muted-foreground text-xs bg-muted/50">
              <th className="text-left py-2 pl-1 font-semibold rounded-l">Type</th>
              <th className="text-center py-2 font-semibold">{t('milk.shift1')}</th>
              <th className="text-center py-2 font-semibold">{t('milk.shift2')}</th>
              <th className="text-right py-2 font-semibold rounded-r">{t('milk.dailyTotal')}</th>
            </tr>
          </thead>
          <tbody>
            <MilkRow
              label={t('milk.coffeeMilk')}
              s1Key="coffee_s1"
              s2Key="coffee_s2"
              s1TestId="milk-coffee-s1"
              s2TestId="milk-coffee-s2"
              data={data}
              onUpdate={update}
            />
            <MilkRow
              label={t('milk.teaMilk')}
              s1Key="tea_s1"
              s2Key="tea_s2"
              s1TestId="milk-tea-s1"
              s2TestId="milk-tea-s2"
              data={data}
              onUpdate={update}
            />
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
              <td className="py-3 text-right font-bold text-primary" data-testid="milk-daily-total">
                {totalConsumed.toFixed(1)}L
              </td>
            </tr>
          </tfoot>
        </table>
      )}

      {/* Closing balance computed */}
      <div
        className="mt-3 px-3 py-2 rounded-md bg-blue-50 border border-blue-200 text-sm"
        data-testid="milk-closing-balance"
      >
        Closing balance:{' '}
        <span className="font-bold text-blue-700">{closingBalance.toFixed(2)} L</span>
        <span className="text-xs text-muted-foreground ml-1">
          ({openingBalance.toFixed(2)} + {data.bought_litres.toFixed(2)} −{' '}
          {totalConsumed.toFixed(2)})
        </span>
      </div>

      <div className="flex justify-end mt-4">
        <button
          onClick={handleSave}
          className={`btn-primary text-sm px-4 py-2 ${saved ? 'bg-secondary' : ''}`}
          disabled={saving}
          data-testid="milk-save-btn"
        >
          {saved ? '✓ Saved' : saving ? t('shift.saving') : t('common.save')}
        </button>
      </div>
    </div>
  )
}

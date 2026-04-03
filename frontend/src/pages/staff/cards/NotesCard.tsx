import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../../lib/supabase'
import { saveDraft, loadDraft } from '../../../lib/offlineQueue'

interface Props {
  dailyEntryId: string
}

export default function NotesCard({ dailyEntryId }: Props) {
  const { t } = useTranslation()
  const [notes, setNotes] = useState<string>(() => loadDraft(`notes_${dailyEntryId}`) || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const i = setInterval(() => saveDraft(`notes_${dailyEntryId}`, notes), 30_000)
    return () => clearInterval(i)
  }, [notes, dailyEntryId])

  const handleSave = async () => {
    setSaving(true)
    try {
      await supabase.from('daily_entries').update({ notes }).eq('id', dailyEntryId)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4">
      <textarea
        className="input-field w-full h-32 resize-none"
        placeholder={t('notes.placeholder')}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <div className="flex justify-end mt-3">
        <button
          onClick={handleSave}
          className={`btn-secondary text-sm px-4 py-2 ${saved ? 'border-secondary text-secondary' : ''}`}
          disabled={saving}
        >
          {saved ? '✓ Saved' : saving ? t('shift.saving') : t('common.save')}
        </button>
      </div>
    </div>
  )
}

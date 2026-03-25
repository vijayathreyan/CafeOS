import React, { createContext, useContext, useState } from 'react'
import i18n from '../i18n/i18n'

interface LanguageContextValue {
  lang: 'en' | 'ta'
  toggleLang: () => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<'en' | 'ta'>(
    (localStorage.getItem('cafeos_lang') as 'en' | 'ta') || 'en'
  )

  const toggleLang = () => {
    const next = lang === 'en' ? 'ta' : 'en'
    setLang(next)
    i18n.changeLanguage(next)
    localStorage.setItem('cafeos_lang', next)
  }

  return (
    <LanguageContext.Provider value={{ lang, toggleLang }}>
      <div className={lang === 'ta' ? 'lang-ta' : ''}>{children}</div>
    </LanguageContext.Provider>
  )
}

export function useLang() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLang must be used within LanguageProvider')
  return ctx
}

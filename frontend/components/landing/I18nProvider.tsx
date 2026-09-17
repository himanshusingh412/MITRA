'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getTranslation, type TranslationKey } from '@/lib/landing/translations'

/**
 * Language state for the landing page (ported from mitra1).
 * Covers the 11 languages the landing copy is translated into; stored per browser.
 */
interface I18nContextType {
  lang: string
  setLang: (lang: string) => void
  t: (key: TranslationKey) => string
}

const I18nContext = createContext<I18nContextType>({
  lang: 'en',
  setLang: () => {},
  t: (key) => getTranslation('en', key),
})

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState('en')

  useEffect(() => {
    try {
      const stored = localStorage.getItem('mitra-lang')
      if (stored) setLangState(stored)
    } catch {}
  }, [])

  const setLang = useCallback((next: string) => {
    setLangState(next)
    try {
      localStorage.setItem('mitra-lang', next)
    } catch {}
  }, [])

  const t = useCallback((key: TranslationKey) => getTranslation(lang, key), [lang])

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>
}

export const useI18n = () => useContext(I18nContext)

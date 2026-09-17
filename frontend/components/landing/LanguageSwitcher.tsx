'use client'

import { useState, useRef, useEffect } from 'react'
import { Globe, Check, ChevronDown } from 'lucide-react'
import { useI18n } from '@/components/landing/I18nProvider'
import { LANGUAGES } from '@/lib/landing/languages'

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200"
        aria-label="Change language"
      >
        <Globe className="w-4 h-4" />
        {!compact && (
          <span className="hidden sm:inline">{current.nativeName}</span>
        )}
        {compact && <span className="uppercase text-xs">{current.code}</span>}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 z-50 overflow-hidden">
          <div className="max-h-72 overflow-y-auto">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => {
                  setLang(l.code)
                  setOpen(false)
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-slate-100 dark:hover:bg-white/5 ${
                  lang === l.code
                    ? 'text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-base">{l.flag}</span>
                  <span>{l.nativeName}</span>
                </span>
                {lang === l.code && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

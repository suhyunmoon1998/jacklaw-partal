'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { en, es } from './translations'

export type Lang = 'en' | 'es'
type Dict = typeof en

interface I18nCtx {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: keyof Dict) => string
}

const I18n = createContext<I18nCtx>({ lang: 'en', setLang: () => {}, t: k => String(k) })

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    const saved = localStorage.getItem('jlp_lang') as Lang | null
    if (saved === 'en' || saved === 'es') setLangState(saved)
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem('jlp_lang', l)
  }

  function t(key: keyof Dict): string {
    const dict = lang === 'es' ? es : en
    return dict[key] as string
  }

  return <I18n.Provider value={{ lang, setLang, t }}>{children}</I18n.Provider>
}

export function useLanguage() {
  return useContext(I18n)
}

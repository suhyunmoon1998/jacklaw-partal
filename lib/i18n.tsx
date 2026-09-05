'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { DICTIONARIES, en, fill } from './translations'
import { Lang, isLang } from './langs'

export type { Lang, TranslatedLang } from './langs'
export { LANGUAGES, TRANSLATED_LANGS, isLang } from './langs'
export { fill } from './translations'

type Dict = typeof en

interface I18nCtx {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: keyof Dict) => string
  tf: (key: keyof Dict, vars: Record<string, string | number>) => string
}

const I18n = createContext<I18nCtx>({
  lang: 'en',
  setLang: () => {},
  t: k => String(k),
  tf: k => String(k),
})


export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    const saved = localStorage.getItem('jlp_lang')
    if (isLang(saved)) setLangState(saved)
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem('jlp_lang', l)
  }

  // Screen readers, font fallback and the browser's own translate prompt all
  // key off this, and the server renders the document as English.
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  /**
   * Falls back to English per key rather than per dictionary, so a string added
   * to `en` and not yet translated shows in English instead of blank.
   */
  function t(key: keyof Dict): string {
    const dict = DICTIONARIES[lang] as Dict
    return (dict[key] as string) || (en[key] as string)
  }

  const tf = (key: keyof Dict, vars: Record<string, string | number>) => fill(t(key), vars)

  return <I18n.Provider value={{ lang, setLang, t, tf }}>{children}</I18n.Provider>
}

export function useLanguage() {
  return useContext(I18n)
}

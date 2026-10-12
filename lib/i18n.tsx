'use client'

import { createContext, useCallback, useContext, useState, useEffect, ReactNode } from 'react'
import { DICTIONARIES, en, fill } from './translations'
import { Lang, isLang } from './langs'

export type { Lang, TranslatedLang } from './langs'
export { LANGUAGES, TRANSLATED_LANGS, isLang } from './langs'
export { fill } from './translations'

type Dict = typeof en

interface I18nCtx {
  lang: Lang
  /** The client picked this, here or through a link the office sent. */
  setLang: (l: Lang) => void
  /**
   * The language the office has on file, taken only when this phone has never
   * been given one. Never overrides a choice.
   */
  adopt: (l: Lang) => void
  /** True once the language came from a choice rather than the default. */
  chosen: boolean
  /** True once the saved choice and the link have been read. */
  ready: boolean
  t: (key: keyof Dict) => string
  tf: (key: keyof Dict, vars: Record<string, string | number>) => string
}

const I18n = createContext<I18nCtx>({
  lang: 'en',
  setLang: () => {},
  adopt: () => {},
  chosen: false,
  ready: false,
  t: k => String(k),
  tf: k => String(k),
})

const SAVED = 'jlp_lang'

function save(l: Lang) {
  try {
    localStorage.setItem(SAVED, l)
  } catch {
    /* private browsing: the choice lasts as long as the page */
  }
}


export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')
  const [chosen, setChosen] = useState(false)
  const [ready, setReady] = useState(false)

  // A link the office sent says which language it was written for, and that
  // wins: the office wrote it in the language this client reads. Otherwise the
  // last choice made on this phone. Otherwise English, which is a default and
  // not a choice — see LanguageSync, which must never send it to the server as
  // one.
  useEffect(() => {
    let fromLink: string | null = null
    try {
      fromLink = new URLSearchParams(window.location.search).get('lang')
    } catch {
      fromLink = null
    }
    if (isLang(fromLink)) {
      setLangState(fromLink)
      setChosen(true)
      save(fromLink)
    } else {
      let saved: string | null = null
      try {
        saved = localStorage.getItem(SAVED)
      } catch {
        saved = null
      }
      if (isLang(saved)) {
        setLangState(saved)
        setChosen(true)
      }
    }
    setReady(true)
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    setChosen(true)
    save(l)
  }

  const adopt = useCallback(
    (l: Lang) => {
      if (chosen) return
      setLangState(l)
      setChosen(true)
      save(l)
    },
    [chosen]
  )

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

  return <I18n.Provider value={{ lang, setLang, adopt, chosen, ready, t, tf }}>{children}</I18n.Provider>
}

export function useLanguage() {
  return useContext(I18n)
}

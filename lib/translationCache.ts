/**
 * A client's writing in English for the office, translated once per text and
 * kept.
 *
 * The admin panel used to translate every non-English answer each time a
 * client was opened, and the facts API every fact's quotation on every load.
 * Here each text is looked up first and sent only when nothing is on file, and
 * a translation that came back is kept (supabase/migrations/0021_translation_cache.sql).
 * The translating itself is lib/staffTranslation.ts — never a free public
 * endpoint, and never shown to a client.
 *
 * Server-only. The browser asks /api/admin/translate, which calls this.
 *
 * Never throws. If the cache cannot be read or written, the translation still
 * happens, uncached. A missing table costs the saving and nothing else.
 */

import { createHash } from 'node:crypto'
import { getSupabase } from '@/lib/supabase'
import { Lang, TRANSLATED_LANGS, TranslatedLang } from '@/lib/langs'
import { LATIN_ONLY, answerText, detectLanguage, isTypedText } from '@/lib/machineTranslate'
import { textsToEnglish } from '@/lib/staffTranslation'
import { AnswerValue } from '@/types'

/**
 * The language a text is sent and kept as. 'auto' is writing in a script the
 * office cannot read and the detector does not name — Vietnamese, Russian,
 * Japanese kana — which Google reads the language of for itself.
 */
export type SourceLang = TranslatedLang | 'auto'

export const cacheKey = (text: string, from: SourceLang | Lang, to: Lang) =>
  createHash('sha256').update(`${from}|${to}|${text}`).digest('hex')

/**
 * The language a text goes to the translator as, or null for writing the
 * office reads as it stands.
 *
 * `clientLanguage` is the language the client reads the portal in, or that
 * their answers read as (answersLanguage in lib/machineTranslate.ts). It
 * matters for Spanish alone: a Spanish reader's "Septiembre 2024" carries no
 * accent and no second word to tell it by.
 */
export function languageOf(text: string, clientLanguage?: string | null): SourceLang | null {
  const t = (text ?? '').trim()
  if (!isTypedText(t)) return null
  const detected = detectLanguage(t)
  if (detected) return detected
  if (!LATIN_ONLY.test(t)) return 'auto'
  return clientLanguage === 'es' ? 'es' : null
}

/** One text, as the translator was asked about it. */
export interface Rendering {
  /** What it was sent as; null when it reads as English and was not sent. */
  lang: SourceLang | null
  /** What came back, or null when nothing did. The text itself when it was English after all. */
  english: string | null
}

/**
 * Each text's language and English, the same order as given. Duplicates are
 * translated once; what is on file is not sent again.
 */
export async function englishOf(texts: string[], clientLanguage?: string | null): Promise<Rendering[]> {
  const wanted = new Map<string, { text: string; from: SourceLang }>()
  const plan = texts.map(raw => {
    const text = (raw ?? '').trim()
    const from = languageOf(text, clientLanguage)
    const key = from ? cacheKey(text, from, 'en') : ''
    if (from) wanted.set(key, { text, from })
    return { from, key }
  })
  const found = new Map<string, string>()
  const keys = Array.from(wanted.keys())

  if (keys.length) {
    const db = getSupabase()
    // In slices: a key is 64 characters, and a URL carrying hundreds of them
    // runs past what the API gateway accepts.
    for (let i = 0; i < keys.length; i += 100) {
      const { data, error } = await db
        .from('translation_cache')
        .select('key, translated')
        .in('key', keys.slice(i, i + 100))
      if (error) break
      for (const r of data ?? []) found.set(String(r.key), String(r.translated))
    }

    const missing = keys.filter(k => !found.has(k))
    const fresh: { key: string; from_lang: string; to_lang: string; source: string; translated: string }[] = []
    // Only the first reading of a file pays this; after that every text is on file.
    const english = await textsToEnglish(missing.map(key => ({ key, ...wanted.get(key)! })))
    for (const key of missing) {
      const translated = english.get(key)
      if (!translated) continue
      const { text, from } = wanted.get(key)!
      found.set(key, translated)
      // Kept even when it came back unchanged — English after all — so it is
      // not sent again on every load.
      fresh.push({ key, from_lang: from, to_lang: 'en', source: text, translated })
    }
    if (fresh.length) {
      const { error } = await db.from('translation_cache').upsert(fresh, { onConflict: 'key' })
      if (error) console.error('could not keep translations:', error.message)
    }
  }

  return plan.map(({ from, key }) => ({ lang: from, english: from ? found.get(key) ?? null : null }))
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/**
 * Each text in English, or '' where it already is English or nothing came
 * back. Same order as given.
 */
export async function toEnglishCached(texts: string[], clientLanguage?: string | null): Promise<string[]> {
  const out = await englishOf(texts, clientLanguage)
  return out.map(({ english }, i) => (english && !same(english, texts[i] ?? '') ? english : ''))
}

/**
 * Every answer a client wrote in another language, in English for the office;
 * everything else as it stands.
 */
export async function translateAnswersCached(
  answers: Record<string, AnswerValue>,
  clientLanguage?: string | null
): Promise<Record<string, string>> {
  const entries = Object.entries(answers).map(([id, v]) => [id, answerText(v)] as const)
  const english = await toEnglishCached(entries.map(([, text]) => text), clientLanguage)
  return Object.fromEntries(entries.map(([id, text], i) => [id, english[i] || text]))
}

/**
 * Every key a text could have been kept under, whichever language it was read
 * as when it was kept. A deleted client's translations are found this way even
 * after the detector changes its mind about a text.
 */
export function keysToForget(texts: string[]): string[] {
  const keys = new Set<string>()
  for (const raw of texts) {
    const text = (raw ?? '').trim()
    if (!text) continue
    for (const from of [...TRANSLATED_LANGS, 'auto'] as SourceLang[]) keys.add(cacheKey(text, from, 'en'))
  }
  return Array.from(keys)
}

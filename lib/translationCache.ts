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
import { Lang } from '@/lib/langs'
import { answerText, detectLanguage } from '@/lib/machineTranslate'
import { textsToEnglish } from '@/lib/staffTranslation'
import { AnswerValue } from '@/types'

/** Yes/no answers are stored as these literals, never as the client's words. */
const STORED_LITERALS = new Set(['yes', 'no', 'not_sure'])

export const cacheKey = (text: string, from: Lang, to: Lang) =>
  createHash('sha256').update(`${from}|${to}|${text}`).digest('hex')

/**
 * Each text in English, or '' where it already is English or nothing came
 * back. Same order as given. Duplicates are translated once.
 */
export async function toEnglishCached(texts: string[]): Promise<string[]> {
  const wanted = new Map<string, { text: string; from: Lang }>()
  for (const raw of texts) {
    const text = (raw ?? '').trim()
    const from = text && !STORED_LITERALS.has(text) ? detectLanguage(text) : null
    if (from) wanted.set(cacheKey(text, from, 'en'), { text, from })
  }
  const found = new Map<string, string>()
  const keys = Array.from(wanted.keys())
  if (!keys.length) return texts.map(() => '')

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
    fresh.push({ key, from_lang: from, to_lang: 'en', source: text, translated })
  }
  if (fresh.length) {
    const { error } = await db.from('translation_cache').upsert(fresh, { onConflict: 'key' })
    if (error) console.error('could not keep translations:', error.message)
  }

  return texts.map(raw => {
    const text = (raw ?? '').trim()
    const from = text && !STORED_LITERALS.has(text) ? detectLanguage(text) : null
    return from ? found.get(cacheKey(text, from, 'en')) ?? '' : ''
  })
}

/**
 * Every answer a client wrote in another language, in English for the office;
 * everything else as it stands.
 */
export async function translateAnswersCached(
  answers: Record<string, AnswerValue>
): Promise<Record<string, string>> {
  const entries = Object.entries(answers).map(([id, v]) => [id, answerText(v)] as const)
  const english = await toEnglishCached(entries.map(([, text]) => text))
  return Object.fromEntries(entries.map(([id, text], i) => [id, english[i] || text]))
}

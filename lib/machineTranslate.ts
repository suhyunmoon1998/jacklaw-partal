/**
 * Which language a client wrote in, and their answers as plain strings.
 *
 * This file used to send answers to MyMemory's free, anonymous translation
 * endpoint. That is gone: the office's English now comes from
 * lib/staffTranslation.ts, through lib/translationCache.ts. What is left sends
 * nothing anywhere, which is why the admin panel can import it in the browser.
 */

import { TranslatedLang } from '@/lib/langs'
import { AnswerValue } from '@/types'

/**
 * Which language a piece of a client's writing is in, or null for English.
 *
 * Hangul and Han are decided by script, which is unambiguous. Spanish shares
 * the Latin alphabet with English, so it is recognised by the characters that
 * essentially never appear in an English answer.
 */
const SPANISH_HINT = /[áéíóúñ¿¡]/i
const HANGUL = /[\uac00-\ud7a3]/
const HAN = /[\u3400-\u4dbf\u4e00-\u9fff]/

export function detectLanguage(text: string): TranslatedLang | null {
  // Korean first: Korean writing mixes in Han characters, but Chinese never
  // contains Hangul, so testing for Hangul first cannot misread either one.
  if (HANGUL.test(text)) return 'ko'
  if (HAN.test(text)) return 'zh'
  if (SPANISH_HINT.test(text)) return 'es'
  return null
}

/** Yes/no answers are stored as these literals, never as the client's words. */
const STORED_LITERALS = new Set(['yes', 'no', 'not_sure'])

/** One stored answer as a single string, the way the admin panel shows it. */
export function answerText(value: AnswerValue | undefined): string {
  if (value === undefined || value === null) return ''
  return Array.isArray(value) ? value.join(', ') : String(value)
}

/**
 * The language a client filled a questionnaire out in, or null if it reads as
 * English.
 *
 * Answers are counted per language rather than stopping at the first hit, so
 * one accented name in an otherwise English form does not label the whole
 * submission Spanish.
 */
export function submissionLanguage(
  answers: Record<string, AnswerValue>
): TranslatedLang | null {
  const tally: Partial<Record<TranslatedLang, number>> = {}
  for (const value of Object.values(answers)) {
    const text = answerText(value)
    if (STORED_LITERALS.has(text)) continue
    const lang = detectLanguage(text)
    if (lang) tally[lang] = (tally[lang] ?? 0) + 1
  }

  let best: TranslatedLang | null = null
  for (const [lang, count] of Object.entries(tally) as [TranslatedLang, number][]) {
    if (!best || count > (tally[best] ?? 0)) best = lang
  }
  return best
}

/**
 * Runs `task` over every item, at most `limit` at a time.
 *
 * Kept for callers that fan work out over many answers without firing them
 * all at once.
 */
export async function mapWithLimit<T, R>(
  items: T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const out = new Array<R>(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++
        out[i] = await task(items[i], i)
      }
    })
  )
  return out
}

/**
 * Machine translation through MyMemory's free endpoint.
 *
 * Two callers, and both treat the result as a draft a person reads rather than
 * as finished text: the question-set editor fills empty translation fields for
 * staff to correct before a set goes out, and the admin panel renders a
 * client's non-English answers in English so the office can read a file without
 * waiting on a translator. Nothing machine-translated is ever shown to a client
 * unreviewed.
 *
 * Every failure returns '' rather than throwing. A translation that does not
 * arrive should leave the original on screen, never break the page.
 */

import { Lang, TranslatedLang } from '@/lib/langs'
import { AnswerValue } from '@/types'

/** MyMemory's language codes, which do not always match our own. */
const MYMEMORY_CODE: Record<Lang, string> = {
  en: 'en',
  es: 'es',
  zh: 'zh-CN',
  ko: 'ko',
}

/**
 * MyMemory rejects anonymous queries much over 500 bytes, and intake answers
 * routinely run longer than that — "describe your job duties" is a paragraph.
 * Long text is cut on sentence boundaries (including the CJK full stops), each
 * piece translated, and the pieces rejoined, so a long answer comes back whole
 * instead of truncated.
 */
function sentenceChunks(text: string, limit = 400): string[] {
  if (text.length <= limit) return [text]

  const sentences = text.match(/[^.!?。！？\n]*[.!?。！？\n]+|[^.!?。！？\n]+/g) ?? [text]
  const out: string[] = []
  let current = ''

  for (const sentence of sentences) {
    // One sentence longer than the limit still has to be cut somewhere.
    if (sentence.length > limit) {
      if (current) { out.push(current); current = '' }
      for (let i = 0; i < sentence.length; i += limit) out.push(sentence.slice(i, i + limit))
      continue
    }
    if (current && (current + sentence).length > limit) {
      out.push(current)
      current = ''
    }
    current += sentence
  }

  if (current) out.push(current)
  return out
}

export async function machineTranslate(text: string, from: Lang, to: Lang): Promise<string> {
  const body = text.trim()
  if (!body || from === to) return ''

  const pieces: string[] = []
  for (const piece of sentenceChunks(body)) {
    try {
      const res = await fetch(
        'https://api.mymemory.translated.net/get' +
          `?q=${encodeURIComponent(piece)}` +
          `&langpair=${MYMEMORY_CODE[from]}|${MYMEMORY_CODE[to]}`
      )
      const data = await res.json()
      const translated = String(data?.responseData?.translatedText ?? '')
      // A refusal comes back as prose in the field where the translation should
      // be; keeping the original piece is better than pasting the complaint in.
      pieces.push(/MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(translated) ? piece : translated || piece)
    } catch {
      return ''
    }
  }

  const joined = pieces.join('')
  return joined === body ? '' : joined
}

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
 * The endpoint is free and rate-limited, and one questionnaire can carry a
 * hundred answers. Firing them all at once is what gets a batch throttled and
 * comes back half translated.
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

/**
 * Every answer a client wrote in another language, rendered in English for the
 * office. Answers already in English — and the stored yes/no literals — are
 * passed through untouched.
 */
export async function translateAnswersToEnglish(
  answers: Record<string, AnswerValue>
): Promise<Record<string, string>> {
  const entries = Object.entries(answers)
  const done = await mapWithLimit(entries, 4, async ([id, value]) => {
    const text = answerText(value)
    const from = STORED_LITERALS.has(text) ? null : detectLanguage(text)
    if (!from) return [id, text] as const
    return [id, (await machineTranslate(text, from, 'en')) || text] as const
  })
  return Object.fromEntries(done)
}

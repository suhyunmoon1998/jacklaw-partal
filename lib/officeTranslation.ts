/**
 * A client's own words, in English, for the people who have to read them.
 *
 * Choices are already English wherever they came from — the portal stores the
 * English option whichever language it was chosen in. Free text is not, and
 * cannot be: a worker describing what happened to them writes it in their own
 * language, and that paragraph is usually the most important thing in the file.
 *
 * Two places needed this and neither had it. The firm's notification arrived in
 * Chinese. The printed file could not even show it — PDFKit's built-in fonts
 * have no CJK glyphs, so thirteen of one client's thirty-five answers came out
 * as "[Answer is in a language this PDF cannot display]". The office was left
 * with a case file that omitted the account of the day someone was fired.
 *
 * The original is never replaced. It is the client's own word and the record of
 * what they actually wrote; the English sits beside it.
 *
 * With GOOGLE_TRANSLATE_API_KEY set, the English comes from Google Cloud
 * Translation through the translations the admin panel already keeps
 * (lib/translationCache.ts), and from nothing else — the owner's choice,
 * 2026-10-06. This file still asked Claude after that choice was made, so a
 * Chinese client's notice was paid for, and failed outright while the firm's
 * Anthropic account was out of credit. Without the key it asks Claude, with
 * each question beside its answer.
 */

import { TRANSLATION_MODEL } from '@/lib/models'
import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { googleTranslateKey } from '@/lib/googleTranslate'
import { LATIN_ONLY } from '@/lib/machineTranslate'
import { englishOf } from '@/lib/translationCache'
import { AnswerValue } from '@/types'

export interface EnglishRendering {
  /** Question id to the English of what the client wrote. */
  english: Record<string, string>
  /** True when something needed translating and the attempt did not finish. */
  incomplete: boolean
}

const Translated = z.object({
  answers: z.array(z.object({ id: z.string(), english: z.string() })),
})

/** The answers a reader of English could not read as they stand. */
export function needsEnglish(answers: Record<string, AnswerValue>): string[] {
  return Object.entries(answers)
    .filter(([, value]) => typeof value === 'string' && value.trim() !== '' && !LATIN_ONLY.test(value))
    .map(([id]) => id)
}

/** Yes/no answers are stored as these literals, never as the client's words. */
const STORED_LITERALS = new Set(['yes', 'no', 'not_sure'])

/**
 * What to put into English for the office: anything not in Latin script, and —
 * for a client who reads the portal in another language — everything they
 * typed.
 *
 * Latin script alone was the test, because this began as the fix for a PDF
 * that could not draw Chinese. But the office cannot read Spanish either, and
 * Spanish is Latin script: a parking attendant's account of his job, and the
 * dates he gave as "Septiembre 2024" and "Agosto 4 2026", reached the firm's
 * inbox untranslated. Guessing Spanish from the words misses most of it — only
 * accented text gives itself away — so the client's own language decides.
 */
export function answersToTranslate(
  answers: Record<string, AnswerValue>,
  clientLanguage?: string | null
): string[] {
  const unreadable = needsEnglish(answers)
  if (!clientLanguage || clientLanguage === 'en') return unreadable
  const typed = Object.entries(answers)
    .filter(
      ([, value]) =>
        typeof value === 'string' && /\p{L}/u.test(value) && !STORED_LITERALS.has(value.trim())
    )
    .map(([id]) => id)
  return Array.from(new Set([...unreadable, ...typed]))
}

/**
 * Translates what a reader of English could not read, and nothing else.
 *
 * Never throws. A failure returns whatever it managed and says so, because a
 * case file missing its translation is still better than a client's submission
 * failing to send.
 */
export async function toEnglishForOffice(
  answers: Record<string, AnswerValue>,
  labelFor: (id: string) => string,
  /** The language the client reads the portal in, when the caller knows it. */
  clientLanguage?: string | null
): Promise<EnglishRendering> {
  const ids = answersToTranslate(answers, clientLanguage)
  if (ids.length === 0) return { english: {}, incomplete: false }

  // Google when its key is set, and then only Google: no paid model behind it.
  if (googleTranslateKey()) return throughGoogle(answers, ids, clientLanguage)

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set, so answers cannot be put into English for the office.')
    return { english: {}, incomplete: true }
  }

  const payload = ids.map(id => ({
    id,
    question: labelFor(id),
    answer: String(answers[id]),
  }))

  const system = [
    "You translate a client's answers on a California employment-law intake into",
    'English for the law office that will read them.',
    '',
    'The reader is a lawyer or paralegal building a case. Translate what the client',
    'actually said, plainly and completely — not a summary, not a tidied-up version.',
    'Keep names, places, company names, job titles, dates and numbers exactly as',
    'written. Where the client is vague, stay vague: "about 20 minutes" must not',
    'become "20 minutes". Where they quote someone, keep it a quotation.',
    '',
    'Some answers may already be in English, or be a choice the client picked from',
    'an English list; return those exactly as given.',
    '',
    'Return one entry per answer you were given, with the same id.',
  ].join('\n')

  try {
    const client = new Anthropic({ maxRetries: 2 })
    const response = await client.messages.parse({
      model: TRANSLATION_MODEL,
      max_tokens: 16000,
      system,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium', format: zodOutputFormat(Translated) },
      messages: [{ role: 'user', content: JSON.stringify(payload, null, 2) }],
    })

    const parsed = response.parsed_output
    if (!parsed) return { english: {}, incomplete: true }

    const english: Record<string, string> = {}
    const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()
    let answered = 0
    for (const item of parsed.answers) {
      if (!ids.includes(item.id) || item.english.trim() === '') continue
      answered++
      // An answer that was English already comes back unchanged, and printing
      // it twice — once as the translation, once "as written" — is noise.
      if (same(item.english, String(answers[item.id]))) continue
      english[item.id] = item.english.trim()
    }
    return { english, incomplete: answered < ids.length }
  } catch (err) {
    console.error('could not put answers into English for the office:', err)
    return { english: {}, incomplete: true }
  }
}

/**
 * The same choice of answers, put into English by Google through the kept
 * translations: what the admin panel has already shown costs nothing here.
 *
 * A Spanish reader's typed answers go as Spanish without Google being told the
 * language, so one that was English comes back as it went and is left out.
 * For anyone else, Latin-script answers read as English stay as they are.
 */
async function throughGoogle(
  answers: Record<string, AnswerValue>,
  ids: string[],
  clientLanguage?: string | null
): Promise<EnglishRendering> {
  const texts = ids.map(id => String(answers[id]))
  const out = await englishOf(texts, clientLanguage === 'es' ? 'es' : null)
  const english: Record<string, string> = {}
  let missing = 0
  ids.forEach((id, i) => {
    const { lang, english: back } = out[i]
    if (!lang) return
    if (!back) {
      missing++
      return
    }
    if (back.trim().toLowerCase() === texts[i].trim().toLowerCase()) return
    english[id] = back.trim()
  })
  return { english, incomplete: missing > 0 }
}

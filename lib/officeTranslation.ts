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
 */

import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { AnswerValue } from '@/types'

/**
 * Latin script and the punctuation the portal's own languages use — which is
 * also, not by coincidence, exactly what the PDF's fonts can draw.
 */
const LATIN_ONLY =
  /^[\t\n\r -~ -ſ–—‘’“”•…€]*$/

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

/**
 * Translates what a reader of English could not read, and nothing else.
 *
 * Never throws. A failure returns whatever it managed and says so, because a
 * case file missing its translation is still better than a client's submission
 * failing to send.
 */
export async function toEnglishForOffice(
  answers: Record<string, AnswerValue>,
  labelFor: (id: string) => string
): Promise<EnglishRendering> {
  const ids = needsEnglish(answers)
  if (ids.length === 0) return { english: {}, incomplete: false }

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
    'Return one entry per answer you were given, with the same id.',
  ].join('\n')

  try {
    const client = new Anthropic({ maxRetries: 2 })
    const response = await client.messages.parse({
      model: 'claude-opus-5',
      max_tokens: 16000,
      system,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium', format: zodOutputFormat(Translated) },
      messages: [{ role: 'user', content: JSON.stringify(payload, null, 2) }],
    })

    const parsed = response.parsed_output
    if (!parsed) return { english: {}, incomplete: true }

    const english: Record<string, string> = {}
    for (const item of parsed.answers) {
      if (ids.includes(item.id) && item.english.trim() !== '') {
        english[item.id] = item.english.trim()
      }
    }
    return { english, incomplete: Object.keys(english).length < ids.length }
  } catch (err) {
    console.error('could not put answers into English for the office:', err)
    return { english: {}, incomplete: true }
  }
}

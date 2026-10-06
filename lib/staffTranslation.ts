/**
 * A client's own words in English, for the office reading their file.
 *
 * These were sent to MyMemory's free, anonymous endpoint, one query string at
 * a time — a stranger's translation memory holding harassment accounts,
 * medical details and immigration-related answers, with no agreement about
 * what it keeps and every sentence sitting in URL logs on the way.
 *
 * Now, with GOOGLE_TRANSLATE_API_KEY set, they go to Google Cloud Translation
 * (lib/googleTranslate.ts) — the owner's choice, free within Google's monthly
 * allowance and under terms that keep nothing — and nowhere else. Without the
 * key they go to the same provider that already reads the client's file for
 * the office (lib/officeTranslation.ts). Either way in the body of a request,
 * never in a URL.
 *
 * Server-only, and only ever for staff: nothing translated here is shown to a
 * client. Callers keep what comes back (lib/translationCache.ts), so a text is
 * paid for once.
 *
 * Never throws. What did not come back is simply missing, and the screen shows
 * the original.
 */

import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { TRANSLATION_MODEL } from '@/lib/models'
import { googleTextsToEnglish, googleTranslateKey } from '@/lib/googleTranslate'

/** Texts per request: a file's answers and fact quotations, a few requests at most. */
const BATCH = 40

const Out = z.object({
  items: z.array(z.object({ key: z.string(), english: z.string() })),
})

const SYSTEM = [
  "You translate short pieces of a client's own writing into English for the",
  'California employment-law office handling their case. Each piece comes with a',
  'key and the language it is in.',
  '',
  'Translate what the client actually wrote, plainly and completely — not a',
  'summary and not a tidied-up version. Keep names, places, company names, job',
  'titles, dates and numbers exactly as written. Where the client is vague, stay',
  'vague. Where they quote someone, keep it a quotation.',
  '',
  'Return one item per piece you were given, with the same key. A piece that is',
  'already English comes back unchanged.',
].join('\n')

export interface ToTranslate {
  key: string
  text: string
  from: string
}

export async function textsToEnglish(items: ToTranslate[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  if (!items.length) return out
  // Google when its key is set, and then only Google: no paid fallback.
  if (googleTranslateKey()) return googleTextsToEnglish(items)
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set, so client writing cannot be put into English for the office.')
    return out
  }

  const client = new Anthropic({ maxRetries: 2 })
  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH)
    const wanted = new Set(batch.map(b => b.key))
    try {
      const response = await client.messages.parse({
        model: TRANSLATION_MODEL,
        max_tokens: 16000,
        system: SYSTEM,
        thinking: { type: 'adaptive' },
        output_config: { effort: 'low', format: zodOutputFormat(Out) },
        messages: [
          {
            role: 'user',
            content: JSON.stringify(batch.map(b => ({ key: b.key, language: b.from, text: b.text })), null, 2),
          },
        ],
      })
      for (const item of response.parsed_output?.items ?? []) {
        const english = item.english.trim()
        if (wanted.has(item.key) && english) out.set(item.key, english)
      }
    } catch (err) {
      console.error('could not put client writing into English for the office:', err instanceof Error ? err.message : err)
    }
  }
  return out
}

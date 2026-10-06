/**
 * A client's writing in English for the office, through Google Cloud
 * Translation (Basic, v2).
 *
 * The owner's choice, 2026-10-06: free within Google's monthly allowance
 * (500,000 characters when this was written), where Claude cost a few cents a
 * client. Google's terms for this API: the text is held in memory to translate
 * it and not kept, not used to train, not shared. MyMemory, which this
 * replaces in spirit, had no terms at all and took the text in its URL.
 *
 * The key travels in the `x-goog-api-key` header and the text in the body —
 * neither in the URL. Server-only, staff-only: nothing here is shown to a
 * client.
 *
 * Never throws. A batch that fails is simply missing and the screen shows the
 * original; it is asked again the next time, because only what came back is
 * kept (lib/translationCache.ts). Once a key is set there is no fallback to a
 * paid model, so nothing is spent behind the owner's back — a daily character
 * quota set on the key's Google Cloud project is what keeps it inside the free
 * allowance.
 */

import type { ToTranslate } from '@/lib/staffTranslation'

export const GOOGLE_TRANSLATE_ENDPOINT = 'https://translation.googleapis.com/language/translate/v2'

/** Google takes up to 128 texts a request; fewer keeps one bad text from costing many. */
const MAX_TEXTS = 100

/** Google recommends at most 5,000 characters a request. A longer single text still goes, alone. */
const MAX_CHARS = 5000

export function googleTranslateKey(): string {
  return process.env.GOOGLE_TRANSLATE_API_KEY?.trim() ?? ''
}

/**
 * Google's code for the client's language. Chinese is left for Google to
 * read, because "zh" would be taken as simplified and a client may write
 * traditional.
 */
function sourceCode(from: string): string | undefined {
  return from === 'es' || from === 'ko' ? from : undefined
}

/** The texts of one language in requests Google will take. */
function batches(items: ToTranslate[]): ToTranslate[][] {
  const out: ToTranslate[][] = []
  let current: ToTranslate[] = []
  let chars = 0
  for (const item of items) {
    const length = item.text.length
    if (current.length && (current.length >= MAX_TEXTS || chars + length > MAX_CHARS)) {
      out.push(current)
      current = []
      chars = 0
    }
    current.push(item)
    chars += length
  }
  if (current.length) out.push(current)
  return out
}

/** What Google said went wrong, by its code — never the text. */
async function failureCode(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: { status?: unknown } } | null
  const status = body?.error?.status
  return typeof status === 'string' && /^[A-Z_]{1,40}$/.test(status) ? status : 'no code'
}

export async function googleTextsToEnglish(
  items: ToTranslate[],
  fetcher: typeof fetch = fetch
): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const key = googleTranslateKey()
  if (!key || !items.length) return out

  const byLanguage = new Map<string, ToTranslate[]>()
  for (const item of items) {
    const group = byLanguage.get(item.from) ?? []
    group.push(item)
    byLanguage.set(item.from, group)
  }

  for (const [from, group] of Array.from(byLanguage.entries())) {
    const source = sourceCode(from)
    for (const batch of batches(group)) {
      try {
        const res = await fetcher(GOOGLE_TRANSLATE_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'x-goog-api-key': key },
          body: JSON.stringify({
            q: batch.map(b => b.text),
            target: 'en',
            format: 'text',
            ...(source ? { source } : {}),
          }),
          signal: AbortSignal.timeout(20_000),
        })
        if (!res.ok) {
          // A daily quota that has run out answers here too; the originals show until tomorrow.
          console.error(`Google translation refused a batch: HTTP ${res.status} (${await failureCode(res)})`)
          continue
        }
        const body = (await res.json().catch(() => null)) as
          | { data?: { translations?: { translatedText?: unknown }[] } }
          | null
        const translations = body?.data?.translations ?? []
        batch.forEach((item, i) => {
          const english = translations[i]?.translatedText
          if (typeof english === 'string' && english.trim()) out.set(item.key, english.trim())
        })
      } catch (err) {
        console.error('Google translation did not answer:', err instanceof Error ? err.name : 'Error')
      }
    }
  }
  return out
}

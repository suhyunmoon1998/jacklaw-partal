/**
 * The admin panel's way to read a client's answers in English.
 *
 * Asks the server, which translates each text once and keeps it, instead of
 * calling the free endpoint from the browser once per answer. On any failure
 * it returns the answers as they stand, so a translation that does not arrive
 * leaves the original on screen and never breaks the page.
 */

import { answerText } from '@/lib/machineTranslate'
import { AnswerValue } from '@/types'

export async function englishFromServer(
  answers: Record<string, AnswerValue>
): Promise<Record<string, string>> {
  const asIs = () => Object.fromEntries(Object.entries(answers).map(([id, v]) => [id, answerText(v)]))
  try {
    const res = await fetch('/api/admin/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    })
    if (!res.ok) return asIs()
    const body = await res.json()
    return { ...asIs(), ...(body?.english ?? {}) }
  } catch {
    return asIs()
  }
}

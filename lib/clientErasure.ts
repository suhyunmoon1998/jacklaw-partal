/**
 * What deleting a client takes with it beyond their row.
 *
 * The row's deletion cascades through every table that names the client. Two
 * things it never reached: the files they uploaded, kept in storage under
 * `<clientId>/`, and the English the office was shown of their answers and
 * quotations, kept in translation_cache under a hash of the text with no
 * client id. Deleting a client left pay stubs and medical records in storage
 * with nothing pointing at them, kept indefinitely.
 */

import { getSupabase } from '@/lib/supabase'
import { cacheKey } from '@/lib/translationCache'
import { answerText, detectLanguage } from '@/lib/machineTranslate'
import { AnswerValue } from '@/types'

/** A client id as the portal makes them. Anything else would name the wrong folder. */
export const isClientId = (id: string) => /^[A-Za-z0-9_-]{1,100}$/.test(id)

/** Every file under the client's folder, removed. Throws if any could not be. */
export async function eraseClientFiles(clientId: string): Promise<number> {
  if (!isClientId(clientId)) throw new Error('Not a client id.')
  const bucket = getSupabase().storage.from('documents')
  let removed = 0
  for (;;) {
    // Always the first page: what was removed is gone from the listing.
    const { data, error } = await bucket.list(clientId, { limit: 100 })
    if (error) throw new Error(`The client's files could not be listed: ${error.message}`)
    const paths = (data ?? []).filter(f => f.name).map(f => `${clientId}/${f.name}`)
    if (!paths.length) return removed
    const { error: rmError } = await bucket.remove(paths)
    if (rmError) throw new Error(`The client's files could not be removed: ${rmError.message}`)
    removed += paths.length
    if (removed > 10_000) throw new Error('More files than one client could have uploaded; stopped.')
  }
}

/** The office's English of this client's own words, forgotten. Best effort. */
export async function forgetClientTranslations(clientId: string): Promise<number> {
  const db = getSupabase()
  const [state, responses, facts] = await Promise.all([
    db.from('questionnaire_states').select('answers').eq('client_id', clientId).maybeSingle(),
    db.from('question_set_responses').select('answer').eq('client_id', clientId).range(0, 9_999),
    db.from('case_facts').select('verbatim').eq('client_id', clientId).range(0, 9_999),
  ])
  const texts: string[] = [
    ...Object.values((state.data?.answers ?? {}) as Record<string, AnswerValue>).map(v => answerText(v)),
    ...(responses.data ?? []).map(r => answerText(r.answer as AnswerValue)),
    ...(facts.data ?? []).map(f => String(f.verbatim ?? '')),
  ]
  const keys = Array.from(
    new Set(
      texts.flatMap(raw => {
        const text = raw.trim()
        const from = text ? detectLanguage(text) : null
        return from ? [cacheKey(text, from, 'en')] : []
      })
    )
  )
  let forgotten = 0
  for (let i = 0; i < keys.length; i += 100) {
    const { error } = await db.from('translation_cache').delete().in('key', keys.slice(i, i + 100))
    if (error) {
      console.error(`translations of a deleted client were not forgotten (${error.message})`)
      return forgotten
    }
    forgotten += keys.slice(i, i + 100).length
  }
  return forgotten
}

import { getSupabase } from '@/lib/supabase'
import { ExtractionInput } from '@/lib/factExtraction'
import { loadAssignedSets } from '@/lib/assignedSets'
import { recordSearch } from '@/lib/sourceSearch'
import { AnswerValue } from '@/types'

/**
 * Everything a client has answered, as fact extraction takes it.
 *
 * One place, because two did it differently. The admin panel's extraction
 * read the questionnaire and every answered question set; the nightly run read
 * the questionnaire alone. Jingwen Du and Xilong Wang were read by the night,
 * so the forty-four answers each gave on 9/4 about the vehicle, DOT and the
 * July 31 termination — and Jingwen's work-history clarification — were never
 * in their facts, and the rounds written from those facts asked them again.
 */
export async function gatherExtractionInput(clientId: string) {
  const db = getSupabase()
  const [{ data: client }, { data: state }, assigned, docs] = await Promise.all([
    db.from('clients').select('id, name').eq('id', clientId).maybeSingle(),
    db.from('questionnaire_states').select('answers').eq('client_id', clientId).maybeSingle(),
    // Everything else the office has asked this client and had answered. These
    // live in their own table, outside the questionnaire's structure, so
    // nothing reading `answers` alone would ever see them.
    loadAssignedSets(clientId),
    db.from('documents').select('name, category').eq('client_id', clientId),
  ])
  if (!client) return null
  // The raw record. extractFacts runs it through answersForReading itself, so
  // that a question the client retracted is read as retracted here too rather
  // than twice or not at all.
  const answers = (state?.answers ?? {}) as Record<string, AnswerValue>
  return {
    clientId,
    clientName: client.name ?? '',
    answers,
    extra: assigned.sets as NonNullable<ExtractionInput['extra']>,
    searched: recordSearch({
      ranAt: new Date().toISOString(),
      answers: state ? answers : null,
      assignments: assigned.error ? { error: assigned.error } : assigned.found,
      documents: docs.error
        ? { error: docs.error.message }
        : (docs.data ?? []).map(d => ({ name: String(d.name ?? ''), category: String(d.category ?? '') })),
    }),
  }
}

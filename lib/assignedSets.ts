/**
 * The answers a client gave to question sets the office assigned, outside the
 * numbered modules.
 *
 * They live in their own table and are not part of the questionnaire, so
 * nothing that reads `questionnaire_states.answers` alone sees them. The fact
 * extraction learned to gather them. The damages reading did not. On DAYEON
 * KIM's file it kept reporting the restaurant's address as unknown after she
 * had given it in a follow-up, and "Re-run" could not change that. Both now
 * gather them here, the same way.
 */

import { getSupabase } from '@/lib/supabase'
import { getAssignmentDetail } from '@/lib/questionSets'
import { AssignmentFound, READ_STATUSES } from '@/lib/sourceSearch'
import { SetRows } from '@/lib/factAdditions'
import { AnswerValue } from '@/types'

/** One answer as a line of text, arrays flattened. */
const shown = (v: AnswerValue | undefined): string =>
  Array.isArray(v) ? v.filter(Boolean).join('; ') : String(v ?? '').trim()

export async function loadAssignedSets(clientId: string): Promise<{
  /** Each answered set, as the readings take it: its title and its answered rows. */
  sets: SetRows[]
  /** Every assignment and what became of it, for the record of what was searched. */
  found: AssignmentFound[]
  /** Set when the list of assignments itself could not be read. */
  error: string | null
}> {
  const db = getSupabase()
  // Every status, not only the answered ones: an assigned set nobody has
  // opened is not a source, but it is something the record is missing.
  // A plain select, not a join: this query also decides which answers are
  // read, and it must not fail over a set's display name.
  const assigned = await db
    .from('client_question_set_assignments')
    .select('id, status, question_set_id')
    .eq('client_id', clientId)
  if (assigned.error) return { sets: [], found: [], error: assigned.error.message }

  // Names only label the record, so a failure here costs a label and nothing else.
  const setIds = Array.from(new Set((assigned.data ?? []).map(a => String(a.question_set_id))))
  const { data: named } = setIds.length
    ? await db.from('question_sets').select('id, name').in('id', setIds)
    : { data: [] }
  const names = new Map((named ?? []).map(s => [String(s.id), String(s.name ?? '')]))

  const sets: SetRows[] = []
  const found: AssignmentFound[] = []
  for (const a of assigned.data ?? []) {
    const name = names.get(String(a.question_set_id)) || 'Unnamed question set'
    const status = String(a.status ?? '')
    if (!(READ_STATUSES as readonly string[]).includes(status)) {
      found.push({ name, status, detail: null })
      continue
    }
    // A set that would not load used to be skipped without a word, and the
    // facts it held were simply absent. It is named as inaccessible instead.
    const detail = await getAssignmentDetail(a.id as string).catch((err: Error) => {
      found.push({ name, status, detail: null, error: err.message })
      return undefined
    })
    if (detail === undefined) continue
    found.push({ name, status, detail })
    if (!detail) continue
    const rows = detail.questions
      .map(q => ({ id: q.id, label: q.label, answer: shown(detail.answers[q.id]) }))
      .filter(r => r.answer.trim())
    if (rows.length) sets.push({ title: `Question set: ${detail.questionSetName}`, rows })
  }
  return { sets, found, error: null }
}

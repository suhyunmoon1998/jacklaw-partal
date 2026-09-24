/**
 * What a reading of the answers looked at, and what it did not.
 *
 * The ledger records where each fact came from. It cannot record where nothing
 * came from: a section the client never answered, a question set that would not
 * load, a document sitting in the portal whose contents no reading has opened.
 * A factual brief that says "nothing on file corroborates this" means one thing
 * if every source was read and another if half were never looked at, and the
 * reader could not tell which.
 *
 * So every extraction leaves a record of its search, in four parts that are
 * kept apart on purpose:
 *
 *   REVIEWED      read, and what the facts were drawn from
 *   MISSING       looked for and not there — nothing answered, nothing uploaded
 *   NOT READ      there, and outside what this reading reads. Document contents
 *                 are the case today: the extraction reads answers, not files
 *   INACCESSIBLE  tried, and could not be opened
 *
 * NOT READ and INACCESSIBLE are not the same event. A document the flow does not
 * read is a known limit; one it could not open is a failure somebody should look
 * at. Filing both under one heading would tell the office a design choice was an
 * outage, or an outage was a design choice.
 *
 * Pure. The route gathers; this only sorts what was gathered.
 */

import { AnswerValue } from '@/types'
import { answersForReading } from '@/lib/modules'

export type SourceKey = 'questionnaire' | 'question sets' | 'documents'

export interface ReviewedItem {
  label: string
  answered: number
  asked: number
}

export interface SourceCategory {
  key: SourceKey
  label: string
  reviewed: ReviewedItem[]
  missing: string[]
  notRead: { label: string; why: string }[]
  inaccessible: { label: string; why: string }[]
}

export interface SearchRecord {
  /** When the reading that searched ran. */
  ranAt: string
  categories: SourceCategory[]
}

/** One assigned question set, as the route found it. */
export interface AssignmentFound {
  name: string
  status: string
  /** Null when the assignment would not load. */
  detail: { questions: { id: string }[]; answers: Record<string, AnswerValue> } | null
  /** Why it would not load, when something said. */
  error?: string
}

export interface SearchInput {
  ranAt: string
  /** Null when the client has no questionnaire row at all. */
  answers: Record<string, AnswerValue> | null
  assignments: AssignmentFound[] | { error: string }
  documents: { name: string; category: string }[] | { error: string }
}

/** The statuses whose answers the extraction reads. The rest are not answered yet. */
export const READ_STATUSES = ['completed', 'in_progress'] as const

const shown = (v: AnswerValue | undefined): string =>
  Array.isArray(v) ? v.filter(Boolean).join('; ') : String(v ?? '').trim()

const failed = <T,>(x: T[] | { error: string }): x is { error: string } => !Array.isArray(x)

const NOT_SENT: Record<string, string> = {
  draft: 'written and not yet approved, so the client has not seen it',
  assigned: 'assigned and not yet sent to the client',
  sent: 'sent, and the client has not started it',
}

function questionnaire(answers: SearchInput['answers']): SourceCategory {
  const out: SourceCategory = {
    key: 'questionnaire',
    label: 'Onboarding questionnaire',
    reviewed: [],
    missing: [],
    notRead: [],
    inaccessible: [],
  }
  if (answers === null) {
    out.missing.push('No questionnaire is on file for this client.')
    return out
  }
  // Read exactly as the extraction reads it, so a section counted here is a
  // section the facts could have come from.
  const reading = answersForReading(answers)
  for (const section of reading.sections) {
    const asked = section.questions.length
    const answered = section.questions.filter(q => shown(reading.filed[q.id])).length
    if (answered > 0) out.reviewed.push({ label: section.title, answered, asked })
    else if (asked > 0) out.missing.push(`${section.title}: none of its ${asked} questions answered.`)
  }
  const retracted = Object.keys(reading.retracted).length
  if (retracted > 0) {
    out.notRead.push({
      label: `${retracted} retracted answer${retracted === 1 ? '' : 's'}`,
      why: 'The client withdrew these. They are kept on file and not read as facts.',
    })
  }
  return out
}

function questionSets(assignments: SearchInput['assignments']): SourceCategory {
  const out: SourceCategory = {
    key: 'question sets',
    label: 'Assigned question sets',
    reviewed: [],
    missing: [],
    notRead: [],
    inaccessible: [],
  }
  if (failed(assignments)) {
    out.inaccessible.push({ label: 'The list of assigned question sets', why: assignments.error })
    return out
  }
  for (const a of assignments) {
    if (!(READ_STATUSES as readonly string[]).includes(a.status)) {
      out.missing.push(`${a.name}: ${NOT_SENT[a.status] ?? `status "${a.status}"`}.`)
      continue
    }
    if (!a.detail) {
      out.inaccessible.push({ label: a.name, why: a.error || 'The assignment could not be loaded.' })
      continue
    }
    const asked = a.detail.questions.length
    const answered = a.detail.questions.filter(q => shown(a.detail!.answers[q.id])).length
    if (answered > 0) out.reviewed.push({ label: a.name, answered, asked })
    else out.missing.push(`${a.name}: opened, and nothing answered yet.`)
  }
  return out
}

function documents(docs: SearchInput['documents']): SourceCategory {
  const out: SourceCategory = {
    key: 'documents',
    label: 'Documents uploaded to the portal',
    reviewed: [],
    missing: [],
    notRead: [],
    inaccessible: [],
  }
  if (failed(docs)) {
    out.inaccessible.push({ label: 'The list of uploaded documents', why: docs.error })
    return out
  }
  if (docs.length === 0) out.missing.push('The client has not uploaded any documents.')
  for (const d of docs) {
    out.notRead.push({
      label: d.category ? `${d.name} (${d.category})` : d.name,
      why: 'On file. This reading reads answers, not document contents, so no fact came from it.',
    })
  }
  return out
}

export function recordSearch(input: SearchInput): SearchRecord {
  return {
    ranAt: input.ranAt,
    categories: [
      questionnaire(input.answers),
      questionSets(input.assignments),
      documents(input.documents),
    ],
  }
}

/** Counts, for a line that says how complete the search was. */
export function searchTotals(record: SearchRecord) {
  const sum = (f: (c: SourceCategory) => number) => record.categories.reduce((n, c) => n + f(c), 0)
  return {
    reviewed: sum(c => c.reviewed.length),
    missing: sum(c => c.missing.length),
    notRead: sum(c => c.notRead.length),
    inaccessible: sum(c => c.inaccessible.length),
  }
}

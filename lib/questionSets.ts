/**
 * Server-side helpers for reusable question sets and their per-client
 * assignments.
 *
 * Two ideas are kept strictly apart here:
 *   - a *question set* is a reusable template (Who's Who, Wage & Hour …)
 *   - an *assignment* is that template handed to one client, and is the only
 *     place progress, status, and answers are ever stored.
 *
 * The default onboarding questionnaire is deliberately NOT stored in these
 * tables. It stays in lib/questionnaireData.ts + questionnaire_states so the
 * existing flow keeps working untouched; it is surfaced to admins as a
 * read-only entry via DEFAULT_SET_ID.
 */

import { getSupabase } from '@/lib/supabase'
import { QUESTIONNAIRE_SECTIONS } from '@/lib/questionnaireData'
import { answerFitsType, isVisible } from '@/lib/questionLogic'
import {
  AnswerValue,
  Assignment,
  AssignmentDetail,
  AssignmentStatus,
  Question,
  QuestionSet,
  QuestionSetDetail,
  QuestionTranslation,
  QuestionType,
} from '@/types'

/** Sentinel id for the built-in onboarding questionnaire. Never a real row. */
export const DEFAULT_SET_ID = 'default-onboarding'

export const DEFAULT_SET_QUESTION_COUNT = QUESTIONNAIRE_SECTIONS.reduce(
  (n, s) => n + s.questions.length,
  0
)

const QUESTION_TYPES: QuestionType[] = [
  'text', 'phone', 'date', 'yes_no', 'yes_no_unsure',
  'select', 'multiselect', 'textarea', 'number', 'currency',
]

/**
 * Coerces whatever the admin editor (or a future Eleanor generator) sends into
 * a Question the portal renderer can handle. Returns null for junk rather than
 * letting a malformed question reach a client's screen.
 */
export function normalizeQuestion(raw: unknown, index: number): Question | null {
  if (!raw || typeof raw !== 'object') return null
  const q = raw as Record<string, unknown>

  const label = typeof q.label === 'string' ? q.label.trim() : ''
  if (!label) return null

  const type = QUESTION_TYPES.includes(q.type as QuestionType) ? (q.type as QuestionType) : 'text'

  // A stable key is what answers are filed under, so derive one from the label
  // when the caller did not supply it.
  const rawId = typeof q.id === 'string' ? q.id.trim() : ''
  const id =
    rawId ||
    `${label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'q'}_${index + 1}`

  const options = Array.isArray(q.options)
    ? q.options.map(o => String(o).trim()).filter(Boolean)
    : undefined

  const question: Question = { id, label, type }
  if (q.required === true) question.required = true
  if (options && options.length > 0) question.options = options
  if (typeof q.placeholder === 'string' && q.placeholder.trim()) question.placeholder = q.placeholder.trim()
  if (typeof q.helpText === 'string' && q.helpText.trim()) question.helpText = q.helpText.trim()

  const showIf = q.showIf as Record<string, unknown> | undefined
  if (showIf && typeof showIf.questionId === 'string' && typeof showIf.value === 'string' && showIf.questionId.trim()) {
    question.showIf = { questionId: showIf.questionId.trim(), value: showIf.value }
  }

  // Spanish, where the admin (or a bank) supplied it. Options are positional
  // display labels, so a list of the wrong length is dropped rather than
  // silently pairing the wrong text with the wrong stored value.
  const es = q.es as Record<string, unknown> | undefined
  if (es && typeof es === 'object') {
    const t: QuestionTranslation = {}
    if (typeof es.label === 'string' && es.label.trim()) t.label = es.label.trim()
    if (typeof es.helpText === 'string' && es.helpText.trim()) t.helpText = es.helpText.trim()
    if (typeof es.placeholder === 'string' && es.placeholder.trim()) t.placeholder = es.placeholder.trim()
    if (Array.isArray(es.options) && question.options && es.options.length === question.options.length) {
      t.options = es.options.map(o => String(o))
    }
    if (Object.keys(t).length > 0) question.es = t
  }

  return question
}

/** Drops questions whose ids collide — answers are keyed by id. */
export function normalizeQuestions(raw: unknown): Question[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: Question[] = []
  raw.forEach((item, i) => {
    const q = normalizeQuestion(item, i)
    if (!q || seen.has(q.id)) return
    seen.add(q.id)
    out.push(q)
  })

  // Skip logic that points at a question which is no longer in the set — the
  // gate was deleted or reordered below its dependant — can never be true, so
  // the condition is dropped rather than hiding the question from every client
  // forever. A multiselect gate is dropped for the same reason: visibility is
  // an equality test and its answer is an array, which can never match.
  const byId = new Map(out.map(q => [q.id, q]))
  return out.map((q, index) => {
    if (!q.showIf) return q
    const gate = byId.get(q.showIf.questionId)
    const gateIndex = gate ? out.findIndex(x => x.id === gate.id) : -1
    if (!gate || gateIndex >= index || gate.type === 'multiselect') {
      return { ...q, showIf: undefined }
    }
    return q
  })
}

interface SetRow {
  id: string
  name: string
  name_es: string | null
  description: string
  status: string
  is_default: boolean
  created_at: string
  updated_at: string
}

function toQuestionSet(row: SetRow, questionCount: number): QuestionSet {
  return {
    id: row.id,
    name: row.name,
    nameEs: row.name_es ?? '',
    description: row.description ?? '',
    status: row.status === 'archived' ? 'archived' : 'active',
    isDefault: row.is_default,
    questionCount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** The built-in onboarding questionnaire, described as a read-only set. */
export function defaultQuestionSet(): QuestionSet {
  return {
    id: DEFAULT_SET_ID,
    name: 'Default Onboarding',
    nameEs: 'Cuestionario Inicial',
    description: 'The standard intake questionnaire every client receives. Built into the portal — duplicate it to make an editable copy.',
    status: 'active',
    isDefault: true,
    questionCount: DEFAULT_SET_QUESTION_COUNT,
    createdAt: '',
    updatedAt: '',
  }
}

export async function listQuestionSets(includeArchived = true): Promise<QuestionSet[]> {
  const supabase = getSupabase()

  let query = supabase.from('question_sets').select('*').order('created_at', { ascending: false })
  if (!includeArchived) query = query.eq('status', 'active')

  const [{ data: sets }, { data: questions }] = await Promise.all([
    query,
    // Ranged explicitly: PostgREST caps an unbounded select at 1000 rows, which
    // would silently under-report counts once the firm's library grows.
    supabase.from('question_set_questions').select('question_set_id').range(0, 99_999),
  ])

  const counts = (questions ?? []).reduce<Record<string, number>>((acc, q) => {
    acc[q.question_set_id] = (acc[q.question_set_id] ?? 0) + 1
    return acc
  }, {})

  return (sets ?? []).map(row => toQuestionSet(row as SetRow, counts[row.id] ?? 0))
}

export async function getQuestionSetDetail(id: string): Promise<QuestionSetDetail | null> {
  if (id === DEFAULT_SET_ID) {
    return {
      ...defaultQuestionSet(),
      // Sections carry their own showIf in the built-in questionnaire. Flattening
      // without pushing it onto the questions would hand a duplicate every gated
      // question unconditionally — e.g. the termination questions asked of
      // someone still employed.
      questions: QUESTIONNAIRE_SECTIONS.flatMap(section =>
        section.questions.map(q => (section.showIf && !q.showIf ? { ...q, showIf: section.showIf } : q))
      ),
    }
  }

  const supabase = getSupabase()
  const { data: set } = await supabase.from('question_sets').select('*').eq('id', id).maybeSingle()
  if (!set) return null

  const { data: rows } = await supabase
    .from('question_set_questions')
    .select('question, sort_order')
    .eq('question_set_id', id)
    .order('sort_order', { ascending: true })

  const questions = (rows ?? []).map(r => r.question as Question)
  return { ...toQuestionSet(set as SetRow, questions.length), questions }
}

/**
 * Replaces a set's questions wholesale — the editor always sends the full list.
 *
 * Goes through a database function so the delete and the insert share one
 * transaction: a failure part way through leaves the old questions in place
 * rather than emptying a set the firm may already have sent out.
 */
export async function replaceQuestions(setId: string, questions: Question[]): Promise<void> {
  const { error } = await getSupabase().rpc('replace_question_set_questions', {
    p_set_id: setId,
    p_questions: questions,
  })
  if (error) {
    console.error('replaceQuestions failed:', error)
    throw new Error(error.message || 'Could not save the questions.')
  }
}

interface AssignmentRow {
  id: string
  client_id: string
  question_set_id: string
  status: string
  assigned_at: string
  sent_at: string | null
  started_at: string | null
  completed_at: string | null
}

function toAssignment(
  row: AssignmentRow,
  set: { name: string; name_es?: string | null; description: string },
  questionCount: number,
  answeredCount: number,
  /** The description is the admin's internal note — never send it to a client. */
  includeDescription = true
): Assignment {
  return {
    id: row.id,
    clientId: row.client_id,
    questionSetId: row.question_set_id,
    questionSetName: set.name,
    questionSetNameEs: set.name_es ?? '',
    questionSetDescription: includeDescription ? (set.description ?? '') : '',
    questionCount,
    status: row.status as AssignmentStatus,
    assignedAt: row.assigned_at,
    sentAt: row.sent_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    answeredCount,
  }
}

/**
 * Assignments for one client, newest first.
 *
 * `visibleToClient` hides drafts — an assignment the admin has parked but not
 * released yet should not appear in the client's portal.
 */
export async function listAssignments(
  clientId: string,
  { visibleToClient = false }: { visibleToClient?: boolean } = {}
): Promise<Assignment[]> {
  const supabase = getSupabase()

  let query = supabase
    .from('client_question_set_assignments')
    .select('*')
    .eq('client_id', clientId)
    .order('assigned_at', { ascending: false })
  if (visibleToClient) query = query.neq('status', 'draft')

  const { data: rows } = await query
  if (!rows || rows.length === 0) return []

  const setIds = Array.from(new Set(rows.map(r => r.question_set_id)))
  const assignmentIds = rows.map(r => r.id)

  const [{ data: sets }, { data: questions }, { data: responses }] = await Promise.all([
    supabase.from('question_sets').select('id, name, name_es, description').in('id', setIds),
    supabase
      .from('question_set_questions')
      .select('question_set_id, question')
      .in('question_set_id', setIds)
      .range(0, 99_999),
    supabase.from('question_set_responses').select('assignment_id, question_key, answer').in('assignment_id', assignmentIds),
  ])

  const setMap = Object.fromEntries((sets ?? []).map(s => [s.id, s]))

  // Question ids per set, so an answer left behind by an edited set does not
  // inflate the progress shown against the set's current questions.
  const questionsBySet = (questions ?? []).reduce<Record<string, Question[]>>((acc, row) => {
    ;(acc[row.question_set_id] ??= []).push(row.question as Question)
    return acc
  }, {})

  const answersByAssignment = (responses ?? []).reduce<Record<string, Record<string, AnswerValue>>>((acc, r) => {
    ;(acc[r.assignment_id] ??= {})[r.question_key] = r.answer as AnswerValue
    return acc
  }, {})

  return rows.map(row => {
    const progress = progressOf(
      questionsBySet[row.question_set_id] ?? [],
      answersByAssignment[row.id] ?? {},
      visibleToClient
    )
    return toAssignment(
      row as AssignmentRow,
      setMap[row.question_set_id] ?? { name: 'Removed question set', description: '' },
      progress.total,
      progress.answered,
      !visibleToClient
    )
  })
}

function isAnswered(val: AnswerValue | null | undefined): boolean {
  if (val === null || val === undefined) return false
  if (Array.isArray(val)) return val.length > 0
  return String(val).trim().length > 0
}

/**
 * How far along an assignment is.
 *
 * The two audiences want different denominators. A client's progress has to be
 * able to reach 100%, so theirs counts only the questions their own answers
 * actually reveal — a set where answering "no" hides six follow-ups is finished
 * at 1/1, not stuck at 1/7. Staff think of a set by its real size, so the
 * office sees every question in it.
 *
 * Both count the same answers: filled in, and still fitting the control they
 * belong to.
 */
function progressOf(
  questions: Question[],
  answers: Record<string, AnswerValue>,
  forClient: boolean
): { total: number; answered: number } {
  const counted = forClient ? questions.filter(q => isVisible(q, answers)) : questions
  return {
    total: counted.length,
    answered: counted.filter(q => answerFitsType(answers[q.id], q.type)).length,
  }
}

/**
 * One assignment with the questions to render and the answers recorded so far.
 *
 * `forClient` does two things: it withholds the set's internal description, and
 * it renders only the set's current questions. For admins the opposite is
 * wanted — if a question was edited out of the template after this client
 * answered it, that answer is still evidence, so it is surfaced rather than
 * silently orphaned.
 */
export async function getAssignmentDetail(
  id: string,
  { forClient = false }: { forClient?: boolean } = {}
): Promise<AssignmentDetail | null> {
  const supabase = getSupabase()

  const { data: row } = await supabase
    .from('client_question_set_assignments')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (!row) return null

  const [{ data: set }, { data: questionRows }, { data: responses }, { data: client }] = await Promise.all([
    supabase.from('question_sets').select('id, name, name_es, description').eq('id', row.question_set_id).maybeSingle(),
    supabase
      .from('question_set_questions')
      .select('question, sort_order')
      .eq('question_set_id', row.question_set_id)
      .order('sort_order', { ascending: true }),
    supabase.from('question_set_responses').select('question_key, answer').eq('assignment_id', id),
    supabase.from('clients').select('name').eq('id', row.client_id).maybeSingle(),
  ])

  const current = (questionRows ?? []).map(r => r.question as Question)
  const answers: Record<string, AnswerValue> = Object.fromEntries(
    (responses ?? []).map(r => [r.question_key, r.answer as AnswerValue])
  )

  // Answers whose question the template no longer contains. Showing them to the
  // firm keeps an edit to a template from hiding what a client actually said.
  const known = new Set(current.map(q => q.id))
  const removed: Question[] = forClient
    ? []
    : Object.keys(answers)
        .filter(key => !known.has(key) && isAnswered(answers[key]))
        .map(key => ({ id: key, label: `${key} (question since removed from this set)`, type: 'textarea' as const }))

  const questions = [...current, ...removed]

  // `questions` already carries the since-removed ones for staff, so their
  // answers are counted here without any extra bookkeeping.
  const progress = progressOf(questions, answers, forClient)
  const base = toAssignment(
    row as AssignmentRow,
    set ?? { name: 'Removed question set', description: '' },
    progress.total,
    progress.answered,
    !forClient
  )

  return { ...base, clientName: client?.name ?? '', questions, answers }
}

/**
 * Moves an assignment forward only. A completed questionnaire that the client
 * reopens must not fall back to in_progress.
 */
const RANK: Record<AssignmentStatus, number> = {
  draft: 0, assigned: 1, sent: 2, in_progress: 3, completed: 4,
}

export function advancesTo(current: AssignmentStatus, next: AssignmentStatus): boolean {
  return RANK[next] > RANK[current]
}

/** Timestamp column that goes with each status, set once on first entry. */
export const STATUS_TIMESTAMP: Record<AssignmentStatus, string | null> = {
  draft: null,
  assigned: 'assigned_at',
  sent: 'sent_at',
  in_progress: 'started_at',
  completed: 'completed_at',
}

/** The client-facing link for one assignment. Keyed by assignment, not by set. */
export function assignmentLink(origin: string, assignmentId: string): string {
  return `${origin}/questionnaire/${assignmentId}`
}

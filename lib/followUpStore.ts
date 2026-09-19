/**
 * Putting a round of follow-up questions where the client will actually see it.
 *
 * Nothing about delivery is invented here. The portal already has question
 * sets, assignments, a renderer that speaks four languages, and a reminder
 * ladder that chases an unfinished assignment by text on day two, by text
 * again on day five, and by telephone on day ten. A generated round is written
 * into exactly that, so it inherits all of it.
 *
 * Two things this file is careful about.
 *
 * THE ASSIGNMENT IS CREATED AS A DRAFT, and the portal already hides drafts
 * from clients. That is the review gate, and it is a gate that exists whether
 * or not anyone remembers it is there: a question written by a model reaches a
 * real person only after someone at the firm has opened it and pressed send.
 * The Korean is the reason it matters most — a reviewer who cannot read it
 * needs the English beside it, which is why the engine writes both.
 *
 * THE RETURN PATH IS WRITTEN DOWN. Every question is stored twice: once as a
 * question the client is shown, and once as a row saying what it was for. An
 * answer without the second is a string in a table. With it, the answer is a
 * fact that supersedes a named fact, or confirms a REPORTED one, or closes an
 * element the matrix could not reach — which is the difference between a brief
 * that lives and one that gets rewritten.
 */

import { getSupabase } from '@/lib/supabase'
import { Lang } from '@/lib/langs'
import { FollowUp, FollowUpSet, FOLLOWUP_MODEL, toQuestion, vetAll } from '@/lib/followUp'
import { replaceQuestions } from '@/lib/questionSets'

/** What a stored round looks like to the office. */
export interface FollowUpPlan {
  id: string
  clientId: string
  questionSetId: string
  assignmentId: string
  factCount: number
  model: string
  leftOut: { gap: string; why: string }[]
  vetProblems: { id: string; problems: string[] }[]
  createdAt: string
  reviewedAt: string | null
  reviewedBy: string | null
  questions: {
    questionKey: string
    rung: number
    resolvesKind: string
    resolvesRef: string
    whyItMatters: string
  }[]
}

/**
 * What the set is called.
 *
 * The client sees this in an email and on the screen, so it says what it is in
 * their own words. It does not say "follow-up round 2" or name the case: a
 * text from a law office about "case development" is a text a worried person
 * reads three times.
 */
const SET_NAME: Record<Lang, string> = {
  en: 'A few more questions about your job',
  es: 'Algunas preguntas más sobre su trabajo',
  zh: '关于您工作的几个补充问题',
  ko: '일하셨던 곳에 대한 몇 가지 추가 질문',
}

/**
 * Questions in an order the gates survive.
 *
 * normalizeQuestions drops a showIf whose gate sits at or after the question
 * it controls, because such a gate can never have been answered — so a set
 * whose follow-ups happen to precede their threshold loses its routing
 * silently, and every client is asked everything. Sorting gates first is
 * cheaper than discovering that from a client's answers.
 */
export function inGateOrder(questions: FollowUp[]): FollowUp[] {
  const byId = new Map(questions.map(q => [q.id, q]))
  const placed = new Set<string>()
  const out: FollowUp[] = []
  const place = (q: FollowUp, seen: Set<string>) => {
    if (placed.has(q.id) || seen.has(q.id)) return
    seen.add(q.id)
    const gate = q.askOnlyIf ? byId.get(q.askOnlyIf.questionId) : undefined
    if (gate) place(gate, seen)
    if (placed.has(q.id)) return
    placed.add(q.id)
    out.push(q)
  }
  for (const q of questions) place(q, new Set())
  return out
}

export interface SavePlanInput {
  clientId: string
  lang: Lang
  set: FollowUpSet
  /** How many standing facts the round was written against. */
  factCount: number
  /** Who pressed the button, for the plan's own record. */
  createdBy?: string
}

/**
 * Writes a round into the portal, as a draft nobody has sent.
 *
 * Order matters on failure. The question set and its questions come first, the
 * assignment second, the plan last — so a failure part way through leaves an
 * orphaned set the office can delete, rather than an assignment pointing at
 * questions that were never written.
 */
export async function savePlan(input: SavePlanInput): Promise<FollowUpPlan> {
  const supabase = getSupabase()
  const ordered = inGateOrder(input.set.questions)
  if (!ordered.length) throw new Error('There are no questions to send.')

  const { data: setRow, error: setErr } = await supabase
    .from('question_sets')
    .insert({
      name: SET_NAME.en,
      name_es: SET_NAME.es,
      name_zh: SET_NAME.zh,
      name_ko: SET_NAME.ko,
      // The description is the admin's internal note and is never sent to a
      // client, so it can say what this actually is.
      description: `Generated follow-up round, ${new Date().toISOString().slice(0, 10)}. Written against ${input.factCount} facts. Not reviewed.`,
      status: 'active',
      is_default: false,
    })
    .select('id')
    .single()
  if (setErr || !setRow) throw new Error(setErr?.message || 'Could not create the question set.')

  await replaceQuestions(
    setRow.id,
    ordered.map(q => toQuestion(q, input.lang))
  )

  const { data: assignment, error: assignErr } = await supabase
    .from('client_question_set_assignments')
    .insert({
      client_id: input.clientId,
      question_set_id: setRow.id,
      // Draft, which the portal hides from the client. Nothing here sends.
      status: 'draft',
      created_by: input.createdBy ?? null,
    })
    .select('id')
    .single()
  if (assignErr || !assignment) throw new Error(assignErr?.message || 'Could not create the assignment.')

  const vetProblems = vetAll({ ...input.set, questions: ordered })
  const { data: plan, error: planErr } = await supabase
    .from('follow_up_plans')
    .insert({
      client_id: input.clientId,
      question_set_id: setRow.id,
      assignment_id: assignment.id,
      fact_count: input.factCount,
      model: FOLLOWUP_MODEL,
      left_out: input.set.leftOut,
      vet_problems: vetProblems,
    })
    .select('id, created_at')
    .single()
  if (planErr || !plan) throw new Error(planErr?.message || 'Could not record why the questions were asked.')

  const rows = ordered.map((q, i) => ({
    plan_id: plan.id,
    question_key: q.id,
    rung: q.rung,
    resolves_kind: q.resolves.kind,
    resolves_ref: q.resolves.ref,
    why_it_matters: q.whyItMatters,
    sort_order: i,
  }))
  const { error: qErr } = await supabase.from('follow_up_questions').insert(rows)
  if (qErr) throw new Error(qErr.message || 'Could not record why the questions were asked.')

  return {
    id: plan.id,
    clientId: input.clientId,
    questionSetId: setRow.id,
    assignmentId: assignment.id,
    factCount: input.factCount,
    model: FOLLOWUP_MODEL,
    leftOut: input.set.leftOut,
    vetProblems,
    createdAt: plan.created_at,
    reviewedAt: null,
    reviewedBy: null,
    questions: rows.map(r => ({
      questionKey: r.question_key,
      rung: r.rung,
      resolvesKind: r.resolves_kind,
      resolvesRef: r.resolves_ref,
      whyItMatters: r.why_it_matters,
    })),
  }
}

/** The rounds written for a client, newest first. */
export async function readPlans(clientId: string): Promise<FollowUpPlan[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('follow_up_plans')
    .select(
      'id, client_id, question_set_id, assignment_id, fact_count, model, left_out, vet_problems, created_at, reviewed_at, reviewed_by, follow_up_questions(question_key, rung, resolves_kind, resolves_ref, why_it_matters, sort_order)'
    )
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message || 'Could not read the follow-up rounds.')

  type Row = {
    id: string
    client_id: string
    question_set_id: string
    assignment_id: string
    fact_count: number
    model: string
    left_out: FollowUpPlan['leftOut']
    vet_problems: FollowUpPlan['vetProblems']
    created_at: string
    reviewed_at: string | null
    reviewed_by: string | null
    follow_up_questions: {
      question_key: string
      rung: number
      resolves_kind: string
      resolves_ref: string
      why_it_matters: string
      sort_order: number
    }[]
  }

  return ((data ?? []) as Row[]).map(r => ({
    id: r.id,
    clientId: r.client_id,
    questionSetId: r.question_set_id,
    assignmentId: r.assignment_id,
    factCount: r.fact_count,
    model: r.model,
    leftOut: r.left_out ?? [],
    vetProblems: r.vet_problems ?? [],
    createdAt: r.created_at,
    reviewedAt: r.reviewed_at,
    reviewedBy: r.reviewed_by,
    questions: [...(r.follow_up_questions ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(q => ({
        questionKey: q.question_key,
        rung: q.rung,
        resolvesKind: q.resolves_kind,
        resolvesRef: q.resolves_ref,
        whyItMatters: q.why_it_matters,
      })),
  }))
}

/** A person has read every question in this round. */
export async function markReviewed(planId: string, by: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('follow_up_plans')
    .update({ reviewed_at: new Date().toISOString(), reviewed_by: by })
    .eq('id', planId)
  if (error) throw new Error(error.message || 'Could not record the review.')
}

/**
 * What an answered follow-up means, ready to be filed.
 *
 * The join the whole table exists for: an answer key becomes the fact it was
 * meant to settle. This returns the pairing and stops — deciding whether an
 * answer supersedes a fact, confirms it, or raises a new dispute is the
 * ledger's business and takes a reading of its own.
 */
export async function answeredFollowUps(
  planId: string
): Promise<{ questionKey: string; resolvesKind: string; resolvesRef: string; answer: unknown }[]> {
  const supabase = getSupabase()
  const { data: plan, error: planErr } = await supabase
    .from('follow_up_plans')
    .select('assignment_id, follow_up_questions(question_key, resolves_kind, resolves_ref)')
    .eq('id', planId)
    .single()
  if (planErr || !plan) throw new Error(planErr?.message || 'That follow-up round is not on file.')

  const meta = (plan as unknown as {
    assignment_id: string
    follow_up_questions: { question_key: string; resolves_kind: string; resolves_ref: string }[]
  })

  const { data: answers, error: ansErr } = await supabase
    .from('question_set_responses')
    .select('question_key, answer')
    .eq('assignment_id', meta.assignment_id)
  if (ansErr) throw new Error(ansErr.message || 'Could not read the answers.')

  const byKey = new Map((answers ?? []).map(a => [a.question_key as string, a.answer]))
  return meta.follow_up_questions
    .filter(q => byKey.has(q.question_key))
    .map(q => ({
      questionKey: q.question_key,
      resolvesKind: q.resolves_kind,
      resolvesRef: q.resolves_ref,
      answer: byKey.get(q.question_key),
    }))
}

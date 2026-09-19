/**
 * What a follow-up question is, and what keeps one away from a client.
 *
 * Split from lib/followUp.ts, which calls the model. Importing a value — even
 * a list of ten strings — from that file pulls the Anthropic SDK and node:fs
 * into whatever imports it, and the admin panel that reviews these questions
 * runs in a browser. The engine writes the questions; this file says what a
 * question is and refuses the ones that should not be sent, and both the
 * server and the screen can hold it.
 *
 * The rules themselves are the corpus's: a ten-rung ladder for developing an
 * issue (sec. 9) and nine rules for how a portal question must be written
 * (sec. 8). They are data here for the same reason the anomaly list and the
 * claim elements are data: a model asked "what should we ask next" produces
 * good questions and no method.
 *
 * The jargon list is the part with teeth. A question containing "meal period",
 * "premium", "regular rate" or "adverse action" does not reach a client,
 * because vet() rejects it and a test asserts vet() rejects it. That is a
 * mechanism. Instructing a model to write simply is a hope.
 */

import { z } from 'zod'
import { Lang } from '@/lib/langs'
import { Question, QuestionType } from '@/types'

/**
 * The corpus's question ladder for a material issue (sec. 9), unchanged.
 *
 * The order is the method. Asking rung 4 — how often, how long — of someone
 * who has not yet been walked through one concrete occasion produces a number
 * they have guessed to be helpful, and a guessed number is worse than no
 * number because it looks like evidence.
 */
export const LADDER = [
  { rung: 1, key: 'threshold', asks: 'Did this happen at all?' },
  { rung: 2, key: 'concrete incident', asks: 'Tell us about one time you remember clearly.' },
  { rung: 3, key: 'representative', asks: 'What usually happened on a normal day or week?' },
  { rung: 4, key: 'frequency and duration', asks: 'How often, how long, and over what period?' },
  { rung: 5, key: 'who knew', asks: 'Who told you, saw it, approved it, changed it, or knew about it?' },
  { rung: 6, key: 'proof', asks: 'What schedule, pay stub, text, photo, record or coworker could show it?' },
  { rung: 7, key: 'exceptions', asks: 'Were there days when the opposite happened?' },
  { rung: 8, key: 'contradiction check', asks: 'Earlier you said X; this sounds like Y. Which is closer, or did both happen at different times?' },
  { rung: 9, key: 'confidence', asks: 'Is that exact, your best estimate, or something you are not sure about?' },
  { rung: 10, key: 'confirmation', asks: 'Say the key point back in plain words and ask them to confirm or correct it.' },
] as const

export const RUNG_KEYS = LADDER.map(l => l.key) as readonly string[]

/**
 * The handles the corpus says to reach for when memory has to be reconstructed
 * (sec. 8).
 *
 * "How many days a week did you miss a break" is a question about a number
 * nobody stored. "Think about the group chat where the schedule was posted —
 * which days were you on?" is a question about a thing that exists.
 */
export const MEMORY_CUES = [
  'the schedule, and where it was posted',
  'coworkers who were on the same shifts',
  'texts and group chats',
  'paydays and pay stubs',
  'opening and closing tasks',
  'holidays and busy periods',
  'routes, deliveries or rounds',
  'photographs on their phone',
  'physical routines — where they put their bag, when they ate, who relieved them',
] as const

/**
 * The confidence vocabulary every estimate is offered alongside (sec. 8).
 *
 * The safety valve is not politeness. A client pushed into false precision
 * gives a number the other side impeaches her with, and the corpus requires
 * that "I do not know" always be available without penalty.
 */
export const CONFIDENCE_CHOICES = [
  'This is exact',
  'This is my best guess',
  'Somewhere in a range',
  'I worked it out from a record',
  'I am not sure',
] as const

/**
 * Words that must not appear in something a client reads.
 *
 * Every one of them is a term this system uses correctly upstairs and which
 * means nothing, or means something else, to the person answering. "Premium"
 * is a word about insurance. "Provided" is the single most contested word in
 * California meal-period law and reads to a worker as "did they let you".
 *
 * The replacements are not suggestions to the model — they are what vet()
 * prints when it rejects a question, so the office sees what to write instead.
 */
export const JARGON: Record<string, string> = {
  'meal period': 'lunch break, or the break you get to eat',
  'rest period': 'short break',
  'rest break': 'short break',
  premium: 'extra pay',
  'regular rate': 'your pay rate',
  'de minimis': '(do not raise this with a client at all)',
  retaliation: 'what happened after you spoke up',
  'adverse action': 'anything that changed for you at work',
  'protected activity': 'speaking up about it',
  'wage statement': 'pay stub',
  exempt: '(ask what they actually did, not how they were classified)',
  'non-exempt': '(ask what they actually did, not how they were classified)',
  reimbursement: 'paid you back',
  reimburse: 'pay you back',
  statute: '(do not cite law to a client)',
  'labor code': '(do not cite law to a client)',
  'wage order': '(do not cite law to a client)',
  waiver: 'signed something giving it up',
  waive: 'give it up',
  willful: '(a legal test — ask what they were told and by whom)',
  'good faith': '(a legal test — ask what they were told and by whom)',
  compensable: 'paid',
  'off the clock': 'before you clocked in, or after you clocked out',
  gratuity: 'tips',
  'constructive discharge': '(ask what made them leave)',
  allege: 'say',
  'alleged': 'said',
  plaintiff: 'you',
  defendant: 'your employer',
}

/** The kinds of gap a question can close. Checked by vet(), not by the schema. */
export const GAP_KINDS = [
  'open loop',
  'element',
  'date conflict',
  'silence',
  'anomaly',
  'contradiction',
  'damages input',
  'record',
] as const

/** A question the office may put to a client, and what it is for. */
const Resolves = z.object({
  /** What kind of gap this closes. One of GAP_KINDS. */
  kind: z.string(),
  /**
   * The thing itself: a fact id, a 'claim-id:element-key', or the gap's own
   * words. This is what routes the answer back into the ledger.
   */
  ref: z.string(),
})

const Translation = z.object({
  label: z.string(),
  helpText: z.string(),
  options: z.array(z.string()),
})

/** The question types a follow-up may use. Checked by vet(), not by the schema. */
export const ASKABLE_TYPES = [
  'text',
  'textarea',
  'yes_no',
  'yes_no_unsure',
  'select',
  'multiselect',
  'number',
  'date',
  'time',
  'currency',
] as const

/**
 * A question, and what it is for.
 *
 * Note what is NOT an enum here. `rung`, `type` and `resolves.kind` are all
 * closed sets, and all three are typed as loose values that vet() checks
 * afterwards. That is deliberate and it was learned the hard way: an enum in
 * the output schema is enforced by the provider, and a single value the model
 * spells differently fails the WHOLE call. Twenty good questions were lost to
 * one rung label. A closed set belongs in the checking, where a bad value
 * costs one question; in the schema it costs the run.
 */
export const FollowUp = z.object({
  /** Stable within the set, as 'fu01'. Becomes the portal question's id. */
  id: z.string(),
  /** The question, in English, at a sixth-grade reading level. */
  label: z.string(),
  /** One of ASKABLE_TYPES. */
  type: z.string(),
  options: z.array(z.string()),
  /** One sentence of help, or empty. Not a second question. */
  helpText: z.string(),
  /** The same question in the client's own language. Empty when they read English. */
  inTheirLanguage: Translation.nullable(),
  /** Which rung of the ladder this is, 1 to 10. */
  rung: z.number(),
  resolves: Resolves,
  /** What the office learns from the answer. Internal; never shown. */
  whyItMatters: z.string(),
  /**
   * The id of the question that must be answered first, and the answers that
   * make this one worth asking. Empty when it always applies.
   */
  askOnlyIf: z.object({ questionId: z.string(), answers: z.array(z.string()) }).nullable(),
})
export type FollowUp = z.infer<typeof FollowUp>

export const FollowUpSetShape = z.object({
  questions: z.array(FollowUp),
  /**
   * Gaps deliberately not asked about, and why.
   *
   * The corpus's stopping rule is that exhaustiveness means closing important
   * gaps, not putting every client through every question. What was left out
   * is therefore a finding, not an omission — and the office may disagree.
   */
  leftOut: z.array(z.object({ gap: z.string(), why: z.string() })),
})
export type FollowUpSet = z.infer<typeof FollowUpSetShape>

/**
 * The part of a question that is actually the question.
 *
 * A follow-up often opens by restating what the client said before — it has
 * to, on the contradiction rung — and that setup is not what she has to parse
 * to answer. The ask is the last sentence.
 */
export function askOf(label: string): string {
  const parts = label.split(/(?<=[.?!])\s+/).filter(p => p.trim())
  const last = parts[parts.length - 1] ?? label
  return last.trim() || label.trim()
}

/** Problems that keep a question away from a client. */
export function vet(q: FollowUp): string[] {
  const problems: string[] = []
  const say = (s: string) => s.toLowerCase()

  // The closed sets, checked here rather than in the output schema, so one
  // mislabelled question is one question and not the whole set.
  if (!Number.isInteger(q.rung) || q.rung < 1 || q.rung > 10) {
    problems.push(`${q.id} is on rung ${q.rung}, and the ladder has ten.`)
  }
  if (!(ASKABLE_TYPES as readonly string[]).includes(q.type)) {
    problems.push(`${q.id} is a "${q.type}", which the portal cannot render.`)
  }
  if (!(GAP_KINDS as readonly string[]).includes(q.resolves.kind)) {
    problems.push(`${q.id} says it closes a "${q.resolves.kind}", which is not a kind of gap.`)
  }
  if (!q.resolves.ref.trim()) {
    problems.push(`${q.id} does not say what it is for, so its answer cannot be filed.`)
  }

  for (const [term, instead] of Object.entries(JARGON)) {
    if (say(q.label).includes(term) || say(q.helpText).includes(term)) {
      problems.push(`"${q.label}" uses "${term}". Say: ${instead}`)
    }
  }
  // What is actually being asked is the last sentence. Everything before it is
  // setup, and rung 8 cannot do without setup — the corpus's own contradiction
  // template is "Earlier you said X; this sounds like Y. Which is closer?".
  // Measuring the whole label flagged every properly-written contradiction
  // check in the first real set, and the questions were fine.
  const ask = askOf(q.label)
  const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

  const marks = (q.label.match(/\?/g) ?? []).length
  if (marks > 1) problems.push(`"${ask}" asks more than one thing.`)

  // One idea per question — but a narrative prompt may name what to cover.
  // "Tell us about that day: what time you arrived, what you did first" is the
  // corpus's concrete-reconstruction rung, not a compound question.
  const narrative = q.type === 'textarea' || q.type === 'text'
  if (!narrative && /\b(what|who|when|where|how|why|which)\b.*\band\b.*\b(what|who|when|where|how|why|which)\b/i.test(ask)) {
    problems.push(`"${ask}" asks two things at once. Split it.`)
  }

  // Double negatives, in the question itself. Her own answer quoted back at
  // her may contain "do not" and that is not a defect — it is the point.
  if (/\b(not|never|n't)\b[^.?]*\b(not|never|without|unless|n't)\b/i.test(ask)) {
    problems.push(`"${ask}" is a double negative. Ask it the positive way.`)
  }

  if (words(ask) > 25) problems.push(`"${ask}" is too long to read once.`)
  // Sixty, because the longest legitimate question in the first real set was a
  // forty-nine-word contradiction check restating two of her answers, and the
  // rest were under forty.
  if (words(q.label) > 60) problems.push(`${q.id} is a paragraph, not a question.`)
  if (!q.label.trim()) problems.push(`${q.id} has no question in it.`)
  if ((q.type === 'select' || q.type === 'multiselect') && q.options.length < 2) {
    problems.push(`"${q.label}" is a choice with nothing to choose between.`)
  }
  // The safety valve, required by the corpus on anything but a yes/no.
  if (
    (q.type === 'select' || q.type === 'multiselect') &&
    !q.options.some(o => /not sure|don.t know|do not know|모르|no estoy segur|不确定/i.test(o))
  ) {
    problems.push(`"${q.label}" gives the client no way to say they do not know.`)
  }
  if (q.inTheirLanguage && !q.inTheirLanguage.label.trim()) {
    problems.push(`${q.id} has an empty translation, so the client would see nothing.`)
  }
  return problems
}

/** Every problem across a set, so the office reviews once rather than per question. */
export function vetAll(set: FollowUpSet): { id: string; problems: string[] }[] {
  return set.questions.map(q => ({ id: q.id, problems: vet(q) })).filter(r => r.problems.length)
}

/** What the portal renders, with the internal fields stripped. */
export function toQuestion(q: FollowUp, lang: Lang): Question {
  const out: Question = {
    id: q.id,
    label: q.label,
    // A type the portal does not know would render as nothing at all, so an
    // unrecognised one falls back to free text. vet() has already said so.
    type: ((ASKABLE_TYPES as readonly string[]).includes(q.type) ? q.type : 'textarea') as QuestionType,
    required: false,
  }
  if (q.options.length) out.options = q.options
  if (q.helpText.trim()) out.helpText = q.helpText
  if (q.askOnlyIf) {
    const [value, ...orValues] = q.askOnlyIf.answers
    out.showIf = { questionId: q.askOnlyIf.questionId, value, ...(orValues.length ? { orValues } : {}) }
  }
  if (q.inTheirLanguage && lang !== 'en') {
    const t = {
      label: q.inTheirLanguage.label,
      ...(q.inTheirLanguage.helpText.trim() ? { helpText: q.inTheirLanguage.helpText } : {}),
      ...(q.inTheirLanguage.options.length ? { options: q.inTheirLanguage.options } : {}),
    }
    if (lang === 'es') out.es = t
    if (lang === 'zh') out.zh = t
    if (lang === 'ko') out.ko = t
  }
  return out
}

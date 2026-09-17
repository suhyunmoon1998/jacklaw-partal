/**
 * Reads one client's answers against California wage-and-hour law.
 *
 * This is a reading aid for the office and nothing more. It does not decide
 * whether a claim exists, it is never shown to a client, and every figure it
 * produces is preliminary until a lawyer has been through it. What it is for is
 * the first hour of work on a new file: a hundred answers turned into "here is
 * what they described, here is the provision it runs into, here is the arithmetic,
 * and here is what we still have to ask them."
 *
 * Three rules are taken from the office's own damages methodology and enforced
 * in the prompt because they are what separates a useful reading from a
 * confident wrong one:
 *
 *   - A missing fact is named, never invented (Damages Source, sec. 1).
 *   - Every material figure shows its formula (sec. 19).
 *   - Fact, estimate, assumption and open legal question are labelled apart
 *     (sec. 24).
 *
 * The reading is done in parts rather than in one call — see the note on the
 * schemas below for why, and PASSES for how it is divided. The law text is
 * large and identical for every part and every client, so it is sent as a
 * cached prompt prefix: the first reading pays for it and the rest do not.
 */

import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { createHash } from 'crypto'
import { LAW_VERSION, LEGAL_SOURCE } from '@/lib/caLaw'
import { answersForReading } from '@/lib/modules'
import { staffFlags, FLAG_LABEL } from '@/lib/staffFlags'
import { AnswerValue } from '@/types'

export const ANALYSIS_MODEL = 'claude-opus-5'

/**
 * How a statement is being made. The office's methodology ends by requiring
 * exactly this separation, and it is the difference between a damages figure a
 * lawyer can stand behind in a demand letter and one they have to re-derive.
 */
const Basis = z.enum(['FACT', 'ESTIMATE', 'ASSUMPTION', 'CONFIRM'])
export type Basis = z.infer<typeof Basis>

const Strength = z.enum(['strong', 'moderate', 'weak', 'needs facts'])
export type Strength = z.infer<typeof Strength>

/** The categories the methodology says to analyse separately (sec. 3). */
const CATEGORIES = [
  'Unpaid straight time',
  'Off-the-clock work',
  'Overtime',
  'Double time',
  'Meal periods',
  'Rest periods',
  'Minimum wage',
  'Liquidated damages',
  'Waiting-time penalties',
  'Wage statements',
  'Expense reimbursement',
  'Piece rate',
  'Reporting time / split shift',
  'Seventh day of rest',
  'Retaliation',
  'Other',
] as const

const BaselineItem = z.object({
  label: z.string(),
  value: z.string(),
  basis: Basis,
})

const Issue = z.object({
  category: z.enum(CATEGORIES),
  /** One line a lawyer can read in the list without opening it. */
  headline: z.string(),
  /** The client's own answers that raise it, quoted or closely paraphrased. */
  because: z.array(z.string()),
  /** The provision, named. "Lab. Code sec. 512; Wage Order 5, sec. 11". */
  law: z.string(),
  /** How those facts meet that provision. */
  why: z.string(),
  strength: Strength,
  /** The formula, written out. Empty where the facts do not support one. */
  math: z.string(),
  /** What the formula comes to, or why it cannot be computed yet. */
  estimate: z.string(),
  basis: Basis,
  /** What has to be confirmed before this figure is relied on. */
  confirm: z.array(z.string()),
})
export type Issue = z.infer<typeof Issue>

/**
 * What one reading is made of, split into the calls that produce it.
 *
 * One call for all of this was five to six minutes of generation on a full
 * questionnaire — long enough that the SDK refuses it outright, long enough for
 * the connection to be dropped halfway through, and far too long to sit in
 * front of. The work divides cleanly, so it is divided: the employment baseline
 * first, then the damages categories read at the same time against that shared
 * baseline, then a short pass that totals what came back and checks it for
 * overlap. The law text is a cached prefix, so the parallel calls pay for it
 * once between them.
 */
const Overview = z.object({
  /**
   * What this person described, in plain English, as a colleague would tell it
   * to you. Employer, job, period, and what went wrong.
   */
  summary: z.string(),
  baseline: z.array(BaselineItem),
  /** Which parts of the claimed period fall inside which limitations period. */
  limitations: z.string(),
})

const Findings = z.object({
  issues: z.array(Issue),
  /** Categories considered and set aside, so the reader knows they were read. */
  notRaised: z.array(z.object({ category: z.enum(CATEGORIES), why: z.string() })),
})

const Assembly = z.object({
  /** sec. 20 — overlaps that must be resolved before anything is totalled. */
  doubleCounting: z.array(z.string()),
  /** sec. 22 — only what could materially change the result. */
  missingFacts: z.array(z.string()),
  /** What to ask this client, or the employer, next. */
  nextSteps: z.array(z.string()),
  /** sec. 17 — kept out of the employee's damages. */
  separateExposure: z.array(z.object({ label: z.string(), value: z.string(), note: z.string() })),
  /** sec. 23. Strings, so "not calculable" is a permitted answer. */
  totals: z.object({
    supported: z.string(),
    estimated: z.string(),
    potentialStatutory: z.string(),
    preliminaryTotal: z.string(),
  }),
  /** sec. 23 — one to three sentences on what drives the value of this case. */
  drivers: z.string(),
})

/** The whole reading, as the panel and the stored row see it. */
export type Analysis = z.infer<typeof Overview> &
  z.infer<typeof Findings> &
  z.infer<typeof Assembly>

export interface AnalysisInput {
  clientName: string
  caseType: string
  caseName: string
  answers: Record<string, AnswerValue>
  /** Titles only — the reading says what to look for in them, never their contents. */
  documents: string[]
}

const SYSTEM = `You are a California wage-and-hour analyst working inside a plaintiff-side
employment law office. You read one client's intake answers and report what those answers
run into under California law.

Your reader is a lawyer at the firm. Write for them: direct, specific, no throat-clearing,
no reassurance. Never address the client and never produce anything meant for the client
to read.

You are doing one part of a reading that is split across several. The instruction after this
one says which part. Stay inside it: another part covers what you were not given, and a
category answered twice is a case counted twice.

THE SOURCE BELOW GOVERNS. It is the office's own damages methodology followed by the
provisions it operates on. Follow the methodology's structure and its prohibitions exactly.

The rules that matter most, and that you will be judged on:

1. NEVER INVENT A FACT. If the answers do not establish the hourly rate, the hire date, the
   industry or the violation frequency, say it is missing. Do not supply a plausible number
   so that a formula can be completed. An analysis that says "rate unknown" is worth more
   here than one built on a guessed $20.

2. SHOW THE MATH. Every material figure carries its formula, written out the way the
   methodology's examples are: "4 days/week x 100 weeks x $20 = $8,000". A number with no
   formula behind it is incomplete.

3. LABEL THE BASIS. FACT is what the client actually stated. ESTIMATE is a figure you
   derived from what they stated, and you say from what. ASSUMPTION is something you
   supplied that they did not state — use it sparingly and always name it. CONFIRM is a
   legal question, rate, cap or allocation that has to be checked before it is relied on.

4. DO NOT ASSUME EVERY CATEGORY APPLIES. Set out only the ones these answers actually
   raise, and list the ones you considered and set aside in notRaised, with the reason. A
   category that the answers say nothing about goes in notRaised as "no facts either way",
   not into issues.

5. DO NOT DOUBLE COUNT. Before you total anything, run the overlap check: straight time
   against overtime, overtime against double time, off-the-clock against overtime, premiums
   against wages for work actually performed, individual damages against PAGA, wage
   statement damages against the underlying unpaid wages. Where an overlap is legally
   uncertain, put it in doubleCounting rather than silently adding both.

6. QUOTE THEM. Every issue names the answers that raise it, in the client's own terms, so
   the reader can disagree in one glance without opening the questionnaire.

7. WHERE THE ANSWERS ARE UNCERTAIN, give the low / most likely / high range in the math
   rather than presenting one uncertain figure as historical fact.

The client may have answered in Spanish, Chinese or Korean. Read those answers directly and
write your entire output in English.

The goal is not the largest possible number. It is the most accurate, supportable and
auditable reading these answers will carry.`

/** A stable fingerprint of what was analysed, so a cached reading knows when it is stale. */
export function analysisFingerprint(input: AnalysisInput): string {
  const h = createHash('sha256')
  h.update(LAW_VERSION)
  h.update(ANALYSIS_MODEL)
  h.update(input.clientName)
  h.update(input.caseType)
  h.update(input.caseName)
  h.update(input.documents.slice().sort().join('|'))
  for (const key of Object.keys(input.answers).sort()) {
    h.update(key)
    h.update(JSON.stringify(input.answers[key]))
  }
  return h.digest('hex').slice(0, 32)
}

const shown = (v: AnswerValue | undefined): string =>
  Array.isArray(v) ? v.join('; ') : String(v ?? '').trim()

/**
 * The answers as a person would read them: the question, then what was chosen.
 *
 * Built from the same reading the office's own Answers tab and PDF use, so the
 * analysis and the file agree — repeating wage-and-hour branches expanded, and
 * anything the client took back by changing an earlier answer left out.
 */
export function buildTranscript(input: AnalysisInput): { text: string; answered: number } {
  const { sections, filed } = answersForReading(input.answers)
  const lines: string[] = []
  let answered = 0

  for (const section of sections) {
    const rows: string[] = []
    for (const q of section.questions) {
      const value = shown(filed[q.id])
      if (!value) continue
      answered++
      rows.push(`- ${q.label}\n  ANSWER: ${value}`)
    }
    if (rows.length) lines.push(`## ${section.title}\n${rows.join('\n')}`)
  }

  return { text: lines.join('\n\n'), answered }
}

/** What the deterministic flags already noticed, so the model starts where staff would. */
function flagSummary(answers: Record<string, AnswerValue>): string {
  const { filed } = answersForReading(answers)
  const flags = staffFlags(filed)
  if (!flags.length) return 'None of the office\'s automatic flags fired on these answers.'
  return flags
    .map(f => `- ${FLAG_LABEL[f.flag]}\n${f.because.map(b => `    ${b}`).join('\n')}`)
    .join('\n')
}

export class NotEnoughAnswers extends Error {}

/**
 * The fewest answers worth spending a reading on.
 *
 * Below this there is nothing to read against the law: a client who has opened
 * the questionnaire and picked a language has a handful of rows and no facts.
 * The panel says so rather than returning a page of "missing".
 */
export const MIN_ANSWERS = 8

/**
 * The damages categories, divided into readings that can run at once.
 *
 * Divided by what has to be weighed together rather than evenly. Meal and rest
 * share a premium structure and a set of answers, and splitting them would have
 * one reading unable to see whether the other had already claimed a workday.
 * Time and pay have to be read as one because an off-the-clock minute may be an
 * overtime minute, and whichever reading sees it second has to know that.
 */
const PASSES: { key: string; title: string; categories: string[] }[] = [
  {
    key: 'time',
    title: 'Hours and pay',
    categories: [
      'Unpaid straight time',
      'Off-the-clock work',
      'Overtime',
      'Double time',
      'Minimum wage',
      'Reporting time / split shift',
      'Seventh day of rest',
      'Piece rate',
    ],
  },
  {
    key: 'breaks',
    title: 'Meal and rest periods',
    categories: ['Meal periods', 'Rest periods'],
  },
  {
    key: 'records',
    title: 'Pay records, separation, expenses and retaliation',
    categories: [
      'Wage statements',
      'Waiting-time penalties',
      'Liquidated damages',
      'Expense reimbursement',
      'Retaliation',
      'Other',
    ],
  },
]

/** The law, sent as a cached prefix so the parallel passes pay for it once. */
function systemBlocks(extra: string) {
  return [
    {
      type: 'text' as const,
      text: `${SYSTEM}\n\n=== GOVERNING SOURCE ===\n\n${LEGAL_SOURCE}`,
      cache_control: { type: 'ephemeral' as const },
    },
    { type: 'text' as const, text: extra },
  ]
}

async function ask<T>(
  client: Anthropic,
  what: string,
  schema: z.ZodType<T>,
  system: string,
  user: string
): Promise<T> {
  /**
   * Streamed, and not for the tokens — nothing here is shown as it arrives.
   * A reading is minutes of work, and a long request with nothing on the wire
   * is refused by the SDK and dropped by whatever sits between this and the
   * browser. Streaming keeps bytes moving; finalMessage() waits for the whole
   * parsed result.
   */
  const response = await client.messages
    .stream({
      model: ANALYSIS_MODEL,
      // Thinking is charged against this ceiling. At 16k a full questionnaire
      // was thought through and then ran out partway into the JSON, which the
      // SDK reports as an unparseable response — the whole call thrown away
      // for want of room to write the answer down.
      max_tokens: 24000,
      system: systemBlocks(system),
      thinking: { type: 'adaptive' },
      // The passes are narrow enough that the reasoning is bounded; 'high' on
      // the undivided job took six minutes and the office is waiting on this.
      output_config: { effort: 'medium', format: zodOutputFormat(schema) },
      messages: [{ role: 'user', content: user }],
    })
    .finalMessage()

  if (response.stop_reason === 'max_tokens') {
    throw new Error(`The ${what} reading ran out of room before it finished. Run it again.`)
  }
  if (response.stop_reason === 'refusal') {
    throw new Error(`The ${what} reading was declined. Read the answers directly.`)
  }
  const parsed = response.parsed_output
  if (!parsed) throw new Error(`The ${what} reading came back in a form we could not read.`)
  return parsed
}

/** The facts every pass is given, so they do not each invent their own baseline. */
function fileHeader(input: AnalysisInput, answered: number): string {
  return `CLIENT: ${input.clientName}
CASE: ${input.caseName || '(not recorded)'}
MARKED AS: ${input.caseType || '(not recorded)'}
DOCUMENTS ON FILE: ${input.documents.length ? input.documents.join(', ') : 'none'}
ANSWERS ON FILE: ${answered}`
}

/** An issue, small enough to hand to the pass that has to total them. */
const brief = (i: Issue) =>
  `[${i.category}] ${i.headline}\n  law: ${i.law}\n  strength: ${i.strength}\n  math: ${
    i.math || '(none)'
  }\n  estimate: ${i.estimate} (${i.basis})`

export async function analyzeCase(input: AnalysisInput): Promise<Analysis> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured, so a case cannot be analysed.')
  }

  const { text, answered } = buildTranscript(input)
  if (answered < MIN_ANSWERS) {
    throw new NotEnoughAnswers(
      `${input.clientName} has answered ${answered} question${answered === 1 ? '' : 's'}. ` +
        `There is not enough on file to read against the law yet.`
    )
  }

  const client = new Anthropic({ maxRetries: 2 })
  const header = fileHeader(input, answered)
  const answersBlock = `=== THE CLIENT'S ANSWERS ===\n\n${text}`

  // ── First, who they worked for and for how long ──────────────────────────
  // Everything else is multiplied by this, so it is settled once and handed to
  // the readings rather than derived three times over and three different ways.
  const overview = await ask(
    client,
    'baseline',
    Overview,
    `This pass establishes the employment baseline only. Do not analyse any damages category.

Give the baseline as the office's methodology asks for it (sec. 2 and sec. 21): employer,
role, work location, start and end dates, whether employment ended, rate or rates, days per
week, hours per day, approximate weeks worked, estimated workdays. One entry per line, each
labelled with its basis. Where the answers do not establish something, the value says so and
the basis is CONFIRM — never fill it in with something plausible.

Then state which parts of the claimed period fall inside which limitations period, and say so
in terms of the dates on file. If the dates are not established, say what is needed to fix them.`,
    `${header}\n\nThe office's automatic flags on these answers:\n${flagSummary(input.answers)}\n\n${answersBlock}`
  )

  const baselineBlock = `=== EMPLOYMENT BASELINE (established, use these figures) ===\n${overview.baseline
    .map(b => `${b.label}: ${b.value} [${b.basis}]`)
    .join('\n')}\n\nLIMITATIONS: ${overview.limitations}`

  // ── Then the categories, at the same time ────────────────────────────────
  const found = await Promise.all(
    PASSES.map(pass =>
      ask(
        client,
        pass.title.toLowerCase(),
        Findings,
        `This pass covers these categories ONLY:

${pass.categories.map(c => `- ${c}`).join('\n')}

Say nothing about any other category; another reading has those and duplicating them would
double-count the case. Every category in your list appears exactly once in your answer —
in issues where the answers raise it, and in notRaised where they do not, with the reason
("no facts either way" is a proper reason and a common one).

Use the employment baseline given below as established. Do not re-derive it and do not
substitute your own figures. Where a calculation needs a fact the baseline marks CONFIRM,
write the formula with the unknown named in it, put the figure it would need under confirm,
and label the estimate accordingly.`,
        `${header}\n\n${baselineBlock}\n\nThe office's automatic flags on these answers:\n${flagSummary(
          input.answers
        )}\n\n${answersBlock}`
      )
    )
  )

  const issues = found.flatMap(f => f.issues)
  const notRaised = found.flatMap(f => f.notRaised)

  // ── Then what they come to together ──────────────────────────────────────
  // Separate because no single category reading can run the overlap check: it
  // is precisely the question of what two of them have both claimed.
  const assembly = await ask(
    client,
    'total',
    Assembly,
    `This pass totals a reading that has already been done. The issues below were found by
separate readings of the same answers. You are not re-analysing them and you are not adding
categories; you are checking them against each other and adding them up.

Run the double-counting check at sec. 20 across everything below, and put every overlap you
find in doubleCounting rather than silently netting it off. Then give the totals in the
methodology's own terms (sec. 23), as strings — "not calculable from these answers" is a
correct answer where the facts do not support a figure, and is better than a number that
looks solid and is not. Keep PAGA, interest, fees and costs out of the total and put them in
separateExposure.

missingFacts is only what could materially change the result (sec. 22) — not everything
unknown. nextSteps is what the office does about it: what to ask this client, what to ask
the employer, what to pull from the documents.`,
    `${header}\n\n${baselineBlock}\n\n=== ISSUES FOUND (${issues.length}) ===\n\n${issues
      .map(brief)
      .join('\n\n')}\n\n=== CONSIDERED AND SET ASIDE ===\n${notRaised
      .map(n => `${n.category}: ${n.why}`)
      .join('\n')}`
  )

  return { ...overview, issues, notRaised, ...assembly }
}

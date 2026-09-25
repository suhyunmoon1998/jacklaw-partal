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
import { plainly } from '@/lib/modelErrors'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { createHash } from 'crypto'
import { LAW_VERSION, LEGAL_SOURCE } from '@/lib/caLaw'
import { answersForReading } from '@/lib/modules'
import { staffFlags, FLAG_LABEL } from '@/lib/staffFlags'
import {
  ANALYSIS_SHAPE_VERSION,
  Analysis,
  AnalysisInput,
  Findings,
  Outlook,
  Reconcile,
  Issue,
  Overview,
  STAGES,
  Stage,
  StoredAnalysis,
  mergeFindings,
} from '@/lib/caseAnalysisShape'
import { AnswerValue } from '@/types'

import { ANALYSIS_MODEL, thinkingFor } from '@/lib/models'

export { ANALYSIS_MODEL }


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
  h.update(String(ANALYSIS_SHAPE_VERSION))
  h.update(ANALYSIS_MODEL)
  h.update(input.clientName)
  h.update(input.caseType)
  h.update(input.caseName)
  h.update(input.documents.slice().sort().join('|'))
  for (const key of Object.keys(input.answers).sort()) {
    h.update(key)
    h.update(JSON.stringify(input.answers[key]))
  }
  // Only when there are any, so a client with no question sets keeps the
  // fingerprint their reading was stored under and is not marked stale for
  // nothing.
  for (const set of input.sets ?? []) {
    h.update(set.title)
    for (const r of set.rows) {
      h.update(r.id)
      h.update(r.answer)
    }
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

  // Asked later, and often to settle what the questionnaire left open or
  // contradictory, so the reading is told which answers came after which.
  const later = (input.sets ?? []).filter(s => s.rows.some(r => r.answer.trim()))
  if (later.length) {
    lines.push(LATER_ANSWERS)
    for (const set of later) {
      const rows = set.rows.filter(r => r.answer.trim()).map(r => `- ${r.label}\n  ANSWER: ${r.answer.trim()}`)
      answered += rows.length
      lines.push(`## ${set.title}\n${rows.join('\n')}`)
    }
  }

  return { text: lines.join('\n\n'), answered }
}

/** Put in front of the follow-up answers, so a correction is read as one. */
export const LATER_ANSWERS = `=== LATER ANSWERS — follow-up question sets ===
These were asked after the questionnaire above, usually to settle what it left open or
contradictory. Where one corrects or clarifies an earlier answer, it is the client's current
account: use it, and say that the earlier answer differed rather than silently dropping it.`

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
 * Divided first by what has to be weighed together. Meal and rest share a
 * premium structure and a set of answers, and splitting them would have one
 * reading unable to see whether the other had already claimed a workday. Hours
 * and pay have to be read as one because an off-the-clock minute may be an
 * overtime minute, and whichever reading sees it second has to know that.
 *
 * Then divided by how much each writes, because these run at the same time and
 * the longest one sets the clock. Measured on a real 184-answer file, the three
 * branches this started as wrote 10,900 / 9,700 / 16,100 characters — so a third
 * of the wait was one branch carrying six categories while another carried two.
 * Splitting that branch in half took the whole stage from 110 seconds to the
 * length of its longest remaining piece. Keep them even when adding a category.
 *
 * Liquidated damages sit with the hours because they are priced on the same
 * hours as the minimum wage. In the records branch they were counted again from
 * the answers: on DAYEON KIM's file the minimum wage was 16.8 hours and the
 * liquidated damages about 40, the same off-the-clock work counted twice two
 * different ways. Split shifts went the other way to keep the branches even —
 * the premium is one hour a day at the minimum wage and prices no hours worked.
 */
export const PASSES: { key: string; title: string; categories: string[] }[] = [
  {
    key: 'time',
    title: 'Hours and pay',
    categories: [
      'Unpaid straight time',
      'Off-the-clock work',
      'Overtime',
      'Double time',
      'Minimum wage',
      'Liquidated damages',
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
    title: 'Pay records and separation',
    categories: ['Wage statements', 'Waiting-time penalties', 'Reporting time / split shift'],
  },
  {
    key: 'expenses',
    title: 'Expenses and retaliation',
    categories: ['Expense reimbursement', 'Retaliation', 'Other'],
  },
]

/**
 * WHY THIS IS SLOW, AND WHAT DOES NOT FIX IT.
 *
 * A reading of a full questionnaire writes about 14,500 tokens — roughly ten
 * pages. Generation runs at 65-78 tokens a second and the first byte arrives in
 * under two seconds, so essentially all of the wait is writing, not thinking or
 * reading the law. Three things were measured against a real 184-answer file
 * and REJECTED; do not spend the afternoon rediscovering them:
 *
 *   effort: 'low'         Saved one second on the baseline stage (58s -> 57s)
 *                         and three on the totals (50s -> 47s). In exchange the
 *                         baseline got the three-year filing deadline wrong by
 *                         two years, dropped the 72-hours-notice question that
 *                         the whole waiting-time claim turns on, and stopped
 *                         recording the categories the answers ruled OUT. The
 *                         time here is output length, not reasoning depth.
 *
 *   caps on single fields Capping because/why/confirm made the output LONGER
 *                         (16,100 -> 17,600 chars). The text moved into math,
 *                         the one field left uncapped. Length pressure applied
 *                         field by field relocates prose; it does not remove it.
 *
 *   a budget per issue    A 1,200-character budget across all of an issue's
 *                         fields did cut it — 16,100 -> 8,800 chars, 110s ->
 *                         71s. It also made the reading start inventing. Under
 *                         the budget it printed the section 226(e) penalty as
 *                         $250 per pay period (it is not), put a dollar figure
 *                         on an hourly rate the client had said she did not
 *                         know, dropped the low/most-likely/high ranges, and
 *                         lost the no-averaging rule the liquidated-damages
 *                         theory rests on. Squeezed for room, it stops saying
 *                         "not established" and starts asserting. That is the
 *                         one failure this office cannot ship.
 *
 * What did work was never about writing less. It was about not writing it in a
 * queue: even the parallel branches so one is not carrying six categories while
 * another carries two, split the last stage's two unrelated jobs so they run at
 * once, and move the limitations analysis to the stage that knows what the
 * claims are. And show each stage the moment it lands — the office reads the
 * summary and the baseline while the categories are still being read, which is
 * the difference the office actually feels.
 *
 * One thing deliberately NOT split: minimum wage stays in the same branch as
 * off-the-clock work and overtime. Unpaid hours are recovered at the GREATER of
 * the contract rate or the minimum wage, never both, and a branch that cannot
 * see the hours it is pricing cannot apply that rule. Ten seconds is not worth
 * moving a load-bearing rule across a seam. Liquidated damages are the same
 * rule's other half, and stay with it for the same reason.
 */

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
  let response
  try {
    response = await client.messages
    .stream({
      model: ANALYSIS_MODEL,
      // Thinking is charged against this ceiling. At 16k a full questionnaire
      // was thought through and then ran out partway into the JSON, which the
      // SDK reports as an unparseable response — the whole call thrown away
      // for want of room to write the answer down.
      max_tokens: 24000,
      system: systemBlocks(system),
      thinking: thinkingFor(ANALYSIS_MODEL, 'medium', 24000).thinking,
      // The passes are narrow enough that the reasoning is bounded; 'high' on
      // the undivided job took six minutes and the office is waiting on this.
      output_config: { ...thinkingFor(ANALYSIS_MODEL, 'medium', 24000).effort, format: zodOutputFormat(schema) },
      messages: [{ role: 'user', content: user }],
    })
    .finalMessage()
  } catch (err) {
    throw plainly(err, what)
  }

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

function prepare(input: AnalysisInput) {
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
  return {
    client: new Anthropic({ maxRetries: 2 }),
    header: fileHeader(input, answered),
    answersBlock: `=== THE CLIENT'S ANSWERS ===\n\n${text}`,
    flags: `The office's automatic flags on these answers:\n${flagSummary(input.answers)}`,
  }
}

/** The figures every later stage is multiplied by, settled once. */
async function runBaseline(input: AnalysisInput) {
  const { client, header, answersBlock, flags } = prepare(input)
  return ask(
    client,
    'baseline',
    Overview,
    `This stage establishes the employment baseline only. Do not analyse any damages category.

Your summary is the first thing the reader sees about this case, so write it as a summary of
the CASE — who this person is, who they worked for, doing what, for how long, and what they
say went wrong, plus anything in the answers that contradicts itself. Never open by saying
what this stage does or does not cover: the reader sees one reading and does not know or care
that it was produced in parts.

Give the baseline as the office's methodology asks for it (sec. 2 and sec. 21): employer,
role, work location, start and end dates, whether employment ended, rate or rates, days per
week, hours per day, approximate weeks worked, estimated workdays. One entry per line, each
labelled with its basis. Where the answers do not establish something, the value says so and
the basis is CONFIRM — never fill it in with something plausible.

Do not leave a row out because its answer is "no". "Seventh day: none — she answers No to ever
working seven days in a row" is a fact the reader needs; silence on it is not.

Keep each value to at most two sentences. It is a baseline row, not an argument — the fact,
and if it is not established, what would establish it. Nothing else.

limitationsAnchor is THREE SENTENCES: which limitations windows are in play, what date anchors
them, and what is needed to pin that date down. Do not write the limitations analysis here —
a later stage does that, once the claims are known.`,
    `${header}\n\n${flags}\n\n${answersBlock}`
  )
}

const baselineBlock = (overview: z.infer<typeof Overview>) =>
  `=== EMPLOYMENT BASELINE (established, use these figures) ===\n${overview.baseline
    .map(b => `${b.label}: ${b.value} [${b.basis}]`)
    .join('\n')}\n\nLIMITATIONS ANCHOR: ${overview.limitationsAnchor}`

/** The categories, read at the same time against that shared baseline. */
async function runFindings(input: AnalysisInput, overview: z.infer<typeof Overview>) {
  const { client, header, answersBlock, flags } = prepare(input)
  const found = await Promise.all(
    PASSES.map(pass =>
      ask(
        client,
        pass.title.toLowerCase(),
        Findings,
        `This pass covers these categories ONLY:

${pass.categories.map(c => `- ${c}`).join('\n')}

Say nothing about any other category. Another reading has those, and duplicating them would
double-count the case. Do not list them in notRaised either — notRaised is for a category of
YOURS that these answers do not raise, with the reason ("no facts either way" is a proper
reason and a common one); it is not a place to note what you left to someone else. Never
mention the other readings; the reader sees one reading, not how it was divided.

Every category in your list appears exactly once in your answer: in issues where the answers
raise it, or in notRaised where they do not.

Use the employment baseline given below as established. Do not re-derive it and do not
substitute your own figures. Where a calculation needs a fact the baseline marks CONFIRM,
write the formula with the unknown named in it, put the figure it would need under confirm,
and label the estimate accordingly.`,
        `${header}\n\n${baselineBlock(overview)}\n\n${flags}\n\n${answersBlock}`
      )
    )
  )
  return mergeFindings(found)
}

/**
 * What they come to together.
 *
 * Separate from the category readings because no single one can run the overlap
 * check: it is precisely the question of what two of them have both claimed.
 *
 * Two calls at once rather than one. Reconciling the arithmetic and working out
 * what is still missing are different questions off the same input, and neither
 * needs the other's answer — as one call this wrote 12,900 characters and took
 * 71 seconds. Split, the stage is the longer half. Merged before it is stored,
 * so the reader sees one section either way.
 */
async function runAssembly(
  input: AnalysisInput,
  overview: z.infer<typeof Overview>,
  findings: z.infer<typeof Findings>
) {
  const { client, header } = prepare(input)
  const { issues, notRaised } = findings

  const shared = `${header}\n\n${baselineBlock(overview)}\n\n=== ISSUES FOUND (${
    issues.length
  }) ===\n\n${issues.map(brief).join('\n\n')}\n\n=== CONSIDERED AND SET ASIDE ===\n${notRaised
    .map(n => `${n.category}: ${n.why}`)
    .join('\n')}`

  const preamble = `This stage works on a reading that has already been done. The issues below were found
by separate readings of the same answers. You are not re-analysing them and you are not
adding categories.

Be brief and be selective. This is the page a lawyer reads before picking up the phone, and
a list of fifteen is a list nobody acts on.

Never shorten by becoming less careful. If a figure rests on a fact the client did not give,
say so and leave it in terms of the unknown — a wrong number stated briefly is the one thing
worse than a long answer.`

  const [reconcile, outlook] = await Promise.all([
    ask(
      client,
      'total',
      Reconcile,
      `${preamble}

Your half is the arithmetic. Check the issues against each other and add them up.

Run the double-counting check at sec. 20 across everything below, and put every overlap you
find in doubleCounting rather than silently netting it off. An entry saying two things do NOT
overlap is not an overlap — leave it out. At most 8.

Then give the totals in the methodology's own terms (sec. 23), as strings — "not calculable
from these answers" is a correct answer where the facts do not support a figure, and is
better than a number that looks solid and is not. At most four sentences each: the figure, or
what single fact would make it calculable. Do not restate the issues.

Keep PAGA, interest, fees and costs out of the total and put them in separateExposure, at
most 6. drivers is one to three sentences on what drives the value of this case.`,
      shared
    ),
    ask(
      client,
      'what is still open',
      Outlook,
      `${preamble}

Your half is what is still open.

limitations is the full analysis. Now that the claims are known, say which of THEM fall inside
which window, and cite the provision for each: Code Civ. Proc. sec. 338(a) for the three-year
statutory wage claims, Bus. & Prof. Code sec. 17200 for the four-year UCL restitution, Code
Civ. Proc. sec. 340(a) for the one-year penalties, Lab. Code sec. 203(b) for waiting-time
penalties running with the wages, and the PAGA period from the LWDA notice. Name the anchor
date you measured from and say it is assumed. If a date on file is doubtful, say what the
analysis becomes if the other reading of it is right.

missingFacts is only what could materially change the result (sec. 22) — not everything
unknown. At most 10, the one that blocks the most first.

nextSteps is what the office does about it: what to ask this client, what to ask the employer,
what to pull from the documents. At most 8, each one an instruction somebody can carry out
today.`,
      shared
    ),
  ])

  return { ...reconcile, ...outlook }
}

/**
 * Runs one stage and returns what is on file after it.
 *
 * Takes what has been stored so far rather than re-deriving it, so the three
 * requests build on each other without any of them repeating the work — or the
 * cost — of the one before.
 */
export async function runStage(
  input: AnalysisInput,
  stage: Stage,
  stored: StoredAnalysis
): Promise<StoredAnalysis> {
  if (stage === 'baseline') return { overview: await runBaseline(input) }

  if (!stored.overview) throw new Error('The baseline has not been read yet. Start again.')
  if (stage === 'findings') {
    return { ...stored, findings: await runFindings(input, stored.overview) }
  }

  if (!stored.findings) throw new Error('The categories have not been read yet. Start again.')
  return { ...stored, assembly: await runAssembly(input, stored.overview, stored.findings) }
}

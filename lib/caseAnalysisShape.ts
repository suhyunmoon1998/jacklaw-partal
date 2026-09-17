/**
 * The shape of a reading of one client's answers.
 *
 * Kept apart from the code that produces it because the admin panel renders
 * these types and walks these stages, and the producer reaches for the Anthropic
 * SDK, the file system and node's crypto. Importing one runtime value out of
 * that module pulled all of it into the browser bundle and the build stopped —
 * so the half the browser legitimately needs lives here, and depends on nothing
 * but zod.
 *
 * Nothing here is advice and none of it is shown to a client.
 */

import { z } from 'zod'
import { AnswerValue } from '@/types'

/**
 * How a statement is being made. The office's methodology ends by requiring
 * exactly this separation, and it is the difference between a damages figure a
 * lawyer can stand behind in a demand letter and one they have to re-derive.
 */
export const Basis = z.enum(['FACT', 'ESTIMATE', 'ASSUMPTION', 'CONFIRM'])
export type Basis = z.infer<typeof Basis>

export const Strength = z.enum(['strong', 'moderate', 'weak', 'needs facts'])
export type Strength = z.infer<typeof Strength>

/** The categories the methodology says to analyse separately (sec. 3). */
export const CATEGORIES = [
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

export const BaselineItem = z.object({
  label: z.string(),
  value: z.string(),
  basis: Basis,
})

export const Issue = z.object({
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
export const Overview = z.object({
  /**
   * What this person described, in plain English, as a colleague would tell it
   * to you. Employer, job, period, and what went wrong.
   */
  summary: z.string(),
  baseline: z.array(BaselineItem),
  /**
   * The dates the limitations analysis hangs on, in three sentences: which
   * windows are in play, what anchors them, and what is needed to fix them.
   *
   * Short on purpose. It exists so the category readings know whether the
   * period they are costing is inside a window; the analysis a lawyer reads is
   * produced at the end, where the claims are known. Written out in full here
   * as well, it was the single most expensive thing on the critical path and it
   * had to guess at claims that had not been found yet.
   */
  limitationsAnchor: z.string(),
})

export const Findings = z.object({
  issues: z.array(Issue),
  /** Categories considered and set aside, so the reader knows they were read. */
  notRaised: z.array(z.object({ category: z.enum(CATEGORIES), why: z.string() })),
})

/**
 * What the issues come to, once they exist — the arithmetic half.
 *
 * Split from Outlook below because the two answer different questions off the
 * same input and neither needs the other's answer. As one call the last stage
 * wrote 12,900 characters and took 71 seconds; as two running at once it is the
 * longer half. Nothing is dropped: both halves are merged back into Assembly.
 */
export const Reconcile = z.object({
  /** sec. 20 — overlaps that must be resolved before anything is totalled. */
  doubleCounting: z.array(z.string()),
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

/** What is still open — the half that says what the office does next. */
export const Outlook = z.object({
  /**
   * Which parts of the claimed period fall inside which limitations period.
   *
   * Here rather than with the baseline because it is only answerable once the
   * claims are known: a period is not "time-barred" in the abstract, it is
   * time-barred for a particular claim under a particular statute.
   */
  limitations: z.string(),
  /** sec. 22 — only what could materially change the result. */
  missingFacts: z.array(z.string()),
  /** What to ask this client, or the employer, next. */
  nextSteps: z.array(z.string()),
})

/** The two halves as they are stored and rendered — one stage to the reader. */
export const Assembly = Reconcile.merge(Outlook)

/** The whole reading, as the panel and the stored row see it. */
export type Analysis = z.infer<typeof Overview> &
  z.infer<typeof Findings> &
  z.infer<typeof Assembly>

/**
 * The reading, in the three stages it is run in.
 *
 * Not an implementation detail: the office's hosting caps a single request at
 * five minutes, and one undivided reading measured at four and a third. Rather
 * than sit a hair under a hard ceiling — where a file with one more issue than
 * this one simply fails after four minutes of work — each stage is its own
 * request, comfortably inside it, and the panel shows which one is running.
 *
 * They are ordered because they depend on each other: everything is multiplied
 * by the baseline, and the overlap check can only be run on findings that
 * already exist.
 */
export const STAGES = ['baseline', 'findings', 'assembly'] as const
export type Stage = (typeof STAGES)[number]

export const STAGE_LABEL: Record<Stage, string> = {
  baseline: 'Establishing the employment baseline',
  findings: 'Reading the damages categories',
  assembly: 'Totalling and checking for overlap',
}

/** What is on file so far. A reading is complete when all three are present. */
export interface StoredAnalysis {
  overview?: z.infer<typeof Overview>
  findings?: z.infer<typeof Findings>
  assembly?: z.infer<typeof Assembly>
}

/** The whole reading, or null while a stage is still outstanding. */
export function completed(stored: StoredAnalysis | null | undefined): Analysis | null {
  if (!stored?.overview || !stored.findings || !stored.assembly) return null
  return { ...stored.overview, ...stored.findings, ...stored.assembly }
}

/** The stage to run next, or null when there is nothing left. */
export function nextStage(stored: StoredAnalysis | null | undefined): Stage | null {
  if (!stored?.overview) return 'baseline'
  if (!stored.findings) return 'findings'
  if (!stored.assembly) return 'assembly'
  return null
}

/**
 * The category readings, joined back into one.
 *
 * Splitting the work is ours, and the reader should not have to see the seams.
 * A pass told to stay off another pass's categories will still sometimes write
 * them down to say it left them alone — "Overtime: assigned to another pass" —
 * which lands in the case file as a category that was set aside when in truth
 * another reading raised it. So the join is the guarantee rather than the
 * prompt: anything raised anywhere is not also listed as set aside, and a
 * category set aside by two passes is listed once.
 */
export function mergeFindings(parts: z.infer<typeof Findings>[]): z.infer<typeof Findings> {
  const issues = parts.flatMap(f => f.issues)
  const raised = new Set<string>(issues.map(i => i.category))
  const seen = new Set<string>()
  const notRaised = parts.flatMap(f => f.notRaised).filter(n => {
    if (raised.has(n.category) || seen.has(n.category)) return false
    seen.add(n.category)
    return true
  })
  return { issues, notRaised }
}

export interface AnalysisInput {
  clientName: string
  caseType: string
  caseName: string
  answers: Record<string, AnswerValue>
  /** Titles only — the reading says what to look for in them, never their contents. */
  documents: string[]
}

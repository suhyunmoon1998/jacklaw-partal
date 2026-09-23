/**
 * One document, in the order a lawyer reads a case.
 *
 * The office's analysis arrives in four panels stacked down a tab — the
 * damages reading, the fact ledger, the claims reading, the follow-up queue —
 * and each was built at a different time against a different half of the
 * problem. Everything the methodology asks for is already produced somewhere
 * in there. What was missing is a single sheet that puts it in one order, so
 * that reading a case is reading a document rather than reconciling four
 * panels and hoping they agree.
 *
 * ASSEMBLED, NOT GENERATED. Nothing here calls a model. Every sentence below
 * comes from a reading that already exists, and this file only decides what
 * goes where and what is missing. That is deliberate: a fifth model call would
 * be a fifth thing to be wrong, it would take another four minutes, and it
 * would paraphrase findings whose exact wording a lawyer may have to stand
 * behind. Composition cannot invent a claim the readings did not find.
 *
 * WHAT IT CANNOT DO YET. Section 7 asks for what changed since the last
 * reading. Readings are replaced rather than kept — a stale one is re-read
 * from the beginning, because stages read against different ledgers must not
 * be stitched together — so there is nothing to compare against. The section
 * says so rather than being left out.
 */

import { Analysis, Issue } from '@/lib/caseAnalysisShape'
import { Cited, SpineRecord } from '@/lib/evidenceSpine'

/** One claim as the claims reading produced it. */
export interface Finding {
  claimId: string
  standing: string
  elements: { key: string; state: string; reasoning: string; wouldSettleIt: string; facts?: string[] }[]
  adverse: string[]
  defense: string
  damagesInputs?: string[]
  damagesMissing?: string[]
}

export interface WageOrderChoice {
  proposal: { order: string; industry: string; businessIs: string; reliedOn: string; because: string }
  dlse: { entry: string; orders: string; agrees: boolean } | null
  caveat: string
}

export interface SpineReading {
  events?: { id?: string; when?: string; what?: string }[]
  coreStory?: Cited[]
  records?: SpineRecord[]
  restingOnTestimonyAlone?: Cited[]
  anomalies?: { what?: string }[]
  dateConflicts?: { what?: string }[]
}

export interface BriefInput {
  clientName: string
  caseType: string
  /** The damages reading. Null when it has not been run. */
  analysis: Analysis | null
  /** The claims reading. */
  findings: Finding[]
  wageOrder: WageOrderChoice | null
  spine: SpineReading | null
  /** Questions written and waiting for somebody to approve them. */
  pendingQuestions: { text: string; why?: string }[]
  factCount: number
  readOn: string | null
  /** The facts moved since the readings were taken. */
  stale: boolean
  /** Readings whose own model or wage order moved since. */
  staleStages: string[]
}

/** A heading with the things under it, or a stated reason there are none. */
export interface BriefSection {
  key: SectionKey
  title: string
  /** Shown when the section has nothing — never left blank. */
  absent: string | null
}

export const SECTION_ORDER = [
  'overview',
  'facts',
  'claims',
  'strengths',
  'damages',
  'questions',
  'review',
] as const
export type SectionKey = (typeof SECTION_ORDER)[number]

export const SECTION_TITLE: Record<SectionKey, string> = {
  overview: 'Case overview',
  facts: 'Material facts and chronology',
  claims: 'Claim-by-claim assessment',
  strengths: 'Strengths, weaknesses and anticipated defenses',
  damages: 'Damages and missing inputs',
  questions: 'Priority questions and evidence requests',
  review: 'Attorney review, and what changed',
}

/**
 * Something the office has to decide, which this system must not.
 *
 * The methodology separates routine factual organisation from consequential
 * legal judgement, and the separation is only real if the judgements are
 * collected somewhere a person will see them.
 */
export interface ReviewItem {
  what: string
  why: string
  /** Where it came from, so the reader can go and look. */
  from: string
}

export interface Brief {
  clientName: string
  caseType: string
  factCount: number
  readOn: string | null
  /** Sections with nothing in them, and why — so the reader is never guessing. */
  absent: BriefSection[]
  overview: { summary: string; baseline: { label: string; value: string; basis: string }[] }
  chronology: { events: { when: string; what: string }[]; coreStory: Cited[]; conflicts: string[] }
  claims: Finding[]
  wageOrder: WageOrderChoice | null
  strengths: string[]
  weaknesses: string[]
  defenses: { claimId: string; defense: string }[]
  damages: {
    issues: Issue[]
    totals: Analysis['totals'] | null
    drivers: string
    doubleCounting: string[]
    missingInputs: string[]
  }
  questions: { text: string; why?: string }[]
  evidence: SpineRecord[]
  review: ReviewItem[]
  /** Null until readings are kept rather than replaced — see the file comment. */
  changes: string | null
}

const has = <T,>(xs: T[] | undefined | null): xs is T[] => Array.isArray(xs) && xs.length > 0

/**
 * Where one claim's assessment lands, for the strengths section.
 *
 * The claims reading writes `standing` as free text, so this reads it rather
 * than switching on an enum that does not exist. Anything it cannot place
 * counts as neither a strength nor a weakness, which is the honest answer.
 */
export function readsAsStrong(standing: string): boolean {
  const s = standing.toLowerCase()
  return s.includes('support') && !s.includes('not support') && !s.includes('unsupport')
}

export function readsAsWeak(standing: string): boolean {
  const s = standing.toLowerCase()
  return (
    s.includes('contradict') ||
    s.includes('not support') ||
    s.includes('unsupport') ||
    s.includes('insufficient')
  )
}

/**
 * Everything a lawyer must decide rather than be told.
 *
 * Collected from wherever the readings flagged it: the wage order is proposed
 * and not settled, a reading taken against facts that have since moved is a
 * right answer with a wrong date on it, and an element the evidence spine says
 * rests on the client's word alone is a proof problem before it is a legal one.
 */
export function reviewItems(input: BriefInput): ReviewItem[] {
  const items: ReviewItem[] = []

  if (input.wageOrder) {
    items.push({
      what: `Wage Order ${input.wageOrder.proposal.order} — ${input.wageOrder.proposal.industry}`,
      why:
        input.wageOrder.dlse && !input.wageOrder.dlse.agrees
          ? "The DLSE's own classification of this business points elsewhere. Every rest-period and hours finding below depends on which one governs."
          : 'Proposed by this reading, not settled. Every rest-period and hours finding below depends on it.',
      from: 'Wage order reading',
    })
  }

  if (input.stale) {
    items.push({
      what: 'The facts have moved since this was read',
      why: 'What follows was true of the facts it was read against. Read again before relying on it.',
      from: 'Fact ledger',
    })
  }

  for (const stage of input.staleStages) {
    items.push({
      what: `"${stage}" would be read differently now`,
      why: 'The model changed, or the wage order it was read under did.',
      from: 'Claims reading',
    })
  }

  if (has(input.spine?.restingOnTestimonyAlone)) {
    items.push({
      what: 'Parts of this case rest on the client’s word alone',
      why: 'No record corroborates them yet. Listed under evidence requests below.',
      from: 'Evidence spine',
    })
  }

  return items
}

/** The whole thing, from readings that already exist. */
export function buildBrief(input: BriefInput): Brief {
  const a = input.analysis
  const absent: BriefSection[] = []
  const note = (key: SectionKey, why: string) =>
    absent.push({ key, title: SECTION_TITLE[key], absent: why })

  if (!a) note('damages', 'The damages reading has not been run for this client yet.')
  if (!has(input.findings)) note('claims', 'The claims reading has not been run for this client yet.')
  if (!input.spine) note('facts', 'The chronology has not been built yet.')
  if (!has(input.pendingQuestions)) {
    note('questions', 'No round of follow-up questions is waiting for approval.')
  }

  const strengths: string[] = []
  const weaknesses: string[] = []
  const defenses: { claimId: string; defense: string }[] = []

  for (const f of input.findings) {
    if (readsAsStrong(f.standing)) strengths.push(`${f.claimId} — ${f.standing}`)
    if (readsAsWeak(f.standing)) weaknesses.push(`${f.claimId} — ${f.standing}`)
    if (f.defense) defenses.push({ claimId: f.claimId, defense: f.defense })
    // An adverse fact is a weakness whatever the claim's overall standing is:
    // a supported claim with a bad fact under it still has the bad fact.
    for (const adverse of f.adverse) weaknesses.push(`${f.claimId} — ${adverse}`)
  }

  const missingInputs = [
    ...(a?.missingFacts ?? []),
    ...input.findings.flatMap(f => f.damagesMissing ?? []),
    // What each category's own reading says it still needs before its figure
    // can be relied on — the methodology's "label assumptions" requirement.
    ...(a?.issues ?? []).flatMap(i => i.confirm),
  ]

  return {
    clientName: input.clientName,
    caseType: input.caseType,
    factCount: input.factCount,
    readOn: input.readOn,
    absent,
    overview: {
      summary: a?.summary ?? '',
      baseline: a?.baseline ?? [],
    },
    chronology: {
      events: (input.spine?.events ?? []).map(e => ({ when: e.when ?? '', what: e.what ?? '' })),
      coreStory: input.spine?.coreStory ?? [],
      conflicts: [
        ...(input.spine?.dateConflicts ?? []).map(c => c.what ?? '').filter(Boolean),
        ...(input.spine?.anomalies ?? []).map(c => c.what ?? '').filter(Boolean),
      ],
    },
    claims: input.findings,
    wageOrder: input.wageOrder,
    strengths,
    weaknesses,
    defenses,
    damages: {
      issues: a?.issues ?? [],
      totals: a?.totals ?? null,
      drivers: a?.drivers ?? '',
      doubleCounting: a?.doubleCounting ?? [],
      missingInputs: Array.from(new Set(missingInputs)),
    },
    questions: input.pendingQuestions,
    // Only what the office does not already hold: a list that includes the
    // documents already in the file is a list nobody acts on.
    evidence: (input.spine?.records ?? []).filter(r => !r.inHand),
    review: reviewItems(input),
    changes: null,
  }
}

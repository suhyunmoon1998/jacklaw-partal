/**
 * What a drafted brief section is, split from the engine so the sheets can hold it.
 *
 * The sheets assemble; they never write. Four parts of the firm's templates
 * cannot be assembled, because they are prose a reader is meant to be
 * persuaded or oriented by: the trial brief's introduction (I), its summary of
 * facts (IV) and its conclusion (XII), and the factual brief's final factual
 * summary (XI). Those are drafted by a model — and only drafted.
 *
 * A DRAFT IS A SET OF CLAIMS ABOUT THE FILE, EACH ONE CHECKABLE. Every sentence
 * carries the fact ids it rests on and the authority keys it states law from,
 * and lib/briefDraft.ts checks each of them against the ledger and the library
 * after the model is done. A sentence that cites a fact the client never gave,
 * a provision the portal does not hold, or a figure the damages reading never
 * produced is shown struck through with the reason, not quietly kept.
 *
 * The rule the whole portal rests on still holds: the model is never asked what
 * the law says. It is handed the claims reading, which was read against quoted
 * text, and the quoted text itself, and may restate only what it was handed.
 *
 * Closed sets are checked, not put in the output schema — a provider enforces a
 * schema all-or-nothing, and one stray section key would cost the whole draft.
 */

import { z } from 'zod'

export const DraftSentence = z.object({
  /** The sentence as it would appear in the brief. */
  text: z.string(),
  /** Bare fact ids from the ledger ('f069') that this sentence rests on. */
  facts: z.array(z.string()),
  /** Authority keys exactly as given ('LAB 226.7', 'IWC 5 sec 11', 'CACI 2702') or holding ids. */
  authority: z.array(z.string()),
  /** True when the sentence draws an inference rather than reports what a fact says. */
  inference: z.boolean(),
})
export type DraftSentence = z.infer<typeof DraftSentence>

export const DraftOutput = z.object({
  sections: z.array(
    z.object({
      key: z.string(),
      paragraphs: z.array(z.object({ sentences: z.array(DraftSentence) })),
    })
  ),
  /** Sections the model declined to write, and why — e.g. nothing supported to conclude. */
  notWritten: z.array(z.object({ key: z.string(), why: z.string() })),
})
export type DraftOutput = z.infer<typeof DraftOutput>

/** The four parts drafted, keyed to the template section they fill. */
export const DRAFT_SECTIONS = {
  'trial-intro': { template: 'Trial Brief Template 1.0', n: 'I', title: 'Introduction — The Case in Its Strongest Form' },
  'trial-facts': { template: 'Trial Brief Template 1.0', n: 'IV', title: 'Brief Summary of Facts and Evidence' },
  'trial-conclusion': { template: 'Trial Brief Template 1.0', n: 'XII', title: 'Conclusion — The Sequence to Remember' },
  'factual-summary': { template: 'Factual Brief Template 1.0', n: 'XI', title: 'Final Factual Summary' },
} as const
export type DraftKey = keyof typeof DRAFT_SECTIONS
export const DRAFT_KEYS = Object.keys(DRAFT_SECTIONS) as DraftKey[]

/** Drafted and kept separately: the trial sections from the case brief, XI from the factual sheet. */
export type DraftKind = 'trial' | 'factual'
export const KEYS_OF: Record<DraftKind, DraftKey[]> = {
  trial: ['trial-intro', 'trial-facts', 'trial-conclusion'],
  factual: ['factual-summary'],
}

/** A sentence after checking: the same sentence, and what is wrong with it. */
export interface CheckedSentence extends DraftSentence {
  /** Empty when every fact, authority and figure it names is on file. */
  problems: string[]
}

export interface CheckedSection {
  key: string
  paragraphs: { sentences: CheckedSentence[] }[]
}

/** What is stored and shown. */
export interface StoredDraft {
  kind: DraftKind
  sections: CheckedSection[]
  notWritten: { key: string; why: string }[]
  /** A digest of exactly what the call was handed (lib/briefDraft draftBasis). */
  basis: string
  model: string
  writtenAt: string
  /** Sentences written, and how many carry a problem. */
  counts: { sentences: number; flagged: number }
}

/** The drafted part for one template section, if there is one. */
export function draftFor(draft: StoredDraft | null | undefined, key: DraftKey): CheckedSection | null {
  return draft?.sections.find(s => s.key === key) ?? null
}

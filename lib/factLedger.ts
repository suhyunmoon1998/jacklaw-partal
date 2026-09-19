/**
 * The atomic facts a case is built from.
 *
 * The office's corpus puts this first, and the reason is worth stating: a case
 * record made of summaries cannot be corrected. When a client's later answer
 * contradicts an earlier one, or a paystub arrives that settles a date, a
 * summary has to be rewritten by hand and the old version is simply gone. A
 * ledger of atomic facts can absorb the new information — the fact that changed
 * is marked, the one that superseded it points back, and every place that fact
 * appeared updates with it.
 *
 * Two rules from the corpus are structural here rather than advisory:
 *
 *   The client's exact words are kept alongside the normalized proposition.
 *   Exact language is evidence; the normalized form is the reusable litigation
 *   object. The normalized one never erases the original (corpus sec. 3).
 *
 *   Provenance is mandatory. Every proposition says where it came from and
 *   whether it is direct, documentary, testimonial, inferred or disputed
 *   (corpus sec. 1). A fact with no source cannot enter the ledger.
 *
 * Nothing here is shown to a client.
 */

import { z } from 'zod'

/**
 * How well established a fact is.
 *
 * The corpus's five, unchanged. CONFIRMED is not "we believe it" — it is
 * corroborated by something other than the client's own account.
 */
export const FactStatus = z.enum([
  /** Corroborated by a record, a document, or an independent source. */
  'CONFIRMED',
  /** The client said it. True until something contradicts it, and no more. */
  'REPORTED',
  /** Derived from other facts. The derivation is stated in confidenceBasis. */
  'INFERRED',
  /** Two sources disagree, or the client's own answers do. Both are kept. */
  'DISPUTED',
  /** The question was asked and the answer was "I don't know". */
  'UNKNOWN',
])
export type FactStatus = z.infer<typeof FactStatus>

/** Where a proposition's confidence comes from. */
export const ConfidenceBasis = z.enum([
  'exact record',
  'client memory',
  'estimate',
  'reconstructed range',
  'third-party corroboration',
  'inference',
])

/**
 * Where a fact came from, precisely enough to go back to.
 *
 * "The client said so" is not provenance. Which question, in which module, on
 * which date — that is what lets a reader check the fact rather than trust it.
 */
export const Provenance = z.object({
  /** 'portal answer', 'document', 'interview', 'payroll record', … */
  kind: z.string(),
  /** The question id, document name, or other handle the office can open. */
  pinpoint: z.string(),
  /** When the source was created or given, where known. */
  on: z.string(),
})

export const FactNugget = z.object({
  /** Stable within a client's ledger. Referred to from everywhere else. */
  id: z.string(),
  /** One concise factual statement, normalized for reuse. */
  proposition: z.string(),
  /**
   * The client's own words, untouched.
   *
   * Kept in whatever language they answered in. A Korean client's account of
   * what a manager said is evidence in Korean; translating it into the ledger
   * would quietly turn testimony into paraphrase.
   */
  verbatim: z.string(),
  provenance: Provenance,
  /** Exact date, a range, a recurring period, or empty when unknown. */
  period: z.string(),
  /** Who did it, who saw it, and where. */
  actors: z.array(z.string()),
  location: z.string(),
  status: FactStatus,
  confidenceBasis: ConfidenceBasis,
  /** Other answers, documents or witnesses that support it. */
  corroboration: z.array(z.string()),
  /**
   * The best known thing that cuts the other way.
   *
   * Required by the corpus and kept in the fact itself, not in a separate file:
   * a record that hides its own weaknesses is one the other side gets to
   * introduce first.
   */
  contrary: z.string(),
  /** Claims, elements, defenses or limitations this fact bears on. */
  legalTags: z.array(z.string()),
  /** Rate, hours, frequency, weeks, period — the inputs a damages figure needs. */
  damagesTags: z.array(z.string()),
  /** The exact missing fact this one points at, and where to get it. */
  openLoop: z.string(),
})
export type FactNugget = z.infer<typeof FactNugget>

/**
 * The ledger for one client, and how it changes.
 *
 * Facts are never edited in place. A correction adds a new fact and marks the
 * old one superseded, so "what did we believe, and when" stays answerable —
 * which is the corpus's rule that new information never silently overwrites
 * history (sec. 1).
 */
export const LedgerEntry = FactNugget.extend({
  /** The reading that produced it, so a fact can be traced to its pass. */
  addedBy: z.string(),
  /** Set when a later fact replaced this one. */
  supersededBy: z.string().nullable(),
  /** Why it was replaced, in a sentence. */
  supersededWhy: z.string().nullable(),
})
export type LedgerEntry = z.infer<typeof LedgerEntry>

/** The facts that currently stand, in the order they were established. */
export function standing(entries: LedgerEntry[]): LedgerEntry[] {
  return entries.filter(e => !e.supersededBy)
}

/** Everything a claim's elements might be proved with. */
export function taggedWith(entries: LedgerEntry[], tag: string): LedgerEntry[] {
  const want = tag.toLowerCase()
  return standing(entries).filter(e =>
    e.legalTags.some(t => t.toLowerCase() === want)
  )
}

/**
 * Facts the office cannot yet rely on, worst first.
 *
 * DISPUTED before UNKNOWN before REPORTED: a contradiction inside the client's
 * own answers is more urgent than a gap, because it will be found by the other
 * side and it costs the client credibility rather than a number.
 */
const NEEDS_WORK: FactStatus[] = ['DISPUTED', 'UNKNOWN', 'REPORTED']
export function unsettled(entries: LedgerEntry[]): LedgerEntry[] {
  return standing(entries)
    .filter(e => NEEDS_WORK.includes(e.status))
    .sort((a, b) => NEEDS_WORK.indexOf(a.status) - NEEDS_WORK.indexOf(b.status))
}

/** What the office still has to go and get. */
export function openLoops(entries: LedgerEntry[]): { factId: string; need: string }[] {
  return standing(entries)
    .filter(e => e.openLoop.trim())
    .map(e => ({ factId: e.id, need: e.openLoop }))
}

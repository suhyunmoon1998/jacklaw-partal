/**
 * What the office is handed when a client answers: the corpus's sec. 17
 * package, in the terms the prompt standard asks for.
 *
 * Three things were missing from what the portal returned, and each is a
 * different kind of omission.
 *
 * THE DIGEST (17.A) is what the client newly said, in plain language and
 * without legal conclusions. An office that has to read a claim analysis to
 * find out what somebody told them has been handed the wrong thing first.
 *
 * THE EVIDENCE STATUS MAP (prompt standard 3.D) is the ledger's own five
 * statuses said in the vocabulary the firm's standard uses. They are the same
 * five ideas and it is not worth migrating 204 rows to rename them; it is
 * worth saying them the way the standard says them.
 *
 * THE DAMAGES ASSUMPTION LOG (3.E, corpus sec. 12) separates what is sourced
 * from what is assumed, and — the part that matters — names the record that
 * would replace each assumption. "Estimated" is not a disclosure; "estimated,
 * and the pay stubs would settle it" is.
 */

import { LedgerFact } from '@/lib/factualBrief'

/** The standard's five labels. The ledger's five ideas, said its way. */
export type EvidenceStatus =
  | 'ESTABLISHED'
  | 'SUPPORTED'
  | 'PARTY CONTENTION / TESTIMONY'
  | 'DISPUTED'
  | 'UNKNOWN / REQUIRES FOUNDATION'

/**
 * A ledger status in the standard's terms.
 *
 * CONFIRMED means corroborated by something other than her account, which is
 * what ESTABLISHED means. A REPORTED fact that something corroborates is
 * SUPPORTED; one that nothing does is her contention and is labelled as such,
 * because the difference decides whether it can be stated as fact.
 */
export function evidenceStatus(f: LedgerFact): EvidenceStatus {
  const s = f.status.toUpperCase()
  if (s === 'DISPUTED') return 'DISPUTED'
  if (s === 'UNKNOWN') return 'UNKNOWN / REQUIRES FOUNDATION'
  if (s === 'CONFIRMED') return 'ESTABLISHED'
  if ((f.corroboration?.length ?? 0) > 0) return 'SUPPORTED'
  // INFERRED included: an inference is not a confirmed fact, and the corpus
  // requires it labelled rather than promoted.
  return 'PARTY CONTENTION / TESTIMONY'
}

export interface StatusCount {
  status: EvidenceStatus
  count: number
}

export const ORDER: EvidenceStatus[] = [
  'ESTABLISHED',
  'SUPPORTED',
  'PARTY CONTENTION / TESTIMONY',
  'DISPUTED',
  'UNKNOWN / REQUIRES FOUNDATION',
]

export function evidenceStatusMap(ledger: LedgerFact[]): StatusCount[] {
  const counts = new Map<EvidenceStatus, number>(ORDER.map(s => [s, 0]))
  for (const f of ledger) {
    const s = evidenceStatus(f)
    counts.set(s, (counts.get(s) ?? 0) + 1)
  }
  return ORDER.map(status => ({ status, count: counts.get(status) ?? 0 }))
}

export interface AssumptionEntry {
  /** rate · hours per day · weeks worked · frequency · period · final pay date */
  input: string
  /** Where the present value comes from. */
  basis: 'sourced' | 'client testimony' | 'estimate' | 'not established'
  /** The facts standing behind it. */
  facts: { id: string; proposition: string; status: string }[]
  /** The record that would replace the assumption. Empty when none was named. */
  wouldReplace: string
}

/**
 * The damages assumption log.
 *
 * Every input the ledger tags, what its present value rests on, and the record
 * that would settle it — taken from the open loop the extraction already wrote
 * against each fact rather than guessed at here.
 */
export function assumptionLog(ledger: LedgerFact[]): AssumptionEntry[] {
  const byInput = new Map<string, AssumptionEntry>()

  for (const f of ledger) {
    for (const tag of f.damagesTags ?? []) {
      const entry =
        byInput.get(tag) ??
        ({ input: tag, basis: 'not established', facts: [], wouldReplace: '' } as AssumptionEntry)

      entry.facts.push({
        id: f.id.replace(/\bclient-\d+:/g, ''),
        proposition: f.proposition,
        status: f.status,
      })

      const s = f.status.toUpperCase()
      // The strongest basis on file wins: one corroborated fact makes the
      // input sourced however many "I don't know" answers sit beside it.
      if (s === 'CONFIRMED' || (f.corroboration?.length ?? 0) > 0) entry.basis = 'sourced'
      else if (s === 'REPORTED' && entry.basis !== 'sourced') entry.basis = 'client testimony'
      else if (s === 'INFERRED' && entry.basis === 'not established') entry.basis = 'estimate'

      if (!entry.wouldReplace && f.openLoop?.trim()) entry.wouldReplace = f.openLoop.trim()
      byInput.set(tag, entry)
    }
  }

  return Array.from(byInput.values()).sort((a, b) => a.input.localeCompare(b.input))
}

export interface DigestLine {
  /** Which part of the intake it came from. */
  where: string
  /** What she said, in her words where the office can read them. */
  said: string
}

/**
 * What the client newly said, in plain language.
 *
 * Her own words, not the office's proposition and not a legal conclusion —
 * the corpus says the digest carries neither. English where she answered in
 * another language, because the office reads its files in English.
 */
export function submissionDigest(ledger: LedgerFact[], limit = 20): DigestLine[] {
  return ledger
    .filter(f => (f.verbatimEnglish || f.verbatim || '').trim())
    .slice(0, limit)
    .map(f => ({
      where: f.provenance.pinpoint,
      said: f.verbatimEnglish || f.verbatim,
    }))
}

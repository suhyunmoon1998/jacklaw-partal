/**
 * Answers that arrive after the facts were read, and what they change.
 *
 * The office reads a client's answers into the ledger, reads the case, and
 * sends follow-up questions to settle what the reading could not. The answers
 * to those questions had no way back in. The only door was "read the answers
 * again", which renumbers every fact and throws away the reading. So DAYEON
 * KIM's twenty follow-up answers sat outside the ledger. They included the
 * restaurant's street address, which the claims reading then reported as
 * unknown. They also included her correction of the one answer the defense
 * would most like to quote.
 *
 * Here the new answers are read on their own and added under new ids. Where
 * one corrects or settles a fact already on file, the old fact is marked
 * superseded with the reason, and never edited or deleted. That is the
 * ledger's own rule (lib/factLedger.ts): a correction adds a fact, and what
 * was believed before stays answerable.
 *
 * This file is the part that needs no model: which answers are new, how the
 * new facts are numbered, and whether a proposed supersession points at
 * anything real.
 */

import { LedgerEntry, standing } from '@/lib/factLedger'

/** A question set's answered rows, as the extraction reads them. */
export interface SetRows {
  title: string
  rows: { id: string; label: string; answer: string }[]
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Whether a fact on file already came from this question.
 *
 * Read off the provenance, which the extraction is required to fill with the
 * question's id or its text. The id has to match whole: `q1` must not claim
 * `q10`'s answer as read.
 */
function cited(ledger: LedgerEntry[], row: { id: string; label: string }): boolean {
  const id = new RegExp(`(^|[^A-Za-z0-9_])${escape(row.id)}([^A-Za-z0-9_]|$)`)
  const label = row.label.trim().toLowerCase()
  return ledger.some(e => {
    const pin = e.provenance?.pinpoint ?? ''
    return id.test(pin) || (label.length > 12 && pin.toLowerCase().includes(label))
  })
}

/**
 * The answered rows no fact on file came from, set by set.
 *
 * Every entry counts, superseded ones included, because an answer read once is
 * read, whatever later replaced the fact it produced.
 */
export function unreadRows(ledger: LedgerEntry[], sets: SetRows[]): SetRows[] {
  return sets
    .map(s => ({ ...s, rows: s.rows.filter(r => r.answer.trim() && !cited(ledger, r)) }))
    .filter(s => s.rows.length > 0)
}

/** The number after the highest `fNNN` on file, so new ids never reuse an old one. */
export function nextFactNumber(ledger: LedgerEntry[]): number {
  let max = 0
  for (const e of ledger) {
    const m = /:f(\d+)$|^f(\d+)$/.exec(e.id)
    if (m) max = Math.max(max, Number(m[1] ?? m[2]))
  }
  return max + 1
}

export interface Supersession {
  oldId: string
  newId: string
  why: string
}

/**
 * Keeps only supersessions that point at something real.
 *
 * The model proposes them, and code decides whether they stand. The old fact
 * must be on file and still standing. The new fact must be one this pass
 * added. There must be a reason. A fact is replaced once: a second proposal
 * for the same fact is set aside, not allowed to overwrite the first reason.
 * Ids are accepted bare (`f012`) or namespaced, and returned namespaced.
 */
export function checkSupersessions(
  proposed: Supersession[],
  ledger: LedgerEntry[],
  added: LedgerEntry[],
  clientId: string
): { kept: Supersession[]; setAside: { proposed: Supersession; why: string }[] } {
  const full = (id: string) => (id.includes(':') ? id.trim() : `${clientId}:${id.trim()}`)
  const standingIds = new Set(standing(ledger).map(e => e.id))
  const allIds = new Set(ledger.map(e => e.id))
  const addedIds = new Set(added.map(e => e.id))
  const kept: Supersession[] = []
  const setAside: { proposed: Supersession; why: string }[] = []
  const taken = new Set<string>()

  for (const p of proposed) {
    const oldId = full(p.oldId)
    const newId = full(p.newId)
    const refuse = (why: string) => setAside.push({ proposed: p, why })
    if (!allIds.has(oldId)) refuse(`${p.oldId} is not a fact on file.`)
    else if (!standingIds.has(oldId)) refuse(`${p.oldId} was already replaced.`)
    else if (!addedIds.has(newId)) refuse(`${p.newId} is not one of the facts just added.`)
    else if (!p.why.trim()) refuse(`No reason was given for replacing ${p.oldId}.`)
    else if (taken.has(oldId)) refuse(`${p.oldId} was already replaced by an earlier proposal.`)
    else {
      taken.add(oldId)
      kept.push({ oldId, newId, why: p.why.trim() })
    }
  }
  return { kept, setAside }
}

/** The ledger as it will stand once the additions and supersessions are stored. */
export function afterAdditions(ledger: LedgerEntry[], added: LedgerEntry[], kept: Supersession[]): LedgerEntry[] {
  const by = new Map(kept.map(s => [s.oldId, s]))
  return [
    ...ledger.map(e => {
      const s = by.get(e.id)
      return s ? { ...e, supersededBy: s.newId, supersededWhy: s.why } : e
    }),
    ...added,
  ]
}

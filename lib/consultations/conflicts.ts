/**
 * The conflict check run on every booking, before anyone at the office speaks
 * with the person.
 *
 * Pure: the booking and every name on file go in; possible matches come out.
 * lib/consultations/conflictsRun.ts reads the names from the database.
 *
 * What it looks for, in a plaintiff-side employment practice:
 *
 *   adverse-is-client     the company or person they want to act against is
 *                         someone the office represents or has consulted with
 *   prospect-is-adverse   the person booking is named as an employer,
 *                         supervisor, HR contact or adverse party in another
 *                         file — they may be on the other side of a client
 *   returning             they are already a client, or consulted before
 *   same-adverse          another file is against the same employer. Not a
 *                         conflict; worth knowing
 *
 * Earlier consultations count as much as clients do: a prospective client's
 * information is protected even when no engagement followed (Cal. Rules of
 * Prof. Conduct, rule 1.18). Cancelled ones count too — they filled in the
 * form.
 *
 * It proposes and never decides, the same rule as the Wage Order choice: a
 * match is shown to an attorney, who marks the booking reviewed. Nothing here
 * cancels a booking or tells the client anything.
 */

export type ConflictKind = 'adverse-is-client' | 'prospect-is-adverse' | 'returning' | 'same-adverse'

export type PartyRole = 'client' | 'prospect' | 'employer' | 'supervisor' | 'hr' | 'adverse' | 'other'

/** One name standing in one file. */
export interface PartyOnFile {
  source: 'client' | 'consultation'
  /** clients.id or consultations.id */
  recordId: string
  /** How the office would recognise the file: the client's or prospect's name. */
  recordLabel: string
  role: PartyRole
  name: string
  phone?: string
}

export interface ConflictHit {
  kind: ConflictKind
  /** The name as the client wrote it on this booking. */
  ours: string
  /** The name as it stands in the other file. */
  theirs: string
  role: PartyRole
  source: PartyOnFile['source']
  recordId: string
  recordLabel: string
}

export interface BookingParties {
  name: string
  phone: string
  adverseParty: string
  otherParties: string
}

/** Words that say what kind of company it is, not which one. */
const ENTITY_WORDS = new Set([
  'the', 'inc', 'incorporated', 'llc', 'l', 'c', 'corp', 'corporation', 'co', 'company', 'ltd', 'limited',
  'lp', 'llp', 'pc', 'apc', 'pllc', 'dba', 'group', 'holdings',
])

/** Lowercase, accents and punctuation off, entity words dropped. */
export function nameTokens(raw: string): string[] {
  return raw
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(' ')
    .filter(t => t && !ENTITY_WORDS.has(t))
}

const isLatin = (s: string) => /^[a-z0-9]+$/.test(s)

/**
 * Whether two names plausibly name the same person or company.
 *
 * Same words in any order ("Dayeon Kim" / "Kim Dayeon"; "ABC Logistics, Inc."
 * / "abc logistics"), or one name's words all inside the other's when the
 * shorter has at least two ("ABC Logistics" / "ABC Logistics West"). A single
 * word matches only itself, and a single short Latin word not at all, so a
 * bare "Kim" or "Lee" does not light up half the file. Hangul and Chinese
 * names are usually written as one word and do match when equal.
 */
export function sameName(a: string, b: string): boolean {
  const x = nameTokens(a)
  const y = nameTokens(b)
  if (!x.length || !y.length) return false
  if (x.length === 1 && y.length === 1) {
    const [p, q] = [x[0], y[0]]
    if (p !== q) return false
    return isLatin(p) ? p.length >= 4 : p.length >= 2
  }
  const xs = new Set(x)
  const ys = new Set(y)
  const [short, long] = xs.size <= ys.size ? [xs, ys] : [ys, xs]
  if (short.size < 2) return false
  return Array.from(short).every(t => long.has(t))
}

const digits = (phone: string | undefined) => (phone ?? '').replace(/\D/g, '').slice(-10)

/** "John Park (supervisor), Mary Lee from HR; Tom" → ["John Park", "Mary Lee from HR", "Tom"] */
export function splitNames(text: string): string[] {
  return text
    .replace(/\([^)]*\)/g, ' ')
    .split(/[,;\n/、，；]+|\s+and\s+|\s+&\s+/i)
    .map(s => s.trim())
    .filter(s => s.length > 1)
}

const REPRESENTED: PartyRole[] = ['client', 'prospect']
const AGAINST: PartyRole[] = ['employer', 'supervisor', 'hr', 'adverse', 'other']

export function findConflicts(booking: BookingParties, onFile: PartyOnFile[]): ConflictHit[] {
  const hits: ConflictHit[] = []
  const seen = new Set<string>()
  const add = (kind: ConflictKind, ours: string, p: PartyOnFile) => {
    const key = `${kind}|${p.source}|${p.recordId}|${p.role}`
    if (seen.has(key)) return
    seen.add(key)
    hits.push({ kind, ours, theirs: p.name, role: p.role, source: p.source, recordId: p.recordId, recordLabel: p.recordLabel })
  }

  const others = splitNames(booking.otherParties)
  const adverse = booking.adverseParty.trim()
  const ownPhone = digits(booking.phone)

  for (const p of onFile) {
    if (REPRESENTED.includes(p.role)) {
      if (adverse && sameName(adverse, p.name)) add('adverse-is-client', adverse, p)
      for (const o of others) if (sameName(o, p.name)) add('adverse-is-client', o, p)
      if (sameName(booking.name, p.name) || (ownPhone.length === 10 && ownPhone === digits(p.phone))) {
        add('returning', booking.name, p)
      }
    } else if (AGAINST.includes(p.role)) {
      if (sameName(booking.name, p.name)) add('prospect-is-adverse', booking.name, p)
      if (p.role === 'employer' || p.role === 'adverse') {
        if (adverse && sameName(adverse, p.name)) add('same-adverse', adverse, p)
      }
    }
  }

  const order: ConflictKind[] = ['adverse-is-client', 'prospect-is-adverse', 'returning', 'same-adverse']
  return hits.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))
}

/** The two kinds an attorney has to clear before the consultation. */
export const NEEDS_REVIEW: ConflictKind[] = ['adverse-is-client', 'prospect-is-adverse']

export function needsReview(hits: ConflictHit[] | null | undefined): boolean {
  return (hits ?? []).some(h => NEEDS_REVIEW.includes(h.kind))
}

export const CONFLICT_LABEL: Record<ConflictKind, string> = {
  'adverse-is-client': 'Named adverse party matches a client or prospect',
  'prospect-is-adverse': 'This person is named as an adverse party in another file',
  returning: 'Already a client or consulted before',
  'same-adverse': 'Another file is against the same employer',
}

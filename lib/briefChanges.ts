/**
 * What changed since the last time this case was read, and what it changed.
 *
 * The brief's last section said "not tracked yet", and that was honest but
 * useless: a reading is replaced when the facts move, so there was no earlier
 * version to compare against. This keeps one, and compares.
 *
 * FOUR THINGS IT MUST DO, and they are the whole design:
 *
 *   PRESERVE BOTH SIDES. A fact that changed keeps its id, its status, and the
 *   client's own words on both sides of the change. The ledger already refuses
 *   to delete anything — a replaced fact is marked superseded with a reason and
 *   left in place — so this reads that rather than inventing a history.
 *
 *   RECOMPUTE ONLY WHAT DEPENDS ON IT. Claims cite the facts they rest on, so
 *   a changed fact points at exactly the claims, damages categories and
 *   questions that have to be read again. Everything else keeps the conclusion
 *   it already had, and keeps the note of which ledger it was read against.
 *
 *   SAY WHAT THE CONCLUSION NOW IS. "Three facts changed" is not the answer to
 *   "did anything I told the client last week stop being true".
 *
 *   NEVER QUIETLY PICK A SIDE. Two answers that disagree stay two answers. The
 *   ledger has a DISPUTED status for exactly this and the corpus requires both
 *   kept; a diff that resolved them by taking the newer one would destroy the
 *   thing a lawyer most needs to see.
 *
 * Pure, and takes its clock and its inputs from the caller, so the whole of it
 * can be tested without a database.
 */

import { Brief } from '@/lib/caseBrief'
import { bareFactId } from '@/lib/releaseTest'

/** One fact, as much of it as a change needs to show. */
export interface FactSnapshot {
  id: string
  proposition: string
  /** The client's own words. Never paraphrased away by a change. */
  verbatim: string
  status: string
  provenance: { kind: string; pinpoint: string; on: string }
  supersededBy?: string | null
  supersededWhy?: string | null
}

export type FactChange =
  | { kind: 'added'; id: string; after: FactSnapshot }
  | { kind: 'superseded'; id: string; before: FactSnapshot; why: string; by: string | null }
  | { kind: 'status'; id: string; before: FactSnapshot; after: FactSnapshot }
  | { kind: 'reworded'; id: string; before: FactSnapshot; after: FactSnapshot }

/** A conclusion that is not what it was. */
export interface ConclusionChange {
  what: string
  from: string
  to: string
  /** The fact ids that moved under it. Empty when nothing explains it. */
  because: string[]
}

/** One thing that is not what it was, in a part of the brief other than a fact. */
export interface Moved {
  what: string
  from: string
  to: string
}

export interface Changes {
  /** When the version being compared against was read. */
  since: string | null
  facts: FactChange[]
  /** What has to be read again, because it cites a fact that moved. */
  affected: { claims: string[]; damages: string[] }
  /** What kept its conclusion, and the ledger it was read against. */
  unaffected: { claims: string[] }
  conclusions: ConclusionChange[]
  /** sec. 17.C — dates and periods added or changed. */
  chronology: Moved[]
  /** sec. 17.E — records identified, obtained, or newly missing. */
  evidence: Moved[]
  /** sec. 17.H — damages inputs and figures affected. */
  damages: Moved[]
  /**
   * Disagreements left standing. Both sides, in the client's own words.
   * Nothing here is resolved by this file; it is listed so a person resolves it.
   */
  unresolved: { id: string; proposition: string; verbatim: string; note: string }[]
}

const byId = (facts: FactSnapshot[]) => new Map(facts.map(f => [f.id, f]))

/** Facts that disagree and were both kept, as the ledger records them. */
export function unresolvedIn(facts: FactSnapshot[]): Changes['unresolved'] {
  return facts
    .filter(f => f.status.toUpperCase() === 'DISPUTED')
    .map(f => ({
      id: f.id,
      proposition: f.proposition,
      verbatim: f.verbatim,
      note: 'Two accounts disagree and both are on file. Nothing here has chosen between them.',
    }))
}

/**
 * What moved in the ledger.
 *
 * Superseded is checked before status and wording, because a superseded fact
 * has usually changed all three and "replaced, and here is why" is the thing
 * worth saying.
 */
export function factChanges(before: FactSnapshot[], after: FactSnapshot[]): FactChange[] {
  const was = byId(before)
  const now = byId(after)
  const out: FactChange[] = []

  for (const [id, b] of Array.from(was.entries())) {
    const a = now.get(id)
    // Gone from the ledger entirely. The store does not delete, so this is a
    // cleared ledger or a re-extraction, and it is reported as a supersession
    // with no replacement rather than passed over.
    if (!a) {
      out.push({ kind: 'superseded', id, before: b, why: b.supersededWhy ?? 'No longer in the ledger.', by: b.supersededBy ?? null })
      continue
    }
    if (a.supersededBy && !b.supersededBy) {
      out.push({ kind: 'superseded', id, before: b, why: a.supersededWhy ?? '', by: a.supersededBy })
      continue
    }
    if (a.status !== b.status) {
      out.push({ kind: 'status', id, before: b, after: a })
      continue
    }
    // The client's own words changing is a different event from the office's
    // paraphrase of them changing, and only the first is worth a line.
    if (a.verbatim !== b.verbatim) out.push({ kind: 'reworded', id, before: b, after: a })
  }

  for (const [id, a] of Array.from(now.entries())) {
    if (!was.has(id)) out.push({ kind: 'added', id, after: a })
  }

  return out
}

/**
 * Every fact id a claim or a damages category rests on, compared bare.
 *
 * The ledger stores `client-1789103134380:f001`; an element's `facts` carries
 * the whole thing and the damages reading writes the bare id into its prose.
 * Both are reduced before anything is matched, because comparing the two forms
 * against each other finds nothing and quietly reports that nothing depends on
 * a fact that everything depends on.
 */
export function factsUnder(brief: Brief): { claims: Map<string, Set<string>>; damages: Map<string, Set<string>> } {
  const claims = new Map<string, Set<string>>()
  for (const f of brief.claims) {
    const ids = new Set<string>()
    for (const e of f.elements) for (const id of e.facts ?? []) ids.add(bareFactId(id))
    claims.set(f.claimId, ids)
  }

  // The damages reading cites its answers as prose rather than ids, so a
  // category is matched on the ids its `because` lines mention.
  const damages = new Map<string, Set<string>>()
  for (const i of brief.damages.issues) {
    const ids = new Set<string>()
    const re = /\b(?:[\w-]+:)?(f\d{2,})\b/g
    for (const line of [...i.because, i.why, i.math]) {
      let m: RegExpExecArray | null
      while ((m = re.exec(line ?? '')) !== null) ids.add(bareFactId(m[1]))
    }
    damages.set(i.category, ids)
  }

  return { claims, damages }
}

/** What has to be read again, and what does not. */
export function affectedBy(
  brief: Brief,
  changedIds: ReadonlySet<string>
): { affected: Changes['affected']; unaffected: Changes['unaffected'] } {
  const { claims, damages } = factsUnder(brief)
  const changed = new Set(Array.from(changedIds).map(bareFactId))
  const touches = (ids: Set<string>) => Array.from(ids).some(id => changed.has(id))

  const affectedClaims: string[] = []
  const unaffectedClaims: string[] = []
  for (const [claimId, ids] of Array.from(claims.entries())) {
    ;(touches(ids) ? affectedClaims : unaffectedClaims).push(claimId)
  }

  return {
    affected: {
      claims: affectedClaims,
      damages: Array.from(damages.entries()).filter(([, ids]) => touches(ids)).map(([c]) => c),
    },
    unaffected: { claims: unaffectedClaims },
  }
}

/** Conclusions that are not what they were. */
export function conclusionChanges(
  before: Brief,
  after: Brief,
  changedIds: ReadonlySet<string>
): ConclusionChange[] {
  const out: ConclusionChange[] = []
  const wasClaim = new Map(before.claims.map(c => [c.claimId, c]))
  const { claims } = factsUnder(after)

  for (const now of after.claims) {
    const then = wasClaim.get(now.claimId)
    if (!then) {
      out.push({ what: `Claim ${now.claimId}`, from: 'not read', to: now.standing, because: [] })
      continue
    }
    const changed = new Set(Array.from(changedIds).map(bareFactId))
    const drove = Array.from(claims.get(now.claimId) ?? []).filter(id => changed.has(id))

    if (then.standing !== now.standing) {
      out.push({ what: `Claim ${now.claimId}`, from: then.standing, to: now.standing, because: drove })
    }

    const wasElement = new Map(then.elements.map(e => [e.key, e]))
    for (const el of now.elements) {
      const prev = wasElement.get(el.key)
      if (prev && prev.state !== el.state) {
        out.push({
          what: `${now.claimId} · ${el.key}`,
          from: prev.state,
          to: el.state,
          because: (el.facts ?? []).map(bareFactId).filter(id => changed.has(id)),
        })
      }
    }
  }

  // A claim that was read and no longer appears is a conclusion withdrawn, and
  // saying nothing about it would be the worst of the options.
  for (const then of before.claims) {
    if (!after.claims.some(c => c.claimId === then.claimId)) {
      out.push({ what: `Claim ${then.claimId}`, from: then.standing, to: 'no longer read', because: [] })
    }
  }

  return out
}

export function compare(input: {
  before: { brief: Brief; facts: FactSnapshot[]; readOn: string | null }
  after: { brief: Brief; facts: FactSnapshot[] }
}): Changes {
  const facts = factChanges(input.before.facts, input.after.facts)
  const changedIds = new Set(facts.map(f => f.id))
  const { affected, unaffected } = affectedBy(input.after.brief, changedIds)

  return {
    since: input.before.readOn,
    facts,
    affected,
    unaffected,
    conclusions: conclusionChanges(input.before.brief, input.after.brief, changedIds),
    chronology: movedIn(
      chronologyLines(input.before.brief),
      chronologyLines(input.after.brief),
      'Chronology'
    ),
    evidence: movedIn(evidenceLines(input.before.brief), evidenceLines(input.after.brief), 'Record'),
    damages: movedIn(damagesLines(input.before.brief), damagesLines(input.after.brief), 'Damages'),
    unresolved: unresolvedIn(input.after.facts),
  }
}

/**
 * What moved in a list of lines, by their text.
 *
 * Used for the parts of the brief that are prose rather than structured
 * records — a chronology row, a record on the spine, a damages figure. Exact
 * text is the key, so a reworded line reads as one gone and one arrived. That
 * is honest: the office should see that the sentence changed.
 */
export function movedIn(
  before: { key: string; text: string }[],
  after: { key: string; text: string }[],
  label: string
): Moved[] {
  const was = new Map(before.map(b => [b.key, b.text]))
  const now = new Map(after.map(a => [a.key, a.text]))
  const out: Moved[] = []

  for (const [key, text] of Array.from(was.entries())) {
    const t = now.get(key)
    if (t === undefined) out.push({ what: `${label}: ${key}`, from: text, to: 'no longer on the brief' })
    else if (t !== text) out.push({ what: `${label}: ${key}`, from: text, to: t })
  }
  for (const [key, text] of Array.from(now.entries())) {
    if (!was.has(key)) out.push({ what: `${label}: ${key}`, from: 'not on the previous brief', to: text })
  }
  return out
}

const chronologyLines = (b: Brief) =>
  b.chronology.events.map(e => ({ key: e.when || e.what.slice(0, 40), text: e.what }))

const evidenceLines = (b: Brief) =>
  b.evidence.map(r => ({ key: r.record, text: r.proves?.note || r.howToGetIt || 'listed' }))

const damagesLines = (b: Brief) =>
  b.damages.issues.map(i => ({ key: i.category, text: `${i.estimate || 'no figure'} \u00b7 ${i.math || 'no arithmetic'}` }))

/** Nothing moved. Said as a sentence, because a blank section says nothing. */
export function nothingChanged(changes: Changes): boolean {
  return (
    changes.facts.length === 0 &&
    changes.conclusions.length === 0 &&
    changes.chronology.length === 0 &&
    changes.evidence.length === 0 &&
    changes.damages.length === 0
  )
}

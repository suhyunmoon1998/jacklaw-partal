/**
 * The brief's versions, and what each one changed.
 *
 * brief_snapshots kept a row every time the sheet was opened, and the sheet
 * compared itself against the newest row. Open it twice and the second opening
 * compared the brief with itself: "nothing moved", and what the reading had
 * actually changed was no longer on the page. Five openings, five identical
 * rows, one real change buried under four copies.
 *
 * So a version is a brief that differs from the one before it, and nothing
 * else. Identity is a digest over what the brief says and the facts it was read
 * against — never over when it was looked at.
 *
 * Pure. Takes rows, returns versions; the store and the routes do the I/O.
 */

import { createHash } from 'crypto'
import { Brief } from '@/lib/caseBrief'
import { Changes, FactSnapshot, compare } from '@/lib/briefChanges'

export interface SnapshotRow {
  brief: Brief
  facts: FactSnapshot[]
  readOn: string | null
  takenAt: string
  /** Why it was kept: opened, or taken just before something replaced it. */
  reason: string
}

export interface Version {
  digest: string
  takenAt: string
  readOn: string | null
  reason: string
  factCount: number
  /** Against the version before it. Null for the first one kept. */
  changes: Changes | null
}

/**
 * JSON with its keys sorted, all the way down.
 *
 * Postgres jsonb does not keep key order, so a brief read back from the table
 * serialises differently from the same brief built in memory. Hashing plain
 * JSON.stringify called every stored version new.
 */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    return `{${Object.keys(obj)
      .filter(k => obj[k] !== undefined)
      .sort()
      .map(k => `${JSON.stringify(k)}:${canonical(obj[k])}`)
      .join(',')}}`
  }
  return JSON.stringify(value ?? null)
}

/**
 * The part of a fact a version is identified by.
 *
 * The same fields a change is computed from. Snapshots written by the sheet
 * carried more — an English rendering of her words, machine-translated on each
 * load — and a translation that came back worded differently is not a new
 * version of the case.
 */
const identity = (f: FactSnapshot) => ({
  id: f.id,
  proposition: f.proposition,
  verbatim: f.verbatim,
  status: f.status,
  provenance: f.provenance,
  supersededBy: f.supersededBy ?? null,
  supersededWhy: f.supersededWhy ?? null,
})

export function versionDigest(brief: Brief, facts: FactSnapshot[]): string {
  // `changes` is about the version, not part of it.
  const { changes: _changes, ...said } = brief
  return createHash('sha256')
    .update(canonical({ brief: said, facts: facts.map(identity) }))
    .digest('hex')
    .slice(0, 32)
}

/**
 * Every version, newest first, each with what it changed.
 *
 * `rows` oldest first, as they were written. Consecutive rows that say the same
 * thing are one version, dated by the first — that is when the office first had
 * it. A version that comes back after a different one is a new version: the case
 * really did move and move back, and the history should show both steps.
 */
export function versionsOf(rows: SnapshotRow[]): Version[] {
  const kept: (Version & { row: SnapshotRow })[] = []
  for (const row of rows) {
    const digest = versionDigest(row.brief, row.facts)
    const prev = kept[kept.length - 1]
    if (prev && prev.digest === digest) continue
    kept.push({
      digest,
      takenAt: row.takenAt,
      readOn: row.readOn,
      reason: row.reason || 'opened',
      factCount: row.facts.length,
      changes: prev
        ? compare({
            before: { brief: prev.row.brief, facts: prev.row.facts, readOn: prev.row.readOn },
            after: { brief: row.brief, facts: row.facts },
          })
        : null,
      row,
    })
  }
  return kept.reverse().map(({ row: _row, ...v }) => v)
}

/**
 * What the brief in hand should be compared against, and whether to keep it.
 *
 * When the newest kept version already says what this one says, this brief is
 * not new: nothing is written, and it is compared against the version before
 * that — which is what the office wanted to see the first time and still wants
 * on the fifth opening.
 */
export function baselineFor(
  rows: SnapshotRow[],
  current: { brief: Brief; facts: FactSnapshot[] }
): { baseline: SnapshotRow | null; isNew: boolean } {
  const digest = versionDigest(current.brief, current.facts)
  let i = rows.length - 1
  const isNew = i < 0 || versionDigest(rows[i].brief, rows[i].facts) !== digest
  if (!isNew) {
    while (i >= 0 && versionDigest(rows[i].brief, rows[i].facts) === digest) i--
  }
  return { baseline: i >= 0 ? rows[i] : null, isNew }
}

/** "3 facts moved · 1 conclusion changed" — for a line in a list of versions. */
export function summarise(changes: Changes | null): string {
  if (!changes) return 'First version kept for this client.'
  const parts: [number, string][] = [
    [changes.conclusions.length, 'conclusion'],
    [changes.facts.length, 'fact'],
    [changes.chronology.length, 'chronology line'],
    [changes.evidence.length, 'record'],
    [changes.damages.length, 'damages line'],
  ]
  const said = parts
    .filter(([n]) => n > 0)
    .map(([n, what]) => `${n} ${what}${n === 1 ? '' : 's'} changed`)
  return said.length ? said.join(' · ') : 'Nothing moved from the version before.'
}

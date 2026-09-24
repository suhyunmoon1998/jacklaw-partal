/**
 * The short ranked list the office actually works from.
 *
 * The brief already ends with everything that is missing — records the spine
 * says to get, what would settle each element, inputs a damages figure cannot
 * be computed without. On a real file that came to well over a hundred lines,
 * in three separate places, in no order. A list that long is not a list of
 * priorities; it is the same problem the reader had before anybody wrote it
 * down.
 *
 * So: at most ten, ranked, one line each, and every line says the four things
 * somebody needs in order to go and do it —
 *
 *     what is missing · why it matters · who has it · how to get it
 *
 * WHAT IT WILL NOT DO. It does not invent a source or a method. Where the
 * reading did not say who holds a record, the line says so rather than
 * guessing at "the employer", because a guessed custodian is a subpoena sent
 * to the wrong place. Housekeeping and anything already answered stay out.
 */

import { Brief } from '@/lib/caseBrief'
import { SpineRecord } from '@/lib/evidenceSpine'

/** The routes the office has for getting something. */
export type Method = 'client' | 'witness' | 'discovery' | 'subpoena' | 'third party' | 'research'

export interface MissingItem {
  what: string
  why: string
  /** Who or what holds it. Empty when the reading did not say. */
  source: string
  method: Method
  /** Higher goes first. Exposed so the ranking can be tested, not guessed at. */
  weight: number
}

/**
 * How proof tiers rank, highest first.
 *
 * The spine's own order: a defendant's record beats a contemporaneous one,
 * which beats a neutral third party, and the client's own memory is last. A
 * missing document ranks by what it would be worth if it arrived.
 */
const TIER_WEIGHT: Record<string, number> = {
  'defendant record': 50,
  'contemporaneous record': 40,
  admission: 38,
  'neutral third party': 30,
  'corroborated testimony': 20,
  'client testimony': 10,
  inference: 5,
}

/**
 * Words that mean the case cannot be valued until this arrives.
 *
 * A missing pay rate is not one gap among many: every damages figure in the
 * brief is written as "hours x $R" until it is answered, so it outranks
 * anything that would improve a single element.
 */
const BLOCKS_VALUATION =
  /\b(rate|hourly|pay stub|paystub|wage statement|payroll|pay record|minimum wage|regular rate)\b/i

/** A conflict in the client's own account outranks a routine gap. */
const RESOLVES_CONFLICT = /\b(conflict|contradict|discrepan|inconsisten|which is correct|resolve)\b/i

/**
 * How the office would go and get it, read off how the reading described it.
 *
 * Deliberately conservative: anything that does not clearly name a holder is
 * put back to the client, because asking the client is the cheapest step and
 * the one that cannot be aimed at the wrong party.
 */
export function methodFor(text: string): Method {
  const s = text.toLowerCase()
  if (/\b(wage order|labor code|statute|ordinance|authority|caci|case law|section \d)\b/.test(s)) {
    return 'research'
  }
  if (/\b(subpoena|bank|carrier|phone records|third[- ]party|vendor|processor)\b/.test(s)) {
    return /\bsubpoena\b/.test(s) ? 'subpoena' : 'third party'
  }
  if (/\b(employer|payroll|personnel file|handbook|policy|time record|punch|pos|wage statement|paystub|pay stub|production|request)\b/.test(s)) {
    return 'discovery'
  }
  if (/\b(coworker|co-worker|colleague|witness|manager|owner|server)\b/.test(s)) return 'witness'
  return 'client'
}

/** Who holds it, as the reading said. Empty rather than guessed. */
export function sourceFor(record: Pick<SpineRecord, 'howToGetIt'>): string {
  return (record.howToGetIt ?? '').trim()
}

function weigh(text: string, base: number): number {
  let w = base
  if (BLOCKS_VALUATION.test(text)) w += 45
  if (RESOLVES_CONFLICT.test(text)) w += 25
  return w
}

/**
 * Everything the brief is waiting on, ranked and cut to ten.
 *
 * Candidates come from the three places the readings put them: records the
 * spine says to obtain, what each element's reading said would settle it, and
 * the inputs a damages figure names as missing. Duplicates across those three
 * are common — the pay stubs settle an element, unblock a figure and are on
 * the spine — so the first mention wins and carries the highest weight found.
 */
export function missingInformation(brief: Brief, limit = 10): MissingItem[] {
  const byWhat = new Map<string, MissingItem>()

  const add = (item: MissingItem) => {
    const key = item.what.trim().toLowerCase()
    if (!key) return
    const standing = byWhat.get(key)
    if (!standing) {
      byWhat.set(key, item)
      return
    }
    // Same thing wanted for two reasons: keep the stronger weight, and keep
    // both reasons, because either alone under-sells it.
    if (item.weight > standing.weight) standing.weight = item.weight
    if (item.why && !standing.why.includes(item.why)) standing.why = `${standing.why} ${item.why}`.trim()
    if (!standing.source && item.source) standing.source = item.source
  }

  for (const r of brief.evidence) {
    const why = r.proves?.note || r.ifMissing || ''
    const how = sourceFor(r)
    add({
      what: r.record,
      why,
      source: how,
      method: methodFor(`${r.record} ${how}`),
      weight: weigh(`${r.record} ${why}`, TIER_WEIGHT[r.tier] ?? 15),
    })
  }

  for (const claim of brief.claims) {
    for (const el of claim.elements) {
      if (!el.wouldSettleIt?.trim()) continue
      // An element the reading could not settle is worth more than one it
      // could: the first decides a claim, the second confirms it.
      const unsettled = /contradict|partial|unknown|needs authority/i.test(el.state) ? 20 : 0
      add({
        what: el.wouldSettleIt.trim(),
        why: `Settles ${claim.claimId} · ${el.key} (${el.state}).`,
        source: '',
        method: methodFor(el.wouldSettleIt),
        weight: weigh(el.wouldSettleIt, 18 + unsettled),
      })
    }
  }

  for (const input of brief.damages.missingInputs) {
    add({
      what: input,
      why: 'A damages figure cannot be computed without it.',
      source: '',
      method: methodFor(input),
      weight: weigh(input, 22),
    })
  }

  return Array.from(byWhat.values())
    .sort((a, b) => b.weight - a.weight || a.what.localeCompare(b.what))
    .slice(0, limit)
}

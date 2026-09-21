/**
 * What a full reading of a case is, and how far along one is.
 *
 * Split from the engine so the admin panel can hold it. Importing a value out
 * of lib/claimMatrix.ts or lib/evidenceSpine.ts pulls the model SDK and
 * node:fs into whatever imports it, and the screen that walks these stages
 * runs in a browser.
 *
 * WHY IT IS IN STAGES
 *
 * The hosting plan caps a request at 300 seconds. Ten claims read against the
 * statutes, the Wage Order and the cases took 100 seconds on a quiet
 * afternoon and 73 minutes on a loaded one; the spine took two minutes. An
 * undivided reading would fail somewhere in the middle, having been paid for.
 *
 * So four requests, each with room to spare, and the panel walks them. The
 * order is not arbitrary: the Wage Order has to be settled before the claims
 * are read, because the rest-period duty is read out of the Order and an
 * unsettled Order makes that element report as needing authority.
 */

import { z } from 'zod'
import { Spend } from '@/lib/spend'

export const STAGES = ['wage order', 'claims 1', 'claims 2', 'spine'] as const
export type Stage = (typeof STAGES)[number]

export const STAGE_LABEL: Record<Stage, string> = {
  'wage order': 'Working out which Wage Order governs this employer',
  'claims 1': 'Reading the first half of the claims',
  'claims 2': 'Reading the rest of the claims',
  spine: 'Building the chronology and the evidence spine',
}

/**
 * Bumped whenever the shape of a stored reading changes.
 *
 * Part of the fingerprint, so a reading written against an older shape reads
 * as stale and the office is offered a re-run — rather than being rendered by
 * code looking for fields it does not have.
 */
export const READING_SHAPE_VERSION = 1

/**
 * Where the claims are cut in two.
 *
 * By count and not by weight, which is crude: meal periods carries five case
 * holdings and two statutes and gratuities carries one section, so the halves
 * are not equal. They do not need to be. Each is far enough under the ceiling
 * that the difference does not decide anything.
 */
export const CLAIMS_PER_STAGE = 5

/** What is on file so far. */
export interface StoredReading {
  /**
   * What each stage was read under, so staleness can be per stage.
   *
   * One hash for the whole reading was too blunt: moving the Wage Order stage
   * from Opus to Sonnet invalidated ten claims and a chronology that were
   * still read by the model they are still read by, and offered the office a
   * four-minute re-read it did not need. A stage is stale when ITS OWN inputs
   * moved — which for the claims includes the Order that was settled, because
   * the rest-period duty is read out of it, but not the model that chose it.
   */
  stamps?: Partial<Record<Stage, string>>
  /** The Order proposed for this employer. Never confirmed by this system. */
  wageOrder?: unknown
  claims1?: unknown[]
  claims2?: unknown[]
  /** Claims that could not be read, by id, with why. */
  failed?: { claimId: string; why: string }[]
  spine?: unknown
  /** Seconds each stage took, so the office can see what it is paying for. */
  took?: Partial<Record<Stage, number>>
  /**
   * Tokens each stage used, counted from what the provider reported.
   *
   * Beside the seconds because the two answer different questions: seconds say
   * whether a stage fits in a request, tokens say what it costs to run it
   * eleven more times. Everything said about cost in this project before this
   * was estimated from character counts.
   */
  spent?: Partial<Record<Stage, Spend>>
}

/** Whether a stage has a result at all. */
export function isRead(stored: StoredReading | null | undefined, stage: Stage): boolean {
  if (!stored) return false
  if (stage === 'wage order') return Boolean(stored.wageOrder)
  if (stage === 'claims 1') return Boolean(stored.claims1)
  if (stage === 'claims 2') return Boolean(stored.claims2)
  return Boolean(stored.spine)
}

/**
 * Stages that have to run again, given what each would be read under now.
 *
 * A stage with no stamp was read before stamps existed. It is reported as
 * stale rather than assumed current: saying a reading is up to date when
 * nothing recorded what it was read under is a claim nobody can check.
 */
export function staleStages(
  stored: StoredReading | null | undefined,
  now: Partial<Record<Stage, string>>
): Stage[] {
  if (!stored) return []
  return STAGES.filter(s => isRead(stored, s) && stored.stamps?.[s] !== now[s])
}

/**
 * The stage to run next, or null when there is nothing left.
 *
 * `now` is what each stage would be read under today. Pass it and a stage
 * whose inputs have moved is run again; leave it out and only the unread
 * stages are asked for, which is what a screen with no ledger in hand can do.
 */
export function nextStage(
  stored: StoredReading | null | undefined,
  now?: Partial<Record<Stage, string>>
): Stage | null {
  const stale = now ? new Set(staleStages(stored, now)) : new Set<Stage>()
  return STAGES.find(s => !isRead(stored, s) || stale.has(s)) ?? null
}

/** Whether every stage has been read, and is still read under today's inputs. */
export function isComplete(
  stored: StoredReading | null | undefined,
  now?: Partial<Record<Stage, string>>
): boolean {
  return nextStage(stored, now) === null
}

/** Every claim read so far, in the order the claims are defined. */
export function allClaims<T>(stored: StoredReading | null | undefined): T[] {
  return [...((stored?.claims1 ?? []) as T[]), ...((stored?.claims2 ?? []) as T[])]
}

/**
 * How a reading is described to somebody deciding whether to trust it.
 *
 * A half-read case is not a thin case, it is an unfinished one, and the two
 * want different sentences. The panel says which.
 */
export function describe(stored: StoredReading | null | undefined): string {
  if (!stored) return 'Not read yet.'
  const done = STAGES.filter(s => {
    if (s === 'wage order') return Boolean(stored.wageOrder)
    if (s === 'claims 1') return Boolean(stored.claims1)
    if (s === 'claims 2') return Boolean(stored.claims2)
    return Boolean(stored.spine)
  })
  if (done.length === STAGES.length) return 'Read in full.'
  return `${done.length} of ${STAGES.length} stages read.`
}

/** What the store hands back: the reading, and whether the file has moved since. */
export const StoredRow = z.object({
  fingerprint: z.string(),
  result: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type StoredRow = z.infer<typeof StoredRow>

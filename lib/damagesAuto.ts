import { Stage, StoredAnalysis, nextStage } from '@/lib/caseAnalysisShape'
import { analysisFingerprint } from '@/lib/caseAnalysis'
import { gather, load, runAnalysisCore } from '@/lib/analysisRun'

/**
 * The damages reading, run when a client finishes Module 2 (owner's decision,
 * 2026-10-03), not every night and not for everyone.
 *
 * Module 2 is where the hours, the pay, the breaks and the unpaid time are
 * asked about. Those are the inputs the damages reading multiplies out, so it
 * is worth reading once the client has answered them, and not before. It is
 * begun from the submission itself (app/api/questionnaire), after the client
 * has had their answer. Whatever the request's clock does not cover is
 * finished by the nightly run, which only ever RESUMES a reading or starts one
 * for a client who submitted on or after DAMAGES_ON_MODULE2_SINCE.
 *
 * WHAT IT DOES NOT DO IS READ AGAIN UNPROMPTED. A complete reading that went
 * stale, because the client answered more or the law file moved, is shown as
 * stale and re-read when somebody asks. The clients who finished Module 2
 * before this shipped are not read either: that backlog is a decision about
 * money that the owner makes, not the night.
 */

/**
 * Clients who submitted Module 2 before this are not read unprompted.
 *
 * Read off `m2_last_saved`, which the submission writes. Twelve clients had a
 * claims reading and no damages reading the day this shipped; reading them all
 * would have cost $12–24 nobody had decided to spend.
 */
export const DAMAGES_ON_MODULE2_SINCE = '2026-10-03T00:00:00Z'

/**
 * Seconds into a request after which no NEW damages stage is begun.
 *
 * A whole reading has taken 163 to 255 seconds over four stages, so no one
 * stage has needed 150. Begun by this mark, a stage finishes inside the
 * 300-second ceiling; past it, the rest waits for the next run rather than
 * being paid for and lost.
 */
export const START_NO_DAMAGES_STAGE_AFTER = 150

export interface DamagesRun {
  ran: boolean
  /** The stages run in this request, in order. */
  stages: Stage[]
  /** The stage that is still to run, or null when the reading is whole. */
  next: Stage | null
  reason?: string
}

/** Where a reading should pick up: from the start unless what is on file was read from these answers. */
export function startingStage(row: { fingerprint: string; result: unknown } | null, currentFingerprint: string): Stage | null {
  if (!row || row.fingerprint !== currentFingerprint) return 'baseline'
  return nextStage(row.result as StoredAnalysis)
}

/**
 * As many stages of the damages reading as the clock allows.
 *
 * `began` is when the request began, so a caller that has already spent time
 * on something else gets only what is left. The first stage is always begun.
 */
export async function readDamagesWhileTimeAllows(clientId: string, began = Date.now()): Promise<DamagesRun> {
  const input = await gather(clientId)
  if (!input) return { ran: false, stages: [], next: null, reason: 'No such client.' }
  if (input.setsError) {
    return {
      ran: false,
      stages: [],
      next: null,
      reason: `A question set could not be read (${input.setsError}), so the damages were not read.`,
    }
  }
  const row = await load(clientId)
  let stage = startingStage(row ?? null, analysisFingerprint(input))
  if (!stage) return { ran: false, stages: [], next: null, reason: 'The damages reading is already complete.' }

  const stages: Stage[] = []
  let reason: string | undefined
  while (stage) {
    const elapsed = (Date.now() - began) / 1000
    if (stages.length && elapsed > START_NO_DAMAGES_STAGE_AFTER) {
      reason = `out of time after ${Math.round(elapsed)}s`
      break
    }
    const result = await runAnalysisCore(clientId, stage)
    if (result.status !== 200 || !result.stored || result.body.stored === false) {
      reason = String(result.body.error ?? `the ${stage} stage stopped with ${result.status}`)
      break
    }
    stages.push(stage)
    stage = nextStage(result.stored)
  }
  return { ran: stages.length > 0, stages, next: stage, reason }
}

/**
 * Who the night owes a damages reading: finished Module 2, and either a
 * reading begun on or after DAMAGES_ON_MODULE2_SINCE and not finished, or none
 * at all for a client who submitted Module 2 on or after it. Pure, so it is
 * tested.
 *
 * "Begun since" matters: three readings on file the day this shipped were
 * taken before the inputs stage existed, so they read as unfinished. Finishing
 * them would have been spending nobody decided on.
 */
export function owedDamages(input: {
  finishedModule2: string[]
  submittedModule2At: Record<string, string | null | undefined>
  analyses: { clientId: string; result: unknown; writtenAt?: string | null }[]
  since?: string
}): string[] {
  const since = Date.parse(input.since ?? DAMAGES_ON_MODULE2_SINCE)
  const onOrAfter = (iso: string | null | undefined) => {
    const at = Date.parse(String(iso ?? ''))
    return Number.isFinite(at) && at >= since
  }
  const byClient = new Map(input.analyses.map(a => [a.clientId, a]))
  return input.finishedModule2.filter(id => {
    const analysis = byClient.get(id)
    if (analysis) return nextStage(analysis.result as StoredAnalysis) !== null && onOrAfter(analysis.writtenAt)
    return onOrAfter(input.submittedModule2At[id])
  })
}

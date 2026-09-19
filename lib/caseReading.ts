/**
 * Running a full reading of one case, a stage at a time.
 *
 * The layers this drives were each validated on real facts and then had
 * nowhere to live. Nothing in the running portal could use them: the follow-up
 * engine asked for a matrix, found none, and wrote a round from the fact
 * ledger alone — which cannot ask about elements nobody can reach, gaps in the
 * timeline, or dates that do not line up. This is the wiring.
 *
 * WHAT EACH STAGE DOES, AND WHY IN THIS ORDER
 *
 *   wage order  Proposes which IWC Order governs the employer, from the
 *               Orders' own applicability and definition language. It runs
 *               first because the rest-period duty is read out of section 12
 *               of an Order, and until one is settled that element reports as
 *               needing an authority the portal in fact holds seventeen times
 *               over. The proposal is never confirmed here; an attorney does
 *               that, and every finding resting on it carries the caveat.
 *
 *   claims 1/2  The claim-proof matrix, in two halves, because ten claims read
 *               against the statutes, the Order and the cases do not reliably
 *               fit in one request.
 *
 *   spine       The chronology, the anomalies and the evidence spine. Last
 *               because it is the only stage nothing else depends on.
 *
 * WHAT STALE MEANS HERE
 *
 * The fingerprint is over the standing ledger, not over the answers. A fact
 * superseded by a follow-up answer changes it, and it should: a matrix that
 * says an element is contradicted, read against a fact the client has since
 * corrected, is worse than no matrix — it is a wrong answer with a date on it.
 */

import { createHash } from 'crypto'
import { LedgerEntry, standing } from '@/lib/factLedger'
import { CLAIMS } from '@/lib/authority/claims'
import { MATRIX_MODEL, buildMatrix } from '@/lib/claimMatrix'
import { SPINE_MODEL, buildSpine } from '@/lib/evidenceSpine'
import { CHOICE_MODEL, WageOrderChoice, proposeWageOrder } from '@/lib/wageOrderChoice'
import { CLAIMS_PER_STAGE, READING_SHAPE_VERSION, Stage, StoredReading } from '@/lib/caseReadingShape'

/**
 * What the reading was run against.
 *
 * The propositions and statuses, not just the ids: a fact whose status moves
 * from REPORTED to DISPUTED is a different fact for every purpose above this,
 * and a reading that predates the change is stale even though the ledger is
 * the same length.
 */
export function readingFingerprint(entries: LedgerEntry[]): string {
  const h = createHash('sha256')
  h.update(String(READING_SHAPE_VERSION))
  h.update(`${MATRIX_MODEL}|${SPINE_MODEL}|${CHOICE_MODEL}`)
  for (const e of standing(entries).slice().sort((a, b) => (a.id < b.id ? -1 : 1))) {
    h.update(e.id)
    h.update(e.status)
    h.update(e.proposition)
    h.update(e.supersededBy ?? '')
  }
  return h.digest('hex').slice(0, 32)
}

/** The claims read at each of the two claim stages. */
export function claimsFor(stage: 'claims 1' | 'claims 2') {
  return stage === 'claims 1'
    ? CLAIMS.slice(0, CLAIMS_PER_STAGE)
    : CLAIMS.slice(CLAIMS_PER_STAGE)
}

/**
 * The Order the claims are read under, or undefined.
 *
 * Undefined rather than a default. A guess here would silently change what
 * duty the employer owed, and the matrix reports the element as needing
 * authority instead — which is the true state of a case whose industry nobody
 * has classified.
 */
function settledOrder(stored: StoredReading): string | undefined {
  const choice = stored.wageOrder as WageOrderChoice | undefined
  return choice?.proposal?.order || undefined
}

/**
 * Runs one stage and returns what it added.
 *
 * Returns a patch rather than the whole reading so the caller can merge it
 * into whatever is on file, and so a stage that ran while another was stored
 * cannot erase it.
 */
export async function runStage(
  stage: Stage,
  entries: LedgerEntry[],
  stored: StoredReading
): Promise<StoredReading> {
  const began = Date.now()
  const took = (patch: StoredReading): StoredReading => ({
    ...patch,
    took: { ...(stored.took ?? {}), [stage]: Math.round((Date.now() - began) / 1000) },
  })

  if (stage === 'wage order') {
    return took({ wageOrder: await proposeWageOrder(entries) })
  }

  if (stage === 'claims 1' || stage === 'claims 2') {
    const matrix = await buildMatrix(entries, claimsFor(stage), { wageOrder: settledOrder(stored) })
    const failed = [...(stored.failed ?? []), ...matrix.failed]
    return took(stage === 'claims 1' ? { claims1: matrix.findings, failed } : { claims2: matrix.findings, failed })
  }

  return took({ spine: await buildSpine(entries) })
}

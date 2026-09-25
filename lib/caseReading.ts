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
import { CLAIMS, Claim, FEHA_CLAIMS } from '@/lib/authority/claims'
import { holdingsFor, render } from '@/lib/authority/cases'
import { parseKey, quote } from '@/lib/authority'
import { MATRIX_MODEL, buildMatrix } from '@/lib/claimMatrix'
import { SPINE_MODEL, buildSpine } from '@/lib/evidenceSpine'
import { CHOICE_MODEL, WageOrderChoice, proposeWageOrder } from '@/lib/wageOrderChoice'
import { CLAIMS_PER_STAGE, READING_SHAPE_VERSION, STAGES, Stage, StoredReading } from '@/lib/caseReadingShape'
import { Meter } from '@/lib/spend'

/**
 * What the reading was run against.
 *
 * The propositions and statuses, not just the ids: a fact whose status moves
 * from REPORTED to DISPUTED is a different fact for every purpose above this,
 * and a reading that predates the change is stale even though the ledger is
 * the same length.
 */
/**
 * The facts a reading was run against.
 *
 * The propositions and statuses, not just the ids: a fact whose status moves
 * from REPORTED to DISPUTED is a different fact for every purpose above this,
 * and a reading that predates the change is stale even though the ledger is
 * the same length.
 */
export function readingFingerprint(entries: LedgerEntry[]): string {
  const h = createHash('sha256')
  h.update(String(READING_SHAPE_VERSION))
  for (const e of standing(entries).slice().sort((a, b) => (a.id < b.id ? -1 : 1))) {
    h.update(e.id)
    h.update(e.status)
    h.update(e.proposition)
    h.update(e.supersededBy ?? '')
  }
  return h.digest('hex').slice(0, 32)
}

/**
 * What one stage would be read under today.
 *
 * The facts, plus only what that stage actually depends on. The claims depend
 * on the Wage Order that was SETTLED and not on the model that chose it — the
 * rest-period duty is read out of section 12 of an Order, so a different Order
 * invalidates them and a different model choosing the same Order does not.
 */
export function stampFor(entries: LedgerEntry[], stage: Stage, stored: StoredReading): string {
  const h = createHash('sha256')
  h.update(readingFingerprint(entries))
  h.update(stage)
  if (stage === 'wage order') h.update(CHOICE_MODEL)
  else if (stage === 'spine') h.update(SPINE_MODEL)
  else {
    h.update(MATRIX_MODEL)
    // FEHA duties are not read out of a Wage Order, so a different Order
    // leaves the FEHA claims exactly as they were read.
    if (stage !== 'claims 3') h.update(settledOrder(stored) ?? 'no order settled')
    // What the claims were read against, not only who read them. A claim
    // re-pointed at a provision now on file, or a holding added to an
    // element, reads differently; before this the stamp could not tell, and
    // a reading taken without Augustus stayed "current" after Augustus was
    // put on file.
    h.update(claimInputs(claimsFor(stage), stage === 'claims 3' ? undefined : settledOrder(stored)))
  }
  return h.digest('hex').slice(0, 32)
}

/**
 * Everything about a set of claims that changes what the matrix is handed:
 * each element's text, the provision it reads from, what it says is missing,
 * and the verbatim passages that bear on it.
 */
export function claimInputs(claims: Claim[], order?: string): string {
  // The text of every provision the matrix will quote, resolved as it will be
  // — a statute amended in place changes the reading as surely as a new one.
  const refs = Array.from(new Set(claims.flatMap(c => [...c.sections, ...c.elements.map(e => e.from)])))
    .filter(r => !r.includes('{order}') || order)
    .map(r => (order ? r.replace('{order}', order) : r))
  return JSON.stringify({
    claims: claims.map(c => ({
      id: c.id,
      name: c.name,
      remedy: c.remedy,
      expectedDefense: c.expectedDefense,
      sections: c.sections,
      caci: c.caci ?? '',
      elements: c.elements.map(e => ({
        key: e.key,
        says: e.says,
        from: e.from,
        needs: e.needsAuthority ?? '',
        // render(), not the quote alone: the limits and the office's reading
        // go to the model too, and a tightened limit reads differently.
        held: [...holdingsFor(`${c.id}:${e.key}`), ...holdingsFor(c.id)].map(render),
      })),
    })),
    law: quote(refs.map(parseKey)),
  })
}

/** Every stage's stamp, for comparing against what is on file. */
export function stampsNow(
  entries: LedgerEntry[],
  stored: StoredReading
): Partial<Record<Stage, string>> {
  return Object.fromEntries(STAGES.map(s => [s, stampFor(entries, s, stored)]))
}

/** The claims read at each of the two claim stages. */
export function claimsFor(stage: 'claims 1' | 'claims 2' | 'claims 3') {
  if (stage === 'claims 3') return FEHA_CLAIMS
  return stage === 'claims 1'
    ? CLAIMS.slice(0, CLAIMS_PER_STAGE)
    : CLAIMS.slice(CLAIMS_PER_STAGE)
}

/**
 * Whether anything on file could raise a FEHA claim.
 *
 * A cheap test in code, run before the stage pays for a model call. It reads
 * what the client said, and what the extraction tagged — but only tags that
 * assert something. On the five files on hand the extraction had written
 * "age — potential FEHA age protection threshold" on a date of birth,
 * "harassment/retaliation — reporting channel" on "there was no HR", and
 * "harassment liability" on a supervisor's job title; and "over 40" matched
 * "over 40 in a week". Every client would have paid for a FEHA reading that
 * could only come back "not raised". So: identity facts are skipped, hedged
 * tags are skipped, and the words are ones that only mean one thing.
 *
 * It still errs wide on what remains — a false yes costs one reading that
 * says "not raised", a false no would hide a claim.
 */
const FEHA_WORDS =
  /\b(disabilit\w*|disabled|pregnan\w*|maternity|harass\w*|discriminat\w*|accommodat\w*|interactive process|FEHA|CFRA|civil rights department|DFEH|race|racial|racist|national origin|ancestry|religio\w*|sex discrimination|sexual orientation|gender|sexual(?:ly)? (?:harass\w*|advances?|comments?)|age discrimination|too old|medical condition|medical leave|work (?:injur\w*|restrictions?)|injured at work|doctor.s note|light duty|hostile work environment|slurs?)\b/i
const IDENTITY = /party identification|contact information|date of birth/i
/**
 * Tags that name a procedure or a threshold rather than a fact. "Possible
 * disability accommodation" is NOT hedged away: a review of this screen showed
 * that the extraction writes "possible" in front of exactly the facts a FEHA
 * reading exists to find.
 */
const HEDGED = /threshold|channel|avenue|liability|policy|procedure|ruled out/i

/**
 * Phrases that carry a FEHA word and mean something else — a pay-stub line for
 * State Disability Insurance is a payroll deduction, not a disability. Struck
 * before matching, because a false yes here is seven Opus calls.
 */
const NOT_FEHA = /state disability insurance|\bSDI\b|disability insurance|disability (?:deduction|withholding)|workers.? comp\w*/gi

export function fehaRaised(entries: LedgerEntry[]): { raised: boolean; because: string[] } {
  const because: string[] = []
  for (const e of standing(entries)) {
    const tags = (e.legalTags ?? []).map(t => t.replace(NOT_FEHA, ' '))
    if ((e.legalTags ?? []).some(t => IDENTITY.test(t))) continue
    const said = e.proposition.replace(NOT_FEHA, ' ').match(FEHA_WORDS)
    const tagged = tags.filter(t => !HEDGED.test(t)).map(t => t.match(FEHA_WORDS)).find(Boolean)
    const m = said ?? tagged
    if (m) because.push(`${e.id}: ${m[0]}`)
  }
  return { raised: because.length > 0, because }
}

/**
 * The Order the claims are read under, or undefined.
 *
 * Undefined rather than a default. A guess here would silently change what
 * duty the employer owed, and the matrix reports the element as needing
 * authority instead — which is the true state of a case whose industry nobody
 * has classified.
 */
export function settledOrder(stored: StoredReading): string | undefined {
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
  stored: StoredReading,
  opts: { forceFeha?: boolean } = {}
): Promise<StoredReading> {
  const began = Date.now()
  const meter = new Meter()
  const took = (patch: StoredReading): StoredReading => ({
    ...patch,
    took: { ...(stored.took ?? {}), [stage]: Math.round((Date.now() - began) / 1000) },
    spent: { ...(stored.spent ?? {}), [stage]: meter.spent },
    // Stamped against the reading INCLUDING this stage's own result, so the
    // Wage Order a claims stage was read under is the one in the patch.
    stamps: {
      ...(stored.stamps ?? {}),
      [stage]: stampFor(entries, stage, { ...stored, ...patch }),
    },
  })

  if (stage === 'wage order') {
    return took({ wageOrder: await proposeWageOrder(entries, meter) })
  }

  if (stage === 'claims 3') {
    const feha = fehaRaised(entries)
    if ((!feha.raised && !opts.forceFeha) || !FEHA_CLAIMS.length) {
      return took({
        claims3: [],
        fehaSkipped: FEHA_CLAIMS.length
          ? 'Nothing on file names a protected characteristic, an accommodation, harassment or a civil-rights complaint, so the FEHA claims were not read.'
          : 'No FEHA claims are defined.',
      })
    }
    const matrix = await buildMatrix(entries, FEHA_CLAIMS, { wageOrder: settledOrder(stored), meter })
    return took({ claims3: matrix.findings, fehaSkipped: undefined, failed: [...(stored.failed ?? []), ...matrix.failed] })
  }

  if (stage === 'claims 1' || stage === 'claims 2') {
    const matrix = await buildMatrix(entries, claimsFor(stage), { wageOrder: settledOrder(stored), meter })
    const failed = [...(stored.failed ?? []), ...matrix.failed]
    return took(stage === 'claims 1' ? { claims1: matrix.findings, failed } : { claims2: matrix.findings, failed })
  }

  return took({ spine: await buildSpine(entries, meter) })
}

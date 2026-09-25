/**
 * The other side's case, kept as a live paired record.
 *
 * The corpus treats defence as two columns that develop together: what the
 * defendant's position is and what it rests on, and what this office answers
 * with (sec. 11). The portal had one string per claim — a sentence predicting
 * what the employer would say — with nothing attached to it and nowhere for
 * the answer to go.
 *
 * WHAT MAKES A POSITION REAL. The corpus is precise about this and it is the
 * part worth encoding: boilerplate affirmative defences "do not become the
 * defendant's actual position until letters, verified discovery, production,
 * deposition testimony, motions, negotiations, or other meaningful conduct
 * show the position is genuinely being advanced." So a predicted defence and
 * one the employer has actually taken are different things and are labelled
 * differently. On an intake file almost everything is predicted — except where
 * the client reports what a manager actually said, which is the employer's own
 * position in her mouth and the most useful thing in the file.
 *
 * CONFLICTS ARE WORK ITEMS. Where the answer is "her own answer cuts against
 * us", that is recorded rather than hidden: the corpus says conflicts are to be
 * reconciled, explained or preserved, not buried.
 */

import { Brief } from '@/lib/caseBrief'
import { LedgerFact } from '@/lib/factualBrief'

/** How far the employer has actually gone. */
export type Standing =
  /** The client reports the employer saying it. Their position, in her words. */
  | 'stated by the employer'
  /** This reading expects it. Nothing shows it is being advanced. */
  | 'predicted'

export interface DefenceRecord {
  /** Which claim it answers. */
  claimId: string
  /** The position, as plainly as it can be put. */
  position: string
  standing: Standing
  /** What it rests on: the facts that evidence the position. */
  restsOn: { id: string; proposition: string; verbatim: string }[]
  /** What this office has against it. */
  response: string[]
  /** What would settle it — the next step, not a wish. */
  development: string[]
}

/**
 * The employer talking, as the client reported it.
 *
 * A fact whose actors include management and whose proposition records what
 * they said. This is the nearest thing to a verified position an intake file
 * holds, and it is worth separating from a prediction.
 */
const MANAGEMENT = /\b(manager|owner|boss|supervisor|lead|employer|company)\b/i
const SAYING = /\b(said|told|responded|stated|answered|refused|claimed|explained|characteri[sz]ed)\b/i

export function isEmployerStatement(f: LedgerFact): boolean {
  const actors = (f.actors ?? []).join(' ')
  return MANAGEMENT.test(actors) && SAYING.test(f.proposition)
}

/**
 * The paired record, one per claim that has a defence on it.
 *
 * Assembled from three places the readings already fill: the defence sentence
 * on each claim, the adverse facts recorded under it, and what each element's
 * reading said would settle it.
 */
/**
 * The word a tag has to carry to be about this claim.
 *
 * The first word of the id did for the wage claims ('meal', 'overtime'). All
 * seven FEHA ids begin 'feha-', so one manager's remark tagged "FEHA
 * accommodation" marked every FEHA defence as stated by the employer. For
 * those the rest of the id is the term: 'accommodation', 'harassment',
 * 'interactive process', 'retaliation'.
 */
export function matchTerm(claimId: string): string {
  if (claimId.startsWith('feha-')) return claimId.slice('feha-'.length).replace(/-/g, ' ')
  return claimId.split('-')[0]
}

export function defenceRecords(brief: Brief, ledger: LedgerFact[]): DefenceRecord[] {
  const statements = ledger.filter(isEmployerStatement)

  const out: DefenceRecord[] = []
  for (const claim of brief.claims) {
    if (!claim.defense?.trim() && claim.adverse.length === 0) continue

    // A statement the employer actually made about this claim's subject beats
    // a prediction about it, so it is looked for first.
    const onPoint = statements.filter(f =>
      (f.legalTags ?? []).some(t => t.toLowerCase().includes(matchTerm(claim.claimId)))
    )

    out.push({
      claimId: claim.claimId,
      position: claim.defense?.trim() || 'Not stated by this reading.',
      standing: onPoint.length > 0 ? 'stated by the employer' : 'predicted',
      restsOn: onPoint.slice(0, 4).map(f => ({
        id: f.id.replace(/\bclient-\d+:/g, ''),
        proposition: f.proposition,
        verbatim: f.verbatimEnglish || f.verbatim,
      })),
      // Her own answers that cut against us are the response's problem, and
      // they are listed as such rather than left out of the pair.
      response: claim.adverse.map(a => a.replace(/\bclient-\d+:/g, '')),
      development: claim.elements
        .map(e => e.wouldSettleIt)
        .filter((s): s is string => Boolean(s?.trim()))
        .slice(0, 3),
    })
  }

  return out.sort((a, b) => Number(b.standing === 'stated by the employer') - Number(a.standing === 'stated by the employer'))
}

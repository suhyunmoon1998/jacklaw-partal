/**
 * The same gap, asked of the right person in the right language.
 *
 * The corpus asks for the smallest set of follow-ups "for the right audience:
 * warm/simple for the client, probing for a witness, formal/precise for
 * discovery, strategic for attorney review" (sec. 13.8, sec. 17.I). The portal
 * had one audience. Every gap in the case — including the ones only a payroll
 * custodian or an attorney can close — came out as a sixth-grade question for
 * the client, and the ones that could not be phrased that way came out as
 * nothing at all.
 *
 * THE READING LEVEL RULE IS NOT UNIVERSAL. vet() refuses "meal period" and
 * "regular rate" in a question going to a client, and it is right to. A
 * document request that avoids the words "meal period" is a document request
 * that will not produce meal period records. Each audience gets the register
 * it needs, and only the client's is held to sixth grade.
 *
 * ASSEMBLED, NOT GENERATED, AND NOT FILING-READY. These are drafts built from
 * gaps the readings already found and people the ledger already names. They
 * are a starting point for somebody who knows the case — a request to edit and
 * serve, not to file. Nothing here is a pleading and nothing here goes out
 * without a lawyer.
 */

import { Brief } from '@/lib/caseBrief'
import { MissingItem, missingInformation } from '@/lib/missingInformation'
import { Person } from '@/lib/whosWho'

export type Audience = 'witness' | 'discovery' | 'attorney'

export interface Request {
  audience: Audience
  /** Who it is put to. A person, a custodian, or the attorney. */
  to: string
  /** The draft, in that audience's register. */
  text: string
  /** The gap it closes, so a reader can see why it is being asked. */
  because: string
}

/** A period phrase the office can drop into a request, when one is known. */
export function periodOf(brief: Brief): string {
  const dated = brief.overview.baseline.find(b => /unpaid[- ]work period|period/i.test(b.label))
  return dated?.value ? ` for the period ${dated.value}` : ''
}

/**
 * What to put to a witness.
 *
 * Probing, not warm: this person may end up on the other side, and a question
 * that tells them what answer helps is a question that has been wasted. It
 * asks what they saw, not whether they agree.
 */
export function witnessRequests(people: Person[], limit = 6): Request[] {
  return people
    .filter(p => p.alignment === 'coworker' || p.alignment === 'company')
    .filter(p => p.facts.length > 0)
    .slice(0, limit)
    .map(p => {
      const topic = p.knowsAbout.length ? p.knowsAbout.join(', ') : 'what happened at the workplace'
      const opening = p.identified
        ? `Ask ${p.name}`
        : `Identify and then ask the person the record calls "${p.name}"`
      return {
        audience: 'witness' as const,
        to: p.name,
        text:
          `${opening}: what did you personally see or do about ${topic}? ` +
          `Who told you to do it, who else was there, and over what period? ` +
          `What records, schedules or messages would show it?`,
        because: `Appears in ${p.facts.length} fact${p.facts.length === 1 ? '' : 's'} on file. ${p.nextStep}`,
      }
    })
}

/**
 * What to put to the other side.
 *
 * Formal and precise, and it names the period: a request without one is
 * objected to and produces nothing. Only for gaps whose holder is the employer
 * or a third party — a question the client can answer is not worth a discovery
 * fight.
 */
export function discoveryRequests(items: MissingItem[], period: string, limit = 8): Request[] {
  return items
    .filter(i => i.method === 'discovery' || i.method === 'subpoena' || i.method === 'third party')
    .slice(0, limit)
    .map(i => ({
      audience: 'discovery' as const,
      to: i.source || 'Custodian not identified — confirm before serving',
      text:
        i.method === 'subpoena'
          ? `Subpoena, to the custodian: all records constituting or reflecting ${lower(i.what)}${period}.`
          : `Request for production: all documents sufficient to show ${lower(i.what)}${period}.`,
      because: i.why,
    }))
}

/**
 * What goes to the attorney.
 *
 * Strategic, and only what is genuinely a judgement — the corpus is explicit
 * that routine completeness checks should not keep going back to Jack. So:
 * what the readings flagged for review, and the gaps that can only be closed
 * by reading authority rather than by asking anybody.
 */
export function attorneyRequests(brief: Brief, items: MissingItem[], limit = 8): Request[] {
  const out: Request[] = brief.review.map(r => ({
    audience: 'attorney' as const,
    to: 'Attorney review',
    text: `${r.what}. ${r.why}`,
    because: r.from,
  }))

  for (const i of items) {
    if (i.method !== 'research') continue
    out.push({
      audience: 'attorney',
      to: 'Attorney review',
      text: `Settle the governing authority: ${i.what}`,
      because: i.why,
    })
  }

  return out.slice(0, limit)
}

const lower = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s)

/** Every audience at once, from one brief. */
export function audienceRequests(brief: Brief): Record<Audience, Request[]> {
  const items = missingInformation(brief, 20)
  const period = periodOf(brief)
  return {
    witness: witnessRequests(brief.people),
    discovery: discoveryRequests(items, period),
    attorney: attorneyRequests(brief, items),
  }
}

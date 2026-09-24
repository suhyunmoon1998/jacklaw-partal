/**
 * How far this case is from a trial brief the firm would file.
 *
 * Trial Brief Template 1.0 "assumes the factual investigation has already been
 * completed" and turns the record into a legal presentation. The case brief is
 * not that document: it is an internal reading of an intake. Relabelling its
 * eight sections I–XIII would claim a readiness nothing here has — a caption
 * with no case number, "requested findings" nobody decided, a conclusion
 * nobody wrote.
 *
 * So the standard is applied as a measure instead. Each template section says
 * what the readings already supply, what the file does not hold yet, and what
 * only a lawyer can do; the template's fourteen closing checks are run where a
 * machine can run them and handed to a person where it cannot.
 *
 * Nothing here reads the law. Whether an element is met is the claims
 * reading's answer, read against authority held in lib/authority; this only
 * counts where those answers are missing.
 *
 * Pure.
 */

import { Brief, readsAsStrong } from '@/lib/caseBrief'
import { LedgerFact, isProof } from '@/lib/factualBrief'
import { DefenceRecord } from '@/lib/defenceRecord'
import { Check, TRIAL_TEMPLATE } from '@/lib/briefStandards'

/** Where one template section stands. */
export type Readiness =
  /** The readings supply it; a lawyer still writes it. */
  | 'inputs on file'
  /** Some of what it needs is on file. */
  | 'partial'
  /** The file does not hold what it needs. */
  | 'not on file'
  /** Judgement or drafting only a lawyer does. */
  | 'for a person'

export interface SectionReadiness {
  n: string
  title: string
  readiness: Readiness
  /** What is on file for it, and what is not. Always said. */
  note: string
}

export interface TrialReadiness {
  template: typeof TRIAL_TEMPLATE
  sections: SectionReadiness[]
  checks: Check[]
  /** One line for the top of the section. */
  headline: string
}

const NEEDS_AUTHORITY = /needs authority/i
const n = (x: number, one: string, many = `${one}s`) => `${x} ${x === 1 ? one : many}`

export function trialReadiness(brief: Brief, ledger: LedgerFact[], defences: DefenceRecord[]): TrialReadiness {
  const facts = ledger.filter(f => !f.supersededBy)
  const confirmed = facts.filter(f => f.status.toUpperCase() === 'CONFIRMED')
  const disputed = facts.filter(f => f.status.toUpperCase() === 'DISPUTED')
  const proof = facts.filter(isProof)

  const elements = brief.claims.flatMap(c => c.elements.map(e => ({ claim: c.claimId, ...e })))
  const needAuthority = elements.filter(e => NEEDS_AUTHORITY.test(e.state))
  const noFacts = elements.filter(e => !(e.facts ?? []).length)
  const strongClaims = brief.claims.filter(c => c.elements.length && c.elements.every(e => readsAsStrong(e.state)))
  const claimsWithoutDefence = brief.claims.filter(c => !defences.some(d => d.claimId === c.claimId))
  const stated = defences.filter(d => d.standing === 'stated by the employer')
  const identified = brief.people.filter(p => p.identified && p.facts.length > 0)
  const noMath = brief.damages.issues.filter(i => !i.math?.trim())
  const wageHour = brief.claims.some(c => /meal|rest|overtime|minimum|wage|off.the.clock|statement|final pay|waiting/i.test(c.claimId))

  const sec = (i: number, readiness: Readiness, note: string): SectionReadiness => ({
    n: TRIAL_TEMPLATE.sections[i].n,
    title: TRIAL_TEMPLATE.sections[i].title,
    readiness,
    note,
  })

  const sections: SectionReadiness[] = [
    sec(0, 'partial',
      `Parties and claims are on file (${n(brief.claims.length, 'claim')} read). Court, case number, judge and trial date are not recorded in the portal.`),
    sec(1, 'for a person',
      brief.overview.summary
        ? 'The damages reading’s summary and the strongest elements (below) are the inputs. The introduction is a lawyer’s to write.'
        : 'No summary on file yet; the damages reading has not been run.'),
    sec(2, 'partial',
      `${n(brief.people.length, 'person', 'people')} mapped in Who’s Who. Procedural posture — operative pleading, rulings, stipulations — is not recorded in the portal.`),
    confirmed.length
      ? sec(3, 'inputs on file', `${n(confirmed.length, 'fact')} confirmed by a record, each with its source.`)
      : sec(3, 'not on file', 'Nothing is confirmed by a record yet. The template forbids calling a contested proposition undisputed because the client believes it.'),
    brief.chronology.events.length
      ? sec(4, 'inputs on file', `Chronology of ${n(brief.chronology.events.length, 'event')} and the core story are on file.`)
      : sec(4, 'not on file', 'The chronology has not been built yet.'),
    !brief.claims.length
      ? sec(5, 'not on file', 'The claims reading has not been run.')
      : needAuthority.length || noFacts.length
        ? sec(5, 'partial',
            `${n(elements.length, 'element')} read against held authority. ${n(needAuthority.length, 'element')} need an authority the portal does not hold; ${n(noFacts.length, 'element')} cite no fact.`)
        : sec(5, 'inputs on file', `Every one of ${n(elements.length, 'element')} is read against held authority and cites the facts it rests on.`),
    // The case brief carries only records still to obtain (buildBrief drops
    // the ones in hand), so a wage-and-hour module has nothing to cite yet.
    sec(6, wageHour ? 'not on file' : 'for a person',
      wageHour
        ? `The wage-and-hour module turns on the employer’s time and payroll records; ${n(brief.evidence.length, 'record')} still to obtain.`
        : 'Which modules apply is a lawyer’s call.'),
    identified.length
      ? sec(7, 'partial', `${n(identified.length, 'witness', 'witnesses')} named with firsthand facts. No exhibit is in hand; ${n(brief.evidence.length, 'record')} listed to obtain.`)
      : sec(7, 'not on file', 'No witness is identified well enough to be found, and no exhibit is in hand.'),
    defences.length
      ? sec(8, 'partial', `${n(defences.length, 'defence')} paired with a response; ${n(stated.length, 'is', 'are')} stated by the employer, the rest predicted.`)
      : sec(8, 'not on file', 'No defence is recorded against any claim.'),
    brief.damages.issues.length
      ? sec(9, noMath.length ? 'partial' : 'inputs on file',
          `${n(brief.damages.issues.length, 'category', 'categories')} with a figure${noMath.length ? `; ${n(noMath.length, 'has', 'have')} no arithmetic` : ''}. ${n(brief.damages.missingInputs.length, 'input')} still to confirm.`)
      : sec(9, 'not on file', 'The damages reading has not been run.'),
    sec(10, 'for a person', 'Admissibility and advance rulings are a trial lawyer’s list. Nothing here predicts them.'),
    sec(11, 'for a person',
      strongClaims.length
        ? `Candidates, where every element reads as supported: ${strongClaims.map(c => c.claimId).join(', ')}. What to ask for is a lawyer’s decision.`
        : 'No claim has every element reading as supported yet.'),
    sec(12, 'for a person', 'The sequence to remember is written, not assembled.'),
  ]

  const q = TRIAL_TEMPLATE.qualityControl
  const c = (i: number, result: Check['result'], why: string): Check => ({ n: i, text: q[i - 1], result, why })

  const checks: Check[] = [
    c(1, 'for a person', 'Drafting. The strongest supported elements are listed under Strengths.'),
    confirmed.length
      ? c(2, 'met', `${n(confirmed.length, 'fact')} confirmed, ${n(disputed.length, 'fact')} disputed, each labelled.`)
      : c(2, 'gap', 'Nothing is confirmed by a record, so there is no undisputed set to separate yet.'),
    !brief.claims.length
      ? c(3, 'not yet', 'The claims reading has not been run.')
      : needAuthority.length
        ? c(3, 'gap', `${n(needAuthority.length, 'element')} need an authority not on file: ${needAuthority.slice(0, 4).map(e => `${e.claim} · ${e.key}`).join(', ')}.`)
        : c(3, 'met', 'Every element is read against authority quoted from lib/authority.'),
    !elements.length
      ? c(4, 'not yet', 'No element has been read.')
      : noFacts.length
        ? c(4, 'gap', `${n(noFacts.length, 'element')} cite no fact: ${noFacts.slice(0, 4).map(e => `${e.claim} · ${e.key}`).join(', ')}.`)
        : c(4, proof.length ? 'met' : 'gap', proof.length
            ? 'Every element cites the facts it rests on.'
            : 'Every element cites facts, but none of them is corroborated beyond her account — the expected proof is her testimony alone.'),
    proof.length
      ? c(5, 'met', `${n(proof.length, 'fact')} ${proof.length === 1 ? 'rests' : 'rest'} on something other than her account.`)
      : c(5, 'gap', 'The strongest evidence is her own account; no record is its source yet.'),
    claimsWithoutDefence.length
      ? c(6, 'gap', `No defence recorded for: ${claimsWithoutDefence.map(x => x.claimId).join(', ')}.`)
      : brief.claims.length
        ? c(6, 'for a person', 'A defence is paired with every claim. Whether it is the strongest one is a lawyer’s judgement.')
        : c(6, 'not yet', 'No claim has been read.'),
    brief.weaknesses.length
      ? c(7, 'met', `${n(brief.weaknesses.length, 'weakness', 'weaknesses')} listed.`)
      : c(7, 'gap', 'No weakness is listed. That is rarely true of a real file; check it.'),
    wageHour
      ? c(8, 'gap', 'No time or payroll record is on this brief, so there is no representative date, pay period or Bates number to cite.')
      : c(8, 'not yet', 'No record-driven claim has been read.'),
    identified.length
      ? c(9, 'met', `${n(identified.length, 'witness', 'witnesses')} tied to the facts they know firsthand.`)
      : c(9, 'gap', 'No witness is identified well enough to be found.'),
    !brief.damages.issues.length
      ? c(10, 'not yet', 'The damages reading has not been run.')
      : noMath.length
        ? c(10, 'gap', `${n(noMath.length, 'category', 'categories')} with no arithmetic: ${noMath.map(i => i.category).join(', ')}.`)
        : c(10, 'met', `Each category shows its arithmetic; ${n(brief.damages.missingInputs.length, 'assumption')} listed to confirm.`),
    c(11, 'for a person', 'The portal quotes only authority it holds, and a test checks each case quote against the stored opinion. Whether the law is still current is an attorney’s check.'),
    c(12, 'for a person', 'Drafting.'),
    c(13, 'for a person', 'Drafting. Candidates are listed under XI above.'),
    c(14, 'for a person', 'Drafting.'),
  ]

  const byKind = (r: Readiness) => sections.filter(s => s.readiness === r).length
  return {
    template: TRIAL_TEMPLATE,
    sections,
    checks,
    headline:
      `Not a trial brief. Of ${sections.length} template sections, ${byKind('inputs on file')} have their inputs on file, ` +
      `${byKind('partial')} are partly on file, ${byKind('not on file')} need what the file does not hold, and ` +
      `${byKind('for a person')} are a lawyer’s to write.`,
  }
}

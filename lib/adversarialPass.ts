/**
 * The draft read as opposing counsel, the judge and the mediator would.
 *
 * The prompt standard runs nine questions over a synthesis before it is
 * finalised (sec. 7). Most of them are judgement and belong to a lawyer. Some
 * are answerable by looking, and those are the ones worth mechanising —
 * because they are the ones a reader under time pressure skips.
 *
 * It is not a grader. Every line it returns names something to go and check,
 * and a clean result means only that these particular questions found nothing.
 * The questions it cannot ask are listed for the person doing the pass, rather
 * than quietly dropped, so nobody mistakes what ran for the whole standard.
 */

import { Brief } from '@/lib/caseBrief'

export interface Challenge {
  /** Which of the standard's questions this answers. */
  question: string
  /** What was found. */
  what: string
  where: string
}

/**
 * The questions no code can ask.
 *
 * Listed so the pass does not read as complete. A model could guess at these
 * and a lawyer would then be reviewing the guess instead of the case.
 */
export const FOR_A_PERSON = [
  'What alternative explanation could a neutral factfinder reasonably accept?',
  'Is there a stronger documentary example or defendant-generated admission than the one presently used?',
  'Is any cited authority distinguishable, or incomplete as to subsequent history?',
  'Does the presentation disclose its weakness and still explain why the stronger record supports the client?',
]

export function adversarialPass(brief: Brief): Challenge[] {
  const found: Challenge[] = []

  // "Which element, burden, or damages input is assumed rather than proved?"
  for (const issue of brief.damages.issues) {
    if (issue.basis && issue.basis !== 'FACT') {
      found.push({
        question: 'Which damages input is assumed rather than proved?',
        what: `${issue.category} rests on an ${issue.basis.toLowerCase()}.`,
        where: `Damages — ${issue.category}`,
      })
    }
  }

  // "Which important factual statement is not actually supported by the proof?"
  for (const claim of brief.claims) {
    for (const el of claim.elements) {
      if (/^supported$/i.test(el.state) && (el.facts?.length ?? 0) === 0) {
        found.push({
          question: 'Which factual statement is not supported by the cited proof?',
          what: `${claim.claimId} · ${el.key} is called supported and cites no fact.`,
          where: `Claim — ${claim.claimId}`,
        })
      }
    }
  }

  // "What fact or document most helps the defense?"
  const worst = brief.weaknesses[0]
  if (worst) {
    found.push({
      question: 'What most helps the defense?',
      what: worst,
      where: 'Weaknesses',
    })
  }

  // "Which witness actually has firsthand knowledge?"
  const unidentified = brief.people.filter(p => !p.identified && p.facts.length >= 3)
  for (const p of unidentified.slice(0, 3)) {
    found.push({
      question: 'Which witness actually has firsthand knowledge?',
      what: `"${p.name}" is on ${p.facts.length} facts and has never been named.`,
      where: 'Who’s Who',
    })
  }

  // "Is a missing record being treated as proof when it is a development issue?"
  if (brief.evidence.length > 0 && brief.claims.some(c => /support/i.test(c.standing))) {
    found.push({
      question: 'Is a missing record being treated as proof?',
      what: `${brief.evidence.length} records are still to be obtained while claims read as supported.`,
      where: 'Records to obtain',
    })
  }

  return found
}

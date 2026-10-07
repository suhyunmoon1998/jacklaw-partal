/**
 * Claims proposed for the matrix, awaiting an attorney. NOT READ.
 *
 * Nothing here reaches a reading. claimsFor() in lib/caseReading.ts reads
 * CLAIMS and FEHA_CLAIMS from claims.ts and nothing else, so a claim added
 * here changes no stamp, makes no stored reading stale, and pays for nothing.
 * test/proposedClaims.test.ts keeps it that way.
 *
 * How they were written. Each comes from a CACI instruction the office holds
 * in full and its claims do not yet use. Every element is the Judicial
 * Council's own wording, copied from that instruction — the test fails if a
 * word differs — including its bracketed blanks, which a reading fills from
 * the facts. Nothing is paraphrased and nothing comes from memory. A remedy is
 * quoted from a provision on file or says none is on file; the expected
 * defence names the CACI defence instruction on file, or says there is none.
 *
 * What approving one does. An attorney moves an approved claim's `claim` into
 * claims.ts (rewording an element there if he wishes, as the existing claims
 * are worded). That adds claims to a reading stage, so every client's stored
 * reading of that stage goes stale and the next nightly run reads it again,
 * at the firm's Anthropic cost. Measured from the eighteen readings on file
 * (2026-10-06), one claim stage averages about 67,000 input tokens, 65,000
 * cache-read, 16,000 cache-write and 24,000 output tokens per client; these
 * eight would make about two stages. Approve, then say so before it runs.
 */

import type { Claim } from '@/lib/authority/claims'

export interface ProposedClaim {
  /** Exactly the shape claims.ts uses, so approving is a move, not a rewrite. */
  claim: Claim
  /** The instruction every element was copied from. */
  transcribedFrom: string
  proposedOn: string
  /** What the attorney decides before approving it. */
  forTheAttorney: string
}

const NO_REMEDY_ON_FILE =
  'Not on file: the damages for this claim are instructed in a CACI series the office does not hold. For the attorney.'
const NO_DEFENSE_ON_FILE = 'No affirmative-defence instruction for this claim is on file. For the attorney.'

export const PROPOSED_CLAIMS: ProposedClaim[] = [
  {
    transcribedFrom: 'CACI 2430',
    proposedOn: '2026-10-06',
    forTheAttorney:
      'Which public policy the discharge violated is named for each client, tethered to a statute or constitutional provision. CACI 2430\'s Directions for Use: "The judge should determine whether the purported reason for firing the plaintiff would amount to a violation of public policy."',
    claim: {
      id: 'wrongful-discharge-public-policy',
      name: 'Wrongful discharge in violation of public policy',
      sections: [],
      caci: '2430',
      elements: [
        { key: 'employed', says: 'That [name of plaintiff] was employed by [name of defendant]', from: 'CACI 2430' },
        { key: 'discharged', says: 'That [name of defendant] discharged [name of plaintiff]', from: 'CACI 2430' },
        {
          key: 'public-policy-motivating-reason',
          says:
            'That [insert alleged violation of public policy, e.g., “[name of plaintiff]’s refusal to engage in price fixing”] was a substantial motivating reason for [name of plaintiff]’s discharge',
          from: 'CACI 2430',
        },
        { key: 'harmed', says: 'That [name of plaintiff] was harmed', from: 'CACI 2430' },
        {
          key: 'causation',
          says: 'That the discharge was a substantial factor in causing [name of plaintiff] harm',
          from: 'CACI 2430',
        },
      ],
      remedy: NO_REMEDY_ON_FILE,
      expectedDefense: NO_DEFENSE_ON_FILE,
    },
  },
  {
    transcribedFrom: 'CACI 2431',
    proposedOn: '2026-10-06',
    forTheAttorney: 'As for CACI 2430: the public policy the required conduct would violate is named per client.',
    claim: {
      id: 'constructive-discharge-required-to-violate-policy',
      name: 'Constructive discharge — required to violate public policy',
      sections: [],
      caci: '2431',
      elements: [
        { key: 'employed', says: 'That [name of plaintiff] was employed by [name of defendant]', from: 'CACI 2431' },
        {
          key: 'required-conduct',
          says:
            'That [name of defendant] required [name of plaintiff] to [specify alleged conduct in violation of public policy, e.g., “engage in price fixing”]',
          from: 'CACI 2431',
        },
        {
          key: 'intolerable',
          says:
            'That this requirement was so intolerable that a reasonable person in [name of plaintiff]’s position would have had no reasonable alternative except to resign',
          from: 'CACI 2431',
        },
        { key: 'resigned', says: 'That [name of plaintiff] resigned because of this requirement', from: 'CACI 2431' },
        { key: 'harmed', says: 'That [name of plaintiff] was harmed', from: 'CACI 2431' },
        {
          key: 'causation',
          says: 'That the requirement was a substantial factor in causing [name of plaintiff]’s harm',
          from: 'CACI 2431',
        },
      ],
      remedy: NO_REMEDY_ON_FILE,
      expectedDefense: NO_DEFENSE_ON_FILE,
    },
  },
  {
    transcribedFrom: 'CACI 2432',
    proposedOn: '2026-10-06',
    forTheAttorney:
      'As for CACI 2430: the public policy the working conditions violated is named per client. The instruction adds: "To be intolerable, the adverse working conditions must be unusually aggravated or involve a continuous pattern of mistreatment. Trivial acts are insufficient."',
    claim: {
      id: 'constructive-discharge-intolerable-conditions',
      name: 'Constructive discharge — intolerable conditions that violate public policy',
      sections: [],
      caci: '2432',
      elements: [
        { key: 'employed', says: 'That [name of plaintiff] was employed by [name of defendant]', from: 'CACI 2432' },
        {
          key: 'conditions-violated-policy',
          says:
            'That [name of plaintiff] was subjected to working conditions that violated public policy, in that [describe conditions imposed on the employee that constitute the violation, e.g., “[name of plaintiff] was required to work more than forty hours a week for less than minimum wage”]',
          from: 'CACI 2432',
        },
        {
          key: 'created-or-permitted',
          says: 'That [name of defendant] intentionally created or knowingly permitted these working conditions',
          from: 'CACI 2432',
        },
        {
          key: 'intolerable',
          says:
            'That these working conditions were so intolerable that a reasonable person in [name of plaintiff]’s position would have had no reasonable alternative except to resign',
          from: 'CACI 2432',
        },
        { key: 'resigned', says: 'That [name of plaintiff] resigned because of these working conditions', from: 'CACI 2432' },
        { key: 'harmed', says: 'That [name of plaintiff] was harmed', from: 'CACI 2432' },
        {
          key: 'causation',
          says: 'That the working conditions were a substantial factor in causing [name of plaintiff]’s harm',
          from: 'CACI 2432',
        },
      ],
      remedy: NO_REMEDY_ON_FILE,
      expectedDefense: NO_DEFENSE_ON_FILE,
    },
  },
  {
    transcribedFrom: 'CACI 2740',
    proposedOn: '2026-10-06',
    forTheAttorney: 'Who the comparator is, and on which ground (sex, race or ethnicity), is named per client.',
    claim: {
      id: 'equal-pay',
      name: 'Equal Pay Act',
      sections: ['LAB 1197.5'],
      caci: '2740',
      elements: [
        {
          key: 'paid-less',
          says:
            'That [name of plaintiff] was paid less than the rate paid to [a] person[s] of another [sex/race/ethnicity] working for [name of defendant]',
          from: 'CACI 2740',
        },
        {
          key: 'substantially-similar-work',
          says:
            'That [name of plaintiff] was performing substantially similar work as the other person[s], considering the overall combination of skill, effort, and responsibility required',
          from: 'CACI 2740',
        },
        {
          key: 'similar-conditions',
          says: 'That [name of plaintiff] was working under similar working conditions as the other person[s]',
          from: 'CACI 2740',
        },
      ],
      remedy:
        'LAB 1197.5, in its own words: the employee "may recover in a civil action the balance of the wages, including interest thereon, and an equal amount as liquidated damages, together with the costs of the suit and reasonable attorney’s fees, notwithstanding any agreement to work for a lesser wage."',
      expectedDefense:
        'On file: CACI 2741 (Affirmative Defense—Different Pay Justified) and CACI 2742 (Bona Fide Factor Other Than Sex, Race, or Ethnicity).',
    },
  },
  {
    transcribedFrom: 'CACI 2743',
    proposedOn: '2026-10-06',
    forTheAttorney: 'What the client did to invoke or assist the right to equal pay, and the adverse action, are named per client.',
    claim: {
      id: 'equal-pay-retaliation',
      name: 'Equal Pay Act retaliation',
      sections: ['LAB 1197.5'],
      caci: '2743',
      elements: [
        {
          key: 'protected-acts',
          says:
            'That [name of plaintiff] [specify acts taken by plaintiff to invoke, enforce, or assist in the enforcement of the right to equal pay]',
          from: 'CACI 2743',
        },
        {
          key: 'adverse-action',
          says: 'That [name of defendant] [discharged/[other adverse employment action]] [name of plaintiff]',
          from: 'CACI 2743',
        },
        {
          key: 'motivating-reason',
          says:
            'That [name of plaintiff]’s [pursuit of/assisting in the enforcement of another’s right to] equal pay was a substantial motivating reason for [name of defendant]’s [discharging/[other adverse employment action]] [name of plaintiff]',
          from: 'CACI 2743',
        },
        { key: 'harmed', says: 'That [name of plaintiff] was harmed', from: 'CACI 2743' },
        {
          key: 'causation',
          says: 'That [name of defendant]’s retaliatory conduct was a substantial factor in causing [name of plaintiff]’s harm',
          from: 'CACI 2743',
        },
      ],
      remedy: NO_REMEDY_ON_FILE,
      expectedDefense: NO_DEFENSE_ON_FILE,
    },
  },
  {
    transcribedFrom: 'CACI 2753',
    proposedOn: '2026-10-06',
    forTheAttorney: 'Whether a contract of employment or an employer policy provided paid vacation is the first fact to find.',
    claim: {
      id: 'vested-vacation',
      name: 'Vested vacation pay',
      sections: ['LAB 227.3'],
      caci: '2753',
      elements: [
        {
          key: 'employer',
          says: 'That [name of defendant] was [a/an] [employer/[specify other covered entity]]',
          from: 'CACI 2753',
        },
        { key: 'employee', says: 'That [name of plaintiff] was an employee of [name of defendant]', from: 'CACI 2753' },
        {
          key: 'unpaid-vacation',
          says:
            'That [name of defendant] did not pay [him/her/nonbinary pronoun] for all earned and unused vacation time at [his/her/nonbinary pronoun] final rate of pay in accordance with the [contract of employment/employer policy]',
          from: 'CACI 2753',
        },
        {
          key: 'amount',
          says: 'The amount owed to [name of plaintiff] for earned and unused vacation time',
          from: 'CACI 2753',
        },
      ],
      remedy:
        'LAB 227.3, in its own words: "all vested vacation shall be paid to him as wages at his final rate in accordance with such contract of employment or employer policy respecting eligibility or time served".',
      expectedDefense: NO_DEFENSE_ON_FILE,
    },
  },
  {
    transcribedFrom: 'CACI 2754',
    proposedOn: '2026-10-06',
    forTheAttorney:
      'Reporting time pay is a duty in section 5 of the governing IWC Wage Order, which the Portal proposes and an attorney settles; until then the duty element needs authority, as rest periods do.',
    claim: {
      id: 'reporting-time-pay',
      name: 'Reporting time pay',
      sections: [],
      caci: '2754',
      elements: [
        {
          key: 'employer',
          says: 'That [name of defendant] was [a/an] [employer/[specify other covered entity]]',
          from: 'CACI 2754',
        },
        { key: 'employee', says: 'That [name of plaintiff] was an employee of [name of defendant]', from: 'CACI 2754' },
        {
          key: 'required-to-report',
          says:
            'That [name of defendant] required [name of plaintiff] to report to work for one or more [workdays/second shifts]',
          from: 'IWC {order} sec 5',
          needsAuthority:
            'The governing IWC Wage Order has not been settled for this employer. All seventeen are on file; which one applies is a legal classification this system proposes but does not decide.',
        },
        { key: 'reported', says: 'That [name of plaintiff] reported for work', from: 'CACI 2754' },
        {
          key: 'not-put-to-work',
          says:
            'That [name of defendant] [failed to put [name of plaintiff] to work/ furnished less than [half of the usual day’s work/two hours of work on a second shift]]',
          from: 'CACI 2754',
        },
      ],
      remedy:
        'CACI 2754, in its own words: "For each workday when an employee reports to work, as required, but is either not put to work or furnished with less than half the usual day’s hours, the employer must pay wages for half the usual or scheduled day’s hours at the employee’s regular rate of pay (and in no event for less than two hours or more than four hours)."',
      expectedDefense: NO_DEFENSE_ON_FILE,
    },
  },
  {
    transcribedFrom: 'CACI 2775',
    proposedOn: '2026-10-06',
    forTheAttorney:
      'Element 1 is in the alternative: either the policy is not fair and neutral on its face, or over time it failed to pay for all time worked. The instruction is for start- and end-of-shift punches; its Directions for Use say not to use it for meal-period rounding (Donohue, on file).',
    claim: {
      id: 'rounding',
      name: 'Nonpayment of wages under a rounding system',
      sections: [],
      caci: '2775',
      elements: [
        {
          key: 'not-fair-and-neutral',
          says: 'That [name of defendant]’s rounding policy is not fair and neutral on its face',
          from: 'CACI 2775',
        },
        {
          key: 'unpaid-over-time',
          says:
            'That, over time, [name of defendant]’s method of rounding resulted in failure to pay its [employees/specify subset of employees to which plaintiff belonged] for all time actually worked',
          from: 'CACI 2775',
        },
        {
          key: 'lost-compensation',
          says: 'That [name of defendant]’s method of rounding resulted in lost compensation for [name of plaintiff]',
          from: 'CACI 2775',
        },
        { key: 'amount', says: 'The amount of wages owed to [name of plaintiff]', from: 'CACI 2775' },
      ],
      remedy: 'The amount of wages owed, which is the instruction\'s own third element.',
      expectedDefense: NO_DEFENSE_ON_FILE,
    },
  },
]

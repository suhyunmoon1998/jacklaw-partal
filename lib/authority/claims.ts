/**
 * The claims a wage-and-hour case is made of, and what each one requires.
 *
 * These are written here, in the repository, and NOT produced by a model. That
 * is the whole design. A model asked "what are the elements of a meal-period
 * claim" will answer fluently and sometimes wrongly, and nothing downstream can
 * tell the difference. A model asked "which of these facts bears on this
 * element, whose text is quoted in front of you" is doing fact-matching, which
 * it is good at and which can be checked.
 *
 * Every element below traces to language in a section the portal actually holds
 * in full — see lib/authority/statutes.json, pulled from the Legislature's own
 * site. The `from` field names the section the element is read out of, and the
 * matrix quotes that section to the model rather than trusting either of us to
 * remember it.
 *
 * What is deliberately NOT here:
 *
 *   Wage Order duties. Rest periods come from IWC Wage Order section 12, not
 *   from the Labor Code — section 226.7 supplies the remedy and says the duty
 *   is "mandated pursuant to an applicable statute, or applicable regulation,
 *   standard, or order of the Industrial Welfare Commission". The Orders are
 *   not on file yet, so the rest-period claim carries its duty element marked
 *   as needing an authority the portal does not have, rather than stating a
 *   rule from memory.
 *
 *   Case law. Brinker, Augustus, Ferra, Naranjo and the rest decide what these
 *   sections mean, and none of them is on file. Where an element's answer turns
 *   on one, it says so.
 *
 * Nothing here is advice, and none of it reaches a client.
 */

export interface Element {
  /** Stable within the claim. */
  key: string
  /** What must be true, in the statute's own terms. */
  says: string
  /** The section this is read out of, as "LAB 512". */
  from: string
  /**
   * Set when the element cannot be settled from the statutes on file — a Wage
   * Order duty, or a question the cases decide. The matrix reports it as
   * unresolved rather than guessing.
   */
  needsAuthority?: string
}

export interface Claim {
  id: string
  /** As the office would say it. */
  name: string
  /** Sections that must be quoted to reason about this claim at all. */
  sections: string[]
  /** The Judicial Council's instruction, where one exists. */
  caci?: string
  elements: Element[]
  /** What the claim pays, in the statute's terms. */
  remedy: string
  /** The defence the office should expect, and what answers it. */
  expectedDefense: string
}

export const CLAIMS: Claim[] = [
  {
    id: 'meal-periods',
    name: 'Meal periods',
    sections: ['LAB 512', 'LAB 226.7'],
    caci: '2766',
    elements: [
      {
        key: 'over-five-hours',
        says: 'The employee worked a work period of more than five hours in a day.',
        from: 'LAB 512',
      },
      {
        key: 'no-thirty-minutes',
        says:
          'The employer did not provide a meal period of not less than 30 minutes for that day.',
        from: 'LAB 512',
      },
      {
        key: 'not-waived',
        says:
          'The meal period was not waived by mutual consent, which is only available where the total work period was no more than six hours.',
        from: 'LAB 512',
      },
      {
        key: 'second-meal',
        says:
          'Where a day exceeded 10 hours, a second meal period of not less than 30 minutes was not provided, and was not validly waived (available only up to 12 hours, and only if the first was not waived).',
        from: 'LAB 512',
      },
      {
        key: 'provided-means-relieved',
        says:
          'Whether a meal period that was nominally given counts as "provided" when the employee was interrupted or kept under the employer\'s control.',
        from: 'LAB 226.7',
        needsAuthority:
          'Brinker Restaurant Corp. v. Superior Court (2012) 53 Cal.4th 1004 — not on file. The statute says an employer "shall not require an employee to work during" the period; what that requires of the employer is decided by the case.',
      },
    ],
    remedy:
      'One additional hour of pay at the regular rate of compensation for each workday a meal period was not provided (LAB 226.7(c)). Work actually performed during the meal is separately compensable.',
    expectedDefense:
      'That the meal period was made available and the employee chose not to take it, or that it was validly waived. Answered by evidence the employer impeded, discouraged, or scheduled through it.',
  },
  {
    id: 'rest-periods',
    name: 'Rest periods',
    sections: ['LAB 226.7'],
    caci: '2761',
    elements: [
      {
        key: 'duty-owed',
        says: 'A rest period was mandated for the shifts the employee worked.',
        from: 'LAB 226.7',
        needsAuthority:
          'IWC Wage Order sec. 12 — NOT ON FILE. Section 226.7 supplies only the remedy and points at the Order for the duty. The number of rest periods a shift earns cannot be stated from the Labor Code alone.',
      },
      {
        key: 'not-provided',
        says: 'The employer failed to provide that rest period.',
        from: 'LAB 226.7',
      },
      {
        key: 'paid-time',
        says:
          'A rest period is counted as hours worked and no deduction from wages may be made for it.',
        from: 'LAB 226.7',
      },
      {
        key: 'relieved-of-duty',
        says:
          'Whether a break the employee remained on call or under control during counts as provided.',
        from: 'LAB 226.7',
        needsAuthority:
          'Augustus v. ABM Security Services (2016) 2 Cal.5th 257 — not on file.',
      },
    ],
    remedy:
      'One additional hour of pay at the regular rate of compensation for each workday a rest period was not provided (LAB 226.7(c)). Separate from any meal premium: the section allows one of each in a workday.',
    expectedDefense:
      'That rest periods were authorized and permitted and the employee declined them.',
  },
  {
    id: 'overtime',
    name: 'Overtime and double time',
    sections: ['LAB 510', 'LAB 1194', 'LAB 1198'],
    caci: '2702',
    elements: [
      {
        key: 'hours-worked',
        says:
          'The employee worked more than eight hours in a workday, or more than 40 in a workweek, or on a seventh consecutive day of a workweek.',
        from: 'LAB 510',
      },
      {
        key: 'not-paid-premium',
        says:
          'Those hours were not compensated at no less than one and one-half times the regular rate; and hours beyond 12 in a day, or beyond eight on a seventh day, not at twice the regular rate.',
        from: 'LAB 510',
      },
      {
        key: 'regular-rate',
        says:
          'The regular rate of pay on which the premium is computed, which is not necessarily the base hourly rate where there is other nondiscretionary compensation.',
        from: 'LAB 510',
        needsAuthority:
          'The composition of the regular rate is decided by case law and the Wage Orders, neither on file.',
      },
      {
        key: 'not-exempt',
        says:
          'The employee was not exempt. Exemption is the employer\'s affirmative defense and is not established by a job title or by being paid a salary.',
        from: 'LAB 510',
        needsAuthority: 'The exemption tests live in the Wage Orders — not on file.',
      },
    ],
    remedy:
      'The unpaid balance of the overtime compensation, with interest, attorney\'s fees and costs (LAB 1194).',
    expectedDefense:
      'Exemption, or that the hours were never worked. Answered by time records, schedules, messages, and the employer\'s own knowledge of the work.',
  },
  {
    id: 'minimum-wage',
    name: 'Minimum wage',
    sections: ['LAB 1197', 'LAB 1194', 'LAB 1194.2', 'LAB 1182.12'],
    caci: '2701',
    elements: [
      {
        key: 'applicable-minimum',
        says:
          'The minimum wage applicable to this employee for this period and work location.',
        from: 'LAB 1182.12',
        needsAuthority:
          'Section 1182.12 sets the state figure by year. A local ordinance may be higher and none is on file, so the worksite city must be established before any figure is used.',
      },
      {
        key: 'paid-less',
        says: 'The employee was paid a wage lower than that minimum.',
        from: 'LAB 1197',
      },
      {
        key: 'hours-uncompensated',
        says:
          'Hours for which nothing was paid are hours paid below the minimum, whatever the contract rate.',
        from: 'LAB 1194',
      },
    ],
    remedy:
      'The unpaid balance, with interest, fees and costs (LAB 1194), plus liquidated damages equal to the wages unlawfully unpaid and interest (LAB 1194.2). Liquidated damages do not extend to unpaid overtime.',
    expectedDefense:
      'That total pay over total hours exceeded the minimum. Whether that averaging is permitted is decided by case law not on file.',
  },
  {
    id: 'final-pay',
    name: 'Final pay and waiting-time penalties',
    sections: ['LAB 201', 'LAB 202', 'LAB 203'],
    caci: '2704',
    elements: [
      {
        key: 'employment-ended',
        says: 'The employment ended, by discharge or by the employee quitting.',
        from: 'LAB 201',
      },
      {
        key: 'due-date',
        says:
          'Wages were due immediately on discharge; on quitting, within 72 hours, or on the last day where at least 72 hours\' notice was given.',
        from: 'LAB 202',
      },
      {
        key: 'unpaid-at-separation',
        says: 'Some wages were still unpaid when they fell due.',
        from: 'LAB 203',
      },
      {
        key: 'willful',
        says:
          'The failure to pay was willful. A good-faith dispute over whether the wages were owed defeats this.',
        from: 'LAB 203',
      },
    ],
    remedy:
      'The employee\'s wages continue as a penalty at the same rate from the due date until paid or until an action is commenced, for not more than 30 days (LAB 203(a)).',
    expectedDefense:
      'A good-faith dispute that any wages were owed at all — which the client\'s own answer about whether anything is still owed may hand them.',
  },
  {
    id: 'wage-statements',
    name: 'Wage statements',
    sections: ['LAB 226'],
    caci: '2706',
    elements: [
      {
        key: 'statement-required',
        says:
          'The employer was required to furnish an accurate itemized statement, semimonthly or at each payment of wages.',
        from: 'LAB 226',
      },
      {
        key: 'item-missing',
        says:
          'A statement failed to show one of the items the section requires — gross wages, total hours worked, net wages, deductions, the pay period, the employee\'s and employer\'s identifying details, and all applicable hourly rates with the hours worked at each.',
        from: 'LAB 226',
      },
      {
        key: 'knowing-and-intentional',
        says:
          'The failure was knowing and intentional, and the employee suffered injury as the section defines it.',
        from: 'LAB 226',
      },
    ],
    remedy:
      'The greater of actual damages or the per-pay-period amounts in section 226(e), subject to the aggregate cap in that subdivision. The figures must be read off the section, never recalled.',
    expectedDefense:
      'That the defect was inadvertent, or that the employee suffered no injury.',
  },
  {
    id: 'expenses',
    name: 'Expense reimbursement',
    sections: ['LAB 2802'],
    caci: '2750',
    elements: [
      {
        key: 'expenditure',
        says: 'The employee incurred an expenditure or loss.',
        from: 'LAB 2802',
      },
      {
        key: 'necessary-and-in-consequence',
        says:
          'It was necessary and incurred in direct consequence of the discharge of the employee\'s duties, or of obedience to the employer\'s directions.',
        from: 'LAB 2802',
      },
      { key: 'not-indemnified', says: 'The employer did not indemnify it.', from: 'LAB 2802' },
    ],
    remedy:
      'Indemnification of the expenditure, with interest from the date it was incurred (LAB 2802(b)), and attorney\'s fees under subdivision (c).',
    expectedDefense:
      'That the expense was not necessary, or that a flat allowance already covered it.',
  },
  {
    id: 'gratuities',
    name: 'Gratuities',
    sections: ['LAB 351'],
    caci: '2752',
    elements: [
      {
        key: 'gratuity-paid',
        says: 'A patron paid, gave or left a gratuity for an employee.',
        from: 'LAB 351',
      },
      {
        key: 'employer-took-or-credited',
        says:
          'The employer or an agent collected, took or received it, deducted it from wages, or required it to be credited against wages due.',
        from: 'LAB 351',
      },
      {
        key: 'sole-property',
        says: 'Every gratuity is the sole property of the employee it was left for.',
        from: 'LAB 351',
      },
    ],
    remedy:
      'The gratuity is the employee\'s property. Time spent handling a tip pool at the employer\'s direction is separately compensable as hours worked.',
    expectedDefense:
      'That the arrangement was a valid tip pool among employees rather than the employer taking a share.',
  },
  {
    id: 'whistleblower',
    name: 'Whistleblower retaliation',
    sections: ['LAB 1102.5'],
    caci: '4600',
    elements: [
      {
        key: 'protected-activity',
        says:
          'The employee disclosed, or the employer believed the employee might disclose, information the employee had reasonable cause to believe showed a violation of law — to a government agency, to a person with authority over them, or to another employee with authority to investigate.',
        from: 'LAB 1102.5',
      },
      {
        key: 'adverse-action',
        says: 'The employer retaliated against the employee.',
        from: 'LAB 1102.5',
      },
      {
        key: 'contributing-factor',
        says:
          'The protected activity was a contributing factor in the adverse action; the employer then bears a clear-and-convincing burden to show it would have acted the same regardless.',
        from: 'LAB 1102.5',
      },
      {
        key: 'employer-knowledge',
        says: 'The person who decided knew of the protected activity.',
        from: 'LAB 1102.5',
      },
    ],
    remedy:
      'As provided by section 1102.5 and its subdivisions, read off the section.',
    expectedDefense:
      'That the decision-maker did not know of the complaint, or would have acted identically anyway.',
  },
  {
    id: 'ucl',
    name: 'Unfair competition (restitution of unpaid wages)',
    sections: ['BPC 17200', 'BPC 17203', 'BPC 17208'],
    elements: [
      {
        key: 'unlawful-practice',
        says:
          'A business act or practice that is unlawful, unfair or fraudulent — an underlying Labor Code violation supplies the unlawful prong.',
        from: 'BPC 17200',
      },
      {
        key: 'restitution',
        says: 'Restitution of money acquired by means of that practice.',
        from: 'BPC 17203',
      },
      {
        key: 'four-years',
        says: 'The action is brought within four years of the accrual of the cause of action.',
        from: 'BPC 17208',
      },
    ],
    remedy:
      'Restitution and injunctive relief (BPC 17203). Its value here is the four-year reach, where the wage claims themselves reach three.',
    expectedDefense:
      'That there is no underlying violation to supply the unlawful prong.',
  },
]

export const claimById = (id: string) => CLAIMS.find(c => c.id === id)

/** Every section any claim needs, so the authority layer can be checked against it. */
export function sectionsUsed(): string[] {
  const out = new Set<string>()
  for (const c of CLAIMS) {
    c.sections.forEach(s => out.add(s))
    c.elements.forEach(e => out.add(e.from))
  }
  return Array.from(out).sort()
}

/**
 * The claims a wage-and-hour or FEHA case is made of, and what each one requires.
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
 * What each element reads from:
 *
 *   Wage Order duties. Rest periods come from IWC Wage Order section 12, not
 *   from the Labor Code — section 226.7 supplies the remedy. All seventeen
 *   Orders are on file; an element written "IWC {order} sec 12" is quoted once
 *   an Order is settled for the employer, and until then reports as needing
 *   authority rather than picking one.
 *
 *   Case law. The holdings in lib/authority/cases.ts are quoted verbatim from
 *   opinions held in full. An element with a holding bearing on it is read
 *   against that passage; one without says what it is missing.
 *
 * Nothing here is advice, and none of it reaches a client.
 */

export interface Element {
  /** Stable within the claim. */
  key: string
  /** What must be true, in the statute's own terms. */
  says: string
  /**
   * The provision this is read out of, as "LAB 512".
   *
   * May carry the placeholder {order}, as "IWC {order} sec 12": a Wage Order
   * duty whose Order depends on the employer's industry. The matrix resolves
   * it from the Order settled for the case, and where none is settled the
   * element reports as needing authority rather than picking one.
   */
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
    sections: ['LAB 512', 'LAB 226.7', 'IWC {order} sec 11'],
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
    sections: ['LAB 226.7', 'IWC {order} sec 12'],
    caci: '2761',
    elements: [
      {
        key: 'duty-owed',
        says: 'A rest period was mandated for the shifts the employee worked.',
        from: 'IWC {order} sec 12',
        needsAuthority:
          'The governing IWC Wage Order has not been settled for this employer. All seventeen are on file; which one applies turns on the industry, and that is a legal classification this system proposes but does not decide. Section 226.7 supplies only the remedy and points at the Order for the duty.',
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
    // Section 3 of each Order ("Hours and Days of Work") carries the overtime
    // exceptions that are not the white-collar tests — the commission
    // exemption of Orders 4 and 7, section 3(D), among them.
    sections: ['LAB 510', 'LAB 515', 'LAB 1194', 'LAB 1198', 'IWC {order} sec 3'],
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
          'The composition of the overtime regular rate is decided by case law the portal does not hold. (Ferra, which is on file, decides the rate for meal and rest premiums only.)',
      },
      {
        key: 'not-exempt',
        says:
          'The employee was not exempt. Exemption is the employer\'s affirmative defense and is not established by a job title or by being paid a salary.',
        // The executive, administrative and professional tests are in section 1
        // of each Order ("Applicability of Order"), with the salary floor tied
        // to the minimum wage. This said "not on file" after all seventeen
        // Orders were put on file, and the matrix duly reported the element
        // as needing authority the portal had held for a week.
        from: 'IWC {order} sec 1',
        needsAuthority:
          'The exemption tests are in sections 1 and 3 of the governing IWC Wage Order, which has not been settled for this employer.',
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
    // The City of Los Angeles ordinance and its annual rates are on file; which
    // rate governs turns on whether the work was within the City as 187.01
    // defines it, and that is a fact the matrix reads, not a rule it supplies.
    // Section 1182.12 fixes the state rate only up to 2022 and leaves the rest
    // to annual adjustment; the Wage Order's section 4 prints each year's
    // figure. Without it the readings reported the state rates not on file.
    sections: ['LAB 1197', 'LAB 1194', 'LAB 1194.2', 'LAB 1182.12', 'IWC {order} sec 4', 'LAB 1474', 'LAB 1475', 'LAB 1182.14', 'LAB 1182.15', 'LAMC 187.01', 'LAMC 187.02', 'LAMW 2024-07-01', 'LAMW 2025-07-01', 'LAMW 2026-07-01'],
    caci: '2701',
    elements: [
      {
        key: 'applicable-minimum',
        says:
          'The minimum wage applicable to this employee for this period and work location: the state rate under section 1182.12, in the figure section 4 of the governing Wage Order gives for each year, and — for an employee who worked within the City of Los Angeles as LAMC 187.01 defines it — the City rate set under LAMC 187.02 and announced in the Office of Wage Standards notices on file. Health-care employers carry their own minimums under sections 1182.14 and 1182.15, and a fast food restaurant as section 1474 defines it carries the minimum set under section 1475; all three are quoted. Nothing else is on file: where the facts do not place the work within the City, place it in another city or unincorporated county territory, or put the employer in another industry with its own minimum, the element is unknown until that is established.',
        from: 'LAB 1182.12',
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
      'That total pay over total hours exceeded the minimum. Armenta (on file) rejects averaging: the minimum applies to each hour worked and not paid for.',
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

/**
 * FEHA claims, read in their own stage (see lib/caseReading.ts, 'claims 3').
 *
 * Kept apart from CLAIMS so the wage-and-hour stages read exactly what they
 * read before, and a FEHA claim cannot shift a wage claim from one stage to
 * the next and silently change what either stage was read under.
 */
export const FEHA_CLAIMS: Claim[] = [
  // Element wording follows the Judicial Council's instructions (CACI 2500,
  // 2540, 2541, 2546, 2521A, 2527, 2505 — the July 2026 supplement where it
  // revised them), restated in the statute's terms. Each element names the
  // provision the matrix quotes for it. Written by hand, for an attorney to
  // review before any reading resting on them is relied on.
  {
    id: 'feha-discrimination',
    name: 'FEHA discrimination (disparate treatment)',
    sections: ['GOV 12940', 'GOV 12926'],
    caci: '2500',
    elements: [
      {
        key: 'covered-relationship',
        says:
          'The defendant was an employer as section 12926 defines it, and the plaintiff was its employee or an applicant for a job with it.',
        from: 'GOV 12926',
      },
      {
        key: 'adverse-action',
        says:
          'The defendant discharged the plaintiff, refused to hire the plaintiff, or otherwise took an adverse employment action against the plaintiff — or the plaintiff was constructively discharged.',
        from: 'GOV 12940',
      },
      {
        key: 'substantial-motivating-reason',
        says:
          'A characteristic section 12940(a) protects — or a combination of them — was a substantial motivating reason for the action.',
        from: 'GOV 12940',
      },
      {
        key: 'harm-caused',
        says: "The plaintiff was harmed, and the defendant's conduct was a substantial factor in causing the harm.",
        from: 'CACI 2500',
      },
    ],
    remedy:
      "Actual damages including back pay and emotional distress, and a prevailing plaintiff's attorney's fees and costs (GOV 12965). Punitive damages turn on Civil Code section 3294, which is not on file.",
    expectedDefense:
      'A legitimate, nondiscriminatory reason for the action. Answered by evidence the stated reason is false or pretextual — timing, comparators, shifting explanations, statements.',
  },
  {
    id: 'feha-disability-discrimination',
    name: 'FEHA disability discrimination',
    sections: ['GOV 12940', 'GOV 12926', 'GOV 12926.1', 'CCR2 11065'],
    caci: '2540',
    elements: [
      {
        key: 'covered-relationship',
        says:
          'The defendant was an employer as section 12926 defines it, and the plaintiff was its employee or an applicant for a job with it.',
        from: 'GOV 12926',
      },
      {
        key: 'disability-known',
        says:
          'The defendant knew the plaintiff had, or had a history of, a physical or mental disability or medical condition as section 12926 defines it — or the defendant perceived or treated the plaintiff as having one.',
        from: 'GOV 12926',
      },
      {
        key: 'able-to-perform',
        says:
          'The plaintiff was able to perform the essential duties of the position, with or without reasonable accommodation.',
        from: 'GOV 12940',
      },
      {
        key: 'adverse-action',
        says:
          'The defendant discharged the plaintiff, refused to hire the plaintiff, or otherwise took an adverse employment action against the plaintiff — or the plaintiff was constructively discharged.',
        from: 'GOV 12940',
      },
      {
        key: 'substantial-motivating-reason',
        says:
          'The disability, its history, or the perception of it was a substantial motivating reason for the action.',
        from: 'GOV 12940',
      },
      {
        key: 'harm-caused',
        says: "The plaintiff was harmed, and the defendant's conduct was a substantial factor in causing the harm.",
        from: 'CACI 2540',
      },
    ],
    remedy:
      "Actual damages including back pay and emotional distress, and a prevailing plaintiff's attorney's fees and costs (GOV 12965). Punitive damages turn on Civil Code section 3294, which is not on file.",
    expectedDefense:
      'That the plaintiff could not perform the essential duties even with accommodation, or that the decision rested on a reason unrelated to the disability.',
  },
  {
    id: 'feha-accommodation',
    name: 'FEHA failure to reasonably accommodate',
    sections: ['GOV 12940', 'GOV 12926', 'CCR2 11065', 'CCR2 11068'],
    caci: '2541',
    elements: [
      {
        key: 'covered-relationship',
        says:
          'The defendant was an employer as section 12926 defines it, and the plaintiff was its employee or an applicant for a job with it.',
        from: 'GOV 12926',
      },
      {
        key: 'disability',
        says:
          'The plaintiff had a physical or mental disability or medical condition as section 12926 defines it, or the defendant treated the plaintiff as having one.',
        from: 'GOV 12926',
      },
      {
        key: 'employer-knew',
        says: 'The defendant knew of it.',
        from: 'GOV 12940',
      },
      {
        key: 'able-with-accommodation',
        says:
          'With reasonable accommodation, the plaintiff could perform the essential duties of the current position, of a vacant position the plaintiff could have been reassigned to, or of the position applied for.',
        from: 'GOV 12940',
      },
      {
        key: 'not-accommodated',
        says: 'The defendant failed to make reasonable accommodation.',
        from: 'GOV 12940',
      },
      {
        key: 'harm-caused',
        says:
          "The plaintiff was harmed, and the failure to accommodate was a substantial factor in causing the harm.",
        from: 'CACI 2541',
      },
    ],
    remedy:
      "Actual damages and a prevailing plaintiff's attorney's fees and costs (GOV 12965).",
    expectedDefense:
      'That the accommodation requested would have imposed an undue hardship, that an effective accommodation was offered, or that the employer was never told of the limitation.',
  },
  {
    id: 'feha-interactive-process',
    name: 'FEHA failure to engage in the interactive process',
    sections: ['GOV 12940', 'GOV 12926', 'CCR2 11068', 'CCR2 11069'],
    caci: '2546',
    elements: [
      {
        key: 'covered-relationship',
        says:
          'The defendant was an employer as section 12926 defines it, and the plaintiff was its employee or an applicant for a job with it.',
        from: 'GOV 12926',
      },
      {
        key: 'known-disability',
        says: 'The plaintiff had a physical or mental disability or medical condition the defendant knew of.',
        from: 'GOV 12940',
      },
      {
        key: 'requested',
        says:
          'The plaintiff requested reasonable accommodation so as to be able to perform the essential job requirements — or the defendant otherwise learned of the need for one, which the regulation (2 CCR 11069(b)) treats as starting its duty. Whether a request is required where the need was known or obvious is a question the statute and the regulation answer differently; say which facts go to each.',
        from: 'GOV 12940',
      },
      {
        key: 'willing',
        says: 'The plaintiff was willing to take part in an interactive process to find one.',
        from: 'GOV 12940',
      },
      {
        key: 'failed-to-engage',
        says:
          'The defendant failed to engage in a timely, good faith, interactive process to determine effective reasonable accommodations.',
        from: 'GOV 12940',
      },
      {
        key: 'accommodation-available',
        says:
          'A reasonable accommodation could have been made when the interactive process should have taken place (CACI 2546, bracketed element 7).',
        from: 'CACI 2546',
        needsAuthority:
          'CACI 2546 says there is a split of authority on whether the employee must prove this (Shirvanyan and Nadaf-Rahrov require it; Wysinger and Claudio do not). None of those cases is on file. Report the facts that bear on availability; which line governs is an attorney\'s decision.',
      },
      {
        key: 'harm-caused',
        says:
          "The plaintiff was harmed, and the failure to engage was a substantial factor in causing the harm.",
        from: 'CACI 2546',
      },
    ],
    remedy:
      "Actual damages and a prevailing plaintiff's attorney's fees and costs (GOV 12965).",
    expectedDefense:
      'That the employer did engage, or that the breakdown was the employee’s — missed meetings, no medical information supplied.',
  },
  {
    id: 'feha-harassment',
    name: 'FEHA hostile work environment harassment',
    sections: ['GOV 12940', 'GOV 12923'],
    caci: '2521A',
    elements: [
      {
        key: 'covered-relationship',
        says:
          'The plaintiff was an employee, an applicant, an unpaid intern or volunteer, or a person providing services under a contract with the defendant.',
        from: 'GOV 12940',
      },
      {
        key: 'harassing-conduct',
        says:
          'The plaintiff was subjected to harassing conduct because of a characteristic section 12940 protects, or a combination of them.',
        from: 'GOV 12940',
      },
      {
        key: 'severe-or-pervasive',
        says:
          'The conduct was severe or pervasive: a reasonable person with the plaintiff’s characteristic in the plaintiff’s circumstances would have found the work environment hostile, intimidating, offensive, oppressive, or abusive — and the plaintiff did.',
        from: 'GOV 12923',
      },
      {
        key: 'employer-liable',
        says:
          'A supervisor engaged in the conduct; or the defendant, its supervisors or agents knew or should have known of it and failed to take immediate and appropriate corrective action.',
        from: 'GOV 12940',
      },
      {
        key: 'harm-caused',
        says: 'The plaintiff was harmed, and the conduct was a substantial factor in causing the harm.',
        from: 'CACI 2521A',
      },
    ],
    remedy:
      "Actual damages including emotional distress, and a prevailing plaintiff's attorney's fees and costs (GOV 12965). A harasser may be personally liable under section 12940(j).",
    expectedDefense:
      'That the conduct was not severe or pervasive, was not because of a protected characteristic, or — for a coworker — that the employer did not know and acted once it did.',
  },
  {
    id: 'feha-failure-to-prevent',
    name: 'FEHA failure to prevent harassment, discrimination or retaliation',
    sections: ['GOV 12940'],
    caci: '2527',
    elements: [
      {
        key: 'covered-relationship',
        says:
          'The plaintiff was an employee of the defendant, an applicant, or a person providing services under a contract with it.',
        from: 'GOV 12940',
      },
      {
        key: 'underlying-violation',
        says:
          'The plaintiff was subjected to harassment, discrimination, or retaliation in the course of employment. This claim does not stand without one.',
        from: 'GOV 12940',
      },
      {
        key: 'no-reasonable-steps',
        says: 'The defendant failed to take all reasonable steps necessary to prevent it from occurring.',
        from: 'GOV 12940',
      },
      {
        key: 'harm-caused',
        says:
          'The plaintiff was harmed, and that failure was a substantial factor in causing the harm.',
        from: 'CACI 2527',
      },
    ],
    remedy:
      "Actual damages and a prevailing plaintiff's attorney's fees and costs (GOV 12965).",
    expectedDefense:
      'That there was no underlying violation, or that policies, training and a working complaint procedure were in place and used.',
  },
  {
    id: 'feha-retaliation',
    name: 'FEHA retaliation',
    sections: ['GOV 12940'],
    caci: '2505',
    elements: [
      {
        key: 'protected-activity',
        says:
          'The plaintiff opposed a practice FEHA forbids — or one the plaintiff reasonably and in good faith believed it forbids (CACI 2505) — filed a complaint, testified or assisted in a FEHA proceeding, or requested an accommodation for a disability or for religious belief or observance. The underlying conduct need not be proved unlawful.',
        from: 'GOV 12940',
      },
      {
        key: 'adverse-action',
        says:
          'The defendant discharged, expelled, or otherwise discriminated against the plaintiff — an action that materially affected the terms, conditions, or privileges of employment — or the plaintiff was constructively discharged.',
        from: 'GOV 12940',
      },
      {
        key: 'substantial-motivating-reason',
        says: 'The protected activity was a substantial motivating reason for the action.',
        from: 'GOV 12940',
      },
      {
        key: 'harm-caused',
        says:
          'The plaintiff was harmed, and the action was a substantial factor in causing the harm.',
        from: 'CACI 2505',
      },
    ],
    remedy:
      "Actual damages and a prevailing plaintiff's attorney's fees and costs (GOV 12965).",
    expectedDefense:
      'That the action was taken for a legitimate reason independent of the protected activity, or that it was too minor to be an adverse employment action.',
  },
]

/** Every claim the portal reads, wage-and-hour first. */
export const ALL_CLAIMS: Claim[] = [...CLAIMS, ...FEHA_CLAIMS]

export const claimById = (id: string) => ALL_CLAIMS.find(c => c.id === id)

/** Every section any claim needs, so the authority layer can be checked against it. */
export function sectionsUsed(): string[] {
  const out = new Set<string>()
  for (const c of ALL_CLAIMS) {
    c.sections.forEach(s => out.add(s))
    c.elements.forEach(e => out.add(e.from))
  }
  return Array.from(out).sort()
}

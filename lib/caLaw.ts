/**
 * The law a client's answers are read against.
 *
 * Two parts, and they do different jobs. DAMAGES_SOURCE is the office's own
 * methodology document, kept here word for word: it decides how a number is
 * arrived at, what may not be added to what, and — the part that matters most
 * for an automated reading — that a missing fact is named rather than invented.
 * STATUTORY_MAP is the provisions themselves, so an issue comes back as
 * "Labor Code 512 and Wage Order 5" rather than as a feeling.
 *
 * Both live in the repository rather than in a database row or an uploaded
 * file, because every analysis the office relies on should be traceable to a
 * version of this text that can be read, reviewed and diffed. LAW_VERSION is
 * part of what a cached analysis is keyed on, so editing this file marks every
 * stored analysis stale instead of leaving old reasoning to look current.
 *
 * Nothing here is advice and none of it is shown to a client.
 */

/** Bump on every substantive edit below. Stored analyses older than this show as stale. */
export const LAW_VERSION = '2026-09-16.1'

/**
 * CALIFORNIA WAGE & HOUR DAMAGES SOURCE 1.0 — the office's own document,
 * reproduced in full. Do not paraphrase it here; replace it with the next
 * version when the office issues one, and bump LAW_VERSION.
 */
export const DAMAGES_SOURCE = `# CALIFORNIA WAGE & HOUR DAMAGES SOURCE 1.0

This document is the default damages methodology for California wage-and-hour matters in this Project.

Use it as the baseline source for preliminary damages calculations, intake evaluations, case assessments, settlement analysis, and damages summaries.

The purpose is to create calculations that are:

- Consistent
- Transparent
- Easy to audit
- Easy to update
- Legally supportable
- Free from avoidable double counting

When case-specific facts or verified current law conflict with this source, the case-specific facts and current controlling law govern.

---

# 1. CORE DAMAGES INPUTS

For most preliminary wage-and-hour calculations, first identify:

1. Pay rate
2. Employment period
3. Weeks worked
4. Days worked per week
5. Hours worked per day
6. Hours worked per week
7. Frequency of each violation per week
8. Amount of unpaid work per day or week
9. Whether employment ended
10. Whether compensation changed during employment

When exact information is unavailable, use a clearly labeled estimate.

Do not silently invent missing facts.

---

# 2. EMPLOYMENT BASELINE

Identify:

- Employee
- Employer
- Employment start date
- Employment end date
- Current or former employee
- Hourly rate or rates
- Salary
- Piece rate
- Commission
- Bonus or incentive compensation
- Days worked per week
- Hours worked per day
- Hours worked per week
- Significant periods not worked

Approximate weeks may be calculated as:

Employment days ÷ 7

or, where appropriate:

Months worked × 4.33

Use exact dates when available.

---

# 3. PRIMARY DAMAGES CATEGORIES

Analyze applicable damages separately:

1. Unpaid straight-time wages
2. Off-the-clock wages
3. Overtime
4. Double time
5. Meal-period premiums
6. Rest-period premiums
7. Minimum-wage deficiencies
8. Liquidated damages
9. Waiting-time penalties
10. Wage-statement damages
11. Expense reimbursement
12. Piece-rate violations
13. Other statutory wage remedies
14. PAGA
15. Interest
16. Attorney's fees and costs

Do not automatically assume every category applies.

---

# 4. UNPAID STRAIGHT TIME AND OFF-THE-CLOCK WORK

Examples include:

- Work before clock-in
- Work after clock-out
- Work during unpaid meals
- Cleaning
- Setup
- Shutdown
- Work calls
- Text messages
- Administrative work
- Waiting time
- Required work from home
- Other uncompensated tasks

Basic formula:

Unpaid hours × applicable hourly rate

Example:

30 unpaid minutes/day  
× 5 days/week  
= 2.5 unpaid hours/week

2.5 hours  
× 100 weeks  
= 250 hours

250 hours  
× $20  
= $5,000

Before classifying this as straight time, determine whether the additional work created overtime or double-time hours.

Do not count the same unpaid hour twice.

---

# 5. OVERTIME

Determine actual hours worked, including off-the-clock work.

Evaluate applicable California daily and weekly overtime rules.

Basic preliminary formula:

Unpaid overtime hours  
× applicable overtime rate

For a straightforward hourly employee, the preliminary rate may be:

Regular rate × 1.5

The legal regular rate may differ from the base hourly rate where compensation includes:

- Bonuses
- Commissions
- Piece-rate earnings
- Shift differentials
- Multiple hourly rates
- Other nondiscretionary compensation

---

# 6. DOUBLE TIME

Calculate separately from ordinary overtime.

Basic preliminary formula:

Eligible double-time hours  
× applicable double-time rate

For a straightforward hourly employee:

Regular rate × 2

The same hour should not be counted as both overtime and double time.

---

# 7. MEAL-PERIOD PREMIUMS

Quantify violations primarily by affected workday.

Relevant facts include:

- No meal provided
- Meal began too late
- Meal was less than 30 minutes
- Meal was interrupted
- Employee performed work during meal
- Employee remained under employer control
- Employee could not leave
- Second meal issues
- Validity of any waiver

Preliminary formula:

Average violating days/week  
× weeks worked  
= estimated violation workdays

Then:

Violation workdays  
× applicable regular rate of compensation  
= estimated meal premiums

Example:

4 violation days/week  
× 100 weeks  
= 400 workdays

400  
× $20  
= $8,000

Analyze any work performed during the meal separately as unpaid wages.

---

# 8. REST-PERIOD PREMIUMS

Determine:

- Number of required rest periods
- Whether rest periods were authorized and permitted
- Whether employee actually had an opportunity to take them
- Whether work interrupted them
- Whether employee remained under employer control
- Approximate affected workdays per week

Preliminary formula:

Average violating days/week  
× weeks worked  
= estimated violation workdays

Violation workdays  
× applicable regular rate  
= estimated rest premiums

Keep meal and rest calculations separate.

---

# 9. MINIMUM-WAGE DEFICIENCY

Determine the legally applicable minimum wage for the employee's work location and time period.

Formula:

Applicable minimum wage  
− effective hourly compensation  
= hourly deficiency

Hourly deficiency  
× affected hours  
= minimum-wage damages

If minimum wage or location changed during employment, calculate separate periods.

---

# 10. LIQUIDATED DAMAGES

Analyze separately.

Do not apply liquidated damages automatically to all wage damages.

Where legally available, identify the portion of damages constituting qualifying unpaid minimum wages and calculate the potential additional statutory amount.

Label as:

Potential liquidated damages.

---

# 11. WAITING-TIME PENALTIES

Analyze only where employment ended.

Determine:

- Date employment ended
- Fired or resigned
- Final rate
- Normal daily hours
- Amount unpaid at separation
- Date final wages were paid
- Whether failure to pay was willful

Preliminary formula:

Daily wage  
× qualifying penalty days

Apply the legally permitted cap.

Do not automatically assume the maximum number of days.

---

# 12. WAGE-STATEMENT DAMAGES

Analyze separately from underlying wage violations.

Review whether wage statements accurately contained required information, including where relevant:

- Gross wages
- Net wages
- Hours
- Rates
- Deductions
- Employer information
- Employee information
- Piece-rate information
- Other required statutory information

Do not automatically add wage-statement damages merely because unpaid wages exist.

---

# 13. BUSINESS EXPENSE REIMBURSEMENT

Potential categories include:

- Cell phone
- Mileage
- Vehicle
- Tools
- Equipment
- Uniforms
- Supplies
- Internet
- Home-office expenses
- Required purchases

Formula:

Reasonable reimbursable amount  
× applicable frequency or period

Use the legally appropriate reimbursement methodology for the relevant period.

---

# 14. PIECE-RATE CASES

Where compensation was based on production or pieces, separately evaluate:

- Piece-rate earnings
- Nonproductive time
- Rest and recovery compensation
- Overtime regular rate
- Minimum wage
- Wage statements
- Rate changes
- Setup time
- Waiting
- Loading
- Cleaning
- Travel
- Administrative work

Do not assume piece-rate pay automatically compensated all hours worked.

---

# 15. PAGA

PAGA must be calculated separately from individual damages.

Potential analysis includes:

- Alleged Labor Code violations
- Aggrieved-employee period
- Pay periods
- Number of affected employees
- Statutory penalty structure
- Cure issues
- Current allocation rules
- Potential overlapping penalties

Do not automatically stack every possible violation for every pay period.

Label preliminary calculations:

Potential PAGA exposure — separate statutory analysis required.

---

# 16. INTEREST

Calculate prejudgment interest where legally recoverable and sufficient information exists.

Identify:

- Principal amount
- Date wages became due
- Applicable rate
- Time period

For early intake:

Interest: not yet calculated

is acceptable if sufficient facts are unavailable.

---

# 17. ATTORNEY'S FEES AND COSTS

Attorney's fees and litigation costs should generally be kept separate from employee damages.

Use:

Employee damages: $____

Statutory penalties: $____

PAGA: $____

Interest: $____

Attorney's fees and costs: separate

---

# 18. LOW / MOST LIKELY / HIGH ANALYSIS

When facts are uncertain, use three scenarios.

Example:

Meal violations:

Low: 3 days/week

Most likely: 4 days/week

High: 5 days/week

Calculate each scenario separately.

Do not present an uncertain estimate as an exact historical fact.

---

# 19. SHOW THE MATH

Every material damages figure should show its formula.

Example:

Meal premiums:

4 days/week  
× 150 weeks  
× $24  
= $14,400

A final damages number without supporting math is incomplete.

---

# 20. DOUBLE-COUNTING CHECK

Before totaling damages, review for overlap between:

- Straight time and overtime
- Overtime and double time
- Off-the-clock work and overtime
- Meal/rest premiums and wages for actual work
- Minimum-wage damages and unpaid wages
- Individual damages and PAGA penalties
- Wage-statement damages and underlying unpaid wages

If overlap is legally uncertain, identify the issue rather than silently adding both amounts.

---

# 21. STANDARD DAMAGES OUTPUT

Use this structure:

## Employment Baseline

Employment period: _____

Weeks worked: _____

Days/week: _____

Hours/day: _____

Rate(s): _____

Estimated workdays: _____

## Individual Damages

Unpaid straight time: $____

Off-the-clock wages: $____

Overtime: $____

Double time: $____

Meal premiums: $____

Rest premiums: $____

Minimum-wage damages: $____

Liquidated damages: $____

Waiting-time penalties: $____

Wage-statement damages: $____

Expense reimbursement: $____

Other damages: $____

### Individual Damages Subtotal

$________

## Separate Exposure

PAGA: $____

Interest: $____

Attorney's fees: separate

Costs: separate

---

# 22. MISSING FACTS

After each calculation, identify only missing facts that could materially affect the result.

Examples:

- Exact employment dates
- Rate changes
- Work location
- Hours per day
- Violation frequency
- Off-the-clock minutes
- Bonuses or commissions
- Final paycheck information
- Pay periods
- Expenses

---

# 23. FINAL DAMAGES SUMMARY

End with:

Known or strongly supported damages: $____

Reasonably estimated damages: $____

Potential additional statutory damages: $____

Potential PAGA exposure: $____

Interest: _____

Attorney's fees and costs: separate

Preliminary total excluding PAGA, interest, fees, and costs: $____

Identify the primary drivers of case value in one to three sentences.

---

# 24. GOVERNING PRINCIPLE

The goal is not to generate the highest possible damages number.

The goal is to generate the most accurate, supportable, transparent, and useful damages assessment available from the facts.

Always distinguish:

FACT

ESTIMATE

ASSUMPTION

LEGAL ISSUE REQUIRING CONFIRMATION

Do not fabricate missing facts.

Where current law affects the calculation, verify the current California rule before relying on it.`

/**
 * The provisions the damages methodology operates on.
 *
 * Drafted to give the reading a citation to hang each issue on. Rates, caps and
 * allocations that change from year to year are deliberately NOT stated as
 * figures — they are marked as needing confirmation, because a number that has
 * quietly gone out of date is worse in a case file than an acknowledged gap.
 */
export const STATUTORY_MAP = `# CALIFORNIA WAGE & HOUR — PROVISIONS

Cite the provision that governs the fact, not every provision in the area. Where
a rule depends on the industry, name the Wage Order that applies and say so.

---

## HOURS WORKED AND OFF-THE-CLOCK WORK

Hours worked means time the employee is suffered or permitted to work, and all
time under the employer's control (IWC Wage Orders, sec. 2).

- Frlekin v. Apple (2020) 8 Cal.5th 1038 — time under employer control is
  compensable even when the employee is doing nothing productive.
- Troester v. Starbucks (2018) 5 Cal.5th 829 — California generally does not
  apply the federal de minimis rule to small amounts of regularly occurring
  work off the clock.

Unpaid hours are recovered as wages: Lab. Code secs. 1194, 1197, 218.

---

## OVERTIME AND DOUBLE TIME — Lab. Code sec. 510; Wage Orders sec. 3

- 1.5x: over 8 hours in a workday; over 40 hours in a workweek; first 8 hours on
  the 7th consecutive day of a workweek.
- 2x: over 12 hours in a workday; over 8 hours on the 7th consecutive day of a
  workweek.

The overtime rate is built on the regular rate of pay, which includes
nondiscretionary bonuses, commissions, piece-rate earnings, shift differentials
and multiple hourly rates — not the base hourly rate alone.

One day's rest in seven: Lab. Code secs. 551, 552; Mendoza v. Nordstrom (2017)
2 Cal.5th 1074 (measured by the workweek, not any rolling seven days).

Exempt status is an employer's affirmative defense and is not established by a
job title or by being paid a salary.

---

## MEAL PERIODS — Lab. Code sec. 512; Wage Orders sec. 11

- 30 minutes, uninterrupted and off duty, beginning before the end of the 5th
  hour of work.
- Waivable by mutual consent only where the day's work does not exceed 6 hours.
- Second meal period before the end of the 10th hour; waivable only where the
  day does not exceed 12 hours and the first meal period was not waived.

- Brinker v. Superior Court (2012) 53 Cal.4th 1004 — the employer must relieve
  the employee of all duty, relinquish control, and give a reasonable
  opportunity to take an uninterrupted 30 minutes; it need not police that the
  break is taken, but it may not impede or discourage it.
- Donohue v. AMN Services (2021) 11 Cal.5th 58 — meal periods may not be
  rounded, and records showing short, late or missed meals raise a rebuttable
  presumption that a premium is owed.

Work performed during a meal period is separately compensable as hours worked,
in addition to any premium.

---

## REST PERIODS — Wage Orders sec. 12

- 10 net minutes, paid, per 4 hours worked or major fraction thereof; ordinarily
  in the middle of each work period.
- None required where the total daily work time is under 3.5 hours.
- Augustus v. ABM Security Services (2016) 2 Cal.5th 257 — on-duty and on-call
  rest periods are not permitted; the employee must be relieved of all duty and
  free of employer control.

A rest period added onto a meal period, or placed at the start or end of a
shift, does not satisfy the requirement.

---

## MEAL AND REST PREMIUMS — Lab. Code sec. 226.7

One additional hour of pay per workday for meal violations, and one additional
hour per workday for rest violations — so a maximum of two premium hours in a
single workday, no matter how many breaks were affected.

- Ferra v. Loews Hollywood Hotel (2021) 11 Cal.5th 858 — the premium is paid at
  the regular rate of pay, including nondiscretionary compensation, not the base
  hourly rate.
- Naranjo v. Spectrum Security Services (2022) 13 Cal.5th 93 — premiums are
  wages; unpaid premiums can therefore support waiting-time penalties under
  sec. 203 and wage-statement claims under sec. 226.

---

## MINIMUM WAGE — Lab. Code secs. 1182.12, 1194, 1194.2, 1197, 1197.1

The applicable minimum wage depends on the year and on the city or county of the
work location, and many local ordinances exceed the state rate. CONFIRM the rate
for each period and location; do not assume the state figure.

Liquidated damages equal to the unpaid minimum wages plus interest are available
under sec. 1194.2, and are distinct from the unpaid wages themselves.

---

## REPORTING TIME AND SPLIT SHIFTS — Wage Orders secs. 4, 5

- Reporting time pay: an employee who reports as scheduled and is given less
  than half the scheduled day's work is owed half the scheduled day, not less
  than 2 nor more than 4 hours at the regular rate.
- Split shift premium: one hour at the minimum wage, where a day's work is
  interrupted by an unpaid non-meal period.

---

## PIECE RATE — Lab. Code sec. 226.2

Rest and recovery periods and other nonproductive time must be separately
compensated; piece-rate earnings are not treated as covering them. Wage
statements must itemise those hours and rates.

---

## EXPENSE REIMBURSEMENT — Lab. Code sec. 2802

Necessary expenditures incurred in the discharge of duties must be indemnified,
including tools, equipment, required uniforms, supplies, mileage and personal
cell phone or internet used for work.

- Cochran v. Schwan's Home Service (2014) 228 Cal.App.4th 1137 — a reasonable
  percentage of the phone bill must be reimbursed even where the employee paid
  a flat rate and incurred no extra cost.

---

## WAGE STATEMENTS — Lab. Code sec. 226

Every statement must show the nine items in sec. 226(a): gross wages earned,
total hours worked, piece-rate units and rates where applicable, net wages,
deductions, the pay period covered, the employee's name and identifying number,
the legal name and address of the employer, and all applicable hourly rates with
the hours worked at each.

Statutory damages under sec. 226(e) require a knowing and intentional failure
and are capped; CONFIRM the current per-pay-period amounts and aggregate cap.
Do not add a wage-statement claim merely because wages were unpaid — identify
what the statement itself failed to show.

---

## FINAL PAY AND WAITING-TIME PENALTIES — Lab. Code secs. 201, 202, 203

- Discharged: all wages due immediately.
- Resigned with at least 72 hours' notice: due on the last day.
- Resigned without notice: due within 72 hours.

Willful failure to pay carries a penalty of the employee's daily wage for each
day the wages are late, up to a statutory maximum of 30 days. Applies only where
employment has ended, and only where something was actually still owed at
separation. A good-faith dispute defeats willfulness.

---

## RETALIATION

- Lab. Code sec. 98.6 — retaliation for complaining about wages or exercising
  rights under the Labor Code.
- Lab. Code sec. 1102.5 — whistleblower retaliation; sec. 1102.6 puts a
  clear-and-convincing burden on the employer once the employee shows the
  protected activity was a contributing factor (Lawson v. PPG Architectural
  Finishes (2022) 12 Cal.5th 703).
- Lab. Code sec. 6310 — retaliation for health and safety complaints.
- Lab. Code sec. 232.5 — retaliation for discussing working conditions.

Look for the protected activity, the adverse action, whether the decision-maker
knew of the activity, and the time between them.

---

## INTEREST — Lab. Code sec. 218.6; Civ. Code sec. 3289(b)

Prejudgment interest on unpaid wages, from the date each amount became due.

---

## LIMITATIONS

- 3 years: statutory wage claims, including overtime, minimum wage, meal and
  rest premiums, and sec. 226 claims (Code Civ. Proc. sec. 338(a)).
- 4 years: unpaid wages recovered as restitution under the Unfair Competition
  Law (Bus. & Prof. Code sec. 17200 et seq.).
- 1 year: penalties (Code Civ. Proc. sec. 340(a)).
- Waiting-time penalties under sec. 203 may be sought within the same period as
  an action for the wages themselves (sec. 203(b)).
- PAGA: 1 year before the LWDA notice, subject to tolling.

Where the employment period runs past a limitations boundary, say which part of
the claimed period is inside it.

---

## PAGA — Lab. Code sec. 2698 et seq.

Calculated separately from individual damages and never merged into them.
Requires LWDA notice and exhaustion. The 2024 reform changed the penalty
structure, the cure provisions and the employee allocation, and applies by the
date of the LWDA notice. CONFIRM the current structure and allocation before
stating any figure; label anything computed here as potential exposure
requiring separate statutory analysis.

---

## WAGE ORDERS

Which of the 17 IWC Wage Orders applies depends on the industry or occupation.
The common ones: Order 4 (professional, technical, clerical, mechanical),
Order 5 (public housekeeping — restaurants, hotels, care facilities), Order 7
(mercantile — retail), Order 9 (transportation), Order 16 (construction,
drilling, mining). Where the industry is not established by the answers, say
which Order you assumed and that it needs confirming.
`

/** Everything the reading is grounded on, in the order it should be read. */
export const LEGAL_SOURCE = `${DAMAGES_SOURCE}

---

${STATUTORY_MAP}`

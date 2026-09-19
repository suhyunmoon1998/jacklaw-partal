/**
 * The decided cases, and the passages the office relies on.
 *
 * A statute can be quoted whole. A case cannot: Brinker is a hundred and
 * twenty thousand characters and the sentence that decides what "provide"
 * means is one of them. So this file does what claims.ts does for elements —
 * it names, in the repository, the passage that carries each rule, and the
 * matrix quotes that passage rather than asking a model what the case held.
 *
 * The reason is the same one and it is worth restating. A model asked "what
 * does Brinker hold" produces a fluent paragraph that is usually right, is
 * sometimes subtly wrong, and is never checkable. A model handed forty words
 * the Supreme Court actually wrote, and asked whether these facts satisfy
 * them, is doing something a lawyer can verify in a minute.
 *
 * WHAT MAKES THIS SAFE RATHER THAN MERELY CAREFUL
 *
 * Every `quote` below must appear, character for character, in the opinion
 * stored in cases.json. A test asserts it. A quotation that drifted — a tidied
 * ellipsis, a fixed typo, a remembered phrasing — fails the build. That is the
 * mechanism; the rest is discipline, and discipline is not a mechanism.
 *
 * WHAT THIS FILE DOES NOT DO
 *
 * It does not decide anything. `appliedTo` is the office's reading of what the
 * passage means for an element, written here to be argued with, and every
 * holding carries `limits` — what the passage does not decide — because the
 * way a case does damage is by being read past its holding.
 *
 * None of it is a substitute for an attorney reading the case. The corpus:
 * "no material legal conclusion should rely only on an old brief, AI output,
 * summary, or secondary source without checking the current controlling
 * authority."
 *
 * PINPOINTS
 *
 * The six opinions taken from the court's own PDFs carry slip-opinion pages,
 * marked in the stored text, and those are real and checkable. None of them
 * carries official reporter pages, and neither does Brinker, whose stored text
 * has no page markers of any kind. So no holding here states a reporter page.
 * A brief needs one, and a person has to add it. Saying nothing is the honest
 * option; the alternative is a citation that looks right and is not.
 */

import caseData from './cases.json'

type CaseRecord = {
  name: string
  citation: string
  decided: string
  docket: string
  court: string
  source: string
  fetchedOn: string
  pagination: string
  text: string
}
const CASES = (caseData as unknown as { cases: Record<string, CaseRecord> }).cases

export interface Holding {
  /** Stable, as 'brinker-provide-means-relieve'. */
  id: string
  /** The key in cases.json. */
  case: string
  /** What the office relies on it for, in one plain sentence. */
  proposition: string
  /** Verbatim from the opinion. Tested against the stored text. */
  quote: string
  /** 'slip op. p. 14', or empty where the stored text carries no pages. */
  pinpoint: string
  /** majority, concurrence, or dissent. A concurrence is not a holding. */
  opinionPart: 'majority' | 'concurrence' | 'dissent'
  /** Element keys this settles, as 'claim-id:element-key'. */
  bearsOn: string[]
  /** What the passage does NOT decide. Required, and not a formality. */
  limits: string
  /** The office's reading, for an attorney to argue with. */
  appliedTo: string
}

/** The cases held in full. */
export function caseNames(): { key: string; name: string; citation: string }[] {
  return Object.entries(CASES).map(([key, c]) => ({ key, name: c.name, citation: c.citation }))
}

export function caseRecord(key: string): CaseRecord | null {
  return CASES[key] ?? null
}

/** How the office cites it. */
export function citeCase(key: string): string {
  const c = CASES[key]
  return c ? `${c.name} ${c.citation}` : `[unknown case: ${key}]`
}

/** Does this quotation actually appear in the opinion? The whole guarantee. */
export function isVerbatim(h: Holding): boolean {
  const text = CASES[h.case]?.text
  if (!text) return false
  // Whitespace is the one thing allowed to differ: the stored text is wrapped
  // at the width of a printed page, so a passage spanning a line break carries
  // newlines a quotation would not. Nothing else is normalized away.
  const flat = (s: string) => s.replace(/\s+/g, ' ').trim()
  return flat(text).includes(flat(h.quote))
}

/**
 * A holding as the matrix hands it to the model.
 *
 * The quote leads, because the quote is the authority. Everything else is the
 * office talking, and it is labelled as such.
 */
export function render(h: Holding): string {
  const where = h.pinpoint ? `, ${h.pinpoint}` : ''
  return `=== ${citeCase(h.case)}${where} (${h.opinionPart}) ===
"${h.quote}"

WHAT IT DOES NOT DECIDE: ${h.limits}
THE OFFICE READS THIS AS: ${h.appliedTo}`
}

/**
 * The holdings the office relies on.
 *
 * Written here rather than produced by a model, reviewed by nobody yet. Every
 * quote is checked verbatim against cases.json by test/cases.test.ts.
 */
export const HOLDINGS: Holding[] = [
  {
    id: "brinker-provide-means-relieve",
    case: "brinker",
    proposition: "Under section 512(a) and Wage Order 5, an employer must relieve the employee of all duty for the meal period; it need not ensure that no work is done.",
    quote: "We conclude that under Wage Order No. 5 and Labor Code section 512, subdivision (a), an employer must relieve the employee of all duty for the designated period, but need not ensure that the employee does no work.",
    pinpoint: "",
    opinionPart: "majority",
    bearsOn: ["meal-periods:provided-means-relieved"],
    limits: "It states the standard without saying what relief from duty looks like in practice. The court, in a certification posture, declined to set out the full range of sufficient approaches and noted what suffices may vary by industry. Wage Order No. 5 and section 512(a) only.",
    appliedTo: "This is the rule the meal-period element turns on. An employer does not violate it because the employee worked; it violates it by not relieving her. So the question to put to the facts is what she was relieved OF, not what she did.",
  },
  {
    id: "brinker-uninterrupted-thirty",
    case: "brinker",
    proposition: "What must be provided is an uninterrupted thirty minutes free of all duty.",
    quote: "Absent circumstances permitting an on-duty meal period, an employer’s obligation is to provide an off-duty meal period: an uninterrupted 30-minute period during which the employee is relieved of all duty.",
    pinpoint: "",
    opinionPart: "majority",
    bearsOn: ["meal-periods:provided-means-relieved", "meal-periods:no-thirty-minutes"],
    limits: "Conditioned on the absence of circumstances permitting an on-duty meal period. It does not analyse when the nature of the work permits an on-duty meal, what the required written agreement must contain, or what counts as an interruption.",
    appliedTo: "Two things have to be true together: thirty minutes, and uninterrupted. A client who reports a full thirty minutes but also reports answering a work phone during it has answered only half the question, and the second half is the one in dispute.",
  },
  {
    id: "brinker-no-duty-to-prohibit",
    case: "brinker",
    proposition: "The theory that an employer must prohibit work during a meal period has no textual source in the wage order or the statute.",
    quote: "The difficulty with the view that an employer must ensure no work is done—i.e., prohibit work—is that it lacks any textual basis in the wage order or statute.",
    pinpoint: "",
    opinionPart: "majority",
    bearsOn: ["meal-periods:provided-means-relieved"],
    limits: "Rejects only a duty to ensure no work is done. It does not soften the affirmative duty to relieve of all duty.",
    appliedTo: "This is the passage the other side will quote. The office should quote it first, and then put the weight on relief from duty, where the burden actually sits.",
  },
  {
    id: "brinker-rest-time-by-shift-length",
    case: "brinker",
    proposition: "Reading the two operative sentences of Wage Order 5, subdivision 12(A) together, the court set out how much rest time a shift earns, beginning at three and one-half hours.",
    quote: "The combined effect of the two pertinent sentences, giving full effect to each, is this; Employees are entitled to 10 minutes’ rest for shifts from three and one-half to six hours in length, 20 minutes for shifts of more than six hours up to 10 hours, 30 minutes for shifts of more than 10 hours up to 14 hours, and so on.",
    pinpoint: "",
    opinionPart: "majority",
    bearsOn: ["rest-periods:duty-owed", "rest-periods:not-provided"],
    limits: "It fixes a QUANTITY OF REST TIME, not a number of breaks — the passage says twenty minutes, and the step from twenty minutes to two ten-minute periods comes from the wage order's own 'ten (10) minutes net rest time per four (4) hours', not from this sentence. The schedule starts at three and one-half hours and says nothing about shorter shifts. It construes subdivision 12(A) of Wage Order No. 5; orders with different rest language were not before the court. It does not decide when rest must fall, whether a break taken was duty-free, or whether it was paid.",
    appliedTo: "For a shift of more than six hours and up to ten, twenty minutes of rest time is owed. Every shift in the present file is in that band on either version of her hours, so the dispute between 6.5 and 7.5 hours does not change the entitlement.",
  },
  {
    id: "brinker-no-waiver-of-unauthorized-break",
    case: "brinker",
    proposition: "An employee cannot waive a rest break the employer never authorized.",
    quote: "No issue of waiver ever arises for a rest break that was required by law but never authorized; if a break is not authorized, an employee has no opportunity to decline to take it.",
    pinpoint: "",
    opinionPart: "majority",
    bearsOn: ["rest-periods:not-provided"],
    limits: "Reaches only breaks that were never authorized. It leaves intact a contention that an authorized and permitted break was voluntarily declined, and says nothing about who bears the burden on that.",
    appliedTo: "Answers the defence that she could have taken more breaks. If the second rest period was never authorized, there was nothing for her to decline.",
  },
  {
    id: "augustus-no-on-duty-or-on-call-rest",
    case: "augustus",
    proposition: "State law prohibits on-duty and on-call rest periods: the employer must relieve the employee of all duties and relinquish control over how the break is spent.",
    quote: "What we conclude is that state law prohibits on-duty and on-call rest periods. During required rest periods, employers must relieve their employees of all duties and relinquish any control over how employees spend their break time.",
    pinpoint: "slip op. p. 1",
    opinionPart: "majority",
    bearsOn: ["rest-periods:relieved-of-duty", "rest-periods:not-provided"],
    limits: "This is the opinion's summary of its own holding under Wage Order 4 and the pre-2013 version of section 226.7. It does not decide how many rest periods are owed, how long they are, or where in a shift they fall.",
    appliedTo: "The client reports she could take her break but had to ask permission first and answered work communications during it. This passage puts both facts in issue: control is the test, not whether a break nominally occurred.",
  },
  {
    id: "augustus-tethered-to-a-device",
    case: "augustus",
    proposition: "Requiring an employee to stay reachable and at the ready during a break cannot be squared with relieving her of all work duties.",
    quote: "Nonetheless, one cannot square the practice of compelling employees to remain at the ready, tethered by time and policy to particular locations or communications devices, with the requirement to relieve employees of all work duties and employer control during 10-minute rest periods.",
    pinpoint: "slip op. p. 15",
    opinionPart: "majority",
    bearsOn: ["rest-periods:relieved-of-duty"],
    limits: "The court first acknowledges that neither Wage Order 4 nor section 226.7 mentions on-call time; the rule is derived from the relief obligation rather than from any provision addressing on-call status. It concerns rest periods.",
    appliedTo: "The most directly applicable passage in the file to this client. She answered a work phone, radio, text, alarm or door during breaks. That is the practice this sentence describes.",
  },
  {
    id: "augustus-what-a-rest-period-is",
    case: "augustus",
    proposition: "A rest period means an interval free from labour, work, or any other employment-related duty, in the term's ordinary sense.",
    quote: "So, ordinarily, a reasonable reader would understand ―rest period‖ to mean an interval of time free from labor, work, or any other employment-related duties.",
    pinpoint: "slip op. p. 8",
    opinionPart: "majority",
    bearsOn: ["rest-periods:relieved-of-duty"],
    limits: "Defines what a rest period is. It does not catalogue which employer requirements count as an employment-related duty.",
    appliedTo: "Useful where the employer's answer is that nothing it asked of her was 'work'. The term reaches any employment-related duty, not only labour.",
  },
  {
    id: "troester-no-de-minimis-on-these-facts",
    case: "troester",
    proposition: "Where the employer required the employee to work off the clock for several minutes per shift, the wage order and statutes do not permit a de minimis rule to excuse payment.",
    quote: "We hold that the relevant wage order and statutes do not permit application of the\nde minimis rule on the facts given to us by the Ninth Circuit, where the employer\nrequired the employee to work “off the clock” several minutes per shift. We do\nnot decide whether there are circumstances where compensable time is so minute\nor irregular that it is unreasonable to expect the time to be recorded.",
    pinpoint: "slip op. p. 2",
    opinionPart: "majority",
    bearsOn: ["minimum-wage:hours-uncompensated", "overtime:hours-worked"],
    limits: "Fact-bound by its own terms: tied to time the EMPLOYER REQUIRED, several minutes PER SHIFT, on a regular basis. It does not decide the case of brief, irregular, or unrequired increments.",
    appliedTo: "The client's account is about two hours once a week for roughly five months, required by a manager. That is far past the several minutes per shift this case would not excuse, and the requirement element is squarely present.",
  },
  {
    id: "troester-express-reservation",
    case: "troester",
    proposition: "The court expressly declined to decide whether a de minimis principle can ever apply to a California wage claim.",
    quote: "We decline to decide whether a de minimis principle may ever apply to\nwage and hour claims given the wide range of scenarios in which this issue arises.",
    pinpoint: "slip op. p. 13",
    opinionPart: "majority",
    bearsOn: ["minimum-wage:hours-uncompensated", "overtime:hours-worked"],
    limits: "This IS the limit. Troester does not hold that California recognises no de minimis principle in wage cases, and a brief that says so will be corrected.",
    appliedTo: "Recorded so the office does not over-read the case it most wants to rely on. Nothing in this file needs the broader proposition.",
  },
  {
    id: "ferra-regular-rate-of-compensation",
    case: "ferra",
    proposition: "The section 226.7(c) premium is paid at the regular rate of pay, which takes in all nondiscretionary payments for work performed, not the base hourly rate alone.",
    quote: "In sum, we hold that the term “regular rate of compensation” in section 226.7(c) has the same meaning as “regular rate of pay” in section 510(a) and encompasses not only hourly wages but all nondiscretionary payments for work performed by the employee.",
    pinpoint: "slip op. p. 26",
    opinionPart: "majority",
    bearsOn: ["overtime:regular-rate", "rest-periods:not-provided", "meal-periods:no-thirty-minutes"],
    limits: "Confined to how the premium is calculated. It does not decide liability for any break violation.",
    appliedTo: "Bears directly on a tipped employee. Whether any part of what she received is nondiscretionary, and so enters the rate, is a fact question the file cannot answer — she does not know her hourly rate. It is a reason the rate has to be obtained, not a figure.",
  },
  {
    id: "donohue-no-rounding-for-meal-periods",
    case: "donohue",
    proposition: "An employer may not round time punches in the meal period context.",
    quote: "First, we hold that employers cannot engage in\nthe practice of rounding time punches — that is, adjusting the\nhours that an employee has actually worked to the nearest\npreset time increment — in the meal period context.",
    pinpoint: "slip op. p. 2",
    opinionPart: "majority",
    bearsOn: ["meal-periods:no-thirty-minutes", "meal-periods:over-five-hours"],
    limits: "Stated for the meal period context only. It says nothing about rounding for computing wages or overtime generally, and it does not reach shifts merely SCHEDULED on the hour where no punch was rounded.",
    appliedTo: "Worth holding, and worth not over-reading. The chronology flagged that every shift boundary this client reports falls on the hour or half hour — but that is her recollection of her schedule, not evidence of a rounding practice. This case reaches rounding of punches, and whether any occurred is unknown until the time records are produced.",
  },
  {
    id: "donohue-voluntary-work-after-relief",
    case: "donohue",
    proposition: "There is no meal period violation where the employee voluntarily chooses to work during the meal period after the employer has relieved her of all duty.",
    quote: "There is no meal period violation\nif an employee voluntarily chooses to work during a meal period\nafter the employer has relieved the employee of all duty.",
    pinpoint: "slip op. p. 12",
    opinionPart: "majority",
    bearsOn: ["meal-periods:provided-means-relieved"],
    limits: "Conditioned on relief from all duty having actually occurred first. It does not put the burden of proving voluntariness on the employee.",
    appliedTo: "The defence to expect here. The client reports she received a full thirty minutes and could leave the premises. The office needs to know what happened when a manager or coworker asked her a question during that time, because that is where relief from duty is tested.",
  },
  {
    id: "naranjo-premium-compensates-labour",
    case: "naranjo",
    proposition: "An employee kept on duty through a meal period, or working past the point a break was owed, is providing services, so the premium compensates labour and is wages.",
    quote: "An employee who remains on duty during lunch is providing the employer services; so too the employee who works without relief past the point when permission to stop to eat or rest was legally required. Section 226.7 reflects a determination that work in such circumstances is worth more — or should cost the employer more — than other work, and so requires payment of a premium.",
    pinpoint: "slip op. p. 11",
    opinionPart: "majority",
    bearsOn: ["final-pay:unpaid-at-separation", "wage-statements:item-missing"],
    limits: "It explains the character of the premium. It does not decide how the premium is calculated, which is Ferra, and it does not create a claim.",
    appliedTo: "Carries a meal or rest premium into the final-pay and wage-statement claims: unpaid premiums are unpaid wages at separation and are reportable on a statement.",
  },
  {
    id: "naranjo2-good-faith-defeats-226-penalty",
    case: "naranjo2",
    proposition: "An employer that reasonably and in good faith believed its wage statements complied with section 226 has not knowingly and intentionally failed to comply.",
    quote: "We now conclude that if an employer reasonably and in good faith believed it was providing a complete and accurate wage statement in compliance with the requirements of section 226, then it has not knowingly and intentionally failed to comply with the wage statement law.",
    pinpoint: "slip op. p. 3",
    opinionPart: "majority",
    bearsOn: ["wage-statements:knowing-and-intentional"],
    limits: "Reaches only the penalty under subdivision (e)(1). It does not touch liability for the violation, nor the costs, fees and injunction available under subdivision (h).",
    appliedTo: "The defence the office should expect on the wage-statement claim, and the reason the element is worth pleading separately from the penalty.",
  },
  {
    id: "naranjo2-willful-under-203",
    case: "naranjo2",
    proposition: "Willfulness under section 203 means intentionally failing to pay wages due; a good faith dispute that any wages are due precludes the penalty.",
    quote: "The rule of Barnhill has since been codified in DLSE regulations, which provide, in pertinent part: “A willful failure to pay wages within the meaning of Labor Code Section 203 occurs when an employer intentionally fails to pay wages to an employee when those wages are due. However, a good faith dispute that any wages are due will preclude imposition of waiting time penalties under Section 203.”",
    pinpoint: "slip op. p. 24",
    opinionPart: "majority",
    bearsOn: ["final-pay:willful"],
    limits: "Quoted in pertinent part — the regulation's own definition of a good faith dispute, at title 8, section 13520(a), is not reproduced in this passage and should be read with it.",
    appliedTo: "This is why the client's own answer that no wages are still owed is the worst fact in the final-pay claim: it hands the employer the dispute the regulation asks about. It has to be addressed with her before any demand goes out.",
  },
  {
    id: "naranjo2-fees-regardless-of-state-of-mind",
    case: "naranjo2",
    proposition: "Any plaintiff who establishes a section 226 violation is entitled to costs, attorney's fees and an injunction, whatever the employer's state of mind.",
    quote: "This provision means that any plaintiff who establishes a section 226 violation is entitled to costs and attorney’s fees, as well as an injunction compelling future compliance.",
    pinpoint: "slip op. p. 13",
    opinionPart: "majority",
    bearsOn: ["wage-statements:statement-required", "wage-statements:item-missing"],
    limits: "Concerns subdivision (h) relief only. It does not say whether injury under subdivision (e)(2) must still be shown for penalties.",
    appliedTo: "The counterweight to the good-faith defence: it defeats the penalty, not the claim. A statement claim is still worth pleading where the penalty may fail.",
  },
]

/** Every holding bearing on an element, as 'claim-id:element-key'. */
export function holdingsFor(elementKey: string): Holding[] {
  return HOLDINGS.filter(h => h.bearsOn.includes(elementKey))
}

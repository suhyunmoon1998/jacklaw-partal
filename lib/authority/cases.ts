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
  // FEHA — fetched 2026-09-24 from the Caselaw Access Project, quotes checked
  // verbatim against the stored text by test/cases.test.ts like every other.
  {
    id: "guz-three-stage-burden-shifting",
    case: "guz",
    proposition: "California tries FEHA disparate-treatment claims, including age claims, under the three-stage McDonnell Douglas burden-shifting test.",
    quote: "In particular, California has adopted the three-stage burden-shifting test established by the United States Supreme Court for trying claims of discrimination, including age discrimination, based on a theory of disparate treatment.",
    pinpoint: "",
    opinionPart: "majority",
    bearsOn: ["feha-discrimination:substantial-motivating-reason", "feha-disability-discrimination:substantial-motivating-reason"],
    limits: "It adopts the framework without stating its steps; the steps (prima facie case raising a presumption, the employer's burden to produce a legitimate nondiscriminatory reason, the plaintiff's chance to show pretext or other evidence of motive) are set out in the sentences that follow, which the opinion frames as the test 'at trial'. The court says the specific elements of a prima facie case 'may vary depending on the particular facts'. Guz was an age claim decided on summary judgment. It does not address retaliation under section 12940(h) or claims proved by direct evidence.",
    appliedTo: "This is the framework a court uses to decide whether a circumstantial discrimination case gets past summary judgment — not an instruction the jury applies. CACI 2500's own Sources and Authority quote Abed v. Western Dental: McDonnell Douglas is \"an analytical tool for use by the trial judge in applying the law, not a concept to be understood and applied by the jury in the factfinding process.\" At trial the jury decides the elements, including substantial motivating reason (see harris-substantial-motivating-factor). For an intake, it is a way to organise what the client can show: the protected characteristic, competent performance, the adverse action, and a circumstance suggesting motive.",
  },
  {
    id: "guz-lying-is-not-discrimination",
    case: "guz",
    proposition: "Evidence that the employer lied about its reasons does not, by itself, support an inference of intentional discrimination.",
    quote: "Moreover, an inference of intentional discrimination cannot be drawn solely from evidence, if any, that the company lied about its reasons. The pertinent statutes do not prohibit lying, they prohibit discrimination.",
    pinpoint: "",
    opinionPart: "majority",
    bearsOn: ["feha-discrimination:substantial-motivating-reason", "feha-disability-discrimination:substantial-motivating-reason"],
    limits: "The key word is 'solely'. In the next sentence the court says proof that the stated reasons are unworthy of credence may 'considerably assist' a circumstantial case. This passage does not say false reasons are irrelevant. It was written about summary judgment in an age case, and it does not decide how much more than falsity is enough.",
    appliedTo: "For the motive element of CACI 2500, showing the employer's explanation is false is not enough on its own — but it is not required either: motive can be proved by direct evidence or by other circumstantial evidence. The court says in the next sentence that proof the stated reasons are unworthy of credence may \"considerably assist\" a circumstantial case, and the discussion of Reeves that follows addresses when a prima facie case plus falsity may be enough. The office should record the facts that tie any falsehood to the protected characteristic — comparators, timing, remarks, a pattern — as well as the falsehood itself.",
  },
  {
    id: "guz-rational-inference-true-cause",
    case: "guz",
    proposition: "The evidence as a whole, considering the employer's innocent explanation, must support a rational inference that prohibited discrimination was the true cause of the employer's action.",
    quote: "Still, there must be evidence supporting a rational inference that intentional discrimination, on grounds prohibited by the statute, was the true cause of the employer’s actions.",
    pinpoint: "",
    opinionPart: "majority",
    bearsOn: ["feha-discrimination:substantial-motivating-reason", "feha-disability-discrimination:substantial-motivating-reason"],
    limits: "This states what the evidence as a whole must support. It does not list what kinds of evidence qualify. Guz uses the phrase 'true cause', and Harris (2013) later set the FEHA causation standard for jury instructions as a 'substantial motivating factor/reason'. How the two formulations fit together is a question for an attorney. This passage does not answer it.",
    appliedTo: "This is the test to put to the motive facts after the employer offers its reason: taking the employer's explanation into account, can a factfinder rationally infer the protected trait was what actually drove the decision? Intake should record the facts that point to motive separately from the facts that only undercut the stated reason.",
  },
  {
    id: "harris-substantial-motivating-factor",
    case: "harris",
    proposition: "A FEHA discrimination jury must find that discrimination was a substantial motivating factor/reason, not merely a motivating factor/reason.",
    quote: "In the present case, the jury was instructed under CACI No. 2500 to determine whether discrimination was “a motivating factor/reason” for Harris’s termination. We hold that the jury should instead determine whether discrimination was “a substantial motivating factor/reason” and that the trial court on remand should determine in the first instance whether the evidence of discrimination in Harris’s case warrants such an instruction.",
    pinpoint: "",
    opinionPart: "majority",
    bearsOn: ["feha-discrimination:substantial-motivating-reason", "feha-disability-discrimination:substantial-motivating-reason"],
    limits: "Decided under section 12940(a) on a pregnancy-discrimination termination. The court expressly refrained 'from opining in the abstract on what evidence might be sufficient' to show that discrimination was a substantial factor. It does not define 'substantial' beyond excluding liability based on 'mere thoughts or passing statements unrelated to the disputed employment decision'. It does not itself decide the causation standard for retaliation (12940(h)) or harassment.",
    appliedTo: "This is the source of the 'substantial motivating reason' wording in the causation element of CACI 2500 (and the matching element of CACI 2540). The office reads it to mean the discriminatory reason must have carried real weight in the decision; it need not be the only cause or a but-for cause. In the paragraph around the quote the court explains that the standard keeps liability from resting on \"mere thoughts or passing statements unrelated to the disputed employment decision\" — facts of that kind alone should not be treated as meeting the element. Applying it to 2505 (retaliation) is an attorney's call; the case decided section 12940(a).",
  },
  {
    id: "harris-same-decision-limits-remedies",
    case: "harris",
    proposition: "If the employer proves it would have made the same decision for lawful reasons, the plaintiff cannot recover damages, backpay, or reinstatement, though declaratory or injunctive relief may remain.",
    quote: "In sum, we construe section 12940(a) as follows: When a plaintiff has shown by a preponderance of the evidence that discrimination was a substantial factor motivating his or her termination, the employer is entitled to demonstrate that legitimate, nondiscriminatory reasons would have led it to make the same decision at the time. If the employer proves by a preponderance of the evidence that it would have made the same decision for lawful reasons, then the plaintiff cannot be awarded damages, backpay, or an order of reinstatement. However, where appropriate, the plaintiff may be entitled to declaratory or injunctive relief.",
    pinpoint: "",
    opinionPart: "majority",
    bearsOn: ["feha-discrimination:substantial-motivating-reason"],
    limits: "This limits remedies. It is not a complete defense to liability, and in the following sentence the court says the plaintiff may also be eligible for attorney's fees and costs under section 12965(b). The employer bears the burden, by a preponderance, and the lawful reasons must be ones that 'would have led it to make the same decision at the time'. The passage is framed around a termination under section 12940(a). It does not decide whether or how the same-decision showing applies to retaliation, harassment, or accommodation claims. The fee provision the court refers to was then section 12965(b); in the text now on file (as amended effective 1/1/2026) attorney's fees and costs are in section 12965(c)(6).",
    appliedTo: "This is not an element the plaintiff must prove. It is a defense the employer carries after the plaintiff establishes substantial motivation under CACI 2500. For case valuation, a client with documented performance problems that existed at the time of the decision faces a real risk that damages are cut off even if discrimination is shown. That belongs in the damages analysis, not in the liability analysis.",
  },
  {
    id: "green-plaintiff-proves-ability-to-perform",
    case: "green",
    proposition: "In a FEHA disability discrimination case the plaintiff must prove he or she can perform the essential duties of the position with or without reasonable accommodation.",
    quote: "Based on the foregoing, we conclude that under the FEHA, a plaintiff must demonstrate that he or she was qualified for the position sought or held in the sense that he or she is able to perform the essential duties of the position with or without reasonable accommodation. Juries should be so instructed.",
    pinpoint: "",
    opinionPart: "majority",
    bearsOn: ["feha-disability-discrimination:able-to-perform"],
    limits: "Decided on a disability-discrimination claim under section 12940(a) tried to a jury, 4–3 (Chin, J., for the court; Werdegar, J., dissenting, joined by Kennard and Moreno, JJ.). The court noted that Bagatti, a failure-to-accommodate case under section 12940(m), 'provided little guidance on the qualification issue'. It did not decide who bears this burden on accommodation (12940(m)) or interactive-process (12940(n)) claims. It does not define which duties are 'essential'. The remand was for a new trial unless the evidence shows 'as a matter of law that plaintiff cannot meet his burden'.",
    appliedTo: "This goes to element 4 of CACI 2540, that the plaintiff 'was able to perform the essential job duties' of the position, 'either with or without reasonable accommodation'. It is the plaintiff's element, not an affirmative defense. Intake should capture what the job's core duties were and what the client could do, with and without an accommodation, at the time of the adverse action. The office should not borrow this burden for the CACI 2541 or 2546 claims without separate authority.",
  },
  {
    id: "roby-personnel-actions-evidence-of-harassment",
    case: "roby",
    proposition: "Official personnel actions can be evidence of harassment when they communicate a hostile message.",
    quote: "Miller, however, makes clear that in some cases the hostile message that constitutes the harassment is conveyed through official employment actions, and therefore evidence that would otherwise be associated with a discrimination claim can form the basis of a harassment claim. Moreover, in analyzing the sufficiency of evidence in support of a harassment claim, there is no basis for excluding evidence of biased personnel management actions so long as that evidence is relevant to prove the communication of a hostile message.",
    pinpoint: "",
    opinionPart: "majority",
    bearsOn: ["feha-harassment:harassing-conduct", "feha-harassment:severe-or-pervasive"],
    limits: "The first sentence says 'in some cases', and the second admits personnel actions only 'so long as that evidence is relevant to prove the communication of a hostile message'. Neither says a personnel action is harassment in itself. The severe-or-pervasive requirement is not relaxed. It arose on review of whether the evidence supported a jury's harassment verdict, where the Court of Appeal had divided the evidence between the harassment and discrimination claims, in a case involving the plaintiff's panic disorder. The opinion was modified when rehearing was denied on February 10, 2010, and the stored text is the version as printed. Since 2019, Gov. Code section 12923 states the Legislature's own standard for the severe-or-pervasive element, and feha-harassment reads that element from it; read the two together.",
    appliedTo: "For the CACI 2521A elements, the hostile-environment and severe-or-pervasive facts can include biased discipline, scheduling, assignments, and warnings when they send a demeaning message, not only comments and conduct. Intake should record who did each act and what message it carried, so the same fact can be argued under both 2500/2540 (the action) and 2521A (the message).",
  },
  {
    id: "roby-discrimination-versus-harassment",
    case: "roby",
    proposition: "Under FEHA, discrimination is bias exercised through official actions and harassment is bias communicated through interpersonal relations in the workplace.",
    quote: "These distinctions place discrimination and harassment in separate categories in regard to application of the FEHA; as explained above, discrimination refers to bias in the exercise of official actions on behalf of the employer, and harassment refers to bias that is expressed or communicated through interpersonal relations in the workplace.",
    pinpoint: "",
    opinionPart: "majority",
    bearsOn: ["feha-harassment:harassing-conduct", "feha-discrimination:adverse-action"],
    limits: "It sorts the two claims into categories. It does not bar using the same evidence for both, which the opinion allows (see roby-personnel-actions-evidence-of-harassment). The surrounding discussion of employer liability (strict for supervisors, negligence for coworkers) is a separate point and not this passage. It does not address failure-to-prevent (12940(k)).",
    appliedTo: "This is how the office should route facts between CACI 2500/2540 and 2521A. Ask whether the harm came through an official exercise of the employer's power (discrimination) or through the workplace's social environment (harassment). Where it came through both, plead both and say which facts go to which claim.",
  },
  {
    id: "yanowitz-materiality-spectrum",
    case: "yanowitz",
    proposition: "FEHA reaches not only ultimate actions like termination or demotion but the whole range of employment actions reasonably likely to materially and adversely affect job performance or advancement.",
    quote: "Appropriately viewed, this provision protects an employee against unlawful discrimination with respect not only to so-called ultimate employment actions such as termination or demotion, but also the entire spectrum of employment actions that are reasonably likely to adversely and materially affect an employee’s job performance or opportunity for advancement in his or her career.",
    pinpoint: "",
    opinionPart: "majority",
    bearsOn: ["feha-retaliation:adverse-action", "feha-discrimination:adverse-action", "feha-disability-discrimination:adverse-action"],
    limits: "'This provision' in the quote is section 12940(a)'s 'terms, conditions, and privileges' language. The court carries the standard to section 12940(h) retaliation in the same discussion. It adopted the 'materiality' test and declined the 'arguably broader' deterrence test the Court of Appeal had used. The case was decided on summary judgment. The firm's Westlaw print (Drive file 1cjbJG735L4NtEB8WkHVPed7l4lt-WH7U, printed 2/24/2026) shows a KeyCite 'Overruling Risk' flag tied to Burlington Northern & Santa Fe Ry. Co. v. White (U.S. 2006), a federal Title VII decision, and a yellow flag (declined to follow by Blount v. Morgan Stanley Smith Barney LLC, N.D.Cal. 2013), so an attorney should check current California treatment before relying on the standard. The stored Official Reports text (Caselaw Access Project) has no quotation marks around 'ultimate employment actions'; the firm's Westlaw print does. Confirm against the bound Official Reports before quoting.",
    appliedTo: "This is the adverse-employment-action element of CACI 2505 (and the adverse-action element of 2500). The question is not whether the client was fired but whether what happened was reasonably likely to hurt her job performance or her prospects. Reassignments, removal of accounts, and unwarranted discipline can qualify. CACI 2509 ('Adverse Employment Action' Explained) states this standard for the jury.",
  },
  {
    id: "yanowitz-trivial-actions-not-actionable",
    case: "yanowitz",
    proposition: "Minor actions that would only anger or upset an employee are not adverse employment actions, but treatment reasonably likely to impair a reasonable employee's performance or advancement is.",
    quote: "Minor or relatively trivial adverse actions or conduct by employers or fellow employees that, from an objective perspective, are reasonably likely to do no more than anger or upset an employee cannot properly be viewed as materially affecting the terms, conditions, or privileges of employment and are not actionable, but adverse treatment that is reasonably likely to impair a reasonable employee’s job performance or prospects for advancement or promotion falls within the reach of the antidiscrimination provisions of sections 12940(a) and 12940(h).",
    pinpoint: "",
    opinionPart: "majority",
    bearsOn: ["feha-retaliation:adverse-action", "feha-discrimination:adverse-action"],
    limits: "The standard is objective ('from an objective perspective', 'a reasonable employee'), so the client's own distress does not settle it. The court says the question is not 'susceptible to a mathematically precise test'. The passage draws the line but does not sort particular acts; Yanowitz's own facts were assessed separately in part III. The same KeyCite caution noted under yanowitz-materiality-spectrum applies.",
    appliedTo: "This is the screen for the adverse-action element of CACI 2505. Record each act the client complains of and ask whether an objective employee's performance or promotion prospects would likely be affected, as opposed to her feelings. Acts that fail alone may still count collectively (see yanowitz-no-single-swift-blow).",
  },
  {
    id: "yanowitz-no-single-swift-blow",
    case: "yanowitz",
    proposition: "Retaliatory acts may be considered collectively; they need not be one decisive action.",
    quote: "Contrary to L’Oreal’s assertion that it is improper to consider collectively the alleged retaliatory acts, there is no requirement that an employer’s retaliatory acts constitute one swift blow, rather than a series of subtle, yet damaging, injuries.",
    pinpoint: "",
    opinionPart: "majority",
    bearsOn: ["feha-retaliation:adverse-action"],
    limits: "This concerns whether an adverse action occurred. Timeliness of older acts is a separate question, which the court resolved through the continuing-violation doctrine of Richards v. CH2M Hill; considering acts collectively does not by itself make acts outside the limitations period actionable. Decided on summary judgment, over a dissent by Chin, J. Yanowitz applied the one-year administrative filing period then in force. Gov. Code section 12960 as now on file sets the current period; read it before relying on continuing-violation arguments for older acts.",
    appliedTo: "Under the adverse-action element of CACI 2505, the office should plead and prove the pattern as a whole (a series of subtle, yet damaging, injuries) rather than defend each act alone. The intake timeline should keep each act dated so both the totality argument and the limitations analysis can be made.",
  },
  // Wage and hour — the cases the firm's verified Authority Digest relies on.
  // Fetched 2026-09-24 (Caselaw Access Project; courts.ca.gov PDFs), re-fetched
  // and compared byte for byte; each quote cut from the stored text, not typed.
  {
    id: "martinez-suffer-or-permit-knowledge",
    case: "martinez",
    proposition: "Under the wage orders' \"suffer or permit to work\" standard, liability rests on the defendant's knowledge of the work and failure to prevent it — not on having benefited from it.",
    quote: "However, the concept of a benefit is neither a necessary nor a sufficient condition for liability under the “suffer or permit” standard. Instead, as we have explained, the basis of liability is the defendant’s knowledge of and failure to prevent the work from occurring.",
    pinpoint: "",
    opinionPart: "majority",
    bearsOn: ["minimum-wage:hours-uncompensated", "overtime:hours-worked"],
    limits: "Decided on whether produce merchants were employers of a grower's workers; the court found they were not on those facts. It speaks to who 'employs' under the IWC wage orders for actions under Labor Code section 1194, and says 'knowledge' in that setting. It does not set the standard for how much time is compensable or what the employer must have known of off-the-clock work — Brinker, on file, states that as 'knew or should have known' (brinker-off-the-clock-knowledge).",
    appliedTo: "Use it for the employer's side of 'suffer or permit': an employer that does not prevent work it knows of is responsible for it. For whether off-the-clock time counts, read it with Brinker's knew-or-should-have-known standard, which does not require proof the employer actually knew. The same opinion sets out the three wage-order definitions of 'employ' (control over wages, hours or working conditions; suffer or permit to work; engage), which decide who the employer is where more than one entity is involved.",
  },
  {
    id: "morillion-control-clause",
    case: "morillion",
    proposition: "The wage order's two 'hours worked' clauses are independent: time under the employer's control is compensable even if the employee is not working.",
    quote: "Indeed, the two phrases— “time during which an employee is subject to the control of an employer” and “time the employee is suffered or permitted to work, whether or not required to do so” (ibid.)—can also be interpreted as independent factors, each of which defines whether certain time spent is compensable as “hours worked.” Thus, an employee who is subject to an employer’s control does not have to be working during that time to be compensated under Wage Order No. 14-80.",
    pinpoint: "",
    opinionPart: "majority",
    bearsOn: ["minimum-wage:hours-uncompensated", "overtime:hours-worked"],
    limits: "Decided under Wage Order 14-80 (agriculture) on compulsory travel in employer-provided buses; the court distinguished ordinary commutes an employee controls, and said the level of the employer's control, not the mere requirement of the activity, is determinative. It does not decide how much control suffices in other settings.",
    appliedTo: "Time the client spent where and doing what the employer required — arriving early at its direction, waiting to be allowed to clock in, handling a task the manager assigned before the shift — is 'hours worked' if she was under the employer's control, whether or not it felt like work. The governing Wage Order defines 'hours worked' in section 2; read that text.",
  },
  {
    id: "frlekin-exit-searches-compensable",
    case: "frlekin",
    proposition: "Time spent on the employer's premises waiting for and undergoing required exit searches of personal items brought for convenience is compensable 'hours worked' under Wage Order 7.",
    quote: "Is time spent on the employer’s premises waiting for, and undergoing, required exit searches of packages, bags, or personal technology devices voluntarily brought to work purely for personal convenience by employees compensable as “hours worked” within the meaning of Wage Order 7? For the reasons that follow, we conclude the answer to the certified question is, yes.",
    pinpoint: "",
    opinionPart: "majority",
    bearsOn: ["minimum-wage:hours-uncompensated", "overtime:hours-worked"],
    limits: "Answers a question certified by the Ninth Circuit under Wage Order 7 (mercantile), about mandatory on-premises searches. The reasons follow the quoted passage and turn on Apple's control during the searches; read them before extending the answer to a different activity or Order.",
    appliedTo: "Required activity on the employer's premises before an employee may leave or start — searches, waiting to clock out, closing tasks the employer requires — is analyzed under the control clause, as here. It supports treating employer-required time on premises as compensable even when the employee's own choices bear on how long it takes.",
  },
  {
    id: "murphy-premium-is-wage",
    case: "murphy",
    proposition: "The additional hour of pay under section 226.7 is a wage, not a penalty, and a direct claim for it carries the three-year limitations period.",
    quote: "We conclude that the remedy provided in Labor Code section 226.7 constitutes a wage or premium pay and is governed by a three-year statute of limitations and that the trial court properly considered the additional, but related, wage claims during the de novo trial.",
    pinpoint: "",
    opinionPart: "majority",
    bearsOn: ["final-pay:unpaid-at-separation"],
    limits: "Decided on the limitations period for the direct premium claim (Code Civ. Proc. 338 against 340). The section has been amended since and its subdivision letters differ from the text now on file. It does not decide whether unpaid premiums support derivative wage-statement or waiting-time claims — Naranjo, on file, does. The quoted sentence also states the opinion's second holding, on hearing new claims in a de novo trial after a Labor Commissioner hearing; the office relies on it for the first.",
    appliedTo: "Unpaid meal and rest premiums are wages: counted back three years from filing on the direct claim, and owed at separation like any other wages (see Naranjo for what follows from that).",
  },
  {
    id: "armenta-no-averaging",
    case: "armenta",
    proposition: "California's minimum wage is measured hour by hour; an employer cannot average pay across paid and unpaid hours in a workweek to satisfy it.",
    quote: "We conclude, therefore, that the FLSA model of averaging all hours worked “in any work week” to compute an employer’s minimum wage obligation under California law is inappropriate. The minimum wage standard applies to each hour worked by respondents for which they were not paid.",
    pinpoint: "",
    opinionPart: "majority",
    bearsOn: ["minimum-wage:paid-less", "minimum-wage:hours-uncompensated"],
    limits: "Court of Appeal (Second District), on hourly employees paid well above the minimum for some hours and nothing for others (drive time, paperwork). It does not address piece-rate or commission pay plans, which later statutes and cases treat separately.",
    appliedTo: "Unpaid hours — pre-shift or post-shift work off the clock — are owed at least the applicable minimum wage for each hour, even where the paid hours were at a higher rate. The employer cannot answer that the week's pay divided by all hours still exceeded the minimum.",
  },
  {
    id: "iloff-good-faith-reasonable-attempt",
    case: "iloff",
    proposition: "To avoid liquidated damages on good-faith grounds, the employer must show a reasonable attempt to learn what the minimum wage law required; ignorance of the law is not enough.",
    quote: "We hold that to establish the good faith defense, an employer must show that it made a reasonable attempt to determine the requirements of the law governing minimum wages; proof that the employer was ignorant of the law is insufficient.",
    pinpoint: "",
    opinionPart: "majority",
    bearsOn: ["minimum-wage:paid-less"],
    limits: "Decides the good-faith defense to liquidated damages under section 1194.2 only. It does not decide the 'good faith dispute' defense to waiting-time penalties under section 203, or the mental state for wage-statement penalties. The burden is the employer's, and the court says the required attempt is 'context dependent'. Decided 8/21/2025; later history not checked by the portal.",
    appliedTo: "Liquidated damages are a remedy on the minimum-wage claim, not an element of it. Where the employer shows no attempt to find out what the law required — for example, telling the employee that time spent on a task was not the business's responsibility — the good-faith defense fails on this holding.",
  },
  {
    id: "bradsbery-first-meal-prospective-waiver",
    case: "bradsbery",
    proposition: "A revocable, prospective written waiver of the first meal period for shifts of more than five and no more than six hours is enforceable absent evidence it is unconscionable or unduly coercive.",
    quote: "We conclude the revocable, prospective waivers Plaintiffs signed are enforceable in the absence of any evidence the waivers are unconscionable or unduly coercive. The prospective written waiver of a 30-minute meal period for shifts between five and six hours accords with the text and purpose of section 512 and Wage Order Nos. 4 and 5.",
    pinpoint: "",
    opinionPart: "majority",
    bearsOn: ["meal-periods:not-waived"],
    limits: "Court of Appeal (Second District), under Wage Orders 4 and 5, on waivers that were written, revocable and prospective. It does not reach shifts over six hours, where section 512 permits no waiver of the first meal, or waivers that were coerced, unwritten or irrevocable. The stored text is the court's second modification order with the original opinion attached; the modification replaced footnote 3. CACI 2770 (July 2026 supp.) quotes this passage. Later history not checked by the portal.",
    appliedTo: "Only relevant where the client's shifts ran more than five and no more than six hours and a waiver was signed; the questions are then whether it was in writing, prospective, revocable, and signed without coercion. On longer shifts it does not apply.",
  },
  {
    id: "brinker-off-the-clock-knowledge",
    case: "brinker",
    proposition: "An employer is liable for off-the-clock work it knew or should have known was occurring.",
    quote: "As all parties agree, liability is contingent on proof Brinker knew or should have known off-the-clock work was occurring.",
    pinpoint: "",
    opinionPart: "majority",
    bearsOn: ["minimum-wage:hours-uncompensated", "overtime:hours-worked"],
    limits: "Stated as a premise the parties agreed on, in a class-certification posture, before the court held the off-the-clock subclass could not be certified on that record; the passage also notes that clocked-out time carries a presumption of no work that the employee must rebut. It does not decide what facts show constructive knowledge.",
    appliedTo: "For unpaid pre-shift or post-shift work, the question is whether the employer knew or should have known the work was being done — a manager who directed it, saw it, or was told of it, or work so regular it could not be missed. Actual knowledge is not required. The time records' clocked-out status is the presumption the client's account has to overcome.",
  },
]

/** Every holding bearing on an element, as 'claim-id:element-key'. */
export function holdingsFor(elementKey: string): Holding[] {
  return HOLDINGS.filter(h => h.bearsOn.includes(elementKey))
}

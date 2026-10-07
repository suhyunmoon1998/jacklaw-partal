import { describe, expect, it } from 'vitest'
import { searchAuthority } from '@/lib/authority/lookup'

/**
 * How well the law store's search finds the provision a question is about.
 *
 * Questions are phrased the way Eleanor's model or a paralegal would put them
 * — mostly in everyday words, not the statute's — and each names the
 * provisions any one of which in the first five results counts as found. The
 * expectations are which provision is ON TOPIC (each was checked against the
 * stored text), not a statement of what the law requires.
 *
 * History (2026-10-06): the first search matched words alone and found 31 of
 * the 40 below (78%). Statute topic names, the office's vocabulary, number
 * words and weighted coverage brought it to 40 of 40. The 18 in LATER were
 * written after that, as questions the search had never been tuned on: it
 * found 15 on first sight (83%), and two everyday synonyms (agreement →
 * contract, hot → temperature) made it 18. The floor below is what it keeps.
 */
const CASES: [question: string, accepted: RegExp][] = [
  ['second meal period after ten hours', /^LAB 512$/],
  ['meal break premium one hour of pay', /^LAB 226\.7$/],
  ['rest break every four hours', /^(IWC \d+ sec 12|CACI 276[01])$/],
  ['rest breaks while on call', /^(augustus-.*|CACI 2761)$/],
  ['overtime after eight hours in a day', /^LAB 510$/],
  ['double time after twelve hours', /^LAB 510$/],
  ['final paycheck when an employee is fired', /^(LAB 201|LAB 203|CACI 2700)$/],
  ['employee quits final wages within 72 hours', /^(LAB 202|LAB 203|CACI 2700)$/],
  ['waiting time penalty for late final pay', /^(LAB 203|CACI 2704|naranjo2-.*)$/],
  ['what has to be on a pay stub', /^LAB 226$/],
  ['penalty for inaccurate wage statements', /^(LAB 226|naranjo2-good-faith-defeats-226-penalty)$/],
  ['reimburse employee cell phone and mileage', /^(LAB 2802|CACI 2750)$/],
  ['manager taking a share of the tip pool', /^(LAB 351|CACI 2752)$/],
  ['vacation pay forfeited use it or lose it', /^(LAB 227\.3|CACI 2753)$/],
  ['sent home early reporting time pay', /^(IWC \d+ sec 5|CACI 2754)$/],
  ['split shift premium', /^IWC \d+ sec [24]$/],
  ['Los Angeles minimum wage 2026', /^(LAMW 2026-07-01|LAMC 187\.02)$/],
  ['fast food restaurant minimum wage', /^(LAB 147[4-7]|IWC 5 sec 4)$/],
  ['independent contractor ABC test', /^(LAB 2775|CACI 2705)$/],
  ['fired for reporting a legal violation to a government agency', /^(LAB 1102\.5|CACI 4603)$/],
  ['retaliation for complaining about unpaid wages', /^LAB 98\.6$/],
  ['disability reasonable accommodation interactive process', /^(GOV 12940|CACI 2546|CACI 2541|CCR2 1106[89])$/],
  ['sexual harassment hostile work environment', /^(GOV 12940|CACI 2521A|CACI 2521B|CACI 2522A)$/],
  ['failure to prevent discrimination and harassment', /^(CACI 2527|GOV 12940)$/],
  ['statute of limitations for unpaid wages', /^(CCP 338|BPC 17208)$/],
  ['unfair competition restitution four years', /^(BPC 17208|BPC 17203)$/],
  ['PAGA notice to the agency before filing suit', /^LAB 2699\.3$/],
  ['PAGA civil penalty amount per pay period', /^LAB 2699$/],
  ['equal pay for substantially similar work', /^(LAB 1197\.5|CACI 2740)$/],
  ['paid sick leave accrual one hour per 30 hours', /^LAB 246$/],
  ['using sick leave to care for a family member', /^(LAB 233|LAB 246\.5)$/],
  ['time off for jury duty', /^LAB 230$/],
  ['wrongful termination in violation of public policy', /^(CACI 2430|CACI 243[12])$/],
  ['employer deducting from paychecks', /^(LAB 221|LAB 224)$/],
  ['exempt executive employee duties test', /^(IWC \d+ sec 1|CACI 2720)$/],
  ['employer requires uniforms', /^(IWC \d+ sec 9|LAB 2802)$/],
  ['piece rate workers rest and recovery periods pay', /^LAB 226\.2$/],
  ['time clock rounding', /^CACI 2775$/],
  ['how often wages must be paid paydays', /^LAB 204$/],
  ['meal period waived by mutual consent six hours', /^(LAB 512|CACI 2770)$/],
]

/** Written after the tuning above, to see whether it held on questions it had not seen. */
const LATER: [question: string, accepted: RegExp][] = [
  ['employer did not pay minimum wage for all hours worked', /^(LAB 1194|LAB 1197|CACI 2701|armenta-no-averaging|IWC \d+ sec 4)$/],
  ['off the clock work before the shift started', /^(brinker-off-the-clock-knowledge|troester-.*|LAB 1194|CACI 2701|martinez-suffer-or-permit-knowledge)$/],
  ['security bag checks at the exit are they paid time', /^frlekin-exit-searches-compensable$/],
  ['required travel time on the employer bus', /^morillion-control-clause$/],
  ['heat illness recovery period', /^LAB 226\.7$/],
  ['how long must payroll records be kept', /^(LAB 226|LAB 1174)$/],
  ['staffing agency and client employer shared liability', /^LAB 2810\.3$/],
  ['employee request to see personnel file', /^LAB 1198\.5$/],
  ['commission agreement must be in writing', /^LAB 2751$/],
  ['alternative workweek schedule overtime', /^(LAB 511|IWC \d+ sec 3)$/],
  ['working seven days in a row day of rest', /^(LAB 551|LAB 552|LAB 556|LAB 510)$/],
  ['disability discrimination refused to hire', /^(GOV 12940|CACI 2540)$/],
  ['attorney fees in a wage claim', /^(LAB 218\.5|LAB 1194)$/],
  ['interest on unpaid wages', /^LAB 218\.6$/],
  ['employer must provide seating for cashiers', /^IWC \d+ sec 14$/],
  ['workplace temperature too hot', /^IWC \d+ sec 15$/],
  ['meal period for a shift under six hours', /^(LAB 512|CACI 2770)$/],
  ['rounding of meal period punches', /^(donohue-no-rounding-for-meal-periods|CACI 2775)$/],
]

/**
 * Written for the sections pulled on 2026-10-06, before any vocabulary was added
 * for them. Found 17 of 20 on first sight; four everyday words (jury duty,
 * lied, move, reference) made it 20. Lab. Code § 230 is accepted beside Gov.
 * Code § 12945.8 for jury service because the text on file says the same.
 */
const PULLED_LATER: [question: string, accepted: RegExp][] = [
  ['pregnancy disability leave how many months', /^GOV 12945$/],
  ['family and medical leave to care for a sick parent', /^GOV 12945\.2$/],
  ['CFRA leave twelve weeks', /^GOV 12945\.2$/],
  ['fired for taking baby bonding leave', /^GOV 12945\.2$/],
  ['bereavement leave after a death in the family', /^GOV 12945\.7$/],
  ['time off after a miscarriage', /^GOV 12945\.6$/],
  ['fired for serving on a jury', /^(GOV 12945\.8|LAB 230)$/],
  ['domestic violence victim time off from work', /^GOV 12945\.8$/],
  ['willful misclassification as an independent contractor penalty', /^LAB 226\.8$/],
  ['fired for complaining about unsafe working conditions', /^(LAB 6310|CACI 4605)$/],
  ['refused to do dangerous work and was fired', /^LAB 6311$/],
  ['mass layoff without 60 days notice', /^(LAB 1401|LAB 1402)$/],
  ['back pay when the plant closed without warning', /^(LAB 1402|LAB 1401)$/],
  ['lied about the pay to get me to move for the job', /^(LAB 970|LAB 972|CACI 2710)$/],
  ['former employer gave a false reference to stop me getting hired', /^(LAB 1050|LAB 1054|CACI 2711)$/],
  ['threatened to report me to immigration after I complained', /^(LAB 1019|CACI 2732)$/],
  ['employer asked for more documents to verify work authorization', /^(LAB 1019\.1|LAB 1019\.2|LAB 1019)$/],
  ['nurse retaliated against for reporting unsafe patient care', /^(HSC 1278\.5|CACI 4606)$/],
  ['retaliation for reporting fraud on a government contract', /^(GOV 12653|CACI 4600)$/],
  ['state employee whistleblower retaliation', /^(GOV 8547\.8|CACI 4601|CACI 4602)$/],
]

export function hitRate(top = 5, cases = CASES): { rate: number; misses: string[] } {
  const misses: string[] = []
  for (const [question, accepted] of cases) {
    const keys = searchAuthority(question, top).map(h => h.key)
    if (!keys.some(k => accepted.test(k))) misses.push(`${question} → ${keys.join(' | ') || '(nothing)'}`)
  }
  return { rate: (cases.length - misses.length) / cases.length, misses }
}

describe('the law store finds the provision a question is about', () => {
  it('in the first five results for nearly every question', () => {
    const { rate, misses } = hitRate()
    // Printed so a change that moves the number shows what moved.
    console.log(`law store search: ${Math.round(rate * 100)}% of ${CASES.length} questions found in the top five`)
    if (misses.length) console.log(misses.join('\n'))
    expect(rate).toBeGreaterThanOrEqual(0.9)
  })

  it('and on the questions written after it was tuned', () => {
    const { rate, misses } = hitRate(5, LATER)
    console.log(`law store search, later questions: ${Math.round(rate * 100)}% of ${LATER.length}`)
    if (misses.length) console.log(misses.join('\n'))
    expect(rate).toBeGreaterThanOrEqual(0.85)
  })

  it('and on the sections pulled on 2026-10-06', () => {
    const { rate, misses } = hitRate(5, PULLED_LATER)
    console.log(`law store search, pulled 2026-10-06: ${Math.round(rate * 100)}% of ${PULLED_LATER.length}`)
    if (misses.length) console.log(misses.join('\n'))
    expect(rate).toBeGreaterThanOrEqual(0.85)
  })
})

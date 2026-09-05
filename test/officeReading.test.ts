/**
 * What reaches the office, and what stops a submission.
 *
 * Two defects this covers, both found by exercising the portal rather than
 * reading it:
 *
 * A client who said they had been fired, answered the whole wrongful-termination
 * section, then corrected themselves to say they still work there had "fired
 * unlawfully" filed in their case anyway — the screen dropped the answers, the
 * email and the printed file did not.
 *
 * And Submit checked only the section the client was standing on. The section
 * rail jumps anywhere, the last section has no required question, so tapping to
 * the end and pressing Submit filed an empty intake and told the office it was
 * complete.
 */

import { describe, expect, it } from 'vitest'
import { QUESTIONNAIRE_SECTIONS } from '@/lib/questionnaireData'
import { answersForReading } from '@/lib/modules'
import { effectiveAnswers, missingRequired, withheldAnswers } from '@/lib/questionLogic'
import { generateIntakeEmailHtml } from '@/lib/emailTemplate'
import { questionnaireSections } from '@/lib/questionnaireSections'
import { AnswerValue } from '@/types'

type Answers = Record<string, AnswerValue>

/** Said they were fired, answered the branch, then said they still work there. */
const CHANGED_THEIR_MIND: Answers = {
  full_name: 'Ana Reyes',
  dob: '1990-04-02',
  address: '1200 W 7th St',
  city_state_zip: 'Los Angeles, CA 90017',
  employer_name: 'Sunrise Diner LLC',
  job_title: 'Line cook',
  job_duties: 'Prep, grill, close the kitchen.',
  still_employed: 'yes',
  // Left behind when they changed the answer above.
  employment_ended_how: 'Fired',
  fired_or_forced: 'Yes',
  ended_unlawfully: 'Yes',
  wrongful_reason_belief: 'They fired me the week after I complained about my pay.',
  wages_owed: 'Yes',
}

describe('an answer the client took back', () => {
  it('is not in what the office files', () => {
    const { live, retracted } = answersForReading(CHANGED_THEIR_MIND)
    expect(live.ended_unlawfully).toBeUndefined()
    expect(live.wrongful_reason_belief).toBeUndefined()
    expect(live.employment_ended_how).toBeUndefined()
    // What they do stand behind is untouched.
    expect(live.still_employed).toBe('yes')
    expect(live.job_title).toBe('Line cook')

    expect(Object.keys(retracted).sort()).toEqual([
      'employment_ended_how',
      'ended_unlawfully',
      'fired_or_forced',
      'wages_owed',
      'wrongful_reason_belief',
    ])
  })

  it('is not in the email the firm receives', () => {
    const { live } = answersForReading(CHANGED_THEIR_MIND)
    const html = generateIntakeEmailHtml(
      'Ana Reyes',
      'Wage & Hour',
      'Friday, September 5, 2026',
      live,
      questionnaireSections('en')
    )
    expect(html).not.toContain('They fired me the week after I complained')
    expect(html).not.toContain('Wrongful Termination')
    // And still carries what they did say.
    expect(html).toContain('Line cook')
    expect(html).toContain('Sunrise Diner LLC')
  })

  it('is still on file, so changing their mind back returns it', () => {
    expect(CHANGED_THEIR_MIND.wrongful_reason_belief).toBeTruthy()
    const backAgain = { ...CHANGED_THEIR_MIND, still_employed: 'no' }
    const { live, retracted } = answersForReading(backAgain)
    expect(live.wrongful_reason_belief).toBe(
      'They fired me the week after I complained about my pay.'
    )
    expect(retracted).toEqual({})
  })

  it('reports nothing retracted for a client who never doubled back', () => {
    const straightforward: Answers = { still_employed: 'yes', job_title: 'Cook' }
    expect(withheldAnswers(QUESTIONNAIRE_SECTIONS, straightforward)).toEqual({})
  })

  it('does not call an answer "taken back" when the questionnaire grew a gate above it', () => {
    // Roberto Paco Garcia answered "when did you start?" months before Module 1
    // put "do you know the exact date?" in front of it. He withdrew nothing.
    const answeredBeforeTheGate: Answers = { still_employed: 'yes', start_date: 'March 2022' }
    const withheld = withheldAnswers(QUESTIONNAIRE_SECTIONS, answeredBeforeTheGate)
    expect(withheld.start_date).toBe('orphaned')

    const { filed, retracted } = answersForReading(answeredBeforeTheGate)
    // It is his own word, so it is filed — and it is not called a retraction.
    expect(filed.start_date).toBe('March 2022')
    expect(retracted.start_date).toBeUndefined()
  })

  it('calls it taken back only when the client answered the gate themselves', () => {
    const withheld = withheldAnswers(QUESTIONNAIRE_SECTIONS, CHANGED_THEIR_MIND)
    expect(withheld.wrongful_reason_belief).toBe('retracted')
    expect(withheld.ended_unlawfully).toBe('retracted')
  })
})

describe('submitting', () => {
  /** What the Submit button now checks: every visible section, not just one. */
  const firstMissing = (answers: Answers) => {
    const live = effectiveAnswers(QUESTIONNAIRE_SECTIONS, answers)
    for (const section of QUESTIONNAIRE_SECTIONS) {
      const [q] = missingRequired(section, live)
      if (q) return { section: section.id, question: q.id }
    }
    return null
  }

  it('is refused for a client who jumped to the end and answered nothing', () => {
    const missing = firstMissing({})
    expect(missing).not.toBeNull()
    expect(missing!.section).toBe('contact')
    expect(missing!.question).toBe('full_name')
  })

  it('names a question the client cannot see from the last section', () => {
    // The trap: the final section has nothing required, so checking only the
    // section underfoot let an empty questionnaire through.
    const last = QUESTIONNAIRE_SECTIONS[QUESTIONNAIRE_SECTIONS.length - 1]
    expect(missingRequired(last, {})).toEqual([])
    expect(firstMissing({})).not.toBeNull()
  })

  it('is allowed once every required question a client can see is answered', () => {
    const complete: Answers = {
      full_name: 'Ana Reyes',
      dob: '1990-04-02',
      address: '1200 W 7th St',
      city_state_zip: 'Los Angeles, CA 90017',
      employer_name: 'Sunrise Diner LLC',
      still_employed: 'yes',
      job_title: 'Line cook',
      job_duties: 'Prep, grill, close the kitchen.',
    }
    expect(firstMissing(complete)).toBeNull()
  })

  it('does not demand answers from sections the client is not shown', () => {
    // A current employee is never asked the former-employee sections, so their
    // required questions must not hold up a submission.
    const currentEmployee: Answers = {
      full_name: 'Ana Reyes',
      dob: '1990-04-02',
      address: '1200 W 7th St',
      city_state_zip: 'Los Angeles, CA 90017',
      employer_name: 'Sunrise Diner LLC',
      still_employed: 'yes',
      job_title: 'Line cook',
      job_duties: 'Prep, grill, close the kitchen.',
    }
    expect(firstMissing(currentEmployee)).toBeNull()
  })
})

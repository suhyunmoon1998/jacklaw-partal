/**
 * What the office actually receives.
 *
 * A wage-and-hour submission used to arrive under the subject "New Client
 * Intake" with a body built from the intake questionnaire's sections — so the
 * one thing it was about, the answers, was not in it. The email is not
 * something a test can send, but what goes into it is.
 */

import { describe, expect, it } from 'vitest'
import { generateIntakeEmailHtml } from '@/lib/emailTemplate'
import { questionnaireSections } from '@/lib/questionnaireSections'
import { module2Sections } from '@/lib/module2Sections'
import { liveAnswersFor } from '@/lib/modules'
import { prepareSections } from '@/lib/repeatSections'
import { AnswerValue } from '@/types'

const OPENED = 'Opened a door or gate'

const ANSWERS: Record<string, AnswerValue> = {
  full_name: 'Ana Reyes',
  job_title: 'Line cook',
  still_employed: 'no',
  m2_meal_given: 'Some days',
  m2_before_clock_in: [OPENED],
  m2_most_frequent_pattern: OPENED,
  [`m2_p_what::${OPENED}`]: 'Unlocked the gate for the crew before clocking in',
  [`m2_p_minutes_per_day::${OPENED}`]: 'best=20; low=15; high=30',
  m2_over_8_hours: '3-4 days',
}

const module2Html = () => {
  const live = liveAnswersFor('en', ANSWERS)
  return generateIntakeEmailHtml(
    'Ana Reyes',
    'Wage & Hour',
    'Thursday, September 4, 2026',
    ANSWERS,
    prepareSections(module2Sections('en'), live)
  )
}

describe('the wage-and-hour notification', () => {
  it('contains the answers it is about', () => {
    const html = module2Html()
    expect(html).toContain('Unlocked the gate for the crew before clocking in')
    expect(html).toContain('best=20; low=15; high=30')
    expect(html).toContain('Some days')
    expect(html).toContain('3-4 days')
  })

  it('heads each repeated branch with the work it is about', () => {
    expect(module2Html()).toContain(`Unpaid Work — ${OPENED}`)
  })

  it('is not empty, which is what it was', () => {
    // The failure mode: Module 2 answers rendered against Module 1's sections,
    // which share no question ids, so every section came out blank.
    const wrongSections = generateIntakeEmailHtml(
      'Ana Reyes',
      'Wage & Hour',
      'Thursday, September 4, 2026',
      ANSWERS,
      module2Sections('en').filter(() => false)
    )
    expect(wrongSections).not.toContain('Unlocked the gate')
    expect(module2Html().length).toBeGreaterThan(wrongSections.length)
  })
})

describe('the intake notification', () => {
  it('still contains the intake answers, unchanged', () => {
    const html = generateIntakeEmailHtml(
      'Ana Reyes',
      'Wage & Hour',
      'Thursday, September 4, 2026',
      ANSWERS,
      questionnaireSections('en')
    )
    expect(html).toContain('Ana Reyes')
    expect(html).toContain('Line cook')
  })

  it('defaults to the intake questionnaire when no sections are given', () => {
    const html = generateIntakeEmailHtml('Ana Reyes', 'Wage & Hour', 'today', ANSWERS)
    expect(html).toContain('Line cook')
  })
})

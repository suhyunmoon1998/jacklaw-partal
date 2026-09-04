/**
 * The staff-only reading aid.
 *
 * A flag is not a conclusion. It says "the facts here point at something
 * someone should read", and it carries those facts so the reader can disagree
 * without opening the whole file. Nothing here reaches a client.
 */

import { describe, expect, it } from 'vitest'
import { FLAG_LABEL, staffFlags } from '@/lib/staffFlags'
import { AnswerValue } from '@/types'

type Answers = Record<string, AnswerValue>

/** The record a real Module 2 run leaves behind. */
const FILLED: Answers = {
  m2_meal_given: 'Some days',
  m2_meal_what_happened: ['I kept working while I ate'],
  m2_meal_days_per_week: '3',
  m2_rest_count: '0',
  m2_rest_days_per_week: '5',
  m2_most_frequent_pattern: 'Opened a door or gate',
  m2_other_frequent_patterns: ['Counted money, tips, or products'],
  'm2_p_minutes_per_day::Opened a door or gate': 'best=20; low=15; high=30',
  'm2_p_told_anyone::Opened a door or gate': 'Yes',
  m2_over_8_hours: '3-4 days',
  m2_all_hours_on_stub: 'No',
  m2_spoke_up: ['I asked for missing pay'],
}

const raised = (answers: Answers) => staffFlags(answers).map(f => f.flag)

describe('what gets flagged', () => {
  it('raises each of the five from the facts that support it', () => {
    expect(raised(FILLED).sort()).toEqual([
      'possible_meal_issue',
      'possible_off_clock_issue',
      'possible_overtime_issue',
      'possible_rest_issue',
      'possible_retaliation_issue',
    ])
  })

  it('always says why, in the client\'s own terms', () => {
    for (const flag of staffFlags(FILLED)) {
      expect(flag.because.length).toBeGreaterThan(0)
      expect(FLAG_LABEL[flag.flag]).toBeTruthy()
      for (const reason of flag.because) expect(reason.trim().length).toBeGreaterThan(0)
    }
    const offClock = staffFlags(FILLED).find(f => f.flag === 'possible_off_clock_issue')!
    expect(offClock.because.join(' ')).toContain('Opened a door or gate')
    expect(offClock.because.join(' ')).toContain('20 unpaid minutes')
  })

  it('raises nothing from an empty record', () => {
    expect(staffFlags({})).toEqual([])
  })

  it('raises nothing when the answers say nothing went wrong', () => {
    const clean: Answers = {
      m2_meal_given: 'Every day',
      m2_meal_minutes_free: '30 minutes or more',
      m2_meal_what_happened: ['I did no work and did not have to stay ready'],
      m2_meal_could_leave: 'Yes',
      m2_meal_days_per_week: '0',
      m2_rest_count: '2',
      m2_rest_full_ten: 'Every break',
      m2_rest_what_happened: ['I did no work and used the time for myself'],
      m2_rest_days_per_week: '0',
      m2_before_clock_in: ['None of these'],
      m2_over_8_hours: 'Never',
      m2_over_40_hours: 'Never',
      m2_all_hours_on_stub: 'Every time',
      m2_seven_days_running: 'No',
      m2_spoke_up: ['None of these'],
    }
    expect(staffFlags(clean)).toEqual([])
  })

  it('opens retaliation from a complaint made inside one unpaid-work branch alone', () => {
    const onlyBranch: Answers = {
      'm2_p_told_anyone::Waited at a gate or security check': 'Yes',
      m2_spoke_up: ['None of these'],
    }
    const flags = staffFlags(onlyBranch)
    expect(flags.map(f => f.flag)).toContain('possible_retaliation_issue')
    expect(flags.find(f => f.flag === 'possible_retaliation_issue')!.because.join(' '))
      .toContain('Waited at a gate or security check')
  })

  it('does not treat "not sure" as a finding on its own', () => {
    expect(raised({ m2_spoke_up: ['Not sure'] })).not.toContain('possible_retaliation_issue')
    expect(raised({ m2_what_got_worse: ['Nothing got worse'] })).not.toContain('possible_retaliation_issue')
  })
})

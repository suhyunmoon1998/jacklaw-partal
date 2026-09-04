/**
 * What in a client's answers is worth a second look, for staff only.
 *
 * These are not conclusions and must never be shown to a client. A flag says
 * "the facts here point at something someone should read", and always carries
 * the facts that raised it so the reader can disagree in one glance. Nothing
 * here decides whether a claim exists; that is a lawyer's job and this is a
 * reading aid.
 */

import { AnswerValue } from '@/types'
import { baseId } from '@/lib/repeatSections'
import { parseNumberRange } from '@/lib/numberRange'

export type StaffFlag =
  | 'possible_meal_issue'
  | 'possible_rest_issue'
  | 'possible_off_clock_issue'
  | 'possible_overtime_issue'
  | 'possible_retaliation_issue'

export interface RaisedFlag {
  flag: StaffFlag
  /** The answers that raised it, in the client's own terms. */
  because: string[]
}

const str = (v: AnswerValue | undefined) => (typeof v === 'string' ? v : '')
const list = (v: AnswerValue | undefined) => (Array.isArray(v) ? v : [])
const isOneOf = (v: AnswerValue | undefined, ...want: string[]) => want.includes(str(v))

/** Days-per-week answers that mean it happened at all. */
const HAPPENED = ['1', '2', '3', '4', '5', '6', '7', 'It changed', 'Not sure']

const MEAL_WORKED_THROUGH = [
  'A boss or worker asked me a question',
  'I helped a customer, patient, resident, or other person',
  'I answered a work phone, radio, text, alarm, or door',
  'I watched a counter, machine, work area, or people',
  'I signed for a delivery or did a quick task',
  'I had to stay ready in case work came up',
  'I kept working while I ate',
  'A boss told me to wait, skip the meal, or finish work first',
  'Work was too busy, or no one could cover for me',
]

const REST_NOT_FREE = [
  'I had to clock out',
  'I answered a question or helped a supervisor, coworker, customer, or vendor',
  'I answered a work phone, radio, text, alarm, or door',
  'I watched a counter, machine, area, or people',
  'I had to stay ready in case work came up',
  'I had to ask before taking the break',
  'I was told to wait or was told no',
  'Work was too busy, or no one could cover',
  'The break was added to lunch or put at the start or end of the shift',
  'A bathroom trip was counted as my rest break',
]

export function staffFlags(answers: Record<string, AnswerValue>): RaisedFlag[] {
  const raised: RaisedFlag[] = []
  const add = (flag: StaffFlag, because: string[]) => {
    const reasons = because.filter(Boolean)
    if (reasons.length) raised.push({ flag, because: reasons })
  }

  // ── Meals ────────────────────────────────────────────────────────────────
  const mealBecause: string[] = []
  if (isOneOf(answers.m2_meal_given, 'No', 'Some days')) {
    mealBecause.push(`Meal break on days over five hours: ${str(answers.m2_meal_given)}`)
  }
  if (isOneOf(answers.m2_meal_minutes_free, '20-29 minutes', '10-19 minutes', 'Less than 10 minutes', 'No meal')) {
    mealBecause.push(`Uninterrupted minutes: ${str(answers.m2_meal_minutes_free)}`)
  }
  const mealWorked = list(answers.m2_meal_what_happened).filter(v => MEAL_WORKED_THROUGH.includes(v))
  if (mealWorked.length) mealBecause.push(`During the meal: ${mealWorked.join('; ')}`)
  if (isOneOf(answers.m2_meal_could_leave, 'No', 'Only with permission')) {
    mealBecause.push(`Could leave the site during the meal: ${str(answers.m2_meal_could_leave)}`)
  }
  if (HAPPENED.includes(str(answers.m2_meal_days_per_week))) {
    mealBecause.push(`Days a week affected: ${str(answers.m2_meal_days_per_week)}`)
  }
  if (isOneOf(answers.m2_second_meal_given, 'No', 'Some days')) {
    mealBecause.push(`Second meal past ten hours: ${str(answers.m2_second_meal_given)}`)
  }
  add('possible_meal_issue', mealBecause)

  // ── Rest breaks ──────────────────────────────────────────────────────────
  const restBecause: string[] = []
  if (isOneOf(answers.m2_rest_count, '0', '1')) {
    restBecause.push(`Paid rest breaks in a normal day: ${str(answers.m2_rest_count)}`)
  }
  if (isOneOf(answers.m2_rest_full_ten, 'Some breaks', 'No')) {
    restBecause.push(`Breaks lasted a full ten minutes: ${str(answers.m2_rest_full_ten)}`)
  }
  const restBusy = list(answers.m2_rest_what_happened).filter(v => REST_NOT_FREE.includes(v))
  if (restBusy.length) restBecause.push(`During the break: ${restBusy.join('; ')}`)
  if (HAPPENED.includes(str(answers.m2_rest_days_per_week))) {
    restBecause.push(`Days a week affected: ${str(answers.m2_rest_days_per_week)}`)
  }
  add('possible_rest_issue', restBecause)

  // ── Work that never reached a time record ────────────────────────────────
  const offClockBecause: string[] = []
  const patterns = [
    ...(str(answers.m2_most_frequent_pattern) ? [str(answers.m2_most_frequent_pattern)] : []),
    ...list(answers.m2_other_frequent_patterns),
  ]
  if (patterns.length) offClockBecause.push(`Unpaid work named: ${patterns.join('; ')}`)
  for (const [key, value] of Object.entries(answers)) {
    if (baseId(key) !== 'm2_p_minutes_per_day') continue
    const { best, low, high } = parseNumberRange(value)
    const minutes = best ?? high ?? low
    if (minutes !== undefined) {
      const which = key.split('::')[1] ?? 'this pattern'
      offClockBecause.push(`About ${minutes} unpaid minutes a day — ${which}`)
    }
  }
  add('possible_off_clock_issue', offClockBecause)

  // ── Overtime ─────────────────────────────────────────────────────────────
  const otBecause: string[] = []
  if (str(answers.m2_over_8_hours) && str(answers.m2_over_8_hours) !== 'Never') {
    otBecause.push(`Days over eight hours: ${str(answers.m2_over_8_hours)}`)
  }
  if (str(answers.m2_over_40_hours) && str(answers.m2_over_40_hours) !== 'Never') {
    otBecause.push(`Weeks over forty hours: ${str(answers.m2_over_40_hours)}`)
  }
  if (isOneOf(answers.m2_all_hours_on_stub, 'Sometimes', 'No', 'I did not get a pay record')) {
    otBecause.push(`All hours shown on the pay record: ${str(answers.m2_all_hours_on_stub)}`)
  }
  if (isOneOf(answers.m2_overtime_on_stub, 'Sometimes', 'No', 'I did not get a pay record')) {
    otBecause.push(`Overtime shown for every extra hour: ${str(answers.m2_overtime_on_stub)}`)
  }
  if (isOneOf(answers.m2_double_time_on_stub, 'Sometimes', 'No', 'I did not get a pay record')) {
    otBecause.push(`Double time past twelve hours: ${str(answers.m2_double_time_on_stub)}`)
  }
  if (isOneOf(answers.m2_seven_days_running, 'Yes, once or twice', 'Yes, many times')) {
    otBecause.push(`Seven days in a row: ${str(answers.m2_seven_days_running)}`)
  }
  add('possible_overtime_issue', otBecause)

  // ── Retaliation ──────────────────────────────────────────────────────────
  const retBecause: string[] = []
  const spokeUp = list(answers.m2_spoke_up).filter(v => v !== 'None of these' && v !== 'Not sure')
  if (spokeUp.length) retBecause.push(`Spoke up about: ${spokeUp.join('; ')}`)
  // Also opened by a complaint made inside any one unpaid-work branch.
  for (const [key, value] of Object.entries(answers)) {
    if (baseId(key) === 'm2_p_told_anyone' && str(value) === 'Yes') {
      retBecause.push(`Asked to be paid for unpaid time — ${key.split('::')[1] ?? 'a pattern'}`)
    }
  }
  const gotWorse = list(answers.m2_what_got_worse).filter(v => v !== 'Nothing got worse' && v !== 'Not sure')
  if (gotWorse.length) retBecause.push(`After speaking up: ${gotWorse.join('; ')}`)
  if (str(answers.m2_first_bad_thing)) retBecause.push(`First: ${str(answers.m2_first_bad_thing)}`)
  if (isOneOf(answers.m2_decider_knew, 'Yes', 'Maybe')) {
    retBecause.push(`The person who decided knew: ${str(answers.m2_decider_knew)}`)
  }
  add('possible_retaliation_issue', retBecause)

  return raised
}

export const FLAG_LABEL: Record<StaffFlag, string> = {
  possible_meal_issue: 'Meal breaks',
  possible_rest_issue: 'Rest breaks',
  possible_off_clock_issue: 'Unpaid time',
  possible_overtime_issue: 'Overtime',
  possible_retaliation_issue: 'Retaliation',
}

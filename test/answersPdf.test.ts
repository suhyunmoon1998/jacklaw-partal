import { describe, it, expect } from 'vitest'
import { answersToPrint, generateAnswersPdf } from '@/lib/generateAnswersPdf'
import { answersForReading } from '@/lib/modules'
import { QuestionnaireSection } from '@/types'

// The shape of one client's follow-up set: one flat
// section, question ids made from the question text.
const set: QuestionnaireSection[] = [
  {
    id: 'set-1',
    title: 'Vehicle, DOT & July 31 Termination',
    questions: [
      { id: 'what_is_the_year_of_the_vehicle_you_usua_1', label: 'What is the year of the vehicle you usually drove?', type: 'text' },
      { id: 'what_is_the_make_brand_of_that_vehicle_2', label: 'What is the make (brand) of that vehicle?', type: 'text' },
    ],
  },
]
const answers = {
  what_is_the_year_of_the_vehicle_you_usua_1: '2019',
  what_is_the_make_brand_of_that_vehicle_2: 'Ford',
}

describe('printing an assigned question set', () => {
  it('prints the answers the set was given, as View Answers shows them', () => {
    // Run through the modules' reading, both were dropped: it knows none of a
    // set's ids, and the PDF said "No answers submitted yet."
    expect(Object.keys(answersForReading(answers).filed)).not.toContain('what_is_the_year_of_the_vehicle_you_usua_1')

    const printed = answersToPrint(answers, set)
    expect(printed.filed).toEqual(answers)
    expect(printed.sections).toBe(set)
    expect(printed.retracted).toEqual({})
  })

  it('still reads the default questionnaire through the modules', () => {
    const intake = { full_name: 'Test Person' }
    const printed = answersToPrint(intake)
    const reading = answersForReading(intake)
    expect(printed.filed).toEqual(reading.filed)
    expect(printed.retracted).toEqual(reading.retracted)
    expect(printed.sections.map(s => s.id)).toEqual(reading.sections.map(s => s.id))
  })

  it('draws a set longer than an empty one', async () => {
    const full = await generateAnswersPdf('Mei Lin', 'Wage & Hour', '', answers, { sections: set, title: set[0].title })
    const empty = await generateAnswersPdf('Mei Lin', 'Wage & Hour', '', {}, { sections: set, title: set[0].title })
    expect(full.length).toBeGreaterThan(empty.length)
  })
})

describe('the fee waiver result on the intake PDF', () => {
  const feeWaiver = {
    sentAt: '2026-10-01T17:00:00Z',
    completedAt: '2026-10-03T17:00:00Z',
    answers: { benefits: 'no' as const, income: 3100, household: 3, householdAnswer: '3' },
    verdict: { kind: 'under' as const, limit: 4553.33, size: 3 },
  }

  it('is drawn when the questions were sent, and left off when they were not', async () => {
    const without = await generateAnswersPdf('Mei Lin', 'Wage & Hour', '', {})
    const withIt = await generateAnswersPdf('Mei Lin', 'Wage & Hour', '', {}, { feeWaiver })
    expect(withIt.length).toBeGreaterThan(without.length)
  })

  it('says so when the answers could not be read, rather than leaving the section out', async () => {
    const without = await generateAnswersPdf('Mei Lin', 'Wage & Hour', '', {})
    const failed = await generateAnswersPdf('Mei Lin', 'Wage & Hour', '', {}, { feeWaiver: { error: 'Could not read the fee waiver answers: timeout' } })
    expect(failed.length).toBeGreaterThan(without.length)
  })
})

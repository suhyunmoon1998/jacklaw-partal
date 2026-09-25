import { describe, it, expect } from 'vitest'
import { answersToPrint, generateAnswersPdf } from '@/lib/generateAnswersPdf'
import { answersForReading } from '@/lib/modules'
import { QuestionnaireSection } from '@/types'

// The shape of Jingwen Du's "Vehicle, DOT & July 31 Termination": one flat
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
    const full = await generateAnswersPdf('Jingwen Du', 'Wage & Hour', '', answers, { sections: set, title: set[0].title })
    const empty = await generateAnswersPdf('Jingwen Du', 'Wage & Hour', '', {}, { sections: set, title: set[0].title })
    expect(full.length).toBeGreaterThan(empty.length)
  })
})

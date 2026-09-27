import { describe, expect, it } from 'vitest'
import { sections } from '@/lib/factExtraction'
import { finishedQuestionnaire } from '@/lib/followUpQueue'

const read = (answers: Record<string, string | string[]>) =>
  sections({ clientId: 'c', clientName: 'C', answers } as Parameters<typeof sections>[0])

const ids = (parts: ReturnType<typeof read>) =>
  parts.flatMap(p => [...p.text.matchAll(/^\[([^\]]+)\]/gm)].map(m => m[1]))

describe('answers given to the questionnaire before September 3', () => {
  it('reads an answer the current questionnaire has no question for, in the wording the client saw', () => {
    // days_per_week and meal_break_provided exist only in the earlier version.
    const parts = read({ days_per_week: '6', meal_break_provided: 'no' })
    const earlier = parts.filter(p => p.title.includes('earlier version'))
    expect(ids(earlier)).toEqual(expect.arrayContaining(['days_per_week', 'meal_break_provided']))
    expect(earlier.map(p => p.text).join('\n')).toContain('ANSWER: 6')
  })

  it('does not read an answer twice when the current questionnaire already has it', () => {
    const parts = read({ full_name: 'Carla Linares', days_per_week: '5' })
    expect(ids(parts).filter(id => id === 'full_name')).toHaveLength(1)
    expect(parts.find(p => p.text.includes('[full_name]'))!.title).not.toContain('earlier version')
  })

  it('leaves out an answer the earlier version itself would have hidden', () => {
    // Ester: "did you pay for tools" no, so "were you reimbursed" was never a
    // live question, whatever is stored under it.
    const parts = read({ paid_for_tools: 'no', tools_reimbursed: 'no' })
    expect(ids(parts)).toContain('paid_for_tools')
    expect(ids(parts)).not.toContain('tools_reimbursed')
  })
})

describe('who has finished the questionnaire', () => {
  it('counts Module 2 submitted', () => {
    expect(finishedQuestionnaire({ m2_submitted: true, completed_sections: [0] })).toBe(true)
  })

  it('counts the earlier twenty-section version answered through, or all but its last section', () => {
    expect(finishedQuestionnaire({ m2_submitted: false, completed_sections: [...Array(20).keys()] })).toBe(true)
    expect(finishedQuestionnaire({ m2_submitted: false, completed_sections: [...Array(19).keys()] })).toBe(true)
  })

  it('does not count the current Module 1 alone, or an earlier version left partway', () => {
    expect(finishedQuestionnaire({ m2_submitted: false, completed_sections: [...Array(10).keys()] })).toBe(false)
    expect(finishedQuestionnaire({ m2_submitted: false, completed_sections: [...Array(18).keys()] })).toBe(false)
    expect(finishedQuestionnaire({ m2_submitted: null, completed_sections: null })).toBe(false)
  })
})

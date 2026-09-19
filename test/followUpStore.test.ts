import { describe, it, expect } from 'vitest'
import { FollowUp, toQuestion } from '@/lib/followUp'
import { inGateOrder } from '@/lib/followUpStore'
import { normalizeQuestion, normalizeQuestions } from '@/lib/questionSets'

const q = (id: string, over: Partial<FollowUp> = {}): FollowUp => ({
  id,
  label: `Question ${id}?`,
  type: 'textarea',
  options: [],
  helpText: '',
  inTheirLanguage: null,
  rung: 2,
  resolves: { kind: 'open loop', ref: 'c1:f001' },
  whyItMatters: 'because',
  askOnlyIf: null,
  ...over,
})

describe('ordering a round so its routing survives', () => {
  it('puts a gate before the question it controls', () => {
    // normalizeQuestions drops a showIf whose gate sits at or after its
    // dependant, because such a gate can never have been answered. A round
    // that happens to come out in the wrong order therefore loses its routing
    // in silence, and every client is asked everything.
    const out = inGateOrder([
      q('b', { askOnlyIf: { questionId: 'a', answers: ['Yes'] } }),
      q('a'),
    ])
    expect(out.map(x => x.id)).toEqual(['a', 'b'])
  })

  it('handles a chain of gates', () => {
    const out = inGateOrder([
      q('c', { askOnlyIf: { questionId: 'b', answers: ['Yes'] } }),
      q('b', { askOnlyIf: { questionId: 'a', answers: ['Yes'] } }),
      q('a'),
    ])
    expect(out.map(x => x.id)).toEqual(['a', 'b', 'c'])
  })

  it('keeps every question when a gate points at nothing', () => {
    const out = inGateOrder([q('a', { askOnlyIf: { questionId: 'gone', answers: ['Yes'] } }), q('b')])
    expect(out.map(x => x.id).sort()).toEqual(['a', 'b'])
  })

  it('does not loop on questions that gate each other', () => {
    const out = inGateOrder([
      q('a', { askOnlyIf: { questionId: 'b', answers: ['Yes'] } }),
      q('b', { askOnlyIf: { questionId: 'a', answers: ['Yes'] } }),
    ])
    expect(out).toHaveLength(2)
  })

  it('leaves an already-ordered round alone', () => {
    const out = inGateOrder([q('a'), q('b', { askOnlyIf: { questionId: 'a', answers: ['Yes'] } }), q('c')])
    expect(out.map(x => x.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('a generated question surviving the trip into the portal', () => {
  it('keeps a gate with more than one revealing answer', () => {
    // The renderer has always understood "Yes or Sometimes". normalizeQuestion
    // dropped the second, so the question stayed hidden from everyone who
    // picked it — silently, and for admin-authored sets too.
    const gate = q('a', { type: 'select', options: ['Yes', 'Sometimes', 'No', 'I am not sure'] })
    const dependant = q('b', { askOnlyIf: { questionId: 'a', answers: ['Yes', 'Sometimes'] } })
    const stored = normalizeQuestions([gate, dependant].map(x => toQuestion(x, 'en')))
    expect(stored[1].showIf).toEqual({ questionId: 'a', value: 'Yes', orValues: ['Sometimes'] })
  })

  it('keeps the Korean the client reads and the English a reviewer checks', () => {
    const stored = normalizeQuestion(
      toQuestion(
        q('a', {
          label: 'What were you doing before you clocked in?',
          type: 'select',
          options: ['Counting tips', 'Something else', 'I am not sure'],
          inTheirLanguage: {
            label: '출근 기록을 찍기 전에 무엇을 하고 계셨나요?',
            helpText: '',
            options: ['팁 세는 일', '다른 일', '잘 모르겠어요'],
          },
        }),
        'ko'
      ),
      0
    )
    expect(stored!.label).toBe('What were you doing before you clocked in?')
    expect(stored!.ko?.label).toBe('출근 기록을 찍기 전에 무엇을 하고 계셨나요?')
    expect(stored!.ko?.options).toEqual(['팁 세는 일', '다른 일', '잘 모르겠어요'])
  })

  it('keeps the generated id, because answers are filed under it', () => {
    // The return path joins question_set_responses.question_key to the row
    // saying what the question was for. A derived id would break that join.
    expect(normalizeQuestion(toQuestion(q('q07_one_or_three'), 'en'), 0)!.id).toBe('q07_one_or_three')
  })
})

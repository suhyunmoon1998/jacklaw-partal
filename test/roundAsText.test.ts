import { describe, it, expect } from 'vitest'
import { roundAsText, RoundNote } from '@/lib/roundAsText'

const note = (over: Partial<RoundNote> = {}): RoundNote => ({
  clientName: 'DAYEON KIM',
  questions: [
    {
      id: 'q01_last_day',
      label: 'What was the last day you actually worked?',
      type: 'text',
      ko: { label: '실제로 마지막으로 일한 날이 언제였나요?' },
    },
    {
      id: 'q15_meal_check',
      label: 'Did both of those happen?',
      type: 'select',
      options: ['Both happened', 'I am not sure'],
      ko: { label: '두 가지가 다 있었던 걸까요?', options: ['둘 다 있었어요', '잘 모르겠어요'] },
      showIf: { questionId: 'q01_last_day', value: 'Yes' },
    },
  ],
  meta: [
    { questionKey: 'q01_last_day', rung: 8, resolvesKind: 'date conflict', whyItMatters: 'The separation date sets the deadline for final pay.' },
    { questionKey: 'q15_meal_check', rung: 8, resolvesKind: 'contradiction', whyItMatters: 'The meal claim defeats itself as written.' },
  ],
  leftOut: [{ gap: 'Her hourly rate', why: 'She has said twice she does not know.' }],
  builtFrom: { ledger: 204, matrix: 10, spine: true },
  factCount: 204,
  reviewedBy: null,
  ...over,
})

describe('a round somebody can hold', () => {
  it('carries both languages, because the reviewer may not read the one she will', () => {
    const said = roundAsText(note())
    expect(said).toContain('실제로 마지막으로 일한 날이 언제였나요?')
    expect(said).toContain('What was the last day you actually worked?')
  })

  it('says why each question is asked', () => {
    expect(roundAsText(note())).toContain('Why: The separation date sets the deadline for final pay.')
  })

  it('names the rung and the gate, so the order can be checked', () => {
    const said = roundAsText(note())
    expect(said).toContain('[contradiction check] q01_last_day')
    expect(said).toContain('(only after q01_last_day)')
  })

  it('puts the choices in both languages too', () => {
    expect(roundAsText(note())).toContain('둘 다 있었어요   /   Both happened')
  })

  it('says plainly that nothing has been sent', () => {
    expect(roundAsText(note())).toContain('Not approved. Nothing has been sent.')
    expect(roundAsText(note({ reviewedBy: 'david' }))).toContain('Approved by david.')
  })

  it('says what the round was built from, and when nothing recorded it', () => {
    expect(roundAsText(note())).toContain('Written against 204 facts, 10 claims, and the evidence spine.')
    expect(roundAsText(note({ builtFrom: null }))).toContain('Nothing recorded what else was on file')
  })

  it('keeps what was deliberately left out, which the reader may disagree with', () => {
    const said = roundAsText(note())
    expect(said).toContain('Deliberately not asked (1)')
    expect(said).toContain('She has said twice she does not know.')
  })
})

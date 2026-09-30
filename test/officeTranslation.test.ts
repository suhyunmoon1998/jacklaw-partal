import { describe, expect, it } from 'vitest'
import { answersToTranslate } from '@/lib/officeTranslation'

const answers = {
  start_date: 'Septiembre 2024',
  job_duties: 'Llegadas y salidas de los autos con sistema automático ( pluma)',
  job_type: 'Part-time',
  still_working: 'no',
  documents: ['Pay stubs', 'Texts'],
  what_happened: '他让我走',
}

describe('what the office email puts into English', () => {
  it('for an English reader, only what is not in Latin script', () => {
    expect(answersToTranslate(answers, 'en')).toEqual(['what_happened'])
    expect(answersToTranslate(answers, null)).toEqual(['what_happened'])
  })

  it('for a Spanish reader, everything typed, accented or not', () => {
    const ids = answersToTranslate(answers, 'es')
    // "Septiembre 2024" has no accent, which is why guessing from the words
    // missed it; the client's language is what catches it.
    expect(ids).toEqual(expect.arrayContaining(['start_date', 'job_duties', 'job_type', 'what_happened']))
    expect(ids).not.toContain('still_working')
    expect(ids).not.toContain('documents')
  })
})

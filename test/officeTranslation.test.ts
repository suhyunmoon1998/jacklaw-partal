import { afterEach, describe, expect, it, vi } from 'vitest'

// Constructing the paid translator at all, once a Google key is set, fails the test.
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    constructor() {
      throw new Error('Claude must not be asked to translate once a Google key is set')
    }
  },
}))

// The kept translations, standing in for Google: what is tested is which
// answers are asked about and what the notice is given back.
const asked: { texts: string[]; language: string | null | undefined }[] = []
vi.mock('@/lib/translationCache', () => ({
  englishOf: vi.fn(async (texts: string[], language?: string | null) => {
    asked.push({ texts, language })
    return texts.map(text =>
      text === 'Part-time'
        ? { lang: 'es', english: 'Part-time' }
        : text === '他让我走'
          ? { lang: 'zh', english: null }
          : { lang: 'es', english: `EN(${text})` }
    )
  }),
}))

import { answersToTranslate, toEnglishForOffice } from '@/lib/officeTranslation'

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

describe('the office notice once a Google key is set', () => {
  const saved = process.env.GOOGLE_TRANSLATE_API_KEY
  afterEach(() => {
    asked.length = 0
    if (saved === undefined) delete process.env.GOOGLE_TRANSLATE_API_KEY
    else process.env.GOOGLE_TRANSLATE_API_KEY = saved
  })

  it('goes through Google and the kept translations, never Claude', async () => {
    process.env.GOOGLE_TRANSLATE_API_KEY = 'synthetic-google-translate-key'
    const out = await toEnglishForOffice(answers, id => id, 'es')
    expect(asked).toHaveLength(1)
    expect(asked[0].language).toBe('es')
    expect(asked[0].texts).toEqual(expect.arrayContaining(['Septiembre 2024', 'Part-time', '他让我走']))
    expect(out.english.start_date).toBe('EN(Septiembre 2024)')
    // English that came back unchanged is not printed twice.
    expect(out.english.job_type).toBeUndefined()
    // Google refused the Chinese, so the notice says it is incomplete.
    expect(out.english.what_happened).toBeUndefined()
    expect(out.incomplete).toBe(true)
  })
})

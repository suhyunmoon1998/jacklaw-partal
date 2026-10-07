import { describe, it, expect, vi, beforeEach } from 'vitest'

// The translator and the table, both in memory: what is tested is when each is
// asked, not what the translation says.
const calls: string[] = []
let table: Record<string, string> = {}
let tableBroken = false

const sentAs: Record<string, string> = {}

vi.mock('@/lib/staffTranslation', () => ({
  textsToEnglish: vi.fn(async (items: { key: string; text: string; from: string }[]) => {
    const out = new Map<string, string>()
    for (const { key, text, from } of items) {
      calls.push(text)
      sentAs[text] = from
      // English comes back as it went, the way Google returns it when it is not told the language.
      if (text === 'Part-time' || text === 'I was a cook') out.set(key, text)
      else if (text !== '실패') out.set(key, `EN(${text})`)
    }
    return out
  }),
}))

vi.mock('@/lib/supabase', () => ({
  getSupabase: () => ({
    from: () => ({
      select: () => ({
        in: async (_: string, keys: string[]) =>
          tableBroken
            ? { data: null, error: { message: 'relation "translation_cache" does not exist' } }
            : { data: keys.filter(k => k in table).map(k => ({ key: k, translated: table[k] })), error: null },
      }),
      upsert: async (rows: { key: string; translated: string }[]) => {
        if (tableBroken) return { error: { message: 'relation "translation_cache" does not exist' } }
        for (const r of rows) table[r.key] = r.translated
        return { error: null }
      },
    }),
  }),
}))

import { cacheKey, englishOf, keysToForget, languageOf, toEnglishCached, translateAnswersCached } from '@/lib/translationCache'

beforeEach(() => {
  calls.length = 0
  table = {}
  tableBroken = false
  for (const k of Object.keys(sentAs)) delete sentAs[k]
})

describe('Spanish the office used to be shown untranslated', () => {
  it('sends Spanish typed without accents', async () => {
    const out = await toEnglishCached(['No me pagaron las horas extra', 'My manager yelled at me'])
    expect(out).toEqual(['EN(No me pagaron las horas extra)', ''])
    expect(calls).toEqual(['No me pagaron las horas extra'])
    expect(sentAs['No me pagaron las horas extra']).toBe('es')
  })

  it('sends what a Spanish reader typed, and keeps an English answer as English', async () => {
    const out = await toEnglishCached(['Septiembre 2024', 'Part-time', 'yes', '2024'], 'es')
    expect(out).toEqual(['EN(Septiembre 2024)', '', '', ''])
    expect(calls).toEqual(['Septiembre 2024', 'Part-time'])
    // Kept even though it came back unchanged, so it is not sent on every load.
    expect(table[cacheKey('Part-time', 'es', 'en')]).toBe('Part-time')
    calls.length = 0
    await toEnglishCached(['Part-time'], 'es')
    expect(calls).toEqual([])
  })

  it('does not treat a Korean or Chinese reader’s Latin answers as their language', async () => {
    expect(await toEnglishCached(['Part-time', 'Toyota'], 'ko')).toEqual(['', ''])
    expect(calls).toEqual([])
  })

  it('sends a script nothing here names, for Google to read', async () => {
    expect(languageOf('Tôi bị sa thải')).toBe('auto')
    expect(languageOf('Меня уволили')).toBe('auto')
    expect(await toEnglishCached(['Меня уволили'])).toEqual(['EN(Меня уволили)'])
    expect(sentAs['Меня уволили']).toBe('auto')
  })

  it('tells the office’s notice what was sent and what came back', async () => {
    const out = await englishOf(['I was a cook', '실패', 'Toyota'], 'es')
    expect(out).toEqual([
      { lang: 'es', english: 'I was a cook' },
      { lang: 'ko', english: null },
      { lang: 'es', english: 'EN(Toyota)' },
    ])
  })

  it('forgets a deleted client’s text under every language it could have been kept as', () => {
    const keys = keysToForget(['  José Martinez ', ''])
    expect(keys).toHaveLength(4)
    expect(keys).toContain(cacheKey('José Martinez', 'es', 'en'))
    expect(keys).toContain(cacheKey('José Martinez', 'auto', 'en'))
  })
})

describe('translating once and keeping it', () => {
  it('asks the translator only for text in another language, once per text', async () => {
    const out = await toEnglishCached(['팁 정리', 'yes', 'Toyota', '', '팁 정리'])
    expect(out).toEqual(['EN(팁 정리)', '', '', '', 'EN(팁 정리)'])
    expect(calls).toEqual(['팁 정리'])
  })

  it('reads a kept translation instead of asking again', async () => {
    await toEnglishCached(['매니져'])
    expect(table[cacheKey('매니져', 'ko', 'en')]).toBe('EN(매니져)')
    calls.length = 0
    expect(await toEnglishCached(['매니져'])).toEqual(['EN(매니져)'])
    expect(calls).toEqual([])
  })

  it('keeps nothing when nothing came back, so a refusal is asked again later', async () => {
    expect(await toEnglishCached(['실패'])).toEqual([''])
    expect(Object.keys(table)).toHaveLength(0)
  })

  it('still translates when the table is missing', async () => {
    tableBroken = true
    expect(await toEnglishCached(['휴게실'])).toEqual(['EN(휴게실)'])
  })

  it('gives the answers back whole, English where it was needed', async () => {
    const out = await translateAnswersCached({ q1: '동료', q2: 'yes', q3: ['Mine', 'Tesla'] })
    expect(out).toEqual({ q1: 'EN(동료)', q2: 'yes', q3: 'Mine, Tesla' })
  })
})

describe('where a client’s words are sent', () => {
  it('never to a free public translation endpoint', async () => {
    const { readFileSync, readdirSync } = await import('fs')
    const { join } = await import('path')
    const sources = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap(d =>
        d.isDirectory() ? sources(join(dir, d.name)) : /\.(ts|tsx)$/.test(d.name) ? [join(dir, d.name)] : []
      )
    for (const file of [...sources('lib'), ...sources('app'), ...sources('components')]) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/mymemory\.translated|translate\.googleapis/i)
    }
  })
})

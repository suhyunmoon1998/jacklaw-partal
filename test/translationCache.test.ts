import { describe, it, expect, vi, beforeEach } from 'vitest'

// The translator and the table, both in memory: what is tested is when each is
// asked, not what the translation says.
const calls: string[] = []
let table: Record<string, string> = {}
let tableBroken = false

vi.mock('@/lib/staffTranslation', () => ({
  textsToEnglish: vi.fn(async (items: { key: string; text: string }[]) => {
    const out = new Map<string, string>()
    for (const { key, text } of items) {
      calls.push(text)
      if (text !== '실패') out.set(key, `EN(${text})`)
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

import { cacheKey, toEnglishCached, translateAnswersCached } from '@/lib/translationCache'

beforeEach(() => {
  calls.length = 0
  table = {}
  tableBroken = false
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

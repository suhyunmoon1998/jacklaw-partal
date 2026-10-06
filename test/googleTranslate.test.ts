import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'

// Constructing the paid translator at all, once a Google key is set, fails the test.
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    constructor() {
      throw new Error('Claude must not be asked to translate once a Google key is set')
    }
  },
}))

import { GOOGLE_TRANSLATE_ENDPOINT, googleTextsToEnglish } from '@/lib/googleTranslate'
import { textsToEnglish } from '@/lib/staffTranslation'

/**
 * The office reads a client's own words in English through Google Cloud
 * Translation once its key is set (owner, 2026-10-06): free within Google's
 * monthly allowance, and under terms that keep nothing. What is tested is what
 * leaves the server and what comes back, with Google stood in for.
 */
const KEY = 'synthetic-google-translate-key'

type Sent = { url: string; headers: Record<string, string>; body: { q: string[]; target: string; format: string; source?: string } }

function fakeGoogle(answer: (body: Sent['body']) => Response = body =>
  Response.json({ data: { translations: body.q.map(text => ({ translatedText: `EN(${text})` })) } })) {
  const sent: Sent[] = []
  const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body))
    sent.push({ url: String(url), headers: init?.headers as Record<string, string>, body })
    return answer(body)
  })
  return { sent, fetcher: fetcher as unknown as typeof fetch }
}

const saved = process.env.GOOGLE_TRANSLATE_API_KEY
beforeEach(() => {
  process.env.GOOGLE_TRANSLATE_API_KEY = KEY
})
afterEach(() => {
  if (saved === undefined) delete process.env.GOOGLE_TRANSLATE_API_KEY
  else process.env.GOOGLE_TRANSLATE_API_KEY = saved
  vi.unstubAllGlobals()
})

describe('what goes to Google', () => {
  it('sends each language its own request, the key in a header and the text in the body', async () => {
    const { sent, fetcher } = fakeGoogle()
    const out = await googleTextsToEnglish(
      [
        { key: 'a', text: '매니저가 소리를 질렀어요', from: 'ko' },
        { key: 'b', text: '휴게 시간이 없었어요', from: 'ko' },
        { key: 'c', text: 'No me pagaron las horas extra', from: 'es' },
        { key: 'd', text: '经理不让我们休息', from: 'zh' },
      ],
      fetcher
    )
    expect(out.get('a')).toBe('EN(매니저가 소리를 질렀어요)')
    expect(out.get('d')).toBe('EN(经理不让我们休息)')
    expect(out.size).toBe(4)
    expect(sent).toHaveLength(3)
    for (const request of sent) {
      expect(request.url).toBe(GOOGLE_TRANSLATE_ENDPOINT)
      expect(request.url).not.toContain(KEY)
      expect(request.headers['x-goog-api-key']).toBe(KEY)
      expect(request.body.target).toBe('en')
      expect(request.body.format).toBe('text')
    }
    expect(sent.map(r => r.body.source)).toEqual(['ko', 'es', undefined])
    expect(sent[0].body.q).toEqual(['매니저가 소리를 질렀어요', '휴게 시간이 없었어요'])
  })

  it('keeps each request inside what Google takes', async () => {
    const { sent, fetcher } = fakeGoogle()
    const many = Array.from({ length: 120 }, (_, i) => ({ key: `k${i}`, text: `짧은 답 ${i}`, from: 'ko' }))
    await googleTextsToEnglish(many, fetcher)
    expect(sent.map(r => r.body.q.length)).toEqual([100, 20])

    const long = Array.from({ length: 3 }, (_, i) => ({ key: `l${i}`, text: '가'.repeat(3000), from: 'ko' }))
    const { sent: sentLong, fetcher: fetcherLong } = fakeGoogle()
    const out = await googleTextsToEnglish(long, fetcherLong)
    expect(sentLong.map(r => r.body.q.length)).toEqual([1, 1, 1])
    expect(out.size).toBe(3)
  })

  it('leaves a refused batch missing and the rest translated, and never logs the text', async () => {
    const errors: string[] = []
    const spy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errors.push(args.map(String).join(' '))
    })
    const { fetcher } = fakeGoogle(body =>
      body.source === 'es'
        ? Response.json({ error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'Quota exceeded' } }, { status: 429 })
        : Response.json({ data: { translations: body.q.map(text => ({ translatedText: `EN(${text})` })) } })
    )
    const out = await googleTextsToEnglish(
      [
        { key: 'a', text: '해고됐어요', from: 'ko' },
        { key: 'b', text: 'Me despidieron', from: 'es' },
      ],
      fetcher
    )
    spy.mockRestore()
    expect(out.get('a')).toBe('EN(해고됐어요)')
    expect(out.has('b')).toBe(false)
    expect(errors.join('\n')).toMatch(/HTTP 429 \(RESOURCE_EXHAUSTED\)/)
    expect(errors.join('\n')).not.toMatch(/despidieron|해고/)
  })

  it('sends nothing without a key', async () => {
    delete process.env.GOOGLE_TRANSLATE_API_KEY
    const { sent, fetcher } = fakeGoogle()
    expect((await googleTextsToEnglish([{ key: 'a', text: '해고', from: 'ko' }], fetcher)).size).toBe(0)
    expect(sent).toHaveLength(0)
  })
})

describe('which translator the office gets', () => {
  it('is Google alone once its key is set, with no paid model behind it', async () => {
    const { sent, fetcher } = fakeGoogle(() => new Response('unavailable', { status: 503 }))
    vi.stubGlobal('fetch', fetcher)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? 'synthetic-anthropic-key'
    const out = await textsToEnglish([{ key: 'a', text: '해고됐어요', from: 'ko' }])
    // Google refused, so nothing came back — and Claude was not asked instead (the mock above would throw).
    expect(out.size).toBe(0)
    expect(sent).toHaveLength(1)
  })

  it('is never a keyless public endpoint', () => {
    const src = readFileSync('lib/googleTranslate.ts', 'utf8')
    expect(src).toContain("'x-goog-api-key': key")
    expect(src).not.toMatch(/[?&]key=/)
    expect(src).not.toMatch(/mymemory\.translated|translate\.googleapis|client=gtx/i)
  })
})

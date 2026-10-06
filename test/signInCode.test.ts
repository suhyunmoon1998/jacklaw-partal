import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import {
  PER_CONNECTION_HOUR,
  PER_NUMBER_15_MIN,
  PER_NUMBER_DAY,
  codeHash,
  decideCodeRequest,
  newCode,
  phoneHash,
  phoneKey,
  phoneVariants,
  readCode,
  signInCodeText,
  usableForSignIn,
} from '@/lib/signInCode'

/**
 * Signing in used to be a phone number and nothing else, and the number is
 * the one thing about a worker their employer always has. These are the
 * pieces of the code that replaced it that can be checked without a phone.
 */
const KEY = 'a-long-random-session-secret'

describe('the number a code is texted to', () => {
  it('is one number however the office typed it', () => {
    for (const raw of ['5550104446', '15550104446', '+1 (555) 010-4446', '555.010.4446']) {
      expect(phoneKey(raw)).toBe('5550104446')
    }
    expect(phoneVariants('5550104446')).toEqual(['5550104446', '15550104446', '+15550104446'])
  })

  it('is never shorter than ten digits', () => {
    expect(usableForSignIn('555010')).toBe(false)
    expect(usableForSignIn('(555) 010-4446')).toBe(true)
  })

  it('is kept as a keyed hash, never as the number', () => {
    const h = phoneHash('5550104446', KEY)
    expect(h).toMatch(/^[0-9a-f]{64}$/)
    expect(h).not.toContain('5550104446')
    expect(phoneHash('+15550104446', KEY)).toBe(h)
    expect(phoneHash('5550104446', 'another-deployment')).not.toBe(h)
  })
})

describe('the code', () => {
  it('is six digits from the random source', () => {
    for (let i = 0; i < 50; i++) expect(newCode()).toMatch(/^\d{6}$/)
  })

  it('is read as typed, spaces and dashes forgiven, and nothing else', () => {
    expect(readCode('123 456')).toBe('123456')
    expect(readCode('123-456')).toBe('123456')
    expect(readCode('12345')).toBeNull()
    expect(readCode('12345a')).toBeNull()
    expect(readCode(undefined)).toBeNull()
  })

  it('only works for the number it was texted to', () => {
    const a = phoneHash('5550104446', KEY)
    const b = phoneHash('5550109999', KEY)
    expect(codeHash(a, '123456', KEY)).not.toBe(codeHash(b, '123456', KEY))
    expect(codeHash(a, '123456', KEY)).toBe(codeHash(a, '123456', KEY))
  })

  it('arrives in the client’s language, named as the office, with what to do if unasked', () => {
    for (const lang of ['en', 'es', 'zh', 'ko'] as const) {
      const text = signInCodeText(lang, '042917')
      expect(text).toContain('042917')
      expect(text.startsWith('866 JACK LAW')).toBe(true)
      expect(text).toMatch(/10/)
    }
  })
})

describe('how often a code is texted', () => {
  const quiet = { number15Min: 0, numberDay: 0, connectionHour: 0 }

  it('texts the first few', () => {
    expect(decideCodeRequest(quiet)).toBe('send')
  })

  it('stops texting a number that has asked too often, without saying so', () => {
    // A different answer for a number past its allowance would say which
    // numbers are on file.
    expect(decideCodeRequest({ ...quiet, number15Min: PER_NUMBER_15_MIN })).toBe('quietly-skip')
    expect(decideCodeRequest({ ...quiet, numberDay: PER_NUMBER_DAY })).toBe('quietly-skip')
  })

  it('tells a connection that has asked too often, because that says nothing about any number', () => {
    expect(decideCodeRequest({ ...quiet, connectionHour: PER_CONNECTION_HOUR })).toBe('too-many-from-here')
  })
})

describe('what is said before the code comes back', () => {
  const read = (p: string) => readFileSync(p, 'utf8')

  it('the lookup takes no number from the caller, only from the code', () => {
    const src = read('app/api/clients/lookup/route.ts')
    expect(src).toContain('verifiedPhone(req)')
    expect(src).not.toContain('req.json')
  })

  it('a case can be picked only by a browser that answered the code', () => {
    expect(read('app/api/clients/session/route.ts')).toContain('verifiedPhone(req)')
  })

  it('asking for a code answers the same way whether or not the number is on file', () => {
    const src = read('app/api/clients/code/route.ts')
    expect(src.match(/\{ sent: true \}/g)?.length).toBe(2)
    // The text goes out after the answer, so the time taken says nothing either.
    expect(src).toContain('after(async () =>')
  })
})

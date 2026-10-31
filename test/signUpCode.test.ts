/**
 * A new client starting on the portal by themselves (2026-10-30).
 *
 * The office used to add every client by hand. Now a number that is not on
 * file can start Step 1, once a code texted to it comes back — so these are
 * the pieces of that code that can be checked without a phone, and the
 * promises about what the new row is and who is told.
 */

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import {
  PER_CONNECTION_HOUR,
  PER_NUMBER_15_MIN,
  PER_NUMBER_DAY,
  codeHash,
  decideCodeRequest,
  newCode,
  phoneHash,
  readCode,
  readName,
  signUpCodeText,
  usableForSignUp,
} from '@/lib/signUpCode'
import { SELF_SIGNUP_CASE_TYPE, SELF_SIGNUP_SENDER, SELF_SIGNUP_TAG } from '@/lib/selfSignup'
import { chasedFrom } from '@/lib/reminderSchedule'
import { en, es, ko, zh } from '@/lib/translations'

const KEY = 'a-long-random-session-secret'

describe('the number a code is texted to', () => {
  it('is a whole North American number, however it was typed', () => {
    for (const raw of ['3105550104', '13105550104', '+1 (310) 555-0104', '310.555.0104']) {
      expect(usableForSignUp(raw), raw).toBe(true)
    }
  })

  it('refuses a short number, a long one, and one no area code starts with', () => {
    // Each code costs the firm a text; a long foreign number is how texting
    // fraud runs up a bill.
    expect(usableForSignUp('310555')).toBe(false)
    expect(usableForSignUp('+44 20 7946 0958')).toBe(false)
    expect(usableForSignUp('0105550104')).toBe(false)
  })

  it('is kept as a keyed hash, never as the number', () => {
    const h = phoneHash('3105550104', KEY)
    expect(h).toMatch(/^[0-9a-f]{64}$/)
    expect(h).not.toContain('3105550104')
    expect(phoneHash('+13105550104', KEY)).toBe(h)
    expect(phoneHash('3105550104', 'another-deployment')).not.toBe(h)
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
    const a = phoneHash('3105550104', KEY)
    const b = phoneHash('3105559999', KEY)
    expect(codeHash(a, '123456', KEY)).not.toBe(codeHash(b, '123456', KEY))
    expect(codeHash(a, '123456', KEY)).toBe(codeHash(a, '123456', KEY))
  })

  it('arrives in the client’s language, named as the office, with what to do if unasked', () => {
    for (const lang of ['en', 'es', 'zh', 'ko'] as const) {
      const text = signUpCodeText(lang, '042917')
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

  it('stops for a number, or a connection, that has asked too often', () => {
    expect(decideCodeRequest({ ...quiet, number15Min: PER_NUMBER_15_MIN })).toBe('too-many-for-number')
    expect(decideCodeRequest({ ...quiet, numberDay: PER_NUMBER_DAY })).toBe('too-many-for-number')
    expect(decideCodeRequest({ ...quiet, connectionHour: PER_CONNECTION_HOUR })).toBe('too-many-from-here')
  })
})

describe('the name', () => {
  it('is tidied, and refused when it is not a name', () => {
    expect(readName('  Joseph   Lin ')).toBe('Joseph Lin')
    expect(readName('林')).toBeNull()
    expect(readName('x'.repeat(101))).toBeNull()
    expect(readName(undefined)).toBeNull()
  })
})

describe('the client a sign-up makes', () => {
  it('is marked as one the office did not add, with the office’s own default case type', () => {
    expect(SELF_SIGNUP_TAG).toBe('Self sign-up')
    expect(SELF_SIGNUP_CASE_TYPE).toBe('Wage & Hour')
  })

  it('is chased if they stop part way, because they asked to start', () => {
    expect(chasedFrom({ sent_at: '2026-10-30T18:00:00Z', created_by: SELF_SIGNUP_SENDER })).toBe('2026-10-30T18:00:00Z')
  })

  it('opens Step 1 and nothing else', () => {
    const src = readFileSync('lib/selfSignup.ts', 'utf8')
    expect(src).toContain("module_id: 'module1'")
    expect(src).not.toContain("'module2'")
  })

  it('is started only after the code is checked, and the office is told', () => {
    const src = readFileSync('app/api/clients/signup/route.ts', 'utf8')
    expect(src.indexOf('consume(challenge)')).toBeLessThan(src.indexOf('createSelfSignupClient('))
    expect(src).toContain('notifyFirmOfSelfSignup(')
  })
})

describe('the sign-up screen', () => {
  it('speaks all four languages', () => {
    const keys = Object.keys(en).filter(k => k.startsWith('signup_'))
    expect(keys.length).toBeGreaterThan(10)
    for (const dict of [es, zh, ko]) {
      for (const k of keys) expect((dict as Record<string, string>)[k], k).toBeTruthy()
      expect(dict.signup_title).not.toBe(en.signup_title)
    }
  })
})

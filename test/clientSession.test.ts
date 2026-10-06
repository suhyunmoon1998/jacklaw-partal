import { describe, it, expect } from 'vitest'
import { createHmac } from 'crypto'
import {
  clientFromSession,
  mintClientSession,
  mintVerifiedPhone,
  phoneTag,
  readClientSession,
  readVerifiedPhone,
} from '@/lib/clientAuth'

/**
 * Every client-facing route used to take a clientId out of the request and
 * answer with whatever it found — so anyone holding an id could read a
 * stranger's questionnaire answers, their documents and their case. The cookie
 * this mints is the part of a request a browser cannot write, and it names
 * exactly one client, on the number that answered the texted code.
 */
const KEY = 'a-long-random-session-secret'
const PHONE = '5550104446'

describe('a client session cookie', () => {
  it('names the client it was minted for, and the number it was opened on', () => {
    const s = mintClientSession('client-1700000000002', PHONE, KEY)!
    expect(clientFromSession(s.value, KEY)).toBe('client-1700000000002')
    expect(readClientSession(s.value, KEY)?.phoneTag).toBe(phoneTag(PHONE, KEY))
  })

  it('is the same number however the office typed it', () => {
    // Rows were typed by hand as 5550104446, 15550104446 and +15550104446.
    expect(phoneTag('15550104446', KEY)).toBe(phoneTag(PHONE, KEY))
    expect(phoneTag('+1 (555) 010-4446', KEY)).toBe(phoneTag(PHONE, KEY))
    expect(phoneTag('5550109999', KEY)).not.toBe(phoneTag(PHONE, KEY))
  })

  it('cannot be edited into a cookie for somebody else', () => {
    // The whole attack: take your own cookie, put another id in front of it.
    const mine = mintClientSession('client-aaa', PHONE, KEY)!
    const forged = mine.value.replace('client-aaa', 'client-bbb')
    expect(clientFromSession(forged, KEY)).toBeNull()
  })

  it('cannot be moved to another number', () => {
    const mine = mintClientSession('client-aaa', PHONE, KEY)!
    const forged = mine.value.replace(phoneTag(PHONE, KEY), phoneTag('5550109999', KEY))
    expect(readClientSession(forged, KEY)).toBeNull()
  })

  it('cannot be extended by rewriting its expiry', () => {
    const s = mintClientSession('client-aaa', PHONE, KEY)!
    const parts = s.value.split('.')
    parts[3] = String(Date.now() + 9e9)
    expect(clientFromSession(parts.join('.'), KEY)).toBeNull()
  })

  it('is refused once it has expired', () => {
    const s = mintClientSession('client-aaa', PHONE, KEY, Date.now() - 15 * 24 * 60 * 60 * 1000)!
    expect(clientFromSession(s.value, KEY)).toBeNull()
  })

  it('is refused when it was signed by another deployment', () => {
    const s = mintClientSession('client-aaa', PHONE, KEY)!
    expect(clientFromSession(s.value, 'a-different-secret')).toBeNull()
  })

  it('refuses rubbish and an absent cookie', () => {
    for (const t of ['', 'client-aaa', 'client-aaa.', '..', 'a.b.c', 'v2.a.b.c.d', undefined]) {
      expect(clientFromSession(t as string | undefined, KEY)).toBeNull()
    }
  })

  it('refuses every cookie minted before the texted code existed', () => {
    // `<clientId>.<expires>.<signature>`, correctly signed: a phone number
    // alone opened it, so it no longer opens anything.
    const payload = `client-aaa.${Date.now() + 60_000}`
    const old = `${payload}.${createHmac('sha256', KEY).update(payload).digest('hex')}`
    expect(clientFromSession(old, KEY)).toBeNull()
  })

  it('mints nothing at all without a signing secret or a number', () => {
    // A deployment missing SESSION_SECRET refuses everyone rather than
    // handing out cookies nothing can verify later.
    expect(mintClientSession('client-aaa', PHONE, '')).toBeNull()
    expect(mintClientSession('client-aaa', '', KEY)).toBeNull()
    const s = mintClientSession('client-aaa', PHONE, KEY)!
    expect(clientFromSession(s.value, '')).toBeNull()
  })

  it('survives a client id that contains dots', () => {
    // Ids are client-<millis> today, but the parse must not depend on that.
    const id = 'client.with.dots'
    const s = mintClientSession(id, PHONE, KEY)!
    expect(clientFromSession(s.value, KEY)).toBe(id)
  })
})

describe('the step between the code and choosing a case', () => {
  it('names the number that answered the code', () => {
    const v = mintVerifiedPhone('+1 (555) 010-4446', KEY)!
    expect(readVerifiedPhone(v, KEY)).toBe(PHONE)
  })

  it('cannot be edited to another number, extended, or used after a quarter hour', () => {
    const v = mintVerifiedPhone(PHONE, KEY)!
    expect(readVerifiedPhone(v.replace(PHONE, '5550109999'), KEY)).toBeNull()
    const parts = v.split('.')
    parts[2] = String(Date.now() + 9e9)
    expect(readVerifiedPhone(parts.join('.'), KEY)).toBeNull()
    const old = mintVerifiedPhone(PHONE, KEY, Date.now() - 16 * 60 * 1000)!
    expect(readVerifiedPhone(old, KEY)).toBeNull()
  })

  it('is not a session cookie, and a session cookie is not it', () => {
    const v = mintVerifiedPhone(PHONE, KEY)!
    const s = mintClientSession('client-aaa', PHONE, KEY)!
    expect(clientFromSession(v, KEY)).toBeNull()
    expect(readVerifiedPhone(s.value, KEY)).toBeNull()
  })
})

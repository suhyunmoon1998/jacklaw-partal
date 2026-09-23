import { describe, it, expect } from 'vitest'
import { clientFromSession, mintClientSession } from '@/lib/clientAuth'

/**
 * Every client-facing route used to take a clientId out of the request and
 * answer with whatever it found — so anyone holding an id could read a
 * stranger's questionnaire answers, their documents and their case. The cookie
 * this mints is the part of a request a browser cannot write, and it names
 * exactly one client.
 */
const KEY = 'a-long-random-session-secret'

describe('a client session cookie', () => {
  it('names the client it was minted for', () => {
    const s = mintClientSession('client-1789103134380', KEY)!
    expect(clientFromSession(s.value, KEY)).toBe('client-1789103134380')
  })

  it('cannot be edited into a cookie for somebody else', () => {
    // The whole attack: take your own cookie, put another id in front of it.
    const mine = mintClientSession('client-aaa', KEY)!
    const forged = mine.value.replace('client-aaa', 'client-bbb')
    expect(clientFromSession(forged, KEY)).toBeNull()
  })

  it('cannot be extended by rewriting its expiry', () => {
    const s = mintClientSession('client-aaa', KEY)!
    const signature = s.value.slice(s.value.lastIndexOf('.') + 1)
    expect(clientFromSession(`client-aaa.${Date.now() + 9e9}.${signature}`, KEY)).toBeNull()
  })

  it('is refused once it has expired', () => {
    const s = mintClientSession('client-aaa', KEY)!
    const signature = s.value.slice(s.value.lastIndexOf('.') + 1)
    expect(clientFromSession(`client-aaa.${Date.now() - 1000}.${signature}`, KEY)).toBeNull()
  })

  it('is refused when it was signed by another deployment', () => {
    const s = mintClientSession('client-aaa', KEY)!
    expect(clientFromSession(s.value, 'a-different-secret')).toBeNull()
  })

  it('refuses rubbish and an absent cookie', () => {
    for (const t of ['', 'client-aaa', 'client-aaa.', '..', 'a.b.c', undefined]) {
      expect(clientFromSession(t as string | undefined, KEY)).toBeNull()
    }
  })

  it('mints nothing at all without a signing secret', () => {
    // A deployment missing SESSION_SECRET refuses everyone rather than
    // handing out cookies nothing can verify later.
    expect(mintClientSession('client-aaa', '')).toBeNull()
    const s = mintClientSession('client-aaa', KEY)!
    expect(clientFromSession(s.value, '')).toBeNull()
  })

  it('survives a client id that contains dots', () => {
    // Ids are client-<millis> today, but the parse must not depend on that.
    const id = 'client.with.dots'
    const s = mintClientSession(id, KEY)!
    expect(clientFromSession(s.value, KEY)).toBe(id)
  })
})

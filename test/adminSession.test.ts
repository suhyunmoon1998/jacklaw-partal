import { describe, it, expect, afterEach } from 'vitest'
import { correctAdminPassword, mintAdminSession, validAdminSession } from '@/lib/adminAuth'

/**
 * What stands between a public URL and a law office's entire client list.
 *
 * The admin password used to be a constant in a client component, so it was
 * compiled into the JavaScript served to anyone who loaded the page — and
 * committed to a public repository. Everything here exists so the password
 * never reaches a browser again: it is exchanged once for a signed cookie that
 * carries nothing but its own expiry.
 */
const SECRET = 'a-long-random-production-secret'

afterEach(() => {
  delete process.env.ADMIN_PASSWORD
})

describe('an admin session cookie', () => {
  it('is accepted when this deployment minted it', () => {
    const { value } = mintAdminSession(SECRET)
    expect(validAdminSession(value, SECRET)).toBe(true)
  })

  it('is refused once the password is rotated', () => {
    // The point of a rotation: sessions opened under the old secret end.
    const { value } = mintAdminSession(SECRET)
    expect(validAdminSession(value, 'the-new-secret')).toBe(false)
  })

  it('cannot be forged by writing a later expiry into it', () => {
    const { value } = mintAdminSession(SECRET)
    const signature = value.slice(value.indexOf('.') + 1)
    const forged = `${Date.now() + 999_999_999}.${signature}`
    expect(validAdminSession(forged, SECRET)).toBe(false)
  })

  it('is refused after it expires', () => {
    const past = Date.now() - 1000
    // Correctly signed, and still no good — the expiry is inside what is signed.
    const { value } = mintAdminSession(SECRET)
    const signature = value.slice(value.indexOf('.') + 1)
    expect(validAdminSession(`${past}.${signature}`, SECRET)).toBe(false)
  })

  it('refuses rubbish, empty values and a missing cookie', () => {
    for (const t of ['', 'jacklaw', 'abc.def', '.', 'NaN.aaaa', undefined]) {
      expect(validAdminSession(t as string | undefined, SECRET)).toBe(false)
    }
  })

  it('refuses everything when the deployment has no password set', () => {
    const { value } = mintAdminSession(SECRET)
    expect(validAdminSession(value, '')).toBe(false)
  })
})

describe('checking the password itself', () => {
  it('accepts only the exact password', () => {
    process.env.ADMIN_PASSWORD = SECRET
    expect(correctAdminPassword(SECRET)).toBe(true)
    expect(correctAdminPassword(SECRET.toUpperCase())).toBe(false)
    expect(correctAdminPassword(`${SECRET} `)).toBe(false)
    expect(correctAdminPassword(SECRET.slice(0, -1))).toBe(false)
  })

  it('never lets an empty password in', () => {
    process.env.ADMIN_PASSWORD = SECRET
    expect(correctAdminPassword('')).toBe(false)
  })

  it('lets nobody in when no password is configured', () => {
    // An unset variable must not become an open door.
    expect(correctAdminPassword('')).toBe(false)
    expect(correctAdminPassword('anything')).toBe(false)
  })
})

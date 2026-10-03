import { describe, expect, it } from 'vitest'
import { mintSsoTicket, SSO_TICKET_TTL_MS, validSsoTicket } from '@/lib/eleanorSso'

const secret = 's'.repeat(40)
const now = 1_790_000_000_000

describe('Eleanor admin sign-in ticket', () => {
  it('is accepted once signed with the shared secret, within its minute', () => {
    const ticket = mintSsoTicket(secret, now, 'a'.repeat(24))
    expect(validSsoTicket(ticket, now + 1000, secret)).toBe(true)
    expect(validSsoTicket(ticket, now + SSO_TICKET_TTL_MS + 1, secret)).toBe(false)
  })
  it('is refused with another secret, altered, or minted too far ahead', () => {
    const ticket = mintSsoTicket(secret, now, 'b'.repeat(24))
    expect(validSsoTicket(ticket, now, 't'.repeat(40))).toBe(false)
    expect(validSsoTicket(ticket.replace(/.$/, c => (c === '0' ? '1' : '0')), now, secret)).toBe(false)
    expect(validSsoTicket(mintSsoTicket(secret, now + 10 * 60_000, 'c'.repeat(24)), now, secret)).toBe(false)
    expect(validSsoTicket('', now, secret)).toBe(false)
    expect(validSsoTicket(ticket, now, null)).toBe(false)
  })
  it('is not the service secret and does not contain it', () => {
    const ticket = mintSsoTicket(secret, now, 'd'.repeat(24))
    expect(ticket.includes(secret)).toBe(false)
  })
})

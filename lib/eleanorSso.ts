import { createHmac, timingSafeEqual } from 'crypto'
import { eleanorServiceSecret } from '@/lib/eleanorService'

/**
 * Signing in to the admin panel from Eleanor, without typing the password.
 *
 * Jack is already signed in to Eleanor. When he opens a Portal page from
 * there, Eleanor's server signs a ticket and his browser posts it here
 * (lib/eleanorSso.ts ← app/api/admin/eleanor-sso). A valid ticket gets the
 * same admin cookie the password would.
 *
 * - The ticket is signed with a key DERIVED from ELEANOR_PORTAL_SERVICE_SECRET
 *   for this one purpose, so a ticket can never be used as the service secret
 *   and the service secret never appears in a browser.
 * - It lives 60 seconds and is posted in a form body, never put in a URL, so
 *   it does not land in history, logs or a Referer.
 * - It carries nothing about the client or the page; where to go after is
 *   checked separately against this site's own admin pages.
 */

export const SSO_TICKET_TTL_MS = 60_000

function ssoKey(secret: string): Buffer {
  return createHmac('sha256', secret).update('jacklaw:eleanor-admin-sso:v1').digest()
}

function signature(secret: string, expires: string, nonce: string): string {
  return createHmac('sha256', ssoKey(secret)).update(`admin-sso.v1.${expires}.${nonce}`).digest('hex')
}

/** For tests and for the Eleanor side's mirror: `v1.<expires>.<nonce>.<signature>`. */
export function mintSsoTicket(secret: string, now = Date.now(), nonce = createHmac('sha256', String(Math.random())).update(String(now)).digest('hex').slice(0, 24)): string {
  const expires = String(now + SSO_TICKET_TTL_MS)
  return `v1.${expires}.${nonce}.${signature(secret, expires, nonce)}`
}

export function validSsoTicket(ticket: string | null | undefined, now = Date.now(), secret = eleanorServiceSecret()): boolean {
  if (!ticket || !secret) return false
  const match = /^v1\.(\d{13})\.([a-f0-9]{16,64})\.([a-f0-9]{64})$/.exec(ticket)
  if (!match) return false
  const [, expires, nonce, given] = match
  const at = Number(expires)
  // Not expired, and not minted further ahead than a ticket ever is (clock skew allowed).
  if (at < now || at > now + SSO_TICKET_TTL_MS + 30_000) return false
  const expected = Buffer.from(signature(secret, expires, nonce))
  const got = Buffer.from(given)
  return expected.length === got.length && timingSafeEqual(expected, got)
}

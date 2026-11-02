import { createHmac, timingSafeEqual } from 'crypto'

/**
 * The link in a client's emails that lets them see and cancel their booking.
 *
 * `/book/manage?b=<id>&t=<token>`, where the token is an HMAC of the booking id
 * keyed on SESSION_SECRET. Nothing is stored for it, so the reminder can carry
 * the same link the confirmation did, and rotating SESSION_SECRET retires
 * every link at once (the client can still call).
 */

function secret(): string {
  return process.env.SESSION_SECRET ?? ''
}

export function manageToken(bookingId: string, key = secret()): string {
  if (!key) throw new Error('SESSION_SECRET is not set.')
  return createHmac('sha256', key).update(`consultation-manage:${bookingId}`).digest('base64url')
}

export function validManageToken(bookingId: string, token: unknown, key = secret()): boolean {
  if (!key || typeof token !== 'string' || !token) return false
  const a = Buffer.from(token)
  const b = Buffer.from(manageToken(bookingId, key))
  return a.length === b.length && timingSafeEqual(a, b)
}

export function manageUrl(origin: string, bookingId: string, lang: string): string {
  const q = new URLSearchParams({ b: bookingId, t: manageToken(bookingId), lang })
  return `${origin}/book/manage?${q}`
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

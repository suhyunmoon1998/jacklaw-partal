import { NextRequest } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Eleanor, the office's own assistant, calling this portal server to server.
 *
 * Eleanor asks Jack before anything reaches a client: she shows him exactly
 * what would go out, he approves it on his own screen, and only then does she
 * call here to send it. So this door opens to one caller holding one secret,
 * and to nothing a browser can hold:
 *
 *   ELEANOR_PORTAL_SERVICE_SECRET   32+ characters, set here and in Eleanor
 *
 * Shorter or missing means nobody is let in — the same rule as CRON_SECRET
 * before it was set. It is compared in constant time and never accepted from
 * a cookie or a query string, so a link cannot carry it.
 *
 * It opens exactly two routes:
 *
 *   /api/eleanor/sends     what the admin panel's Send button does for a module,
 *                          and the next reminder text, now.
 *   /api/eleanor/analysis  one stage of the client's damages reading — the admin
 *                          panel's Run, the same code — which Eleanor reads back
 *                          from the shared database for its FACTS / DAMAGES screen.
 *
 * It cannot change a file, send anything the admin panel would not, or reach
 * anything else.
 *
 * Separately, a key DERIVED from the same secret signs Eleanor's 60-second
 * admin sign-in tickets (lib/eleanorSso.ts). The secret itself still never
 * leaves the two servers.
 */

export function eleanorServiceSecret(): string | null {
  const secret = process.env.ELEANOR_PORTAL_SERVICE_SECRET?.trim()
  return secret && secret.length >= 32 ? secret : null
}

export function isEleanorService(req: NextRequest): boolean {
  const secret = eleanorServiceSecret()
  if (!secret) return false
  const given = Buffer.from(req.headers.get('authorization') ?? '')
  const expected = Buffer.from(`Bearer ${secret}`)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

/**
 * A seal over everything that decides what a client would receive — the
 * address, the number, the language, the link, the words.
 *
 * Eleanor shows Jack a preview and keeps this seal with his approval. When she
 * comes back to send, the preview is worked out again and the seal must match,
 * so a number corrected or a language changed in between stops the send
 * instead of sending something he did not see. Keyed with the service secret,
 * so the seal cannot be turned back into the phone number it covers.
 */
export function sendFingerprint(secret: string, facts: Record<string, unknown>): string {
  const ordered = Object.keys(facts).sort().map(key => [key, facts[key] ?? null])
  return createHmac('sha256', secret).update(JSON.stringify(ordered)).digest('hex')
}

/** Enough to recognise the number, not enough to dial it. */
export function maskPhone(phone: string): string {
  const digits = String(phone ?? '').replace(/\D/g, '')
  return digits.length >= 4 ? `•••-•••-${digits.slice(-4)}` : ''
}

/** Enough to recognise the address, not enough to write to it. */
export function maskEmail(email: string): string {
  const value = String(email ?? '').trim()
  const at = value.indexOf('@')
  if (at < 1) return ''
  return `${value[0]}•••${value.slice(at)}`
}

import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { getSupabase } from '@/lib/supabase'
import { VERIFIED_PHONE_TTL_MS, phoneKey } from '@/lib/signInCode'

/**
 * Which client file this browser is allowed to open.
 *
 * Every client-facing route used to take a clientId out of the query string
 * and answer with whatever it found. So signing in mints a cookie that names
 * one client and is signed by this deployment, and the routes ask it rather
 * than the caller. It is HttpOnly: script cannot read it, so it cannot be
 * copied out of one browser into a request for somebody else's case.
 *
 * Signing in used to be a phone number with no code sent to it, so anyone who
 * knew a client's number could get a cookie for that client. Now the number
 * has to answer a texted code first (lib/signInCode.ts), and the cookie is
 * bound to that number: when the office corrects a client's number, every
 * session opened on the old one ends, because the person holding the old
 * number is exactly who should lose the file.
 *
 * Cookies minted before the code existed carry no number and are refused, so
 * every phone-number-only session ended when this shipped.
 */

export const CLIENT_COOKIE = 'jlp_client_session'

/** The step between the texted code and choosing which case. */
export const VERIFIED_PHONE_COOKIE = 'jlp_phone_verified'

/**
 * Two weeks: long enough to finish a seventy-seven question intake over
 * several evenings, short enough that a phone left signed in does not stay so.
 * Signing in again costs one text.
 */
const SESSION_MS = 14 * 24 * 60 * 60 * 1000

/**
 * What the cookies are signed with.
 *
 * Its own variable rather than ADMIN_PASSWORD, so rotating the office's
 * password does not sign every client out of a questionnaire they are halfway
 * through. Unset means no session can be minted or accepted — a deployment
 * missing it refuses everyone rather than admitting everyone.
 */
export function sessionSecret(): string {
  return process.env.SESSION_SECRET ?? ''
}

function sign(payload: string, key: string): string {
  return createHmac('sha256', key).update(payload).digest('hex')
}

function sameString(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

/** A short keyed tag of the number, so the cookie can say which number without carrying it. */
export function phoneTag(phone: string, key: string): string {
  return sign(`session-phone:${phoneKey(phone)}`, key).slice(0, 24)
}

/** `v2.<clientId>.<phoneTag>.<expires-at>.<signature>` */
export function mintClientSession(
  clientId: string,
  phone: string,
  key: string,
  now = Date.now()
): { value: string; maxAge: number } | null {
  if (!key || !clientId || !phoneKey(phone)) return null
  const expires = now + SESSION_MS
  const payload = `v2.${clientId}.${phoneTag(phone, key)}.${expires}`
  return { value: `${payload}.${sign(payload, key)}`, maxAge: Math.floor(SESSION_MS / 1000) }
}

/** The client and number-tag this token is good for, or null. */
export function readClientSession(
  token: string | undefined,
  key: string,
  now = Date.now()
): { clientId: string; phoneTag: string } | null {
  if (!token || !key || !token.startsWith('v2.')) return null
  const last = token.lastIndexOf('.')
  if (last <= 0) return null
  const payload = token.slice(0, last)
  const signature = token.slice(last + 1)
  if (!sameString(signature, sign(payload, key))) return null

  const parts = payload.split('.')
  // v2 . <clientId, which may contain dots> . <tag> . <expires>
  if (parts.length < 4) return null
  const expires = parts[parts.length - 1]
  const tag = parts[parts.length - 2]
  const clientId = parts.slice(1, -2).join('.')
  if (!/^\d+$/.test(expires) || Number(expires) < now) return null
  if (!clientId || !/^[0-9a-f]{24}$/.test(tag)) return null
  return { clientId, phoneTag: tag }
}

/** Kept for the tests and anything that only needs the id: the client, or null. */
export function clientFromSession(token: string | undefined, key: string): string | null {
  return readClientSession(token, key)?.clientId ?? null
}

/**
 * Whether the number this session was opened on is still the client's number.
 * A read that fails is answered as "cannot say", and the caller refuses.
 */
async function stillTheirNumber(session: { clientId: string; phoneTag: string }): Promise<boolean | null> {
  const { data, error } = await getSupabase()
    .from('clients')
    .select('phone')
    .eq('id', session.clientId)
    .maybeSingle()
  if (error) return null
  if (!data) return false
  return sameString(phoneTag(String(data.phone ?? ''), sessionSecret()), session.phoneTag)
}

/**
 * Whoever this request is signed in as, if anyone — checked against the number
 * on file, not only against the cookie's signature.
 */
export async function verifiedSessionClient(req: NextRequest): Promise<string | null> {
  const session = readClientSession(req.cookies.get(CLIENT_COOKIE)?.value, sessionSecret())
  if (!session) return null
  return (await stillTheirNumber(session)) === true ? session.clientId : null
}

export function setClientCookie(res: NextResponse, clientId: string, phone: string): boolean {
  const session = mintClientSession(clientId, phone, sessionSecret())
  if (!session) return false
  res.cookies.set(CLIENT_COOKIE, session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: session.maxAge,
  })
  return true
}

export function clearClientCookie(res: NextResponse): void {
  res.cookies.set(CLIENT_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  res.cookies.set(VERIFIED_PHONE_COOKIE, '', { httpOnly: true, path: '/api/clients', maxAge: 0 })
}

/** `v1.<phone key>.<expires-at>.<signature>`: this browser answered a code for this number. */
export function mintVerifiedPhone(phone: string, key: string, now = Date.now()): string | null {
  const number = phoneKey(phone)
  if (!key || !number) return null
  const payload = `v1.${number}.${now + VERIFIED_PHONE_TTL_MS}`
  return `${payload}.${sign(`verified-phone:${payload}`, key)}`
}

export function readVerifiedPhone(token: string | undefined, key: string, now = Date.now()): string | null {
  if (!token || !key) return null
  const parts = token.split('.')
  if (parts.length !== 4 || parts[0] !== 'v1') return null
  const [, number, expires, signature] = parts
  if (!/^\d{10,15}$/.test(number) || !/^\d+$/.test(expires) || Number(expires) < now) return null
  const payload = `v1.${number}.${expires}`
  return sameString(signature, sign(`verified-phone:${payload}`, key)) ? number : null
}

/** The number this browser has just proved it holds, if any. */
export function verifiedPhone(req: NextRequest): string | null {
  return readVerifiedPhone(req.cookies.get(VERIFIED_PHONE_COOKIE)?.value, sessionSecret())
}

export function setVerifiedPhoneCookie(res: NextResponse, phone: string): boolean {
  const value = mintVerifiedPhone(phone, sessionSecret())
  if (!value) return false
  res.cookies.set(VERIFIED_PHONE_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    // Sent only to the sign-in routes, never to anything that reads a file.
    path: '/api/clients',
    maxAge: Math.floor(VERIFIED_PHONE_TTL_MS / 1000),
  })
  return true
}

/**
 * The guard every client route runs first.
 *
 * Returns the response to send when the caller may not have what they asked
 * for, and null when they may. A missing session and a session for somebody
 * else are answered the same way: the id a client is not signed in as should
 * not be confirmable as one that exists.
 */
export async function denyClient(req: NextRequest, wanted: string | null | undefined): Promise<NextResponse | null> {
  const session = readClientSession(req.cookies.get(CLIENT_COOKIE)?.value, sessionSecret())
  if (!session) {
    return NextResponse.json({ error: 'Sign in to the client portal first.' }, { status: 401 })
  }
  if (!wanted || wanted !== session.clientId) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }
  const same = await stillTheirNumber(session)
  if (same === null) {
    return NextResponse.json({ error: 'The portal could not check your sign-in. Please try again.' }, { status: 503 })
  }
  if (!same) {
    return NextResponse.json({ error: 'Sign in to the client portal again.' }, { status: 401 })
  }
  return null
}

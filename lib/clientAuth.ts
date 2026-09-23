import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Which client file this browser is allowed to open.
 *
 * Every client-facing route used to take a clientId out of the query string
 * and answer with whatever it found. Nothing checked who was asking, so
 * `/api/questionnaire?clientId=…` handed over a stranger's answers — their job,
 * their pay, what they said about their manager — to anyone who had an id. The
 * ids are `client-<millisecond>`, and the sign-in route hands them out by
 * phone number.
 *
 * So signing in now mints a cookie that names one client and is signed by this
 * deployment, and the routes ask it rather than the caller. It is HttpOnly:
 * script cannot read it, so it cannot be copied out of one browser into a
 * request for somebody else's case.
 *
 * What this is NOT: proof of who the person is. Sign-in is still a phone
 * number with no code sent to it, so anyone who knows a client's number can
 * still get a cookie for that client. That is the next piece of work. This one
 * closes the larger hole — reading any file without having any credential at
 * all — and it is the floor everything else stands on.
 */

export const CLIENT_COOKIE = 'jlp_client_session'

/** A working session, long enough to finish a seventy-seven question intake. */
const SESSION_MS = 30 * 24 * 60 * 60 * 1000

/**
 * What the cookie is signed with.
 *
 * Its own variable rather than ADMIN_PASSWORD, so rotating the office's
 * password does not sign every client out of a questionnaire they are halfway
 * through. Unset means no session can be minted or accepted — a deployment
 * missing it refuses everyone rather than admitting everyone.
 */
function secret(): string {
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

/** `<clientId>.<expires-at>.<signature>` */
export function mintClientSession(
  clientId: string,
  key: string
): { value: string; maxAge: number } | null {
  if (!key || !clientId) return null
  const expires = Date.now() + SESSION_MS
  const payload = `${clientId}.${expires}`
  return { value: `${payload}.${sign(payload, key)}`, maxAge: Math.floor(SESSION_MS / 1000) }
}

/** The client this token is good for, or null. */
export function clientFromSession(token: string | undefined, key: string): string | null {
  if (!token || !key) return null
  const last = token.lastIndexOf('.')
  if (last <= 0) return null
  const payload = token.slice(0, last)
  const signature = token.slice(last + 1)

  const split = payload.lastIndexOf('.')
  if (split <= 0) return null
  const clientId = payload.slice(0, split)
  const expires = payload.slice(split + 1)

  if (!/^\d+$/.test(expires) || Number(expires) < Date.now()) return null
  if (!sameString(signature, sign(payload, key))) return null
  return clientId || null
}

/** Whoever this request is signed in as, if anyone. */
export function sessionClient(req: NextRequest): string | null {
  return clientFromSession(req.cookies.get(CLIENT_COOKIE)?.value, secret())
}

export function setClientCookie(res: NextResponse, clientId: string): boolean {
  const session = mintClientSession(clientId, secret())
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
}

/**
 * The guard every client route runs first.
 *
 * Returns the response to send when the caller may not have what they asked
 * for, and null when they may. A missing session and a session for somebody
 * else are answered the same way: the id a client is not signed in as should
 * not be confirmable as one that exists.
 */
export function denyClient(req: NextRequest, wanted: string | null | undefined) {
  const who = sessionClient(req)
  if (!who) {
    return NextResponse.json(
      { error: 'Sign in to the client portal first.' },
      { status: 401 }
    )
  }
  if (!wanted || wanted !== who) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }
  return null
}

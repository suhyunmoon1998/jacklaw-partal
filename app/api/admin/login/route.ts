import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE, correctAdminPassword, isAdmin, mintAdminSession } from '@/lib/adminAuth'
import { clientIp, mayTry, recordAttempt } from '@/lib/loginThrottle'

/**
 * The one place the admin password is checked.
 *
 * It arrives here and goes no further: what the browser keeps afterwards is a
 * signed, HttpOnly cookie that proves somebody knew the password once, and
 * cannot be read back out by script to be sent anywhere else.
 */

/** GET — is this browser still signed in? The panel asks before drawing. */
export async function GET(req: NextRequest) {
  return NextResponse.json({ authenticated: isAdmin(req) })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!process.env.ADMIN_PASSWORD) {
    // Said plainly rather than as a wrong password: nobody can guess their way
    // past a variable that was never set, and the remedy is the deployment's.
    return NextResponse.json(
      { error: 'No admin password is configured for this deployment.' },
      { status: 500 }
    )
  }

  // Checked before the password is, so a shut door says nothing about whether
  // the guess would have been right.
  const ip = clientIp(req)
  const verdict = await mayTry(ip)
  if (!verdict.allowed) {
    const when = `Try again in ${verdict.retryInMinutes} minute${verdict.retryInMinutes === 1 ? '' : 's'}.`
    return NextResponse.json(
      {
        error:
          verdict.by === 'connection'
            ? `Too many wrong passwords from this connection. ${when}`
            : `Sign-in is paused after too many wrong passwords. ${when}`,
      },
      { status: 429, headers: { 'Retry-After': String(verdict.retryInMinutes * 60) } }
    )
  }

  const right = correctAdminPassword(password)
  await recordAttempt(ip, right)
  if (!right) {
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 })
  }

  const session = mintAdminSession(process.env.ADMIN_PASSWORD)
  const res = NextResponse.json({ authenticated: true })
  res.cookies.set(ADMIN_COOKIE, session.value, {
    httpOnly: true,
    // Off in development, where the panel is served over plain http.
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: session.maxAge,
  })
  return res
}

/** DELETE — signing out, and the only way the cookie goes away early. */
export async function DELETE() {
  const res = NextResponse.json({ authenticated: false })
  res.cookies.set(ADMIN_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}

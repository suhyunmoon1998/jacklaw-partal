import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE, mintAdminSession } from '@/lib/adminAuth'
import { safeAdminReturn } from '@/lib/adminReturn'
import { validSsoTicket } from '@/lib/eleanorSso'

export const dynamic = 'force-dynamic'

/**
 * Eleanor's one-click sign-in to the admin panel (lib/eleanorSso.ts).
 *
 * POST only, form-encoded `ticket` and `next`. A valid ticket gets the same
 * eight-hour admin cookie as the password, and the browser is sent on to the
 * page it came for — only this site's reading or factual pages, or /admin.
 * Anything else is sent to the ordinary sign-in, with nothing set.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null)
  const ticket = typeof form?.get('ticket') === 'string' ? String(form?.get('ticket')) : ''
  const next = safeAdminReturn(typeof form?.get('next') === 'string' ? String(form?.get('next')) : null) ?? '/admin'
  const base = new URL(req.url)

  if (!process.env.ADMIN_PASSWORD || !validSsoTicket(ticket)) {
    return NextResponse.redirect(new URL('/admin', base), 303)
  }
  const session = mintAdminSession(process.env.ADMIN_PASSWORD)
  const res = NextResponse.redirect(new URL(next, base), 303)
  res.cookies.set(ADMIN_COOKIE, session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: session.maxAge,
  })
  res.headers.set('Cache-Control', 'no-store')
  return res
}

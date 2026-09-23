import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { clearClientCookie, sessionClient, setClientCookie } from '@/lib/clientAuth'

/**
 * Signing a client in to one of their cases.
 *
 * The pairing is checked here and not taken on trust: the caller says "this
 * phone, this case", and the row has to actually carry that number. Otherwise
 * the cookie would be a cookie for whatever id was typed, and every route
 * behind it would be back to where it started.
 *
 * Sign-in is still a phone number with no code sent to it. What this adds is
 * that the portal now has to be signed in to at all, and to the case being
 * read — not that the person is who they say they are.
 */

/** GET — which case, if any, this browser is signed in to. */
export async function GET(req: NextRequest) {
  return NextResponse.json({ clientId: sessionClient(req) })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const clientId = typeof body?.clientId === 'string' ? body.clientId.trim() : ''
  const digits = String(body?.phone ?? '').replace(/\D/g, '')

  if (!clientId || digits.length < 7) {
    return NextResponse.json({ error: 'A phone number and a case are required.' }, { status: 400 })
  }

  const { data } = await getSupabase()
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('phone', digits)
    .maybeSingle()

  // Wrong pairing and no such client answer alike: this should not become a
  // way to ask whether an id exists.
  if (!data) {
    return NextResponse.json({ error: 'We could not find that case.' }, { status: 404 })
  }

  const res = NextResponse.json({ clientId: data.id })
  if (!setClientCookie(res, data.id)) {
    // Refused rather than waved through: without the signing secret a session
    // cannot be verified later, and a portal that lets everyone in because it
    // is misconfigured is the thing this exists to prevent.
    return NextResponse.json(
      { error: 'This portal is not configured for sign-in yet.' },
      { status: 500 }
    )
  }
  return res
}

/** DELETE — signing out. */
export async function DELETE() {
  const res = NextResponse.json({ clientId: null })
  clearClientCookie(res)
  return res
}

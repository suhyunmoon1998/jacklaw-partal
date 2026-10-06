import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { clearClientCookie, setClientCookie, verifiedPhone, verifiedSessionClient } from '@/lib/clientAuth'
import { phoneKey } from '@/lib/signInCode'

export const dynamic = 'force-dynamic'

const noStore = { 'Cache-Control': 'no-store' }

/**
 * Signing a client in to one of their cases.
 *
 * Only a browser that has just answered the code texted to a number can pick
 * a case, and only a case on that number (app/api/clients/code/verify). The
 * session it gets is bound to the number, so it ends when the office changes
 * the client's number (lib/clientAuth.ts).
 */

/** GET — which case, if any, this browser is signed in to. */
export async function GET(req: NextRequest) {
  return NextResponse.json({ clientId: await verifiedSessionClient(req) }, { headers: noStore })
}

export async function POST(req: NextRequest) {
  const number = verifiedPhone(req)
  if (!number) {
    return NextResponse.json({ error: 'Sign in with the code we text you first.' }, { status: 401, headers: noStore })
  }
  const body = await req.json().catch(() => ({}))
  const clientId = typeof body?.clientId === 'string' ? body.clientId.trim() : ''
  if (!clientId) {
    return NextResponse.json({ error: 'Choose a case.' }, { status: 400, headers: noStore })
  }

  const { data, error } = await getSupabase()
    .from('clients')
    .select('id, name, phone, case_type')
    .eq('id', clientId)
    .maybeSingle()
  if (error) {
    return NextResponse.json({ error: 'The portal could not check your sign-in. Please try again.' }, { status: 503, headers: noStore })
  }

  // A case on another number answers like no case at all: this must not
  // become a way to ask whether an id exists.
  if (!data || phoneKey(String(data.phone ?? '')) !== number) {
    return NextResponse.json({ error: 'We could not find that case.' }, { status: 404, headers: noStore })
  }

  const res = NextResponse.json({ clientId: data.id, name: data.name, case_type: data.case_type ?? '' }, { headers: noStore })
  if (!setClientCookie(res, data.id, String(data.phone ?? ''))) {
    // Refused rather than waved through: without the signing secret a session
    // cannot be verified later, and a portal that lets everyone in because it
    // is misconfigured is the thing this exists to prevent.
    return NextResponse.json({ error: 'This portal is not configured for sign-in yet.' }, { status: 500, headers: noStore })
  }
  return res
}

/** DELETE — signing out. */
export async function DELETE() {
  const res = NextResponse.json({ clientId: null }, { headers: noStore })
  clearClientCookie(res)
  return res
}

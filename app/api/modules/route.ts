import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

/**
 * GET /api/modules?clientId=xxx — the steps this client has been given.
 *
 * Returns both shapes on purpose. `sends` carries when each was handed over and
 * whether the client has ever opened it, which is what draws the step list and
 * the "New" badge. `sent` is the plain list of ids, kept because more than one
 * screen only ever needed to ask "is this one mine?" and should not have to
 * learn a second shape to keep asking it.
 *
 * `ok` is the important field. An empty list and a failed query are the same
 * JSON otherwise, and a caller that cannot tell them apart locks every client
 * out of every questionnaire the moment this route has a bad minute. Callers
 * must hold their screen on ok:false, never conclude "nothing was sent".
 *
 * Unauthenticated like the other client-facing routes here: it takes a client id
 * and returns which questionnaires are open to them. A wrong id shows someone
 * else's list of module names, which carries nothing about anybody's case.
 */
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get('clientId')
  if (!clientId) return NextResponse.json({ ok: false, sent: [], sends: [] }, { status: 400 })

  const { data, error } = await getSupabase()
    .from('client_module_sends')
    .select('module_id, sent_at, opened_at')
    .eq('client_id', clientId)

  if (error) {
    console.error('module list failed:', error)
    return NextResponse.json({ ok: false, sent: [], sends: [] }, { status: 500 })
  }

  const rows = data ?? []
  return NextResponse.json({
    ok: true,
    sent: rows.map(r => r.module_id),
    sends: rows.map(r => ({
      moduleId: r.module_id,
      sentAt: r.sent_at,
      openedAt: r.opened_at ?? null,
    })),
  })
}

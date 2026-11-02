import { NextRequest, NextResponse } from 'next/server'
import { origin } from '@/lib/assignmentInvite'
import { UUID, validManageToken } from '@/lib/consultations/manageLink'
import { ConsultationRow, cancel, loadConsultation, reschedule } from '@/lib/consultations/store'

/**
 * The client's own booking, reached from the link in their emails.
 *
 *   GET  ?b=<id>&t=<token>                    what is booked
 *   POST { b, t, action: 'cancel' }
 *   POST { b, t, action: 'reschedule', start } moved in one step; 409 'taken'
 *                                             when the new time went first
 *
 * A wrong token and a missing booking answer alike, so the link cannot be used
 * to learn which ids exist.
 */

async function authorised(id: unknown, token: unknown): Promise<ConsultationRow | null> {
  if (typeof id !== 'string' || !UUID.test(id) || !validManageToken(id, token)) return null
  return loadConsultation(id)
}

function view(row: ConsultationRow) {
  return {
    start: row.starts_at,
    end: row.ends_at,
    status: row.status === 'cancelled' ? 'cancelled' : new Date(row.ends_at) < new Date() ? 'past' : 'booked',
    meetUrl: row.status === 'booked' ? row.meet_url : null,
    name: row.name,
    lang: row.lang,
  }
}

export async function GET(req: NextRequest) {
  try {
    const row = await authorised(req.nextUrl.searchParams.get('b'), req.nextUrl.searchParams.get('t'))
    if (!row || row.status === 'held') return NextResponse.json({ reason: 'not-found' }, { status: 404 })
    return NextResponse.json(view(row), { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('consultation manage:', err instanceof Error ? err.message : err)
    return NextResponse.json({ reason: 'unavailable' }, { status: 503 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const action = body?.action
  if (action !== 'cancel' && action !== 'reschedule') return NextResponse.json({ reason: 'bad-request' }, { status: 400 })
  const start = new Date(String(body?.start ?? ''))
  if (action === 'reschedule' && Number.isNaN(start.getTime())) return NextResponse.json({ reason: 'bad-request' }, { status: 400 })

  try {
    const row = await authorised(body?.b, body?.t)
    if (!row || row.status === 'held') return NextResponse.json({ reason: 'not-found' }, { status: 404 })
    if (row.status === 'cancelled') return NextResponse.json(view(row))
    if (new Date(row.starts_at) < new Date()) return NextResponse.json({ reason: 'past' }, { status: 409 })

    if (action === 'reschedule') {
      const moved = await reschedule(row, start, origin(req))
      if (!moved.ok) {
        const status = moved.reason === 'unavailable' ? 503 : 409
        return NextResponse.json({ reason: moved.reason }, { status })
      }
      return NextResponse.json(view(moved.row))
    }

    await cancel(row, 'client', origin(req))
    const after = await loadConsultation(row.id)
    return NextResponse.json(view(after ?? row))
  } catch (err) {
    console.error(`consultation ${action}:`, err instanceof Error ? err.message : err)
    return NextResponse.json({ reason: 'unavailable' }, { status: 503 })
  }
}

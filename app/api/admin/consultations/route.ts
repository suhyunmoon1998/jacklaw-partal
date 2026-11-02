import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/adminAuth'
import { getSupabase } from '@/lib/supabase'
import { origin } from '@/lib/assignmentInvite'
import { SCOPES, calendarConfigured, serviceAccountEmail } from '@/lib/consultations/google'
import { ConsultationRow, ROW_COLUMNS, cancel, loadConsultation } from '@/lib/consultations/store'
import { UUID } from '@/lib/consultations/manageLink'

/**
 * Admin → Consultations.
 *
 *   GET    everything the panel draws: calendar status, hosts, bookings from
 *          a week ago on, and cancellations of the last thirty days
 *   PATCH  { id, action: 'review' | 'unreview' | 'cancel' }
 *
 * 'review' records that an attorney has looked at the conflict check. It does
 * not change what the check found.
 */

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getSupabase()
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()
  const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString()

  const [hosts, booked, cancelled] = await Promise.all([
    db.from('consultation_hosts').select('id, name, email, weekly_hours, active').order('created_at'),
    db.from('consultations').select(ROW_COLUMNS).eq('status', 'booked').gte('starts_at', weekAgo).order('starts_at').limit(500),
    db.from('consultations').select(ROW_COLUMNS).eq('status', 'cancelled').gte('cancelled_at', monthAgo).order('starts_at', { ascending: false }).limit(100),
  ])
  const failed = hosts.error ?? booked.error ?? cancelled.error
  if (failed) return NextResponse.json({ error: failed.message }, { status: 500 })

  return NextResponse.json({
    calendar: { configured: calendarConfigured(), serviceAccount: serviceAccountEmail(), scopes: SCOPES },
    bookingUrl: `${origin(req)}/book`,
    hosts: hosts.data ?? [],
    booked: booked.data ?? [],
    cancelled: cancelled.data ?? [],
  })
}

export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const id = typeof body?.id === 'string' && UUID.test(body.id) ? body.id : null
  if (!id) return NextResponse.json({ error: 'Which consultation?' }, { status: 400 })

  const row: ConsultationRow | null = await loadConsultation(id).catch(() => null)
  if (!row) return NextResponse.json({ error: 'No such consultation.' }, { status: 404 })

  if (body.action === 'review' || body.action === 'unreview') {
    const { error } = await getSupabase()
      .from('consultations')
      .update({ conflicts_reviewed_at: body.action === 'review' ? new Date().toISOString() : null })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'cancel') {
    try {
      const done = await cancel(row, 'office', origin(req))
      if (!done) return NextResponse.json({ error: 'It is not booked any more.' }, { status: 409 })
      return NextResponse.json({ ok: true })
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : 'Cancel failed.' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
}

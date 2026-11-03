import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isAdmin } from '@/lib/adminAuth'
import { getSupabase } from '@/lib/supabase'
import { UUID } from '@/lib/consultations/manageLink'
import { OFFICE_HOURS, parseWeeklyHours } from '@/lib/consultations/hours'
import { busyTimes, calendarConfigured } from '@/lib/consultations/google'

/**
 * The people who give consultations.
 *
 *   POST   { name, email }                         add one, with office hours
 *   PATCH  { id, name?, email?, active?, hours? }  hours = seven day-lines, "0".."6"
 *   PUT    { id }                                  check the calendar can be read
 *
 * A host is turned off rather than deleted: their past bookings point at them.
 */

const Email = z.string().trim().toLowerCase().max(254).pipe(z.email())
const Name = z.string().trim().min(2).max(100)

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const name = Name.safeParse(body?.name)
  const email = Email.safeParse(body?.email)
  if (!name.success) return NextResponse.json({ error: 'Enter the host’s name.' }, { status: 400 })
  if (!email.success) return NextResponse.json({ error: 'Enter their Workspace email address.' }, { status: 400 })

  const { data, error } = await getSupabase()
    .from('consultation_hosts')
    .insert({ name: name.data, email: email.data, weekly_hours: OFFICE_HOURS })
    .select('id, name, email, weekly_hours, active')
    .single()
  if (error) {
    const taken = error.code === '23505'
    return NextResponse.json({ error: taken ? 'That address is already a host.' : error.message }, { status: taken ? 409 : 500 })
  }
  return NextResponse.json({ host: data })
}

export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const id = typeof body?.id === 'string' && UUID.test(body.id) ? body.id : null
  if (!id) return NextResponse.json({ error: 'Which host?' }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (body.name !== undefined) {
    const name = Name.safeParse(body.name)
    if (!name.success) return NextResponse.json({ error: 'Enter the host’s name.' }, { status: 400 })
    update.name = name.data
  }
  if (body.email !== undefined) {
    const email = Email.safeParse(body.email)
    if (!email.success) return NextResponse.json({ error: 'Enter their Workspace email address.' }, { status: 400 })
    update.email = email.data
  }
  if (body.active !== undefined) update.active = body.active === true
  if (body.hours !== undefined) {
    const parsed = parseWeeklyHours(body.hours)
    if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })
    update.weekly_hours = parsed.hours
  }
  if (!Object.keys(update).length) return NextResponse.json({ error: 'Nothing to change.' }, { status: 400 })

  const { data, error } = await getSupabase()
    .from('consultation_hosts')
    .update(update)
    .eq('id', id)
    .select('id, name, email, weekly_hours, active')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ host: data })
}

/** Reads the next day of the host's calendar, and says plainly what Google answered. */
export async function PUT(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!calendarConfigured()) {
    return NextResponse.json({
      ok: false,
      message: 'GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_WORKLOAD_IDENTITY_PROVIDER are not set on this deployment (see docs/consultations.md).',
    })
  }
  const body = await req.json().catch(() => ({}))
  const id = typeof body?.id === 'string' && UUID.test(body.id) ? body.id : null
  if (!id) return NextResponse.json({ error: 'Which host?' }, { status: 400 })

  const { data: host, error } = await getSupabase().from('consultation_hosts').select('email').eq('id', id).maybeSingle()
  if (error || !host) return NextResponse.json({ error: error?.message ?? 'No such host.' }, { status: 404 })

  try {
    const now = new Date()
    const busy = await busyTimes(host.email, now, new Date(now.getTime() + 86_400_000))
    return NextResponse.json({ ok: true, message: `Calendar read. ${busy.length} busy block${busy.length === 1 ? '' : 's'} in the next 24 hours.` })
  } catch (err) {
    return NextResponse.json({ ok: false, message: err instanceof Error ? err.message : String(err) })
  }
}

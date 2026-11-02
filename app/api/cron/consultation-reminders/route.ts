import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { getSupabase } from '@/lib/supabase'
import { origin } from '@/lib/assignmentInvite'
import { OFFICE_TIME_ZONE } from '@/lib/consultations/config'
import { emailClient } from '@/lib/consultations/notify'
import { ConsultationRow, ROW_COLUMNS, bookLink, forEmail } from '@/lib/consultations/store'
import { addDays, zonedDate, zonedToUtc } from '@/lib/consultations/time'

/**
 * The day-before reminder for every consultation booked for tomorrow
 * (Pacific). Runs once a morning (vercel.json).
 *
 * Safe to run twice: each booking is claimed by setting reminded_at, where it
 * is still empty, before the email is sent. A crash between the two costs one
 * reminder; the other order would send it twice. A booking made after this
 * morning's run for tomorrow simply gets no reminder — it was confirmed
 * within the day.
 *
 * `?dryRun=1` claims nothing and sends nothing, and says who would be emailed.
 */

/** Only the scheduler, with CRON_SECRET (see app/api/cron/reminders for why nothing else). */
function authorised(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = req.headers.get('authorization')
  if (!auth) return false
  const a = Buffer.from(auth)
  const b = Buffer.from(`Bearer ${secret}`)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function GET(req: NextRequest) {
  if (!authorised(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1'

  const tomorrow = addDays(zonedDate(new Date(), OFFICE_TIME_ZONE), 1)
  const from = zonedToUtc(tomorrow, '00:00', OFFICE_TIME_ZONE)
  const to = zonedToUtc(addDays(tomorrow, 1), '00:00', OFFICE_TIME_ZONE)

  const db = getSupabase()
  const { data, error } = await db
    .from('consultations')
    .select(ROW_COLUMNS)
    .eq('status', 'booked')
    .is('reminded_at', null)
    .gte('starts_at', from.toISOString())
    .lt('starts_at', to.toISOString())
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []) as ConsultationRow[]
  if (dryRun) {
    return NextResponse.json({ dryRun: true, date: tomorrow, wouldEmail: rows.map(r => ({ id: r.id, startsAt: r.starts_at, lang: r.lang })) })
  }

  const base = origin(req)
  let sent = 0
  for (const row of rows) {
    const { data: claimed } = await db
      .from('consultations')
      .update({ reminded_at: new Date().toISOString() })
      .eq('id', row.id)
      .is('reminded_at', null)
      .select('id')
    if (!claimed?.length) continue
    const booking = forEmail(row, base)
    if (await emailClient('reminder', booking, bookLink(base, booking.lang))) sent++
  }
  return NextResponse.json({ date: tomorrow, due: rows.length, sent })
}

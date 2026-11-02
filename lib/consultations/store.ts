import { getSupabase } from '@/lib/supabase'
import { Lang, toLang } from '@/lib/langs'
import { BUFFER_MINUTES, DURATION_MINUTES, MAX_UPCOMING_PER_PERSON, OFFICE_TIME_ZONE } from './config'
import { hostAvailability } from './availability'
import { ConflictHit } from './conflicts'
import { runConflictCheck } from './conflictsRun'
import { BookingForEmail, calendarDescription, eventTitle } from './emails'
import { CalendarError, createConsultationEvent, deleteConsultationEvent } from './google'
import { manageUrl } from './manageLink'
import { emailClient, emailOfficeBooked, emailOfficeCancelled } from './notify'
import { freeHostsAt } from './slots'

/**
 * Booking and cancelling, in the order that keeps the calendar and the
 * database agreeing.
 *
 *   1. the time is checked against every host's calendar again, now
 *   2. a row is held for the first free host (hold_consultation, one lock per host)
 *   3. the event and its Meet room are made on that host's calendar
 *   4. the row becomes 'booked' — or, if Google refused, is deleted
 *   5. the conflict check runs, and the emails go out
 *
 * A booking that reaches the client's inbox is therefore always on a
 * calendar, and a calendar that refused leaves nothing behind.
 */

export interface BookingRequest {
  start: Date
  name: string
  email: string
  phone: string
  lang: Lang
  adverseParty: string
  otherParties: string
  summary: string
}

export type BookingResult =
  | { ok: true; id: string; start: Date; end: Date; meetUrl: string | null; manageUrl: string }
  | { ok: false; reason: 'taken' | 'limit' | 'unavailable' | 'not-configured' }

export interface ConsultationRow {
  id: string
  host_id: string
  starts_at: string
  ends_at: string
  status: 'held' | 'booked' | 'cancelled'
  name: string
  email: string
  phone: string
  lang: string
  adverse_party: string
  other_parties: string
  summary: string
  conflicts: ConflictHit[] | null
  conflicts_reviewed_at: string | null
  google_event_id: string | null
  meet_url: string | null
  reminded_at: string | null
  cancelled_at: string | null
  cancelled_by: 'client' | 'office' | null
  created_at: string
  consultation_hosts?: { name: string; email: string } | null
}

export const ROW_COLUMNS = '*, consultation_hosts(name, email)'

export function forEmail(row: ConsultationRow, origin: string): BookingForEmail {
  const lang = toLang(row.lang)
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    lang,
    start: new Date(row.starts_at),
    end: new Date(row.ends_at),
    meetUrl: row.meet_url,
    manageUrl: manageUrl(origin, row.id, lang),
    hostName: row.consultation_hosts?.name ?? 'the host',
    adverseParty: row.adverse_party,
    otherParties: row.other_parties,
    summary: row.summary,
    conflicts: row.conflicts,
  }
}

export const adminLink = (origin: string) => `${origin}/admin?tab=consultations`
export const bookLink = (origin: string, lang: Lang) => `${origin}/book?lang=${lang}`

export async function loadConsultation(id: string): Promise<ConsultationRow | null> {
  const { data, error } = await getSupabase().from('consultations').select(ROW_COLUMNS).eq('id', id).maybeSingle()
  if (error) throw new Error(`consultations: ${error.message}`)
  return (data as ConsultationRow | null) ?? null
}

/**
 * One person holding a couple of future times is a person; more is a script.
 * Both are stored normalised (lowercase address, ten digits) by the route.
 */
async function upcomingFor(email: string, phone: string): Promise<number> {
  const { data, error } = await getSupabase()
    .from('consultations')
    .select('id')
    .eq('status', 'booked')
    .gt('starts_at', new Date().toISOString())
    .or(`email.eq."${email.replace(/"/g, '')}",phone.eq."${phone.replace(/\D/g, '')}"`)
  if (error) throw new Error(`consultations: ${error.message}`)
  return data?.length ?? 0
}

export async function book(req: BookingRequest, origin: string, now = new Date()): Promise<BookingResult> {
  if (!process.env.SESSION_SECRET) return { ok: false, reason: 'not-configured' }

  if ((await upcomingFor(req.email, req.phone)) >= MAX_UPCOMING_PER_PERSON) return { ok: false, reason: 'limit' }

  const { hosts, rows } = await hostAvailability(now)
  const candidates = freeHostsAt(req.start, hosts, now)
  if (!candidates.length) return { ok: false, reason: 'taken' }

  const end = new Date(req.start.getTime() + DURATION_MINUTES * 60_000)
  const db = getSupabase()
  const { data: held, error: holdError } = await db.rpc('hold_consultation', {
    p_host_ids: candidates,
    p_starts_at: req.start.toISOString(),
    p_ends_at: end.toISOString(),
    p_buffer_minutes: BUFFER_MINUTES,
    p_name: req.name,
    p_email: req.email,
    p_phone: req.phone,
    p_lang: req.lang,
    p_adverse_party: req.adverseParty,
    p_other_parties: req.otherParties,
    p_summary: req.summary,
  })
  if (holdError) throw new Error(`hold_consultation: ${holdError.message}`)
  const hold = (held as { id: string; host_id: string }[] | null)?.[0]
  if (!hold) return { ok: false, reason: 'taken' }

  const host = rows.find(r => r.id === hold.host_id)
  if (!host) {
    await db.from('consultations').delete().eq('id', hold.id)
    return { ok: false, reason: 'taken' }
  }

  let event: { eventId: string; meetUrl: string | null }
  try {
    event = await createConsultationEvent(host.email, {
      bookingId: hold.id,
      start: req.start,
      end,
      timeZone: OFFICE_TIME_ZONE,
      summary: `${eventTitle('en')}: ${req.name}`,
      description: calendarDescription(req, adminLink(origin)),
      attendee: { email: req.email, name: req.name },
    })
  } catch (err) {
    console.error('consultation event:', err instanceof CalendarError || err instanceof Error ? err.message : err)
    await db.from('consultations').delete().eq('id', hold.id)
    return { ok: false, reason: 'unavailable' }
  }

  const { error: confirmError } = await db
    .from('consultations')
    .update({ status: 'booked', google_event_id: event.eventId, meet_url: event.meetUrl })
    .eq('id', hold.id)
  if (confirmError) {
    // The event exists and the row does not say so: take the event back off
    // rather than leave the host a meeting the portal does not know about.
    console.error('consultation confirm:', confirmError.message)
    await deleteConsultationEvent(host.email, event.eventId).catch(() => {})
    await db.from('consultations').delete().eq('id', hold.id)
    return { ok: false, reason: 'unavailable' }
  }

  const conflicts = await runConflictCheck(hold.id, req)
  const booking: BookingForEmail = {
    ...forEmail(
      {
        id: hold.id,
        starts_at: req.start.toISOString(),
        ends_at: end.toISOString(),
        name: req.name,
        email: req.email,
        phone: req.phone,
        lang: req.lang,
        meet_url: event.meetUrl,
        adverse_party: req.adverseParty,
        other_parties: req.otherParties,
        summary: req.summary,
        conflicts,
        consultation_hosts: { name: host.name, email: host.email },
      } as ConsultationRow,
      origin
    ),
  }
  // Awaited: a function is frozen once it has answered, and an email still
  // being written then would never leave. Neither throws.
  await Promise.all([
    emailClient('booked', booking, bookLink(origin, req.lang)),
    emailOfficeBooked(booking, adminLink(origin)),
  ])

  return { ok: true, id: hold.id, start: req.start, end, meetUrl: event.meetUrl, manageUrl: booking.manageUrl }
}

/**
 * Cancels a booked consultation: off the host's calendar, marked cancelled,
 * and both sides told. Returns false when there was nothing left to cancel.
 */
export async function cancel(row: ConsultationRow, by: 'client' | 'office', origin: string): Promise<boolean> {
  if (row.status !== 'booked') return false
  const { data, error } = await getSupabase()
    .from('consultations')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), cancelled_by: by })
    .eq('id', row.id)
    .eq('status', 'booked')
    .select('id')
  if (error) throw new Error(`consultations: ${error.message}`)
  if (!data?.length) return false

  const hostEmail = row.consultation_hosts?.email
  if (hostEmail && row.google_event_id) {
    await deleteConsultationEvent(hostEmail, row.google_event_id).catch(err =>
      console.error('consultation event delete:', err instanceof Error ? err.message : err)
    )
  }

  const booking = forEmail(row, origin)
  await Promise.all([
    emailClient(by === 'client' ? 'cancelled-by-client' : 'cancelled-by-office', booking, bookLink(origin, booking.lang)),
    emailOfficeCancelled(booking, by, adminLink(origin)),
  ])
  return true
}

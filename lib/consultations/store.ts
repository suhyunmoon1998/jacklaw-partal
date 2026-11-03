import { getSupabase } from '@/lib/supabase'
import { Lang, toLang } from '@/lib/langs'
import { BUFFER_MINUTES, DURATION_MINUTES, MAX_UPCOMING_PER_PERSON, OFFICE_TIME_ZONE } from './config'
import { HostRow, hostAvailability } from './availability'
import { ConflictHit } from './conflicts'
import { runConflictCheck } from './conflictsRun'
import { BookingForEmail, calendarDescription, eventTitle } from './emails'
import { CalendarError, createConsultationEvent, deleteConsultationEvent } from './google'
import { manageUrl } from './manageLink'
import { emailClient, emailOfficeBooked, emailOfficeCancelled, emailOfficeRescheduled } from './notify'
import { freeHostsAt } from './slots'

/**
 * Booking, moving and cancelling, in the order that keeps the calendar and
 * the database agreeing.
 *
 *   1. the time is checked against every host's calendar again, now
 *   2. a row is held for the first free host (hold_consultation, one lock per host)
 *   3. the event and its Meet room are made on that host's calendar
 *   4. the row becomes 'booked' — or, if Google refused, is deleted
 *   5. the conflict check runs, and the emails go out
 *
 * A booking that reaches the client's inbox is therefore always on a
 * calendar, and a calendar that refused leaves nothing behind. Moving a
 * booking takes the new time the same way before it lets go of the old one,
 * so a client who reschedules is never left with neither.
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

type Person = Omit<BookingRequest, 'start'>

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
    hostEmail: row.consultation_hosts?.email ?? null,
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

type Held =
  | { ok: true; id: string; host: HostRow; end: Date; eventId: string; meetUrl: string | null }
  | { ok: false; reason: 'taken' | 'unavailable' }

/**
 * Steps 2 and 3: a held row for the first of `candidates` still free, and the
 * event on that host's calendar. On any failure nothing is left behind.
 */
async function holdWithEvent(person: Person, start: Date, candidates: string[], rows: HostRow[], origin: string): Promise<Held> {
  const db = getSupabase()
  const end = new Date(start.getTime() + DURATION_MINUTES * 60_000)
  const { data: held, error: holdError } = await db.rpc('hold_consultation', {
    p_host_ids: candidates,
    p_starts_at: start.toISOString(),
    p_ends_at: end.toISOString(),
    p_buffer_minutes: BUFFER_MINUTES,
    p_name: person.name,
    p_email: person.email,
    p_phone: person.phone,
    p_lang: person.lang,
    p_adverse_party: person.adverseParty,
    p_other_parties: person.otherParties,
    p_summary: person.summary,
  })
  if (holdError) throw new Error(`hold_consultation: ${holdError.message}`)
  const hold = (held as { id: string; host_id: string }[] | null)?.[0]
  if (!hold) return { ok: false, reason: 'taken' }

  const host = rows.find(r => r.id === hold.host_id)
  if (!host) {
    await db.from('consultations').delete().eq('id', hold.id)
    return { ok: false, reason: 'taken' }
  }

  try {
    const event = await createConsultationEvent(host.email, {
      bookingId: hold.id,
      start,
      end,
      timeZone: OFFICE_TIME_ZONE,
      summary: `${eventTitle('en')}: ${person.name}`,
      description: calendarDescription(person, adminLink(origin)),
    })
    return { ok: true, id: hold.id, host, end, eventId: event.eventId, meetUrl: event.meetUrl }
  } catch (err) {
    console.error('consultation event:', err instanceof CalendarError || err instanceof Error ? err.message : err)
    await db.from('consultations').delete().eq('id', hold.id)
    return { ok: false, reason: 'unavailable' }
  }
}

export async function book(req: BookingRequest, origin: string, now = new Date()): Promise<BookingResult> {
  if (!process.env.SESSION_SECRET) return { ok: false, reason: 'not-configured' }

  if ((await upcomingFor(req.email, req.phone)) >= MAX_UPCOMING_PER_PERSON) return { ok: false, reason: 'limit' }

  const { hosts, rows } = await hostAvailability(now)
  const candidates = freeHostsAt(req.start, hosts, now)
  if (!candidates.length) return { ok: false, reason: 'taken' }

  const held = await holdWithEvent(req, req.start, candidates, rows, origin)
  if (!held.ok) return held

  const db = getSupabase()
  const { error: confirmError } = await db
    .from('consultations')
    .update({ status: 'booked', google_event_id: held.eventId, meet_url: held.meetUrl })
    .eq('id', held.id)
  if (confirmError) {
    // The event exists and the row does not say so: take the event back off
    // rather than leave the host a meeting the portal does not know about.
    console.error('consultation confirm:', confirmError.message)
    await deleteConsultationEvent(held.host.email, held.eventId).catch(() => {})
    await db.from('consultations').delete().eq('id', held.id)
    return { ok: false, reason: 'unavailable' }
  }

  const conflicts = await runConflictCheck(held.id, req)
  const booking = forEmail(
    {
      id: held.id,
      starts_at: req.start.toISOString(),
      ends_at: held.end.toISOString(),
      name: req.name,
      email: req.email,
      phone: req.phone,
      lang: req.lang,
      meet_url: held.meetUrl,
      adverse_party: req.adverseParty,
      other_parties: req.otherParties,
      summary: req.summary,
      conflicts,
      consultation_hosts: { name: held.host.name, email: held.host.email },
    } as ConsultationRow,
    origin
  )
  // Awaited: a function is frozen once it has answered, and an email still
  // being written then would never leave. Neither throws.
  await Promise.all([
    emailClient('booked', booking, bookLink(origin, req.lang)),
    emailOfficeBooked(booking, adminLink(origin)),
  ])

  return { ok: true, id: held.id, start: req.start, end: held.end, meetUrl: held.meetUrl, manageUrl: booking.manageUrl }
}

export type RescheduleResult =
  | { ok: true; row: ConsultationRow }
  | { ok: false; reason: 'taken' | 'unavailable' | 'not-booked' }

/**
 * Moves a booking to a new time, keeping its id — so the client's manage
 * link, the conflict check and an attorney's review of it all carry over.
 *
 * The new time is taken first (a held row and a new event, exactly as a
 * booking), then the booking is moved onto it and the old event comes off the
 * calendar. The same host is kept when they are free at the new time. Their
 * own booking still occupies the old time while this runs, so a time within
 * the buffer of it is not offered to them by that host.
 */
export async function reschedule(row: ConsultationRow, start: Date, origin: string, now = new Date()): Promise<RescheduleResult> {
  if (row.status !== 'booked' || Date.parse(row.starts_at) <= now.getTime()) return { ok: false, reason: 'not-booked' }
  if (start.getTime() === Date.parse(row.starts_at)) return { ok: true, row }

  const { hosts, rows } = await hostAvailability(now)
  const candidates = freeHostsAt(start, hosts, now).sort(
    (a, b) => Number(b === row.host_id) - Number(a === row.host_id)
  )
  if (!candidates.length) return { ok: false, reason: 'taken' }

  const person: Person = {
    name: row.name,
    email: row.email,
    phone: row.phone,
    lang: toLang(row.lang),
    adverseParty: row.adverse_party,
    otherParties: row.other_parties,
    summary: row.summary,
  }
  const held = await holdWithEvent(person, start, candidates, rows, origin)
  if (!held.ok) return held

  const db = getSupabase()
  const { data: moved, error: moveError } = await db
    .from('consultations')
    .update({
      host_id: held.host.id,
      starts_at: start.toISOString(),
      ends_at: held.end.toISOString(),
      google_event_id: held.eventId,
      meet_url: held.meetUrl,
      reminded_at: null,
    })
    .eq('id', row.id)
    .eq('status', 'booked')
    .select('id')
  // The held row only stood in for the new time while it was being taken.
  await db.from('consultations').delete().eq('id', held.id)
  if (moveError || !moved?.length) {
    if (moveError) console.error('consultation reschedule:', moveError.message)
    await deleteConsultationEvent(held.host.email, held.eventId).catch(() => {})
    return { ok: false, reason: moveError ? 'unavailable' : 'not-booked' }
  }

  const previous = {
    start: new Date(row.starts_at),
    hostName: row.consultation_hosts?.name ?? 'the host',
    hostEmail: row.consultation_hosts?.email ?? null,
  }
  if (previous.hostEmail && row.google_event_id) {
    await deleteConsultationEvent(previous.hostEmail, row.google_event_id).catch(err =>
      console.error('consultation old event delete:', err instanceof Error ? err.message : err)
    )
  }

  const after = (await loadConsultation(row.id)) ?? row
  const booking = forEmail(after, origin)
  await Promise.all([
    emailClient('rescheduled', booking, bookLink(origin, booking.lang)),
    emailOfficeRescheduled(booking, previous, adminLink(origin)),
  ])
  return { ok: true, row: after }
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

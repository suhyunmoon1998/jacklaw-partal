import { getSupabase } from '@/lib/supabase'
import { readWeeklyHours } from './hours'
import { busyTimes, calendarConfigured } from './google'
import { DEFAULT_RULES, HostAvailability, Interval, SlotRules, horizon } from './slots'
import { addDays, zonedToUtc } from './time'

/**
 * What each active host has free, read from their Google calendar and from the
 * portal's own bookings, for slots.ts to turn into times.
 *
 * A host whose calendar cannot be read is left out — offered no times — rather
 * than offered as entirely free. The error is logged, and the admin panel's
 * "Check calendar" says what it was.
 */

export interface HostRow {
  id: string
  name: string
  email: string
  weekly_hours: unknown
  active: boolean
}

export async function activeHosts(): Promise<HostRow[]> {
  const { data, error } = await getSupabase()
    .from('consultation_hosts')
    .select('id, name, email, weekly_hours, active')
    .eq('active', true)
    .order('created_at')
  if (error) throw new Error(`consultation_hosts: ${error.message}`)
  return (data ?? []) as HostRow[]
}

/** The instants the horizon spans, padded a day either side for the buffer. */
export function horizonRange(now: Date, rules: SlotRules = DEFAULT_RULES): { from: Date; to: Date } {
  const { from, to } = horizon(now, rules)
  return {
    from: zonedToUtc(addDays(from, -1), '00:00', rules.timeZone),
    to: zonedToUtc(addDays(to, 2), '00:00', rules.timeZone),
  }
}

/** Bookings that occupy a host: booked, or held by a request still in flight. */
async function portalBookings(hostIds: string[], from: Date, to: Date) {
  const { data, error } = await getSupabase()
    .from('consultations')
    .select('host_id, starts_at, ends_at, status, created_at')
    .in('host_id', hostIds)
    .in('status', ['booked', 'held'])
    .lt('starts_at', to.toISOString())
    .gt('ends_at', from.toISOString())
  if (error) throw new Error(`consultations: ${error.message}`)
  const staleHold = Date.now() - 5 * 60_000
  return (data ?? []).filter(r => r.status === 'booked' || Date.parse(r.created_at) > staleHold)
}

export async function hostAvailability(
  now: Date,
  rules: SlotRules = DEFAULT_RULES
): Promise<{ hosts: HostAvailability[]; rows: HostRow[] }> {
  if (!calendarConfigured()) return { hosts: [], rows: [] }
  const rows = await activeHosts()
  if (!rows.length) return { hosts: [], rows }

  const { from, to } = horizonRange(now, rules)
  const [bookings, calendars] = await Promise.all([
    portalBookings(
      rows.map(r => r.id),
      from,
      to
    ),
    Promise.all(
      rows.map(r =>
        busyTimes(r.email, from, to).catch(err => {
          console.error('consultation free/busy:', err instanceof Error ? err.message : err)
          return null
        })
      )
    ),
  ])

  const hosts: HostAvailability[] = []
  rows.forEach((row, i) => {
    const calendar = calendars[i]
    if (!calendar) return
    const own = bookings.filter(b => b.host_id === row.id)
    const busy: Interval[] = [
      ...calendar,
      ...own.map(b => ({ start: new Date(b.starts_at), end: new Date(b.ends_at) })),
    ]
    hosts.push({ id: row.id, hours: readWeeklyHours(row.weekly_hours), busy, load: own.length })
  })
  return { hosts, rows }
}

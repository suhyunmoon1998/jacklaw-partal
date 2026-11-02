/**
 * Wall-clock time in one time zone, without a date library.
 *
 * Hosts' hours are written as Pacific wall-clock ("09:00" on a Tuesday), and
 * the database and Google keep instants. These turn one into the other through
 * Intl, which carries the zone's daylight-saving rules, so a 9am slot is 9am
 * on both sides of the change in March and November.
 */

const partsFormatter = new Map<string, Intl.DateTimeFormat>()

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let f = partsFormatter.get(timeZone)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    partsFormatter.set(timeZone, f)
  }
  return f
}

function wallClock(at: Date, timeZone: string) {
  const parts = formatterFor(timeZone).formatToParts(at)
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value ?? 0)
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  }
}

/** Minutes the zone is ahead of UTC at that instant (Pacific: -420 or -480). */
function offsetMinutes(at: Date, timeZone: string): number {
  const w = wallClock(at, timeZone)
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second)
  return Math.round((asUtc - at.getTime()) / 60000)
}

/**
 * The instant at which the zone's clocks read `date` `time`.
 *
 * Two passes, because the offset to use is the one in force at the answer, not
 * at the first guess. A wall time that does not exist (2:30am on the spring
 * change) lands an hour later; no host's hours sit there.
 */
export function zonedToUtc(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  const naive = Date.UTC(y, m - 1, d, hh, mm)
  const first = naive - offsetMinutes(new Date(naive), timeZone) * 60000
  return new Date(naive - offsetMinutes(new Date(first), timeZone) * 60000)
}

/** The zone's calendar date at that instant, as YYYY-MM-DD. */
export function zonedDate(at: Date, timeZone: string): string {
  const w = wallClock(at, timeZone)
  return `${w.year}-${String(w.month).padStart(2, '0')}-${String(w.day).padStart(2, '0')}`
}

/** A calendar date `days` after `date`. Plain date arithmetic: no zone involved. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

/** Sunday = 0, as JavaScript and consultation_hosts.weekly_hours both count. */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

export function isDateString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))
}

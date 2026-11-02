/**
 * A host's weekly hours: when they take consultations, in Pacific wall-clock.
 *
 * Stored as consultation_hosts.weekly_hours, keyed by weekday with Sunday =
 * "0". Staff edit one line per day in the admin panel ("09:00-12:00,
 * 13:00-17:00"), and this is the only place that line is read, so a typo is
 * refused here rather than turning into a day with no times.
 */

export type Window = [start: string, end: string]
export type WeeklyHours = Partial<Record<'0' | '1' | '2' | '3' | '4' | '5' | '6', Window[]>>

export const WEEKDAY_KEYS = ['0', '1', '2', '3', '4', '5', '6'] as const
export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/

const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3))

/** "9:00" → "09:00"; anything that is not a time → null. */
function readTime(raw: string): string | null {
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const t = `${m[1].padStart(2, '0')}:${m[2]}`
  return HHMM.test(t) ? t : null
}

/**
 * One day's line, as staff type it. Empty means the day is off.
 * Returns an error message for the panel instead of guessing.
 */
export function parseDayLine(line: string): { windows: Window[] } | { error: string } {
  const text = line.trim()
  if (!text) return { windows: [] }
  const windows: Window[] = []
  for (const piece of text.split(',')) {
    const [a, b, extra] = piece.split('-')
    const start = readTime(a ?? '')
    const end = readTime(b ?? '')
    if (!start || !end || extra !== undefined) {
      return { error: `"${piece.trim()}" is not a range like 09:00-12:00` }
    }
    if (minutes(end) <= minutes(start)) return { error: `${start}-${end} ends before it starts` }
    windows.push([start, end])
  }
  windows.sort((x, y) => minutes(x[0]) - minutes(y[0]))
  for (let i = 1; i < windows.length; i++) {
    if (minutes(windows[i][0]) < minutes(windows[i - 1][1])) {
      return { error: `${windows[i - 1].join('-')} and ${windows[i].join('-')} overlap` }
    }
  }
  return { windows }
}

export function formatDayLine(windows: Window[] | undefined): string {
  return (windows ?? []).map(([a, b]) => `${a}-${b}`).join(', ')
}

/**
 * Whatever is in the database, narrowed to well-formed windows. A row edited
 * by hand into something unreadable gives that day no hours rather than an
 * exception on the public booking page.
 */
export function readWeeklyHours(value: unknown): WeeklyHours {
  const out: WeeklyHours = {}
  if (!value || typeof value !== 'object') return out
  for (const key of WEEKDAY_KEYS) {
    const day = (value as Record<string, unknown>)[key]
    if (!Array.isArray(day)) continue
    const windows = day.filter(
      (w): w is Window =>
        Array.isArray(w) && w.length === 2 && HHMM.test(String(w[0])) && HHMM.test(String(w[1])) && minutes(w[1]) > minutes(w[0])
    )
    if (windows.length) out[key] = windows
  }
  return out
}

/** The panel's seven lines back into stored hours, or the first line that is wrong. */
export function parseWeeklyHours(lines: unknown): { hours: WeeklyHours } | { error: string } {
  if (!lines || typeof lines !== 'object') return { error: 'Weekly hours are missing.' }
  const hours: WeeklyHours = {}
  for (const key of WEEKDAY_KEYS) {
    const line = (lines as Record<string, unknown>)[key]
    const parsed = parseDayLine(typeof line === 'string' ? line : '')
    if ('error' in parsed) return { error: `${WEEKDAY_NAMES[Number(key)]}: ${parsed.error}` }
    if (parsed.windows.length) hours[key] = parsed.windows
  }
  return { hours }
}

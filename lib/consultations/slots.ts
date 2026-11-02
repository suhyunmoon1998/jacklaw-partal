/**
 * Which times the booking page offers, and who would take each one.
 *
 * Pure: hosts, what is already on their calendars, and the moment it is now go
 * in; times come out. Everything that talks to Google or the database is in
 * lib/consultations/availability.ts, so this can be checked across a daylight
 * saving change or a double booking without either.
 */

import {
  BUFFER_MINUTES,
  DURATION_MINUTES,
  HORIZON_DAYS,
  MIN_NOTICE_HOURS,
  OFFICE_TIME_ZONE,
  SLOT_STEP_MINUTES,
} from './config'
import { WeeklyHours } from './hours'
import { addDays, weekdayOf, zonedDate, zonedToUtc } from './time'

export interface Interval {
  start: Date
  end: Date
}

export interface HostAvailability {
  id: string
  hours: WeeklyHours
  /** Calendar busy blocks and portal bookings, merged. */
  busy: Interval[]
  /** Bookings already given in the window, for sharing the load. */
  load: number
}

export interface SlotRules {
  timeZone: string
  durationMinutes: number
  stepMinutes: number
  bufferMinutes: number
  minNoticeHours: number
  horizonDays: number
}

export const DEFAULT_RULES: SlotRules = {
  timeZone: OFFICE_TIME_ZONE,
  durationMinutes: DURATION_MINUTES,
  stepMinutes: SLOT_STEP_MINUTES,
  bufferMinutes: BUFFER_MINUTES,
  minNoticeHours: MIN_NOTICE_HOURS,
  horizonDays: HORIZON_DAYS,
}

export interface DaySlots {
  /** Pacific calendar date, YYYY-MM-DD. */
  date: string
  /** Start instants, ISO, earliest first. */
  slots: string[]
}

const MINUTE = 60_000

/** True when [start, end) comes within `pad` minutes of any busy block. */
export function clashes(start: Date, end: Date, busy: Interval[], padMinutes: number): boolean {
  const pad = padMinutes * MINUTE
  return busy.some(b => b.start.getTime() < end.getTime() + pad && b.end.getTime() + pad > start.getTime())
}

/** The first and last Pacific dates the page reaches from `now`. */
export function horizon(now: Date, rules: SlotRules = DEFAULT_RULES): { from: string; to: string } {
  const from = zonedDate(now, rules.timeZone)
  return { from, to: addDays(from, rules.horizonDays - 1) }
}

/** Every start time one host's hours allow on one date, before anything is taken away. */
function hostStarts(host: HostAvailability, date: string, rules: SlotRules): Date[] {
  const windows = host.hours[String(weekdayOf(date)) as keyof WeeklyHours] ?? []
  const out: Date[] = []
  for (const [open, close] of windows) {
    const opens = zonedToUtc(date, open, rules.timeZone).getTime()
    const closes = zonedToUtc(date, close, rules.timeZone).getTime()
    for (let t = opens; t + rules.durationMinutes * MINUTE <= closes; t += rules.stepMinutes * MINUTE) {
      out.push(new Date(t))
    }
  }
  return out
}

/** The hosts free at `start`, the one with the fewest bookings first. */
export function freeHostsAt(
  start: Date,
  hosts: HostAvailability[],
  now: Date,
  rules: SlotRules = DEFAULT_RULES
): string[] {
  const end = new Date(start.getTime() + rules.durationMinutes * MINUTE)
  if (start.getTime() < now.getTime() + rules.minNoticeHours * 60 * MINUTE) return []
  const { from, to } = horizon(now, rules)
  const date = zonedDate(start, rules.timeZone)
  if (date < from || date > to) return []

  return hosts
    .filter(h => hostStarts(h, date, rules).some(s => s.getTime() === start.getTime()))
    .filter(h => !clashes(start, end, h.busy, rules.bufferMinutes))
    .sort((a, b) => a.load - b.load || a.id.localeCompare(b.id))
    .map(h => h.id)
}

/**
 * Every date in the horizon with the times at least one host can take.
 * Dates with none are kept, empty, so the page can show them as closed.
 */
export function openSlots(hosts: HostAvailability[], now: Date, rules: SlotRules = DEFAULT_RULES): DaySlots[] {
  const { from } = horizon(now, rules)
  const earliest = now.getTime() + rules.minNoticeHours * 60 * MINUTE
  const days: DaySlots[] = []

  for (let i = 0; i < rules.horizonDays; i++) {
    const date = addDays(from, i)
    const starts = new Set<number>()
    for (const host of hosts) {
      for (const start of hostStarts(host, date, rules)) {
        if (start.getTime() < earliest) continue
        const end = new Date(start.getTime() + rules.durationMinutes * MINUTE)
        if (!clashes(start, end, host.busy, rules.bufferMinutes)) starts.add(start.getTime())
      }
    }
    days.push({
      date,
      slots: Array.from(starts)
        .sort((a, b) => a - b)
        .map(t => new Date(t).toISOString()),
    })
  }
  return days
}

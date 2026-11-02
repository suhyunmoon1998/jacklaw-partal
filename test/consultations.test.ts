/**
 * Consultation booking: which times are offered, who takes them, and what the
 * conflict check flags.
 *
 * Everything here is the pure half (lib/consultations/{time,hours,slots,
 * conflicts,request,emails,manageLink}). Google and the database are not
 * involved, which is what lets a daylight-saving change and a double booking
 * be checked in a millisecond.
 *
 * The things worth being careful about: a 9am slot is 9am Pacific on both
 * sides of the clock change; nothing within the buffer of a calendar block is
 * offered; and a bare surname never lights up a conflict.
 */

import { describe, expect, it } from 'vitest'
import { addDays, weekdayOf, zonedDate, zonedToUtc } from '@/lib/consultations/time'
import { parseDayLine, parseWeeklyHours, readWeeklyHours } from '@/lib/consultations/hours'
import { DEFAULT_RULES, HostAvailability, freeHostsAt, openSlots } from '@/lib/consultations/slots'
import { findConflicts, nameTokens, needsReview, sameName, splitNames, PartyOnFile } from '@/lib/consultations/conflicts'
import { readBookingRequest } from '@/lib/consultations/request'
import { consultationIcs, clientEmailHtml, clientEmailSubject, formatWhen, BookingForEmail } from '@/lib/consultations/emails'
import { manageToken, validManageToken } from '@/lib/consultations/manageLink'

const LA = 'America/Los_Angeles'
const AT = (iso: string) => new Date(iso)

describe('Pacific wall-clock time', () => {
  it('reads 9am as 16:00Z in daylight time and 17:00Z in standard time', () => {
    expect(zonedToUtc('2026-10-30', '09:00', LA).toISOString()).toBe('2026-10-30T16:00:00.000Z')
    // 2026-11-01 is the autumn change; the Monday after is standard time.
    expect(zonedToUtc('2026-11-02', '09:00', LA).toISOString()).toBe('2026-11-02T17:00:00.000Z')
    expect(zonedToUtc('2027-03-15', '09:00', LA).toISOString()).toBe('2027-03-15T16:00:00.000Z')
  })

  it('gives the Pacific date, not the UTC one', () => {
    // 5pm on the 3rd in Los Angeles is already the 4th in UTC.
    expect(zonedDate(AT('2026-11-04T01:00:00Z'), LA)).toBe('2026-11-03')
  })

  it('counts days and weekdays on plain dates', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(weekdayOf('2026-11-01')).toBe(0)
    expect(weekdayOf('2026-11-06')).toBe(5)
  })
})

describe('weekly hours', () => {
  it('reads what staff type, tidies it, and sorts it', () => {
    expect(parseDayLine(' 13:00-17:00, 9:00-12:00 ')).toEqual({ windows: [['09:00', '12:00'], ['13:00', '17:00']] })
    expect(parseDayLine('')).toEqual({ windows: [] })
  })

  it('refuses a typo rather than guessing', () => {
    expect(parseDayLine('9-12')).toHaveProperty('error')
    expect(parseDayLine('12:00-09:00')).toHaveProperty('error')
    expect(parseDayLine('09:00-12:00, 11:00-13:00')).toHaveProperty('error')
    expect(parseWeeklyHours({ '1': '09:00-25:00' })).toEqual({ error: expect.stringContaining('Monday') })
  })

  it('drops whatever in the database is unreadable instead of throwing on the public page', () => {
    expect(readWeeklyHours({ '1': [['09:00', '12:00'], ['x', 'y']], '2': 'nonsense' })).toEqual({ '1': [['09:00', '12:00']] })
    expect(readWeeklyHours(null)).toEqual({})
  })
})

const MON_9_TO_11 = { '1': [['09:00', '11:00']] as [string, string][] }

const host = (over: Partial<HostAvailability> = {}): HostAvailability => ({
  id: 'a',
  hours: MON_9_TO_11,
  busy: [],
  load: 0,
  ...over,
})

/** Friday 2026-10-30, 8am Pacific. The next Monday is 2026-11-02, in standard time. */
const FRIDAY_MORNING = AT('2026-10-30T15:00:00Z')

const mondayTimes = (hosts: HostAvailability[], now = FRIDAY_MORNING) =>
  openSlots(hosts, now).find(d => d.date === '2026-11-02')!.slots

describe('the times offered', () => {
  it('offers every half hour a 30-minute consultation fits in the hours', () => {
    expect(mondayTimes([host()])).toEqual([
      '2026-11-02T17:00:00.000Z',
      '2026-11-02T17:30:00.000Z',
      '2026-11-02T18:00:00.000Z',
      '2026-11-02T18:30:00.000Z',
    ])
  })

  it('keeps the buffer clear around a calendar block', () => {
    // A 9:30–10:00 court call. With 15 minutes either side, 9:00 and 10:00 go too.
    const busy = [{ start: AT('2026-11-02T17:30:00Z'), end: AT('2026-11-02T18:00:00Z') }]
    expect(mondayTimes([host({ busy })])).toEqual(['2026-11-02T18:30:00.000Z'])
  })

  it('offers a time when any one host has it', () => {
    const busy = [{ start: AT('2026-11-02T17:00:00Z'), end: AT('2026-11-02T19:00:00Z') }]
    expect(mondayTimes([host({ busy }), host({ id: 'b' })])).toHaveLength(4)
  })

  it('offers nothing inside the notice period', () => {
    // Monday 8am: the 9:00 and 9:30 slots are under 12 hours away.
    const mondayMorning = AT('2026-11-02T16:00:00Z')
    expect(openSlots([host()], mondayMorning)[0].slots).toEqual([])
  })

  it('keeps every date in the horizon, empty ones too', () => {
    const days = openSlots([host()], FRIDAY_MORNING)
    expect(days).toHaveLength(DEFAULT_RULES.horizonDays)
    expect(days[0].date).toBe('2026-10-30')
    expect(days.find(d => d.date === '2026-11-03')!.slots).toEqual([])
  })

  it('gives a time to the free host with the fewest bookings', () => {
    const start = AT('2026-11-02T17:00:00Z')
    expect(freeHostsAt(start, [host({ id: 'a', load: 3 }), host({ id: 'b', load: 1 })], FRIDAY_MORNING)).toEqual(['b', 'a'])
    const busy = [{ start, end: AT('2026-11-02T17:30:00Z') }]
    expect(freeHostsAt(start, [host({ id: 'a' }), host({ id: 'b', busy })], FRIDAY_MORNING)).toEqual(['a'])
  })

  it('refuses a start that is off the grid or outside the hours', () => {
    expect(freeHostsAt(AT('2026-11-02T17:10:00Z'), [host()], FRIDAY_MORNING)).toEqual([])
    expect(freeHostsAt(AT('2026-11-02T19:00:00Z'), [host()], FRIDAY_MORNING)).toEqual([])
  })
})

describe('matching names for the conflict check', () => {
  it('matches the same name in any order, and a company with or without its suffix', () => {
    expect(sameName('Dayeon Kim', 'kim dayeon')).toBe(true)
    expect(sameName('ABC Logistics, Inc.', 'abc logistics')).toBe(true)
    expect(sameName('ABC Logistics', 'ABC Logistics West LLC')).toBe(true)
    expect(sameName('José Pérez', 'Jose Perez')).toBe(true)
    expect(sameName('김다연', '김다연')).toBe(true)
  })

  it('never matches on a bare surname or a short word', () => {
    expect(sameName('Kim', 'Kim')).toBe(false)
    expect(sameName('Kim', 'Dayeon Kim')).toBe(false)
    expect(sameName('Lee', 'Mary Lee')).toBe(false)
    expect(sameName('Walmart', 'Walmart Inc.')).toBe(true)
    expect(sameName('The Company LLC', 'Inc.')).toBe(false)
  })

  it('splits a list of people and leaves out what they were', () => {
    expect(splitNames('John Park (supervisor), Mary Lee from HR; Tom and Jerry Cho')).toEqual([
      'John Park',
      'Mary Lee from HR',
      'Tom',
      'Jerry Cho',
    ])
    expect(nameTokens('L.L.C.')).toEqual([])
  })
})

describe('the conflict check', () => {
  const onFile: PartyOnFile[] = [
    { source: 'client', recordId: 'c1', recordLabel: 'Maria Lopez', role: 'client', name: 'Maria Lopez', phone: '2135551234' },
    { source: 'client', recordId: 'c1', recordLabel: 'Maria Lopez', role: 'employer', name: 'Sunrise Foods, Inc.' },
    { source: 'client', recordId: 'c1', recordLabel: 'Maria Lopez', role: 'supervisor', name: 'Daniel Cho' },
    { source: 'consultation', recordId: 'k9', recordLabel: 'Henry Park', role: 'prospect', name: 'Henry Park', phone: '3105550000' },
  ]
  const booking = (over = {}) => ({ name: 'Ana Ruiz', phone: '6265550101', adverseParty: 'Acme Corp', otherParties: '', ...over })

  it('finds nothing when no name is on file', () => {
    expect(findConflicts(booking(), onFile)).toEqual([])
  })

  it('flags someone who wants to act against a client', () => {
    const hits = findConflicts(booking({ adverseParty: 'Maria Lopez' }), onFile)
    expect(hits.map(h => h.kind)).toEqual(['adverse-is-client'])
    expect(needsReview(hits)).toBe(true)
  })

  it('flags someone named as an adverse party in another file', () => {
    const hits = findConflicts(booking({ name: 'Daniel Cho' }), onFile)
    expect(hits[0]).toMatchObject({ kind: 'prospect-is-adverse', role: 'supervisor', recordLabel: 'Maria Lopez' })
  })

  it('counts an earlier consultation as much as a client (rule 1.18)', () => {
    const hits = findConflicts(booking({ otherParties: 'Henry Park (manager)' }), onFile)
    expect(hits[0]).toMatchObject({ kind: 'adverse-is-client', source: 'consultation', recordId: 'k9' })
  })

  it('notes a returning client and a shared employer without asking for review', () => {
    const hits = findConflicts(booking({ phone: '(213) 555-1234', adverseParty: 'sunrise foods' }), onFile)
    expect(hits.map(h => h.kind).sort()).toEqual(['returning', 'same-adverse'])
    expect(needsReview(hits)).toBe(false)
  })
})

describe('the booking form', () => {
  const good = {
    start: '2026-11-02T17:00:00.000Z',
    name: '  Ana   Ruiz ',
    email: ' Ana@Example.COM ',
    phone: '+1 (626) 555-0101',
    adverseParty: 'Acme  Corp',
    otherParties: 'Bob',
    summary: 'They did not pay overtime.',
    ack: true,
    lang: 'es',
  }

  it('stores what it reads normalised', () => {
    const read = readBookingRequest(good)
    expect(read).toEqual({
      request: {
        start: AT('2026-11-02T17:00:00.000Z'),
        name: 'Ana Ruiz',
        email: 'ana@example.com',
        phone: '6265550101',
        lang: 'es',
        adverseParty: 'Acme Corp',
        otherParties: 'Bob',
        summary: 'They did not pay overtime.',
      },
    })
  })

  it('names the field that is wrong', () => {
    expect(readBookingRequest({ ...good, start: 'soon' })).toEqual({ field: 'start' })
    expect(readBookingRequest({ ...good, email: 'ana@' })).toEqual({ field: 'email' })
    expect(readBookingRequest({ ...good, phone: '555-0101' })).toEqual({ field: 'phone' })
    expect(readBookingRequest({ ...good, adverseParty: ' ' })).toEqual({ field: 'adverse' })
    expect(readBookingRequest({ ...good, ack: 'yes' })).toEqual({ field: 'ack' })
  })

  it('quietly drops what filled the hidden field', () => {
    expect(readBookingRequest({ ...good, website: 'http://spam.example' })).toEqual({ bot: true })
  })
})

const BOOKING: BookingForEmail = {
  id: '6f1c2a9e-0000-4000-8000-000000000001',
  name: '김다연',
  email: 'dayeon@example.com',
  phone: '2135550000',
  lang: 'ko',
  start: AT('2026-11-02T17:00:00Z'),
  end: AT('2026-11-02T17:30:00Z'),
  meetUrl: 'https://meet.google.com/abc-defg-hij',
  manageUrl: 'https://portal.example/book/manage?b=x&t=y&lang=ko',
  hostName: 'Jack',
  adverseParty: 'Acme',
  otherParties: '',
  summary: '',
  conflicts: [],
}

describe('the emails', () => {
  it('states the time in Pacific, in the client’s language', () => {
    expect(formatWhen(BOOKING.start, 'en')).toBe('Monday, November 2, 2026 at 9:00 AM (Pacific Time)')
    expect(formatWhen(BOOKING.start, 'ko')).toContain('태평양 시간')
    expect(clientEmailSubject('booked', BOOKING)).toContain('상담 예약이 완료되었습니다')
  })

  it('carries the Meet link and the manage link when booked, and only a new-time link when cancelled', () => {
    const booked = clientEmailHtml('booked', BOOKING, 'https://portal.example/book')
    expect(booked).toContain(BOOKING.meetUrl)
    expect(booked).toContain(BOOKING.manageUrl.replace(/&/g, '&amp;'))
    const cancelled = clientEmailHtml('cancelled-by-office', BOOKING, 'https://portal.example/book')
    expect(cancelled).not.toContain(BOOKING.meetUrl)
    expect(cancelled).toContain('https://portal.example/book')
  })

  it('escapes what the client typed', () => {
    const html = clientEmailHtml('booked', { ...BOOKING, name: '<script>x</script>' }, '')
    expect(html).not.toContain('<script>x</script>')
  })

  it('writes a calendar file with the right instants and lines no longer than 75 octets', () => {
    const ics = consultationIcs(BOOKING, AT('2026-11-01T00:00:00Z'))
    expect(ics).toContain('DTSTART:20261102T170000Z')
    expect(ics).toContain('DTEND:20261102T173000Z')
    const encoder = new TextEncoder()
    for (const line of ics.split('\r\n')) expect(encoder.encode(line).length).toBeLessThanOrEqual(75)
  })
})

describe('the manage link', () => {
  it('accepts its own token and nothing else', () => {
    const token = manageToken('b1', 'secret')
    expect(validManageToken('b1', token, 'secret')).toBe(true)
    expect(validManageToken('b2', token, 'secret')).toBe(false)
    expect(validManageToken('b1', token, 'rotated')).toBe(false)
    expect(validManageToken('b1', undefined, 'secret')).toBe(false)
  })
})

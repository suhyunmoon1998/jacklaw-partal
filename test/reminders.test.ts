/**
 * The reminder ladder.
 *
 * Day 2, day 5, day 7, then a call. Everything about who is due is decided in
 * lib/reminderSchedule.ts with the day passed in, which is what lets a week of
 * chasing be tested in a millisecond and without a Twilio account.
 *
 * The thing worth being careful about is not "does it send" — it is "does it
 * ever send twice", and "does it ever chase somebody who finished, has no
 * number, or asked us to stop". Those are the tests.
 */

import { invitationSms } from '@/lib/assignmentInvite'
import { describe, expect, it } from 'vitest'
import {
  LADDER,
  ReminderKind,
  ReminderTarget,
  SentStep,
  daysBetween,
  dueFor,
  isSendingTime,
  planReminders,
  resolveLang,
} from '@/lib/reminderSchedule'
import { CALL_VOICE, IMAGE_FOR, firstName, reminderBody } from '@/lib/reminderMessages'
import { toE164 } from '@/lib/twilio'
import { LANGUAGES } from '@/lib/langs'

const AT = (iso: string) => new Date(iso)
/** A Wednesday, 10am in Los Angeles. */
const MORNING = AT('2026-09-16T17:30:00Z')

const someone = (over: Partial<ReminderTarget> = {}): ReminderTarget => ({
  clientId: 'c1',
  name: 'Maria Lopez',
  phone: '2135551234',
  lang: 'en',
  optedOut: false,
  ...over,
})

const sent = (over: Partial<SentStep> = {}): SentStep => ({
  clientId: 'c1',
  chasing: 'module1',
  sentAt: '2026-09-09T18:00:00Z',
  submitted: false,
  ...over,
})

function plan(opts: {
  steps?: SentStep[]
  target?: Partial<ReminderTarget>
  already?: ReminderKind[]
  now?: Date
}) {
  const alreadySent = new Map([
    ['c1', new Map([['module1', new Set<ReminderKind>(opts.already ?? [])]])],
  ])
  return planReminders({
    steps: opts.steps ?? [sent()],
    targets: new Map([['c1', someone(opts.target)]]),
    alreadySent,
    now: opts.now ?? MORNING,
  })
}

describe('the ladder', () => {
  it('climbs on days 2 and 5, then calls on day 10', () => {
    expect(LADDER.map(r => [r.kind, r.afterDays, r.channel])).toEqual([
      ['day2', 2, 'sms'],
      ['day5', 5, 'sms'],
      ['call', 10, 'call'],
    ])
  })

  it('has no third text — two go unread, and the next thing is a voice', () => {
    expect(LADDER.filter(r => r.channel === 'sms')).toHaveLength(2)
    expect(LADDER.some(r => r.afterDays === 7)).toBe(false)
  })

  it('sends nothing before the second day', () => {
    for (const days of [0, 1]) expect(dueFor(days, new Set())).toBeNull()
  })

  it('takes the highest rung reached, not the lowest', () => {
    // Somebody sent eleven days ago and never chased gets a call, not three
    // texts in one morning.
    expect(dueFor(11, new Set())).toBe('call')
    expect(dueFor(6, new Set())).toBe('day5')
  })

  it('never repeats a rung it has already sent', () => {
    expect(dueFor(2, new Set<ReminderKind>(['day2']))).toBeNull()
    expect(dueFor(5, new Set<ReminderKind>(['day5']))).toBe('day2')
    expect(dueFor(12, new Set<ReminderKind>(['day2', 'day5', 'call']))).toBeNull()
  })

  it('walks one client from silence to a phone call', () => {
    const seen: (ReminderKind | null)[] = []
    const already = new Set<ReminderKind>()
    for (let day = 0; day <= 12; day++) {
      const k = dueFor(day, already)
      if (k) already.add(k)
      seen.push(k)
    }
    expect(seen).toEqual([
      null, null, 'day2', null, null, 'day5', null, null, null, null, 'call', null, null,
    ])
  })
})

describe('who gets chased', () => {
  it('chases a client who was sent something and has not submitted', () => {
    const { due } = plan({ now: AT('2026-09-16T17:30:00Z') })
    expect(due).toHaveLength(1)
    // Seven days out, and the last text goes on day 5, so day 5 is what is owed.
    expect(due[0]).toMatchObject({ kind: 'day5', channel: 'sms', clientId: 'c1' })
  })

  it('leaves a client who submitted alone', () => {
    const { due, skipped } = plan({ steps: [sent({ submitted: true })] })
    expect(due).toEqual([])
    expect(skipped[0].reason).toBe('submitted')
  })

  it('leaves a client who replied STOP alone, including the call', () => {
    const late = AT('2026-09-25T17:30:00Z')
    const { due, skipped } = plan({ target: { optedOut: true }, now: late })
    expect(due).toEqual([])
    expect(skipped[0]).toMatchObject({ reason: 'opted out', kind: 'call' })
  })

  it('reports a client with no usable number instead of failing silently', () => {
    for (const phone of ['', '555', 'not a number']) {
      const { due, skipped } = plan({ target: { phone } })
      expect(due).toEqual([])
      expect(skipped[0].reason).toBe('no phone')
    }
  })

  it('gives every step its own rung, counted from its own send date', () => {
    // Two different people, so the one-a-day rule below is not what is being
    // measured here: module 2 went out later, so it is earlier on the ladder.
    const steps: SentStep[] = [
      { clientId: 'c1', chasing: 'module1', sentAt: '2026-09-09T18:00:00Z', submitted: false },
      { clientId: 'c2', chasing: 'module2', sentAt: '2026-09-14T18:00:00Z', submitted: false },
    ]
    const { due } = planReminders({
      steps,
      targets: new Map([
        ['c1', someone()],
        ['c2', someone({ clientId: 'c2', phone: '2135559999' })],
      ]),
      alreadySent: new Map(),
      now: MORNING,
    })
    expect(due.map(d => [d.chasing, d.kind])).toEqual([
      ['module1', 'day5'],
      ['module2', 'day2'],
    ])
  })

  /**
   * One person suing two employers is two rows sharing a number, and both can
   * be waiting. Two identical texts a minute apart, from a law office, about
   * two cases the message cannot tell apart, is the worst version of this
   * feature working.
   */
  it('texts a person once a morning even when two of their cases are due', () => {
    const steps: SentStep[] = [
      { clientId: 'a', chasing: 'module1', sentAt: '2026-09-09T18:00:00Z', submitted: false },
      { clientId: 'b', chasing: 'module1', sentAt: '2026-09-14T18:00:00Z', submitted: false },
    ]
    const sharedNumber = '4243332514'
    const { due, skipped } = planReminders({
      steps,
      targets: new Map([
        ['a', someone({ clientId: 'a', phone: sharedNumber, name: 'Aaron Oh' })],
        ['b', someone({ clientId: 'b', phone: sharedNumber, name: 'Aaron Oh' })],
      ]),
      alreadySent: new Map(),
      now: MORNING,
    })

    expect(due).toHaveLength(1)
    // The one further along the ladder is the one that goes.
    expect(due[0]).toMatchObject({ clientId: 'a', kind: 'day5' })
    expect(skipped.find(s => s.clientId === 'b')?.reason).toBe('one a day')
  })

  it('leaves the held-back case to come due again tomorrow', () => {
    // Nothing was recorded against it, so the next run offers it afresh.
    const steps: SentStep[] = [
      { clientId: 'b', chasing: 'module1', sentAt: '2026-09-14T18:00:00Z', submitted: false },
    ]
    const { due } = planReminders({
      steps,
      targets: new Map([['b', someone({ clientId: 'b' })]]),
      alreadySent: new Map(),
      now: MORNING,
    })
    expect(due[0]).toMatchObject({ clientId: 'b', kind: 'day2' })
  })

  it('counts the days from the send, on the calendar', () => {
    expect(daysBetween('2026-09-09T23:00:00Z', AT('2026-09-11T01:00:00Z'))).toBe(2)
    expect(daysBetween('2026-09-09T00:00:00Z', AT('2026-09-09T23:59:00Z'))).toBe(0)
  })
})

describe('when it is allowed to send', () => {
  it('sends on a weekday morning in Los Angeles', () => {
    expect(isSendingTime(AT('2026-09-16T17:30:00Z'))).toBe(true) // Wed 10:30am PDT
  })

  it('stays quiet at night and at dawn', () => {
    expect(isSendingTime(AT('2026-09-16T05:00:00Z'))).toBe(false) // Tue 10pm
    expect(isSendingTime(AT('2026-09-16T13:00:00Z'))).toBe(false) // Wed 6am
  })

  it('stays quiet at the weekend', () => {
    expect(isSendingTime(AT('2026-09-19T17:30:00Z'))).toBe(false) // Sat
    expect(isSendingTime(AT('2026-09-20T17:30:00Z'))).toBe(false) // Sun
  })

  it('nobody is lost by a quiet day — the rung is still owed on Monday', () => {
    const steps = [sent({ sentAt: '2026-09-12T18:00:00Z' })]
    const saturday = AT('2026-09-19T17:30:00Z') // day 7
    const monday = AT('2026-09-21T17:30:00Z') // day 9, and day 5 is still unsent
    expect(isSendingTime(saturday)).toBe(false)
    expect(plan({ steps, now: monday }).due[0]).toMatchObject({ kind: 'day5' })
  })
})

describe('what it says', () => {
  it('writes every rung in every language, naming the firm and the way out', () => {
    for (const { code } of LANGUAGES) {
      for (const kind of ['day2', 'day5'] as const) {
        const body = reminderBody(kind, code, { name: 'Maria Lopez', link: 'https://x.test/client' })
        expect(body, `${code}/${kind}`).toContain('866 JACK LAW')
        expect(body, `${code}/${kind}`).toContain('https://x.test/client')
        expect(body, `${code}/${kind} must offer an opt-out`).toMatch(/STOP/)
        expect(body).not.toContain('{name}')
        expect(body).not.toContain('{link}')
      }
      // Nobody writes down a URL off a voicemail, so the call carries none.
      const call = reminderBody('call', code, { name: 'Maria Lopez', link: 'https://x.test/client' })
      expect(call, `${code}/call`).not.toContain('https://')
      expect(CALL_VOICE[code].language.length).toBeGreaterThan(0)
    }
  })

  /**
   * The mascot rides on the first nudge only. Beside "this is our last text"
   * it would undercut the one message that has to land as serious — and it
   * turns every message it touches into a costlier MMS.
   */
  it('puts the picture on the first text and nowhere else', () => {
    expect(IMAGE_FOR.day2).toBeTruthy()
    expect(IMAGE_FOR.day5).toBeUndefined()
    expect(IMAGE_FOR.call).toBeUndefined()
  })

  it('keeps the picture as a path, so it cannot point at localhost in production', () => {
    for (const path of Object.values(IMAGE_FOR)) {
      expect(path).toMatch(/^\//)
      expect(path).not.toMatch(/^https?:/)
    }
  })

  it('uses a first name, because the full one reads as a summons', () => {
    expect(firstName('Maria Lopez')).toBe('Maria')
    expect(firstName('  ')).toBe('there')
    expect(reminderBody('day2', 'en', { name: 'Maria Lopez', link: 'l' })).toContain('Hi Maria,')
  })
})

describe('what language to write in', () => {
  it('uses what the client picked in the portal, above everything', () => {
    expect(resolveLang('ko', 'es')).toBe('ko')
    expect(resolveLang('zh', null)).toBe('zh')
  })

  it('falls back to the language they filled the questionnaire in', () => {
    // Somebody who answered in Korean should not be chased in English.
    expect(resolveLang(null, 'ko')).toBe('ko')
    expect(resolveLang('', 'es')).toBe('es')
  })

  it('falls back to English when neither is known', () => {
    for (const picked of [null, undefined, '', 'klingon', 42]) {
      expect(resolveLang(picked, null), String(picked)).toBe('en')
    }
  })

  it('ignores a stored language that is not one we write', () => {
    expect(resolveLang('fr', null)).toBe('en')
    expect(resolveLang('fr', 'ko')).toBe('ko')
  })
})

describe('phone numbers as Twilio wants them', () => {
  it('reads the ways an American number gets typed', () => {
    for (const raw of ['2135551234', '(213) 555-1234', '1-213-555-1234', '+1 213 555 1234']) {
      expect(toE164(raw), raw).toBe('+12135551234')
    }
  })

  it('refuses what cannot be dialled rather than guessing', () => {
    for (const raw of ['', '555', '12345', 'abc']) expect(toE164(raw), raw).toBeNull()
  })
})

describe('chasing a round of follow-up questions', () => {
  const who = new Map([
    ['c1', { clientId: 'c1', name: 'Dayeon Kim', phone: '+12135774446', lang: 'ko' as const, optedOut: false }],
  ])

  it('walks the same ladder a module does', () => {
    // The round was sent once and then nothing chased it, which is the exact
    // problem the ladder exists to solve.
    const round = 'assignment:abc-123' as const
    for (const [days, expected] of [[2, 'day2'], [5, 'day5'], [10, 'call']] as const) {
      const { due } = planReminders({
        steps: [{ clientId: 'c1', chasing: round, sentAt: '2026-09-01T17:00:00Z', submitted: false }],
        targets: who,
        alreadySent: new Map(),
        now: new Date(`2026-09-${String(1 + days).padStart(2, '0')}T17:00:00Z`),
      })
      expect(due[0]?.kind, `day ${days}`).toBe(expected)
      expect(due[0]?.chasing).toBe(round)
    }
  })

  it('stops once she has answered the last question', () => {
    const { due, skipped } = planReminders({
      steps: [{ clientId: 'c1', chasing: 'assignment:abc-123', sentAt: '2026-09-01T17:00:00Z', submitted: true }],
      targets: who,
      alreadySent: new Map(),
      now: new Date('2026-09-20T17:00:00Z'),
    })
    expect(due).toEqual([])
    expect(skipped[0].reason).toBe('submitted')
  })

  it('does not let a module rung stand in for a round’s', () => {
    // Both are keyed on the client; if they shared a key, finishing module 1
    // would silently exhaust the follow-up ladder.
    const { due } = planReminders({
      steps: [{ clientId: 'c1', chasing: 'assignment:abc-123', sentAt: '2026-09-01T17:00:00Z', submitted: false }],
      targets: who,
      alreadySent: new Map([['c1', new Map([['module1', new Set<ReminderKind>(['day2', 'day5', 'call'])]])]]),
      now: new Date('2026-09-12T17:00:00Z'),
    })
    expect(due[0]?.kind).toBe('call')
  })

  it('still sends one message a person a morning', () => {
    // A client waiting on a module AND on a round is one phone number.
    const { due, skipped } = planReminders({
      steps: [
        { clientId: 'c1', chasing: 'module1', sentAt: '2026-09-01T17:00:00Z', submitted: false },
        { clientId: 'c1', chasing: 'assignment:abc-123', sentAt: '2026-09-09T17:00:00Z', submitted: false },
      ],
      targets: who,
      alreadySent: new Map(),
      now: new Date('2026-09-12T17:00:00Z'),
    })
    expect(due).toHaveLength(1)
    expect(due[0].chasing).toBe('module1') // the higher rung: day 11 vs day 3
    expect(skipped.some(s => s.reason === 'one a day')).toBe(true)
  })
})

describe('what a follow-up round actually says', () => {
  it('does not tell somebody who finished that their questionnaire is waiting', () => {
    const asked = reminderBody('day2', 'ko', { name: 'DAYEON KIM', link: 'x', subject: 'follow-up' })
    expect(asked).toContain('답변 잘 봤습니다')
    expect(asked).not.toContain('아직 남아 있습니다')
    expect(asked).toContain('STOP')
  })

  it('writes the round in every language the portal offers', () => {
    for (const lang of ['en', 'es', 'zh', 'ko'] as const) {
      for (const kind of ['day2', 'day5', 'call'] as const) {
        const said = reminderBody(kind, lang, { name: 'Ana', link: 'https://x/client', subject: 'follow-up' })
        expect(said.length, `${lang} ${kind}`).toBeGreaterThan(40)
        expect(said, `${lang} ${kind}`).toContain('866')
        if (kind !== 'call') expect(said, `${lang} ${kind}`).toContain('https://x/client')
      }
    }
  })

  it('leaves the first ask alone', () => {
    const first = reminderBody('day2', 'ko', { name: 'DAYEON KIM', link: 'x' })
    expect(first).toContain('설문이 아직 남아 있습니다')
  })
})

describe('the text that invites a client to a question set', () => {
  it('sends the front door, not a link that opens the case file', () => {
    // Sign-in is by phone. A phone is lent and screens are read over
    // shoulders, so a text must not carry a key to somebody's case.
    const said = invitationSms('ko', 'DAYEON KIM', 'https://jacklaw-portal.vercel.app/')
    expect(said).toContain('https://jacklaw-portal.vercel.app/client')
    expect(said).not.toMatch(/questionnaire\/[0-9a-f-]{8}/)
    expect(said).toContain('DAYEON')
    expect(said).toContain('STOP')
  })

  it('uses the first name only, because a full legal name reads as a summons', () => {
    expect(invitationSms('en', 'Dayeon Kim', 'https://x')).toContain('Hi Dayeon,')
  })

  it('writes it in every language', () => {
    for (const lang of ['en', 'es', 'zh', 'ko'] as const) {
      expect(invitationSms(lang, 'Ana', 'https://x').length, lang).toBeGreaterThan(40)
    }
  })
})

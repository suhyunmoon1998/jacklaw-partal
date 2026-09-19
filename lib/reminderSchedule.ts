/**
 * Who is owed a reminder today.
 *
 * The office sends a step and then waits. Nothing chased it, so a client who
 * means to finish and forgets was only found when somebody happened to scroll
 * the list. The ladder is: a text on day 2, day 5 and day 7, and a call on day
 * 10 if none of them worked.
 *
 * This file decides only WHO and WHICH RUNG. It sends nothing, reads nothing and
 * has no clock of its own — the day is passed in — which is what lets the whole
 * schedule be tested without a Twilio account, a database, or waiting a week.
 */

import { Lang, isLang } from '@/lib/langs'
import { ModuleId } from '@/lib/modules'

/**
 * What a rung is chasing.
 *
 * A numbered module, or one question-set assignment — a generated round of
 * follow-up questions. Opaque to everything here: this file decides who is
 * owed a reminder and which rung, and does not care what the thing is. The
 * caller encodes it and the caller decodes it.
 */
export type Chasing = ModuleId | `assignment:${string}`

/** The assignment a key refers to, or null if it is a module. */
export function assignmentOf(chasing: Chasing): string | null {
  return chasing.startsWith('assignment:') ? chasing.slice('assignment:'.length) : null
}

/** The module a key refers to, or null if it is an assignment. */
export function moduleOf(chasing: Chasing): ModuleId | null {
  return chasing.startsWith('assignment:') ? null : (chasing as ModuleId)
}

export type ReminderKind = 'day2' | 'day5' | 'call'

/**
 * The rung, and how many days after the send it comes due.
 *
 * Two texts, then a voice. A third text on day 7 was dropped: somebody who has
 * ignored two is not going to read a third, and the five days of quiet before
 * the call make it land as a real follow-up rather than as more of the same.
 *
 * Rows recorded under the old day-7 rung stay in the database and stay valid —
 * they simply match nothing here, so nobody is chased for them again.
 */
export const LADDER: { kind: ReminderKind; afterDays: number; channel: 'sms' | 'call' }[] = [
  { kind: 'day2', afterDays: 2, channel: 'sms' },
  { kind: 'day5', afterDays: 5, channel: 'sms' },
  { kind: 'call', afterDays: 10, channel: 'call' },
]

export interface SentStep {
  clientId: string
  chasing: Chasing
  /** When the office sent it. The day counting starts here. */
  sentAt: string
  submitted: boolean
}

export interface ReminderTarget {
  clientId: string
  name: string
  phone: string
  lang: Lang
  optedOut: boolean
}

export interface DueReminder {
  clientId: string
  name: string
  phone: string
  lang: Lang
  chasing: Chasing
  kind: ReminderKind
  channel: 'sms' | 'call'
  /** Days between the send and the day being planned. */
  daysWaiting: number
}

/** Why a step that is otherwise due is not being acted on. */
export type SkipReason =
  | 'submitted'
  | 'already sent'
  | 'no phone'
  | 'opted out'
  | 'too soon'
  | 'unknown client'
  | 'one a day'

export interface Skipped {
  clientId: string
  chasing: Chasing
  kind: ReminderKind | null
  reason: SkipReason
}

/**
 * A law office does not text at six in the morning, or on a Sunday.
 *
 * The job runs once a day, so this is a gate rather than a queue: if today is
 * not a weekday morning nothing goes out, and tomorrow's run picks up everyone
 * who came due meanwhile — they are worked out from the send date, so none of
 * them is lost by waiting.
 */
export function isSendingTime(now: Date, timeZone = 'America/Los_Angeles'): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(now)

  const weekday = parts.find(p => p.type === 'weekday')?.value ?? ''
  const hour = Number(parts.find(p => p.type === 'hour')?.value ?? -1)

  if (weekday === 'Sat' || weekday === 'Sun') return false
  return hour >= 9 && hour < 12
}

/**
 * The language to write to one client in.
 *
 * What they picked in the portal wins, because it is the only thing they said
 * themselves. Failing that, the language they filled the questionnaire in —
 * somebody who answered in Korean should not be chased in English. Failing
 * both, English: a client who has picked nothing and answered nothing gives us
 * nothing to go on, and guessing from a name would be worse than the default.
 */
export function resolveLang(picked: unknown, inferred: Lang | null | undefined): Lang {
  if (isLang(picked)) return picked
  if (inferred && isLang(inferred)) return inferred
  return 'en'
}

/** Whole days between two instants, counted on the calendar. */
export function daysBetween(from: string | Date, to: Date): number {
  const a = new Date(from)
  if (Number.isNaN(a.getTime())) return -1
  const startOfDay = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  return Math.floor((startOfDay(to) - startOfDay(a)) / 86_400_000)
}

/**
 * The highest rung this step has reached that has not been sent yet.
 *
 * Highest, not lowest: a client who was sent something eleven days ago and has
 * had nothing gets the call, not three texts in a row on the same morning. The
 * rungs below it are recorded as sent so they never fire retroactively.
 */
export function dueFor(
  daysWaiting: number,
  alreadySent: ReadonlySet<ReminderKind>
): ReminderKind | null {
  for (let i = LADDER.length - 1; i >= 0; i--) {
    const rung = LADDER[i]
    if (daysWaiting >= rung.afterDays && !alreadySent.has(rung.kind)) return rung.kind
  }
  return null
}

export const channelOf = (kind: ReminderKind): 'sms' | 'call' =>
  LADDER.find(r => r.kind === kind)?.channel ?? 'sms'

/**
 * Everything owed today, and everything deliberately passed over.
 *
 * The skipped list is returned rather than dropped because it is what the
 * office reads to answer "why did this client not get chased?" — and because a
 * client with no phone number on file is a data problem somebody should fix,
 * not a silent no-op.
 */
export function planReminders(input: {
  steps: SentStep[]
  targets: Map<string, ReminderTarget>
  /** client_id → what is being chased → kinds already recorded. */
  alreadySent: Map<string, Map<string, Set<ReminderKind>>>
  now: Date
}): { due: DueReminder[]; skipped: Skipped[] } {
  const { steps, targets, alreadySent, now } = input
  const due: DueReminder[] = []
  const skipped: Skipped[] = []

  for (const step of steps) {
    const sentKinds =
      alreadySent.get(step.clientId)?.get(step.chasing) ?? new Set<ReminderKind>()

    if (step.submitted) {
      skipped.push({ ...ids(step), kind: null, reason: 'submitted' })
      continue
    }

    const daysWaiting = daysBetween(step.sentAt, now)
    const kind = dueFor(daysWaiting, sentKinds)
    if (!kind) {
      skipped.push({
        ...ids(step),
        kind: null,
        reason: sentKinds.size >= LADDER.length ? 'already sent' : 'too soon',
      })
      continue
    }

    const who = targets.get(step.clientId)
    if (!who) {
      skipped.push({ ...ids(step), kind, reason: 'unknown client' })
      continue
    }
    if (who.optedOut) {
      skipped.push({ ...ids(step), kind, reason: 'opted out' })
      continue
    }
    if (!who.phone || who.phone.replace(/\D/g, '').length < 10) {
      skipped.push({ ...ids(step), kind, reason: 'no phone' })
      continue
    }

    due.push({
      clientId: step.clientId,
      name: who.name,
      phone: who.phone,
      lang: who.lang,
      chasing: step.chasing,
      kind,
      channel: channelOf(kind),
      daysWaiting,
    })
  }

  return oneEach(due, skipped)
}

/**
 * One reminder per person per morning.
 *
 * A client suing two employers is two rows sharing a phone number, and both of
 * them can be waiting on a questionnaire — so without this they get the same
 * text twice in the same minute, from a law office, about two cases they cannot
 * tell apart from the message. The most urgent one goes: the higher rung first,
 * and the longer wait to break a tie.
 *
 * The one left behind is not lost. Nothing was recorded against it, so it comes
 * due again tomorrow — which is also a kinder way to chase somebody than two
 * messages at once.
 */
function oneEach(due: DueReminder[], skipped: Skipped[]): { due: DueReminder[]; skipped: Skipped[] } {
  const rank = (k: ReminderKind) => LADDER.findIndex(r => r.kind === k)
  const best = new Map<string, DueReminder>()
  const held: DueReminder[] = []

  for (const item of due) {
    const key = item.phone.replace(/\D/g, '')
    const standing = best.get(key)
    if (!standing) { best.set(key, item); continue }
    const beats =
      rank(item.kind) > rank(standing.kind) ||
      (rank(item.kind) === rank(standing.kind) && item.daysWaiting > standing.daysWaiting)
    if (beats) { held.push(standing); best.set(key, item) } else { held.push(item) }
  }

  return {
    due: Array.from(best.values()),
    skipped: [
      ...skipped,
      ...held.map(h => ({ clientId: h.clientId, chasing: h.chasing, kind: h.kind, reason: 'one a day' as SkipReason })),
    ],
  }
}

const ids = (s: SentStep) => ({ clientId: s.clientId, chasing: s.chasing })

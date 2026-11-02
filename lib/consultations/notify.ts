import {
  BookingForEmail,
  ClientEmailKind,
  WITH_CALENDAR_FILE,
  clientEmailHtml,
  clientEmailSubject,
  consultationIcs,
  officeBookedHtml,
  officeCancelledHtml,
  officeRescheduledHtml,
} from './emails'
import { needsReview } from './conflicts'

/**
 * Sends what emails.ts renders. Never throws: a booking that is on the
 * calendar stays booked when an email fails, and the failure is logged.
 *
 * The office's emails go to FIRM_EMAIL and to the host the consultation was
 * given to — the calendar event alone is easy to miss among a day's meetings.
 */

async function resend() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('consultation email: RESEND_API_KEY is not set')
    return null
  }
  const { Resend } = await import('resend')
  return new Resend(apiKey)
}

const from = () => `JACKLAW Portal <${process.env.FIRM_FROM_EMAIL ?? 'onboarding@resend.dev'}>`

export async function emailClient(kind: ClientEmailKind, b: BookingForEmail, bookUrl: string): Promise<boolean> {
  const client = await resend()
  if (!client) return false
  try {
    const { error } = await client.emails.send({
      from: from(),
      to: [b.email],
      subject: clientEmailSubject(kind, b),
      html: clientEmailHtml(kind, b, bookUrl),
      ...(WITH_CALENDAR_FILE.includes(kind)
        ? { attachments: [{ filename: 'consultation.ics', content: Buffer.from(consultationIcs(b)), contentType: 'text/calendar' }] }
        : {}),
    })
    if (error) {
      console.error(`consultation email (${kind}):`, error)
      return false
    }
    return true
  } catch (err) {
    console.error(`consultation email (${kind}):`, err instanceof Error ? err.message : err)
    return false
  }
}

/** FIRM_EMAIL and the host, once each. */
export function officeRecipients(firmEmail: string | undefined, ...hosts: (string | null | undefined)[]): string[] {
  const all = [firmEmail, ...hosts].map(a => a?.trim().toLowerCase()).filter((a): a is string => Boolean(a && a.includes('@')))
  return Array.from(new Set(all))
}

async function emailOffice(subject: string, html: string, ...hosts: (string | null | undefined)[]): Promise<void> {
  const to = officeRecipients(process.env.FIRM_EMAIL, ...hosts)
  const client = await resend()
  if (!client || !to.length) return
  try {
    const { error } = await client.emails.send({ from: from(), to, subject, html })
    if (error) console.error('consultation email (office):', error)
  } catch (err) {
    console.error('consultation email (office):', err instanceof Error ? err.message : err)
  }
}

const shortWhen = (d: Date) =>
  d.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

export async function emailOfficeBooked(b: BookingForEmail, adminUrl: string): Promise<void> {
  const flag = needsReview(b.conflicts) ? '⚠ Conflict review: ' : b.conflicts === null ? '⚠ Not conflict-checked: ' : ''
  await emailOffice(`${flag}Consultation booked: ${b.name} — ${shortWhen(b.start)}`, officeBookedHtml(b, adminUrl), b.hostEmail)
}

export async function emailOfficeRescheduled(
  b: BookingForEmail,
  previous: { start: Date; hostName: string; hostEmail: string | null },
  adminUrl: string
): Promise<void> {
  await emailOffice(
    `Consultation rescheduled: ${b.name} — now ${shortWhen(b.start)}`,
    officeRescheduledHtml(b, previous.start, previous.hostName, adminUrl),
    b.hostEmail,
    // A host who lost the consultation to another is told too.
    previous.hostEmail
  )
}

export async function emailOfficeCancelled(b: BookingForEmail, by: 'client' | 'office', adminUrl: string): Promise<void> {
  await emailOffice(`Consultation cancelled: ${b.name}`, officeCancelledHtml(b, by, adminUrl), b.hostEmail)
}

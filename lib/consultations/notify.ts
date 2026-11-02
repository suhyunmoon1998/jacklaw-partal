import {
  BookingForEmail,
  ClientEmailKind,
  clientEmailHtml,
  clientEmailSubject,
  consultationIcs,
  officeBookedHtml,
  officeCancelledHtml,
} from './emails'
import { needsReview } from './conflicts'

/**
 * Sends what emails.ts renders. Never throws: a booking that is on the
 * calendar stays booked when an email fails, and the failure is logged.
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
      ...(kind === 'booked'
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

async function emailOffice(subject: string, html: string): Promise<void> {
  const firmEmail = process.env.FIRM_EMAIL
  const client = await resend()
  if (!client || !firmEmail) return
  try {
    const { error } = await client.emails.send({ from: from(), to: [firmEmail], subject, html })
    if (error) console.error('consultation email (office):', error)
  } catch (err) {
    console.error('consultation email (office):', err instanceof Error ? err.message : err)
  }
}

export async function emailOfficeBooked(b: BookingForEmail, adminUrl: string): Promise<void> {
  const flag = needsReview(b.conflicts) ? '⚠ Conflict review: ' : b.conflicts === null ? '⚠ Not conflict-checked: ' : ''
  const when = b.start.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
  await emailOffice(`${flag}Consultation booked: ${b.name} — ${when}`, officeBookedHtml(b, adminUrl))
}

export async function emailOfficeCancelled(b: BookingForEmail, by: 'client' | 'office', adminUrl: string): Promise<void> {
  await emailOffice(`Consultation cancelled: ${b.name}`, officeCancelledHtml(b, by, adminUrl))
}

/**
 * Telling the office about a reply that might be a request to stop.
 *
 * A long message with "stop" or "cancel" somewhere in it is not read as an
 * opt-out by itself (lib/optOut.ts): these are workers writing about their
 * jobs. But it might be one, and only a person can tell, so the office is sent
 * the message. If it is a stop, Stop texts & calls on the client's row (or the
 * client's own STOP) records it.
 *
 * Best effort: a failure is logged without the message or the number.
 */

import { maskPhone } from '@/lib/eleanorService'

export async function tellOfficePossibleStop(input: { from: string; body: string; clients: string[] }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const firmEmail = process.env.FIRM_EMAIL
  const fromEmail = process.env.FIRM_FROM_EMAIL ?? 'onboarding@resend.dev'
  if (!apiKey || !firmEmail) {
    console.error('twilio inbound: a reply that may mean stop could not be sent to the office (no email configured)')
    return
  }
  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const who = input.clients.length ? input.clients.join(', ') : 'nobody on file'
  try {
    const { Resend } = await import('resend')
    const { error } = await new Resend(apiKey).emails.send({
      from: `JACKLAW Portal <${fromEmail}>`,
      to: [firmEmail],
      subject: `A client's reply may be asking us to stop texting: ${who}`,
      html: [
        `<p>A text came in from ${escape(maskPhone(input.from))} (${escape(who)}) that may be a request to stop texts and calls.`,
        `The portal did <strong>not</strong> change anything, because the words could also be about their job.</p>`,
        `<blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#333">${escape(input.body.slice(0, 1000))}</blockquote>`,
        `<p>If it is a request to stop, press <strong>Stop texts &amp; calls</strong> on the client's row in the portal. It applies to every case on the number.</p>`,
      ].join('\n'),
    })
    if (error) console.error('twilio inbound: the office could not be told about a possible stop')
  } catch {
    console.error('twilio inbound: the office could not be told about a possible stop')
  }
}

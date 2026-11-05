/**
 * Telling the office what the portal cannot deal with by itself.
 *
 * A client's text is the main one. Until now only a reply that might mean stop
 * reached anybody, and every other reply was logged by its length and dropped:
 * one client's question about the fee and another's "I can't open the link"
 * sat unread at Twilio for weeks. A person writing to their lawyer is owed a
 * reader, so every reply that is not a bare STOP or START comes here, with its
 * photos, whatever it says and whoever sent it.
 *
 * Best effort, and a failure is logged without the message or the number: logs
 * are kept by the hosting provider, and a client's words do not belong there.
 */

import { escapeHtml } from '@/lib/emailTemplate'
import { formatPhone } from '@/lib/auth'

export interface OfficeAttachment {
  filename: string
  content: Buffer
}

/** False when nothing was sent, so a caller can say so in its own log line. */
async function emailOffice(mail: { subject: string; html: string; attachments?: OfficeAttachment[] }): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const firmEmail = process.env.FIRM_EMAIL
  const fromEmail = process.env.FIRM_FROM_EMAIL ?? 'onboarding@resend.dev'
  if (!apiKey || !firmEmail) return false
  try {
    const { Resend } = await import('resend')
    const { error } = await new Resend(apiKey).emails.send({
      from: `JACKLAW Portal <${fromEmail}>`,
      to: [firmEmail],
      subject: mail.subject.replace(/\s+/g, ' ').trim(),
      html: mail.html,
      ...(mail.attachments?.length ? { attachments: mail.attachments } : {}),
    })
    return !error
  } catch {
    return false
  }
}

const PARAGRAPH = 'margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#374151;'

function page(heading: string, body: string): string {
  return `
<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827;">
  <p style="margin:0 0 4px 0;color:#E07820;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;">JACKLAW Client Portal</p>
  <h2 style="margin:0 0 16px 0;font-size:20px;">${escapeHtml(heading)}</h2>
  ${body}
</div>`.trim()
}

/**
 * A photo or file a client texted, by the address Twilio gave for it.
 *
 * The address needs the account's login to open, so a link in an email would
 * show the office an error. Fetched here and attached instead.
 */
export interface TextedFile {
  url: string
  contentType: string
}

/** What Twilio will let an MMS be, and well under what an email can carry. */
const MOST_ATTACHED_BYTES = 20 * 1024 * 1024
const FETCH_MS = 8000

const EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'video/mp4': 'mp4',
  'video/3gpp': '3gp',
  'audio/mpeg': 'mp3',
  'audio/amr': 'amr',
}

async function fetchTextedFiles(files: TextedFile[]): Promise<{ attached: OfficeAttachment[]; missed: number }> {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const fetched = await Promise.all(
    files.map(async (file, i): Promise<OfficeAttachment | null> => {
      // The account's login is for Twilio and nobody else.
      if (!sid || !token || !file.url.startsWith('https://api.twilio.com/')) return null
      try {
        const res = await fetch(file.url, {
          headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}` },
          signal: AbortSignal.timeout(FETCH_MS),
        })
        if (!res.ok) return null
        const extension = EXTENSION[file.contentType.toLowerCase()] ?? 'bin'
        return { filename: `texted-file-${i + 1}.${extension}`, content: Buffer.from(await res.arrayBuffer()) }
      } catch {
        return null
      }
    })
  )
  const attached: OfficeAttachment[] = []
  let bytes = 0
  for (const file of fetched) {
    if (!file || bytes + file.content.length > MOST_ATTACHED_BYTES) continue
    bytes += file.content.length
    attached.push(file)
  }
  return { attached, missed: files.length - attached.length }
}

/**
 * A client's text, passed to the office to read and answer.
 *
 * The number is written out in full, unlike in the logs: this email exists so
 * that somebody can call back, and for a number nobody has on file it is the
 * only thing to go on.
 */
export async function tellOfficeOfReply(input: {
  /** The sender's number: ten digits, or as Twilio gave it. */
  from: string
  body: string
  /** Who is on file at that number; null when the lookup itself failed. */
  clients: string[] | null
  /** The words might be a request to stop, which only a person can tell. */
  maybeStop: boolean
  files?: TextedFile[]
  /** The portal's own address, for the link. */
  origin: string
}): Promise<void> {
  // Ten digits read as a US number. Anything else is written as Twilio gave it,
  // because formatPhone keeps the first ten digits and an overseas number would
  // come out as a different number that looks fine.
  const number = /^\d{10}$/.test(input.from) ? formatPhone(input.from) : input.from
  const who = input.clients === null ? number : input.clients.length ? input.clients.join(', ') : `${number} (not on file)`
  const onFile =
    input.clients === null
      ? 'The portal could not look up who this is.'
      : input.clients.length
        ? `On file at this number: <strong>${escapeHtml(input.clients.join(', '))}</strong>.`
        : 'Nobody on file has this number.'

  const { attached, missed } = await fetchTextedFiles(input.files ?? [])
  const message = input.body.trim()
  const parts = [
    `<p style="${PARAGRAPH}">From <strong>${escapeHtml(number)}</strong>. ${onFile}</p>`,
    message
      ? `<blockquote style="margin:0 0 14px 0;border-left:3px solid #E07820;padding:2px 0 2px 12px;font-size:15px;line-height:1.6;color:#111827;white-space:pre-wrap;">${escapeHtml(message)}</blockquote>`
      : `<p style="${PARAGRAPH}">The text had no words in it.</p>`,
    attached.length ? `<p style="${PARAGRAPH}">${attached.length} file${attached.length === 1 ? '' : 's'} they sent ${attached.length === 1 ? 'is' : 'are'} attached.</p>` : '',
    missed ? `<p style="${PARAGRAPH}"><strong>${missed} file${missed === 1 ? '' : 's'} they sent could not be attached.</strong> Open it in the Twilio console under Messaging, Logs.</p>` : '',
    input.maybeStop
      ? `<p style="${PARAGRAPH}">This may be a request to stop texts and calls. The portal did <strong>not</strong> change anything, because the words could also be about their job. If it is a request to stop, press <strong>Stop texts &amp; calls</strong> on the client's row. It applies to every case on the number.</p>`
      : '',
    `<p style="${PARAGRAPH}">The portal has not answered this text. Somebody at the office needs to.</p>`,
    `<a href="${escapeHtml(`${input.origin.replace(/\/$/, '')}/admin`)}" style="display:inline-block;background:#E07820;color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:10px 22px;border-radius:99px;">Open the admin panel</a>`,
  ]

  const sent = await emailOffice({
    subject: input.maybeStop ? `A client's reply may be asking us to stop texting: ${who}` : `Text from ${who}`,
    html: page(input.maybeStop ? 'A text that may mean stop' : 'A client texted the office', parts.filter(Boolean).join('\n  ')),
    attachments: attached,
  })
  if (!sent) console.error('twilio inbound: a client’s text could not be emailed to the office. It is still at Twilio, under Messaging, Logs.')
}

/**
 * The night worked out a Wage Order and could not get to one.
 *
 * The claims wait until somebody settles it, and nothing else would say so:
 * four clients sat like this for up to five weeks before anyone noticed. Sent
 * once, from the run that made the proposal, and not from every night after.
 */
export async function tellOfficeOrderIsOpen(input: {
  clientName: string
  problem: string
  whatWouldSettleIt: string
  origin: string
}): Promise<void> {
  const parts = [
    `<p style="${PARAGRAPH}">${escapeHtml(input.problem)}</p>`,
    input.whatWouldSettleIt ? `<p style="${PARAGRAPH}"><strong>What would settle it:</strong> ${escapeHtml(input.whatWouldSettleIt)}</p>` : '',
    `<p style="${PARAGRAPH}">An attorney can choose the Order under <strong>Claims &amp; evidence</strong> on the client's page. Or press <strong>Write the next questions</strong> there to ask the client. The claims stay unread until one of those happens.</p>`,
    `<a href="${escapeHtml(`${input.origin.replace(/\/$/, '')}/admin`)}" style="display:inline-block;background:#E07820;color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:10px 22px;border-radius:99px;">Open the admin panel</a>`,
  ]
  const sent = await emailOffice({
    subject: `Wage Order needed before the claims can be read: ${input.clientName}`,
    html: page('The claims are waiting on a Wage Order', parts.filter(Boolean).join('\n  ')),
  })
  if (!sent) console.error('cron follow-ups: the office could not be told that a Wage Order is needed')
}

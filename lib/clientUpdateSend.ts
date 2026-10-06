import { getSupabase } from '@/lib/supabase'
import { Lang } from '@/lib/langs'
import { resolveLang } from '@/lib/reminderSchedule'
import { usablePhone } from '@/lib/assignmentInvite'
import { formatUpdateSentences, parseUpdateSentences, renderUpdate } from '@/lib/clientUpdates'
import { sendSms } from '@/lib/twilio'

/**
 * Sending one update text (lib/clientUpdates.ts says what it can say).
 *
 * Worked out from the client's record every time — at the preview Jack is
 * shown and again at the send — so the seal over it (lib/eleanorService.ts)
 * catches a number, a language or a name that changed in between. The firm's
 * day is part of what is sealed, so an approval does not carry over to another
 * day.
 *
 * Once only is Eleanor's to hold: she records each text, under this seal, in
 * her own database before she asks for it, and asks again only when this
 * route said it did not go. So the portal keeps no table of its own for these
 * and needs no migration; the answer it gives — sent, or not sent and why —
 * is what she records.
 */

export type UpdatePlan = {
  clientId: string
  name: string
  phone: string
  lang: Lang
  /** The firm's calendar day (Los Angeles) the text is for. */
  day: string
  /** The sentences as asked, in the one written form. */
  sentences: string
  /** Exactly what the client reads. */
  body: string
  /** The same sentences in English, for the office. Never sent. */
  english: string
}

export type UpdateRefusal = 'InvalidSentences' | 'UnknownClient' | 'OptedOut' | 'NoPhone' | 'Unreadable'

const refusalText: Record<Exclude<UpdateRefusal, 'InvalidSentences'>, string> = {
  UnknownClient: 'No such client.',
  OptedOut: 'They replied STOP to our texts, so this office cannot text them.',
  NoPhone: 'There is no usable phone number on file for them.',
  Unreadable: 'The portal could not read what it needs to decide this, so nothing was sent.',
}

/** The firm's calendar day for an instant, YYYY-MM-DD. */
export function firmToday(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/**
 * A law office does not text a client late at night. An update goes out
 * between 8 am and 9 pm in Los Angeles, any day; outside that it is refused,
 * not queued, and Jack approves it again in the morning.
 */
export function isUpdateSendingHour(now: Date): boolean {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', hour12: false })
      .formatToParts(now)
      .find(part => part.type === 'hour')?.value ?? -1
  )
  return hour >= 8 && hour < 21
}

export async function planClientUpdate(
  clientId: string,
  sentencesRaw: unknown,
  now = new Date()
): Promise<{ ok: true; plan: UpdatePlan } | { ok: false; reason: UpdateRefusal; explanation: string }> {
  const day = firmToday(now)
  const parsed = parseUpdateSentences(sentencesRaw, day)
  if (!parsed.ok) return { ok: false, reason: 'InvalidSentences', explanation: parsed.why }
  const refuse = (reason: Exclude<UpdateRefusal, 'InvalidSentences'>) => ({ ok: false as const, reason, explanation: refusalText[reason] })

  const { data: client, error } = await getSupabase()
    .from('clients')
    .select('id, name, phone, portal_lang, sms_opt_out')
    .eq('id', clientId)
    .maybeSingle()
  if (error) return refuse('Unreadable')
  if (!client) return refuse('UnknownClient')
  if (client.sms_opt_out) return refuse('OptedOut')
  const phone = usablePhone(String(client.phone ?? ''))
  if (!phone) return refuse('NoPhone')

  const lang = resolveLang(client.portal_lang)
  const name = String(client.name ?? '')
  return {
    ok: true,
    plan: {
      clientId,
      name,
      phone,
      lang,
      day,
      sentences: formatUpdateSentences(parsed.sentences),
      body: renderUpdate(lang, name, parsed.sentences),
      english: renderUpdate('en', name, parsed.sentences),
    },
  }
}

/**
 * Sends the text. Called only after the seal matched and inside sending
 * hours; Eleanor has already recorded the claim on her side.
 */
export async function deliverClientUpdate(plan: UpdatePlan): Promise<{ status: 'sent'; providerId: string } | { status: 'failed'; error: string }> {
  const sent = await sendSms(plan.phone, plan.body)
  return sent.ok ? { status: 'sent', providerId: sent.id } : { status: 'failed', error: sent.error }
}

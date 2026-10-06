import { SupabaseClient } from '@supabase/supabase-js'
import { getSupabase } from '@/lib/supabase'
import { numberOptedOut } from '@/lib/numberOptOut'
import { ModuleId } from '@/lib/modules'
import {
  Chasing,
  DueReminder,
  LADDER,
  ReminderKind,
  assignmentOf,
  channelOf,
  daysBetween,
  resolveLang,
} from '@/lib/reminderSchedule'
import { CALL_VOICE, IMAGE_FOR, reminderBody } from '@/lib/reminderMessages'
import { placeCall, sendSms, xmlEscape } from '@/lib/twilio'
import { usablePhone } from '@/lib/assignmentInvite'

/**
 * Sending one reminder — the daily chase's, and the one Eleanor sends now
 * after Jack approves it. One place, so both write the same row, in the same
 * order, with the same words.
 */

/**
 * The public address of the portal, fixed — not whatever host this request
 * happened to arrive on.
 *
 * Two things ride on it: the link a client taps, and the URL the carrier
 * fetches the picture from. A run that landed on a deployment URL rather than
 * the custom domain would put a link behind Vercel's deployment protection
 * into a client's text, and hand the carrier a picture it cannot fetch — and
 * neither failure is visible from here.
 */
export const publicOrigin = () =>
  (process.env.PUBLIC_ORIGIN ?? 'https://jacklaw-portal.vercel.app').replace(/\/$/, '')

export const reminderRef = (d: DueReminder) => ({
  clientId: d.clientId,
  name: d.name,
  chasing: d.chasing,
  kind: d.kind,
  channel: d.channel,
  // So the dry run answers "and what language will they get this in?"
  lang: d.lang,
  daysWaiting: d.daysWaiting,
})

export function reminderPreview(d: DueReminder, origin: string) {
  // Sign-in is by phone, so the link is the front door rather than a per-client
  // URL — nothing in a text should be a key to somebody's case file.
  const link = `${origin}/client`
  // A round of extra questions is not "your questionnaire is still waiting" —
  // that person finished it. The copy says what is actually being asked.
  const subject = assignmentOf(d.chasing) ? ('follow-up' as const) : ('questionnaire' as const)
  const image = subject === 'questionnaire' ? IMAGE_FOR[d.kind] : undefined
  return {
    ...reminderRef(d),
    link,
    body: reminderBody(d.kind, d.lang, { name: d.name, link, subject }),
    // Twilio fetches this itself, so it has to be the public origin.
    mediaUrl: d.channel === 'sms' && image ? `${origin}${image}` : undefined,
  }
}

/** One spoken message, then hang up. */
function twimlFor(d: DueReminder, body: string): string {
  const v = CALL_VOICE[d.lang] ?? CALL_VOICE.en
  return (
    `<Response><Pause length="1"/>` +
    `<Say voice="${v.voice}" language="${v.language}">${xmlEscape(body)}</Say>` +
    `</Response>`
  )
}

/**
 * Claims the rung, then sends it.
 *
 * The row is written BEFORE the message goes out. If two runs overlap, the
 * second insert violates the unique index and this client is skipped rather
 * than texted twice; a crash between the two costs one reminder, where the
 * other order would cost a client three copies of the same text.
 */
export async function deliverReminder(
  db: SupabaseClient,
  item: DueReminder,
  origin: string
): Promise<{ status: 'sent' | 'failed' | 'skipped'; link: string; error?: string }> {
  const { body, link, mediaUrl } = reminderPreview(item, origin)
  const round = assignmentOf(item.chasing)
  const { error: claimError } = await db.from('client_reminders').insert({
    client_id: item.clientId,
    module_id: round ? null : item.chasing,
    assignment_id: round,
    kind: item.kind,
    channel: item.channel,
    to_number: item.phone,
    lang: item.lang,
    body,
    status: 'sent',
  })
  if (claimError) return { status: 'skipped', link, error: 'already claimed' }

  const sent =
    item.channel === 'sms'
      ? await sendSms(item.phone, body, mediaUrl)
      : await placeCall(item.phone, twimlFor(item, body))

  // The rung just claimed, addressed by whichever column identifies it.
  const patch = sent.ok ? { provider_id: sent.id } : { status: 'failed', error: sent.error }
  const rung = db.from('client_reminders').update(patch).eq('kind', item.kind)
  await (round
    ? rung.eq('assignment_id', round)
    : rung.eq('client_id', item.clientId).eq('module_id', item.chasing))

  return { status: sent.ok ? 'sent' : 'failed', link, error: sent.ok ? undefined : sent.error }
}

export type ManualReminderRefusal =
  | 'NotSent'
  | 'AlreadySubmitted'
  | 'UnknownClient'
  | 'OptedOut'
  | 'NoPhone'
  | 'TextRemindersUsed'
  | 'Unreadable'

const refusalText: Record<ManualReminderRefusal, string> = {
  NotSent: 'That step has not been sent to this client, so there is nothing to remind them about.',
  AlreadySubmitted: 'They have already submitted it.',
  UnknownClient: 'No such client.',
  OptedOut: 'They replied STOP to our texts, so this office cannot text them.',
  NoPhone: 'There is no usable phone number on file for them.',
  TextRemindersUsed: 'Both reminder texts for this step have already gone out; the schedule makes the phone call next.',
  Unreadable: 'The portal could not read what it needs to decide this, so nothing was sent.',
}

/**
 * The next reminder text for one step, sent early.
 *
 * The same rungs as the daily chase, in order: the day-2 text, then the day-5
 * text. Never the call — that stays with the schedule. The rung is recorded
 * like any other, so the chase does not send it again later.
 */
export async function planManualReminder(
  clientId: string,
  chasing: Chasing,
  now = new Date()
): Promise<{ ok: true; item: DueReminder } | { ok: false; reason: ManualReminderRefusal; explanation: string }> {
  const refuse = (reason: ManualReminderRefusal) => ({ ok: false as const, reason, explanation: refusalText[reason] })
  const db = getSupabase()
  const round = assignmentOf(chasing)

  let sentAt: string | null = null
  let submitted = false
  if (round) {
    const { data, error } = await db
      .from('client_question_set_assignments')
      .select('id, client_id, status, sent_at, completed_at')
      .eq('id', round)
      .maybeSingle()
    if (error) return refuse('Unreadable')
    if (!data || data.client_id !== clientId || !data.sent_at || !['sent', 'in_progress'].includes(String(data.status))) {
      return refuse(data?.completed_at ? 'AlreadySubmitted' : 'NotSent')
    }
    sentAt = data.sent_at
    submitted = Boolean(data.completed_at)
  } else {
    const moduleId = chasing as ModuleId
    const [sendRes, stateRes] = await Promise.all([
      db.from('client_module_sends').select('sent_at').eq('client_id', clientId).eq('module_id', moduleId).maybeSingle(),
      db.from('questionnaire_states').select('submitted, m2_submitted').eq('client_id', clientId).maybeSingle(),
    ])
    if (sendRes.error || stateRes.error) return refuse('Unreadable')
    if (!sendRes.data?.sent_at) return refuse('NotSent')
    sentAt = sendRes.data.sent_at
    submitted = moduleId === 'module2' ? Boolean(stateRes.data?.m2_submitted) : Boolean(stateRes.data?.submitted)
  }
  if (submitted) return refuse('AlreadySubmitted')

  const [clientRes, loggedRes] = await Promise.all([
    db.from('clients').select('id, name, phone, portal_lang, sms_opt_out').eq('id', clientId).maybeSingle(),
    round
      ? db.from('client_reminders').select('kind').eq('assignment_id', round)
      : db.from('client_reminders').select('kind').eq('client_id', clientId).eq('module_id', chasing),
  ])
  if (clientRes.error || loggedRes.error) return refuse('Unreadable')
  const client = clientRes.data
  if (!client) return refuse('UnknownClient')
  if (client.sms_opt_out) return refuse('OptedOut')
  const phone = usablePhone(String(client.phone ?? ''))
  if (!phone) return refuse('NoPhone')
  const stopped = await numberOptedOut(phone)
  if (stopped === null) return refuse('Unreadable')
  if (stopped) return refuse('OptedOut')

  const used = new Set((loggedRes.data ?? []).map(row => row.kind as ReminderKind))
  const next = LADDER.find(rung => rung.channel === 'sms' && !used.has(rung.kind))
  if (!next) return refuse('TextRemindersUsed')

  return {
    ok: true,
    item: {
      clientId,
      name: client.name ?? '',
      phone,
      lang: resolveLang(client.portal_lang),
      chasing,
      kind: next.kind,
      channel: channelOf(next.kind),
      daysWaiting: daysBetween(sentAt ?? now, now),
    },
  }
}

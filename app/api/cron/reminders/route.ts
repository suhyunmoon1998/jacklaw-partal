import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { getSupabase } from '@/lib/supabase'
import { Lang } from '@/lib/langs'
import { submissionLanguage } from '@/lib/machineTranslate'
import { ModuleId } from '@/lib/modules'
import {
  DueReminder,
  LADDER,
  ReminderKind,
  ReminderTarget,
  SentStep,
  isSendingTime,
  planReminders,
  resolveLang,
} from '@/lib/reminderSchedule'
import { CALL_VOICE, IMAGE_FOR, reminderBody } from '@/lib/reminderMessages'
import { isConfigured, placeCall, sendSms, xmlEscape } from '@/lib/twilio'

/**
 * The daily chase.
 *
 * Runs once a morning. Works out who was sent a step, has not submitted it, and
 * has reached day 2, 5, 7 or 10; texts the first three and calls the last. What
 * is due is computed from the send date every time rather than queued, so
 * changing the ladder takes effect at once and nothing has to be cancelled.
 *
 * Safe to run twice: every reminder is written to client_reminders under a
 * unique (client, module, rung), and the row is written BEFORE the message
 * goes out. A crash between the two costs one reminder; the other order would
 * cost a client three copies of the same text.
 *
 * `?dryRun=1` does everything except send, and returns exactly what would have
 * gone to whom. That is how this gets checked against real clients without
 * texting any of them.
 */

/**
 * Only the scheduler, and only with the secret.
 *
 * This used to also accept the admin panel's x-admin-key. That key is a literal
 * compiled into the admin page's JavaScript and served to every visitor, so the
 * effect was that anybody who opened the site could make a law firm text and
 * ring its clients. CRON_SECRET is server-side only; Vercel sends it as a
 * bearer token on the scheduled run and nothing else knows it.
 *
 * Without CRON_SECRET set, nothing is authorised at all — which is what happened
 * for the system's first weeks, and is a great deal better than the alternative.
 */
function authorised(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = req.headers.get('authorization')
  if (!auth) return false
  const a = Buffer.from(auth)
  const b = Buffer.from(`Bearer ${secret}`)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function GET(req: NextRequest) {
  if (!authorised(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1'
  // Lets the office try it outside a weekday morning, and lets a Monday run
  // that failed be repeated the same afternoon.
  const force = req.nextUrl.searchParams.get('force') === '1'
  const now = new Date()

  if (!force && !isSendingTime(now)) {
    return NextResponse.json({
      ran: false,
      reason: 'Outside weekday mornings — nothing sent. Tomorrow picks these up.',
      due: [],
    })
  }

  const db = getSupabase()
  const [sendsRes, statesRes, clientsRes, loggedRes] = await Promise.all([
    db.from('client_module_sends').select('client_id, module_id, sent_at'),
    db.from('questionnaire_states').select('client_id, submitted, m2_submitted'),
    db.from('clients').select('id, name, phone, portal_lang, sms_opt_out'),
    db.from('client_reminders').select('client_id, module_id, kind'),
  ])

  /**
   * Any of these failing means sending the wrong thing to the wrong people.
   *
   * Each read was previously destructured for its data alone and every consumer
   * coalesced a failure to an empty list — which reads as "nobody has submitted
   * anything, nobody has opted out, and nobody has been reminded yet". A single
   * failed read of questionnaire_states would have chased every client on file,
   * including the ones who finished weeks ago, and placed a call to anyone past
   * day ten. Nothing goes out unless all four came back.
   */
  const failed = [
    ['module sends', sendsRes.error],
    ['questionnaire states', statesRes.error],
    ['clients', clientsRes.error],
    ['reminder log', loggedRes.error],
  ].filter(([, e]) => e)

  if (failed.length) {
    console.error('cron reminders: aborted, could not read', failed.map(([w]) => w).join(', '))
    return NextResponse.json(
      {
        ran: false,
        reason:
          `Could not read ${failed.map(([w]) => w).join(', ')} from the database, so nothing was sent. ` +
          `Sending on a partial read would chase clients who have already submitted.`,
      },
      { status: 503 }
    )
  }

  const sends = sendsRes.data
  const states = statesRes.data
  const clients = clientsRes.data
  const logged = loggedRes.data

  const submitted = new Map(
    (states ?? []).map(s => [s.client_id, { module1: !!s.submitted, module2: !!s.m2_submitted }])
  )

  const steps: SentStep[] = (sends ?? []).map(s => ({
    clientId: s.client_id,
    moduleId: s.module_id as ModuleId,
    sentAt: s.sent_at,
    submitted:
      s.module_id === 'module2'
        ? Boolean(submitted.get(s.client_id)?.module2)
        : Boolean(submitted.get(s.client_id)?.module1),
  }))

  /**
   * The language to write to this client in.
   *
   * portal_lang is set the moment they pick a language in the portal, and
   * seeded when the office adds them — but a client who was added without one
   * and has never opened the portal has none, and defaulting those to English
   * means texting somebody in a language they may not read.
   *
   * So where it is missing, it is read off their own answers: somebody who
   * filled the questionnaire in Korean gets chased in Korean. Only fetched for
   * the clients who actually need it, because an answers blob is not small.
   */
  const needLang = (clients ?? []).filter(c => !c.portal_lang).map(c => c.id)
  const inferred = new Map<string, Lang>()
  if (needLang.length) {
    const { data: rows } = await db
      .from('questionnaire_states')
      .select('client_id, answers')
      .in('client_id', needLang)
    for (const row of rows ?? []) {
      const guess = submissionLanguage(row.answers ?? {})
      if (guess) inferred.set(row.client_id, guess)
    }
  }

  const targets = new Map<string, ReminderTarget>(
    (clients ?? []).map(c => [
      c.id,
      {
        clientId: c.id,
        name: c.name ?? '',
        phone: c.phone ?? '',
        lang: resolveLang(c.portal_lang, inferred.get(c.id)),
        optedOut: Boolean(c.sms_opt_out),
      },
    ])
  )

  const alreadySent = new Map<string, Map<string, Set<ReminderKind>>>()
  for (const row of logged ?? []) {
    const byModule = alreadySent.get(row.client_id) ?? new Map<string, Set<ReminderKind>>()
    const kinds = byModule.get(row.module_id) ?? new Set<ReminderKind>()
    kinds.add(row.kind as ReminderKind)
    byModule.set(row.module_id, kinds)
    alreadySent.set(row.client_id, byModule)
  }

  const { due, skipped } = planReminders({ steps, targets, alreadySent, now })
  /**
   * The public address of the portal, fixed — not whatever host this request
   * happened to arrive on.
   *
   * Two things ride on it: the link a client taps, and the URL the carrier
   * fetches the picture from. A scheduled run that landed on a deployment URL
   * rather than the custom domain would put a link behind Vercel's deployment
   * protection into a client's text, and hand the carrier a picture it cannot
   * fetch — and neither failure is visible from here.
   */
  const origin = (process.env.PUBLIC_ORIGIN ?? 'https://jacklaw-portal.vercel.app').replace(/\/$/, '')

  /**
   * With no provider there is nothing to send, and running anyway would be
   * worse than doing nothing: every rung is claimed before the send, so a run
   * against an unconfigured account would burn the whole ladder for every
   * client and none of them would ever be chased once the account existed.
   */
  if (!dryRun && !isConfigured()) {
    return NextResponse.json({
      ran: false,
      configured: false,
      reason:
        'Twilio is not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER). ' +
        'Nothing was sent and nothing was recorded, so no reminder has been used up.',
      wouldSend: due.map(d => preview(d, origin)),
      skipped,
    })
  }

  if (dryRun) {
    return NextResponse.json({
      ran: false,
      dryRun: true,
      configured: isConfigured(),
      wouldSend: due.map(d => preview(d, origin)),
      skipped,
    })
  }

  const results: Record<string, unknown>[] = []
  for (const item of due) {
  const { body, link, mediaUrl } = preview(item, origin)

    // Claim the rung first. If two runs overlap, the second insert violates the
    // unique index and this client is skipped rather than texted twice.
    const { error: claimError } = await db.from('client_reminders').insert({
      client_id: item.clientId,
      module_id: item.moduleId,
      kind: item.kind,
      channel: item.channel,
      to_number: item.phone,
      lang: item.lang,
      body,
      status: 'sent',
    })
    if (claimError) {
      results.push({ ...ref(item), status: 'skipped', error: 'already claimed' })
      continue
    }

    const sent =
      item.channel === 'sms'
        ? await sendSms(item.phone, body, mediaUrl)
        : await placeCall(item.phone, twimlFor(item, body))

    if (!sent.ok) {
      await db
        .from('client_reminders')
        .update({ status: 'failed', error: sent.error })
        .eq('client_id', item.clientId)
        .eq('module_id', item.moduleId)
        .eq('kind', item.kind)
    } else {
      await db
        .from('client_reminders')
        .update({ provider_id: sent.id })
        .eq('client_id', item.clientId)
        .eq('module_id', item.moduleId)
        .eq('kind', item.kind)
    }

    results.push({ ...ref(item), link, status: sent.ok ? 'sent' : 'failed', error: sent.ok ? undefined : sent.error })
  }

  return NextResponse.json({ ran: true, configured: isConfigured(), sent: results, skipped })
}

/**
 * POST /api/cron/reminders — start the ladder from today.
 *
 * Connecting the provider makes every waiting step due at once, and today that
 * is four people who were sent something between fifteen and forty-eight days
 * ago. The first morning would put a robocall on all four about a questionnaire
 * they may well have forgotten the firm ever sent.
 *
 * This records every rung of every currently-unsubmitted step as deliberately
 * skipped, so the chase begins with what the office sends next. It writes
 * history rather than deleting any: the rows say "skipped", with the reason, so
 * the log still answers why nobody was chased about these.
 */
export async function POST(req: NextRequest) {
  if (!authorised(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  if (body?.action !== 'skip-existing') {
    return NextResponse.json(
      { error: 'Send { "action": "skip-existing" } to start the ladder from today.' },
      { status: 400 }
    )
  }

  const db = getSupabase()
  const [{ data: sends }, { data: states }] = await Promise.all([
    db.from('client_module_sends').select('client_id, module_id'),
    db.from('questionnaire_states').select('client_id, submitted, m2_submitted'),
  ])

  const submitted = new Map(
    (states ?? []).map(s => [s.client_id, { module1: !!s.submitted, module2: !!s.m2_submitted }])
  )

  const rows = (sends ?? [])
    .filter(s =>
      s.module_id === 'module2'
        ? !submitted.get(s.client_id)?.module2
        : !submitted.get(s.client_id)?.module1
    )
    .flatMap(s =>
      LADDER.map(rung => ({
        client_id: s.client_id,
        module_id: s.module_id,
        kind: rung.kind,
        channel: rung.channel,
        status: 'skipped' as const,
        error: 'Backlog cleared when reminders were switched on',
      }))
    )

  if (!rows.length) return NextResponse.json({ marked: 0, note: 'Nothing was waiting.' })

  // Anything already recorded keeps what it has; this only fills the gaps.
  const { error } = await db
    .from('client_reminders')
    .upsert(rows, { onConflict: 'client_id,module_id,kind', ignoreDuplicates: true })

  if (error) return NextResponse.json({ error: 'Could not mark the backlog.' }, { status: 500 })

  return NextResponse.json({
    marked: rows.length,
    note: 'Existing unsubmitted steps will not be chased. Anything sent from now on will be.',
  })
}

const ref = (d: DueReminder) => ({
  clientId: d.clientId,
  name: d.name,
  moduleId: d.moduleId,
  kind: d.kind,
  channel: d.channel,
  // So the dry run answers "and what language will they get this in?"
  lang: d.lang,
  daysWaiting: d.daysWaiting,
})

function preview(d: DueReminder, origin: string) {
  // Sign-in is by phone, so the link is the front door rather than a per-client
  // URL — nothing in a text should be a key to somebody's case file.
  const link = `${origin}/client`
  const image = IMAGE_FOR[d.kind]
  return {
    ...ref(d),
    link,
    body: reminderBody(d.kind, d.lang, { name: d.name, link }),
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

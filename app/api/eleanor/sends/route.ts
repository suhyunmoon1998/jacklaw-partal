import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { eleanorServiceSecret, isEleanorService, maskEmail, maskPhone, scrubNumbers, sendFingerprint } from '@/lib/eleanorService'
import { asModule, performModuleSend, planModuleSend } from '@/lib/moduleSend'
import { deliverReminder, planManualReminder, publicOrigin, reminderPreview } from '@/lib/reminderSend'
import { Chasing } from '@/lib/reminderSchedule'
import { moduleById, stepName } from '@/lib/modules'
import { isConfigured } from '@/lib/twilio'
import { deliverClientUpdate, isUpdateSendingHour, planClientUpdate } from '@/lib/clientUpdateSend'

export const dynamic = 'force-dynamic'

/**
 * Sends Eleanor makes after Jack approves them.
 *
 * GET shows exactly what would go out — to which masked address and number,
 * in which language, with which words — and seals it. Eleanor shows that to
 * Jack; nothing is sent. POST, with the seal from his approval, works it all
 * out again and sends only if nothing changed, through the same code as the
 * admin panel's Send button and the daily reminder chase.
 *
 * Three sends:
 *   kind=module    the admin panel's "Send" for Module 1 or 2
 *   kind=reminder  the next reminder text for a step, now instead of on day 2 or 5
 *   kind=update    an update on the client's case, made only of the fixed
 *                  sentences in lib/clientUpdates.ts, in the client's language
 *
 * Only Eleanor's server holds the secret (lib/eleanorService.ts). The replies
 * never carry a full phone number or email address.
 */

const noStore = { 'Cache-Control': 'no-store' }

/** Outside 8 am to 9 pm in Los Angeles: nothing is sent, and Eleanor is told so. */
const quietHours = (kind: 'module' | 'reminder') => ({
  status: 409,
  body: {
    ok: false,
    reason: 'QuietHours',
    explanation: `It is outside 8 am to 9 pm in Los Angeles, so the ${kind === 'module' ? 'invitation' : 'reminder'} was not sent. Ask for it again in the morning.`,
  },
})
const reply = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status, headers: noStore })

const clientIdOf = (value: unknown) => (typeof value === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(value.trim()) ? value.trim() : null)

function chasingOf(value: unknown): Chasing | null {
  if (value === 'module1' || value === 'module2') return value
  if (typeof value === 'string' && /^assignment:[0-9a-f-]{36}$/i.test(value)) return value as Chasing
  return null
}

type Request =
  | { kind: 'module'; clientId: string; moduleId: 'module1' | 'module2' | 'module3' }
  | { kind: 'reminder'; clientId: string; chasing: Chasing }
  | { kind: 'update'; clientId: string; sentences: string }

function parse(input: Record<string, unknown>): Request | null {
  const clientId = clientIdOf(input.clientId)
  if (!clientId) return null
  if (input.kind === 'module') {
    const moduleId = asModule(input.moduleId)
    return moduleId ? { kind: 'module', clientId, moduleId } : null
  }
  if (input.kind === 'reminder') {
    const chasing = chasingOf(input.chasing)
    return chasing ? { kind: 'reminder', clientId, chasing } : null
  }
  if (input.kind === 'update') {
    // Read strictly by lib/clientUpdates.ts when the update is worked out.
    const sentences = typeof input.sentences === 'string' ? input.sentences.trim() : ''
    return sentences && sentences.length <= 400 ? { kind: 'update', clientId, sentences } : null
  }
  return null
}

async function stepLabel(chasing: Chasing): Promise<string> {
  if (!chasing.startsWith('assignment:')) {
    const definition = moduleById(chasing as 'module1' | 'module2')
    return definition ? definition.name : chasing
  }
  const { data } = await getSupabase()
    .from('client_question_set_assignments')
    .select('question_set_id')
    .eq('id', chasing.slice('assignment:'.length))
    .maybeSingle()
  if (!data?.question_set_id) return 'Follow-up questions'
  const { data: set } = await getSupabase().from('question_sets').select('name').eq('id', data.question_set_id).maybeSingle()
  return set?.name ? `Follow-up questions · ${set.name}` : 'Follow-up questions'
}

type Preview =
  | { ok: true; preview: Record<string, unknown>; fingerprint: string; run: () => Promise<{ status: number; body: Record<string, unknown> }> }
  | { ok: false; status: number; body: Record<string, unknown> }

async function prepare(request: Request, secret: string): Promise<Preview> {
  const origin = publicOrigin()
  if (request.kind === 'update') return prepareUpdate(request, secret)
  if (request.kind === 'module') {
    const planned = await planModuleSend({ clientId: request.clientId, moduleId: request.moduleId, linkOrigin: origin, textOrigin: origin })
    if (!planned.ok) {
      return { ok: false, status: planned.outcome.status === 404 ? 404 : 409, body: { ok: false, reason: 'Refused', explanation: String(planned.outcome.body.error ?? 'It cannot be sent.') } }
    }
    const plan = planned.plan
    const { data: earlier, error: earlierErr } = await getSupabase()
      .from('client_module_sends')
      .select('sent_at')
      .eq('client_id', plan.clientId)
      .eq('module_id', plan.moduleId)
      .maybeSingle()
    // Whether it was already sent is what Jack is shown ("Send" or "Send
    // again"), so it is part of what he approves. Unread, it could not be.
    if (earlierErr) {
      return { ok: false, status: 503, body: { ok: false, reason: 'Unavailable', explanation: 'Whether this module was already sent could not be checked, so nothing was prepared.' } }
    }
    const textReady = isConfigured()
    const textWhy = plan.target.phone ? (textReady ? null : 'texting-off') : plan.target.reason ?? 'none'
    const facts = {
      kind: 'module', clientId: plan.clientId, moduleId: plan.moduleId, to: plan.to, phone: plan.target.phone,
      textReady, lang: plan.lang, link: plan.link, blockedBy: plan.blockedBy, step: stepName(plan.definition, plan.lang),
      // Sealed: if the office sends it from the panel after Jack approved a
      // first send, the seal no longer matches and the client is not sent it twice.
      alreadySentAt: earlier?.sent_at ?? null,
    }
    return {
      ok: true,
      fingerprint: sendFingerprint(secret, facts),
      preview: {
        kind: 'module',
        clientId: plan.clientId,
        clientName: plan.clientName,
        moduleId: plan.moduleId,
        officeName: plan.definition.name,
        clientSees: stepName(plan.definition, plan.lang),
        lang: plan.lang,
        email: plan.to.includes('@') ? maskEmail(plan.to) : '',
        text: plan.target.phone && textReady ? maskPhone(plan.target.phone) : '',
        noTextBecause: textWhy,
        link: plan.link,
        blockedBy: plan.blockedBy,
        // A second send re-invites them; the office should know it is one.
        alreadySentAt: earlier?.sent_at ?? null,
      },
      run: async () => {
        // A text from the office at 11:30 at night is not one a client should
        // get because an approval was tapped late. The same hours as updates.
        if (!isUpdateSendingHour(new Date())) return quietHours('module')
        const outcome = await performModuleSend(plan, 'eleanor')
        const body = outcome.body
        // Never hand the full address or number back.
        return {
          status: outcome.status,
          body: {
            ok: outcome.status === 200 && body.sent === true,
            recorded: body.recorded === true,
            textSent: typeof body.sms === 'string' && body.sms.length > 0,
            emailSent: typeof body.email === 'string' && body.email.length > 0,
            error: typeof body.error === 'string' ? scrubNumbers(body.error) : undefined,
            textError: typeof body.smsError === 'string' ? scrubNumbers(body.smsError) : undefined,
            emailError: typeof body.emailError === 'string' ? scrubNumbers(body.emailError) : undefined,
          },
        }
      },
    }
  }

  const planned = await planManualReminder(request.clientId, request.chasing)
  if (!planned.ok) {
    return { ok: false, status: planned.reason === 'UnknownClient' ? 404 : 409, body: { ok: false, reason: planned.reason, explanation: planned.explanation } }
  }
  if (!isConfigured()) {
    return { ok: false, status: 409, body: { ok: false, reason: 'TextingOff', explanation: 'Texting is not switched on for this portal, so no reminder can be sent.' } }
  }
  const item = planned.item
  const message = reminderPreview(item, origin)
  const facts = { kind: 'reminder', clientId: item.clientId, chasing: item.chasing, phone: item.phone, lang: item.lang, rung: item.kind, body: message.body }
  return {
    ok: true,
    fingerprint: sendFingerprint(secret, facts),
    preview: {
      kind: 'reminder',
      clientId: item.clientId,
      clientName: item.name,
      chasing: item.chasing,
      step: await stepLabel(item.chasing),
      rung: item.kind,
      daysWaiting: item.daysWaiting,
      lang: item.lang,
      text: maskPhone(item.phone),
      body: message.body,
      withPicture: Boolean(message.mediaUrl),
    },
    run: async () => {
      if (!isUpdateSendingHour(new Date())) return quietHours('reminder')
      const delivered = await deliverReminder(getSupabase(), item, origin)
      return {
        status: delivered.status === 'skipped' ? 409 : 200,
        body: {
          ok: delivered.status === 'sent',
          recorded: delivered.status !== 'skipped',
          textSent: delivered.status === 'sent',
          error: scrubNumbers(delivered.error),
        },
      }
    },
  }
}

/**
 * An update text. What is sealed is everything that decides what the client
 * receives — the number, the language, the name, the exact words — and the
 * firm's day, so an approval does not carry over to another day. Eleanor
 * records each text under this seal before she asks for it, so the same text
 * reaches the same client at most once a day; the answer here says whether it
 * went, and only a refusal given here says it did not.
 */
async function prepareUpdate(request: Extract<Request, { kind: 'update' }>, secret: string): Promise<Preview> {
  const planned = await planClientUpdate(request.clientId, request.sentences)
  if (!planned.ok) {
    const status = planned.reason === 'UnknownClient' ? 404 : planned.reason === 'Unreadable' ? 503 : planned.reason === 'InvalidSentences' ? 400 : 409
    return { ok: false, status, body: { ok: false, reason: planned.reason, explanation: planned.explanation } }
  }
  if (!isConfigured()) {
    return { ok: false, status: 409, body: { ok: false, reason: 'TextingOff', explanation: 'Texting is not switched on for this portal, so no update can be sent.' } }
  }
  const plan = planned.plan
  const facts = { kind: 'update', clientId: plan.clientId, phone: plan.phone, lang: plan.lang, name: plan.name, body: plan.body, day: plan.day }
  const fingerprint = sendFingerprint(secret, facts)
  return {
    ok: true,
    fingerprint,
    preview: {
      kind: 'update',
      clientId: plan.clientId,
      clientName: plan.name,
      lang: plan.lang,
      text: maskPhone(plan.phone),
      sentences: plan.sentences,
      body: plan.body,
      english: plan.english,
      day: plan.day,
    },
    run: async () => {
      if (!isUpdateSendingHour(new Date())) {
        return {
          status: 409,
          body: { ok: false, reason: 'QuietHours', explanation: 'It is outside 8 am to 9 pm in Los Angeles, so the update was not sent. Ask for it again in the morning.' },
        }
      }
      const delivered = await deliverClientUpdate(plan)
      if (delivered.status === 'sent') return { status: 200, body: { ok: true, textSent: true } }
      console.error(`eleanor update to ${maskPhone(plan.phone)} did not go out: ${scrubNumbers(delivered.error)}`)
      // Only a refusal Twilio gave says the text did not go out. A dropped
      // connection or a server error may follow a text that went, so it is
      // reported as not known, and Eleanor keeps her claim on it for the day.
      if (delivered.uncertain) {
        return {
          status: 502,
          body: {
            ok: false,
            reason: 'DeliveryUnknown',
            explanation: 'The text service did not say whether the text went out. It may have, so do not send it again today; check with the client.',
          },
        }
      }
      return { status: 502, body: { ok: false, reason: 'NotSent', explanation: 'The text service refused the text, so it did not go out. It can be approved again.' } }
    },
  }
}

/** GET /api/eleanor/sends?kind=module&clientId=…&moduleId=… | ?kind=reminder&clientId=…&chasing=… | ?kind=update&clientId=…&sentences=… */
export async function GET(req: NextRequest) {
  const secret = eleanorServiceSecret()
  if (!secret || !isEleanorService(req)) return reply({ error: 'Unauthorized' }, 401)
  const params = req.nextUrl.searchParams
  const request = parse({
    kind: params.get('kind'),
    clientId: params.get('clientId'),
    moduleId: params.get('moduleId'),
    chasing: params.get('chasing'),
    sentences: params.get('sentences'),
  })
  if (!request) return reply({ ok: false, reason: 'InvalidRequest' }, 400)
  const prepared = await prepare(request, secret)
  if (!prepared.ok) return reply(prepared.body, prepared.status)
  return reply({ ok: true, preview: prepared.preview, fingerprint: prepared.fingerprint })
}

/** POST /api/eleanor/sends { kind, clientId, moduleId | chasing | sentences, fingerprint } — sends only what was previewed. */
export async function POST(req: NextRequest) {
  const secret = eleanorServiceSecret()
  if (!secret || !isEleanorService(req)) return reply({ error: 'Unauthorized' }, 401)
  const input = await req.json().catch(() => null)
  if (!input || typeof input !== 'object' || Array.isArray(input)) return reply({ ok: false, reason: 'InvalidRequest' }, 400)
  const request = parse(input as Record<string, unknown>)
  const fingerprint = (input as Record<string, unknown>).fingerprint
  if (!request || typeof fingerprint !== 'string' || !/^[0-9a-f]{64}$/.test(fingerprint)) {
    return reply({ ok: false, reason: 'InvalidRequest' }, 400)
  }
  const prepared = await prepare(request, secret)
  if (!prepared.ok) return reply(prepared.body, prepared.status)
  if (prepared.fingerprint !== fingerprint) {
    return reply({
      ok: false,
      reason: 'PreviewChanged',
      explanation: 'What would be sent changed after it was approved (the address, number, language, link, words or day). Nothing was sent.',
    }, 409)
  }
  const outcome = await prepared.run()
  return reply(outcome.body, outcome.status)
}

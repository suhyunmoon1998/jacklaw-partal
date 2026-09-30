import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { eleanorServiceSecret, isEleanorService, maskEmail, maskPhone, sendFingerprint } from '@/lib/eleanorService'
import { asModule, performModuleSend, planModuleSend } from '@/lib/moduleSend'
import { deliverReminder, planManualReminder, publicOrigin, reminderPreview } from '@/lib/reminderSend'
import { Chasing } from '@/lib/reminderSchedule'
import { moduleById, stepName } from '@/lib/modules'
import { isConfigured } from '@/lib/twilio'

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
 * Two sends, both ones the office already makes:
 *   kind=module    the admin panel's "Send" for Module 1 or 2
 *   kind=reminder  the next reminder text for a step, now instead of on day 2 or 5
 *
 * Only Eleanor's server holds the secret (lib/eleanorService.ts). The replies
 * never carry a full phone number or email address.
 */

const noStore = { 'Cache-Control': 'no-store' }
const reply = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status, headers: noStore })

const clientIdOf = (value: unknown) => (typeof value === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(value.trim()) ? value.trim() : null)

function chasingOf(value: unknown): Chasing | null {
  if (value === 'module1' || value === 'module2') return value
  if (typeof value === 'string' && /^assignment:[0-9a-f-]{36}$/i.test(value)) return value as Chasing
  return null
}

type Request = { kind: 'module'; clientId: string; moduleId: 'module1' | 'module2' | 'module3' } | { kind: 'reminder'; clientId: string; chasing: Chasing }

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
  if (request.kind === 'module') {
    const planned = await planModuleSend({ clientId: request.clientId, moduleId: request.moduleId, linkOrigin: origin, textOrigin: origin })
    if (!planned.ok) {
      return { ok: false, status: planned.outcome.status === 404 ? 404 : 409, body: { ok: false, reason: 'Refused', explanation: String(planned.outcome.body.error ?? 'It cannot be sent.') } }
    }
    const plan = planned.plan
    const { data: earlier } = await getSupabase()
      .from('client_module_sends')
      .select('sent_at')
      .eq('client_id', plan.clientId)
      .eq('module_id', plan.moduleId)
      .maybeSingle()
    const textReady = isConfigured()
    const textWhy = plan.target.phone ? (textReady ? null : 'texting-off') : plan.target.reason ?? 'none'
    const facts = {
      kind: 'module', clientId: plan.clientId, moduleId: plan.moduleId, to: plan.to, phone: plan.target.phone,
      textReady, lang: plan.lang, link: plan.link, blockedBy: plan.blockedBy, step: stepName(plan.definition, plan.lang),
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
            error: typeof body.error === 'string' ? body.error : undefined,
            textError: typeof body.smsError === 'string' ? body.smsError : undefined,
            emailError: typeof body.emailError === 'string' ? body.emailError : undefined,
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
      const delivered = await deliverReminder(getSupabase(), item, origin)
      return {
        status: delivered.status === 'skipped' ? 409 : 200,
        body: {
          ok: delivered.status === 'sent',
          recorded: delivered.status !== 'skipped',
          textSent: delivered.status === 'sent',
          error: delivered.error,
        },
      }
    },
  }
}

/** GET /api/eleanor/sends?kind=module&clientId=…&moduleId=… | ?kind=reminder&clientId=…&chasing=… */
export async function GET(req: NextRequest) {
  const secret = eleanorServiceSecret()
  if (!secret || !isEleanorService(req)) return reply({ error: 'Unauthorized' }, 401)
  const params = req.nextUrl.searchParams
  const request = parse({ kind: params.get('kind'), clientId: params.get('clientId'), moduleId: params.get('moduleId'), chasing: params.get('chasing') })
  if (!request) return reply({ ok: false, reason: 'InvalidRequest' }, 400)
  const prepared = await prepare(request, secret)
  if (!prepared.ok) return reply(prepared.body, prepared.status)
  return reply({ ok: true, preview: prepared.preview, fingerprint: prepared.fingerprint })
}

/** POST /api/eleanor/sends { kind, clientId, moduleId | chasing, fingerprint } — sends only what was previewed. */
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
      explanation: 'What would be sent changed after it was approved (the address, number, language, link or words). Nothing was sent.',
    }, 409)
  }
  const outcome = await prepared.run()
  return reply(outcome.body, outcome.status)
}

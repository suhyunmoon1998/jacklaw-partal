import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { isAdmin } from '@/lib/adminAuth'
import { lookupClientEmail, lookupClientLanguage } from '@/lib/sendAssignmentEmail'
import { isConfigured } from '@/lib/twilio'
import { lookupClientSms, origin } from '@/lib/assignmentInvite'
import { asModule, blockedByStep, moduleLink, performModuleSend, planModuleSend } from '@/lib/moduleSend'

/**
 * GET /api/admin/modules/send?clientId=…&moduleId=…
 *
 * The address, the link and the language the office would use — the same look
 * before sending that a question set gets.
 */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clientId = req.nextUrl.searchParams.get('clientId')
  const moduleId = asModule(req.nextUrl.searchParams.get('moduleId'))
  if (!clientId || !moduleId) {
    return NextResponse.json({ error: 'Missing clientId or moduleId' }, { status: 400 })
  }

  const [email, lang, blockedBy, sms] = await Promise.all([
    lookupClientEmail(clientId),
    lookupClientLanguage(clientId),
    blockedByStep(clientId, moduleId),
    lookupClientSms(clientId),
  ])

  return NextResponse.json({
    link: moduleLink(req.nextUrl.origin, moduleId, blockedBy !== null),
    email,
    lang,
    phone: sms.phone,
    smsOptOut: sms.optedOut,
    smsReady: isConfigured(),
    // So the office is told before the email goes out, not after the client
    // calls asking why the link does nothing.
    blockedBy,
  })
}

/**
 * POST /api/admin/modules/send  { clientId, moduleId, email?, phone?, lang?, sms? }
 *
 * Records that the module was handed to this client and emails them the link.
 * The record is what the client's own portal reads to decide whether to offer
 * the module at all, so it is written even when the email fails — the office can
 * copy the link and send it themselves, and the client can still get in.
 * The send itself lives in lib/moduleSend.ts, shared with Eleanor's approved sends.
 */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const clientId = typeof body?.clientId === 'string' ? body.clientId.trim() : ''
  const moduleId = asModule(body?.moduleId)
  if (!clientId || !moduleId) {
    return NextResponse.json({ error: 'Missing clientId or moduleId' }, { status: 400 })
  }

  const planned = await planModuleSend({
    clientId,
    moduleId,
    // Present-but-empty means the office cleared the box on purpose; absent means
    // they were never shown one and the file should answer.
    email: typeof body?.email === 'string' ? body.email : undefined,
    phone: typeof body?.phone === 'string' ? body.phone : undefined,
    sms: body?.sms === false ? false : undefined,
    lang: body?.lang,
    linkOrigin: req.nextUrl.origin,
    textOrigin: origin(req),
  })
  const outcome = planned.ok ? await performModuleSend(planned.plan, 'admin') : planned.outcome
  return NextResponse.json(outcome.body, { status: outcome.status })
}

/**
 * DELETE /api/admin/modules/send?clientId=…&moduleId=…
 *
 * Takes a step back.
 *
 * The office needed this for three different reasons and had none of them:
 * a module sent to the wrong client stayed sent and would quietly open itself
 * later; a client stuck behind an unfinished Step 1 had no way through except
 * finishing it; and the rule that an unsent step never blocks anything was
 * unreachable in practice, because every client on the books has Step 1.
 *
 * The client's answers are untouched — this removes the invitation, not the
 * work. A step they already submitted stays readable, because a submitted
 * questionnaire is theirs whatever our bookkeeping says.
 */
export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clientId = req.nextUrl.searchParams.get('clientId')
  const moduleId = asModule(req.nextUrl.searchParams.get('moduleId'))
  if (!clientId || !moduleId) {
    return NextResponse.json({ error: 'Missing clientId or moduleId' }, { status: 400 })
  }

  const { error } = await getSupabase()
    .from('client_module_sends')
    .delete()
    .eq('client_id', clientId)
    .eq('module_id', moduleId)

  if (error) {
    console.error('module unsend failed:', error)
    return NextResponse.json({ error: 'Could not take that step back.' }, { status: 500 })
  }

  return NextResponse.json({ removed: true })
}

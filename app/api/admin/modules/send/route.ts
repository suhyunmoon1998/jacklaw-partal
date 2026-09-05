import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { isAdmin } from '@/lib/adminAuth'
import { Lang, isLang } from '@/lib/langs'
import { ModuleId, moduleById, moduleQuestionCount, stepName } from '@/lib/modules'
import { lookupClientEmail, lookupClientLanguage, sendAssignmentEmail } from '@/lib/sendAssignmentEmail'
import { readSteps } from '@/lib/clientSteps'

const asModule = (value: unknown): ModuleId | null =>
  value === 'module1' || value === 'module2' || value === 'module3' ? value : null

/**
 * Where to send the client.
 *
 * Normally the questionnaire itself. But the office can hand out Step 2 while
 * Step 1 is unfinished, and then the module's own address is a locked door: the
 * client taps a link from their attorney, logs in, and is refused. So a module
 * that will land locked links to the dashboard instead, where the step they can
 * actually do is the live card and the new one is visibly waiting behind it.
 */
const moduleLink = (origin: string, moduleId: ModuleId, blocked: boolean) =>
  blocked ? `${origin}/dashboard` : `${origin}${moduleById(moduleId)?.href ?? '/dashboard'}`

/** The step this module would sit behind for this client, if any. */
async function blockedByStep(clientId: string, moduleId: ModuleId): Promise<number | null> {
  const views = await readSteps(clientId)
  const mine = views.find(v => v.id === moduleId)
  if (!mine) return null
  // Computed as though it were already sent, because the office is asking what
  // will happen when they press Send.
  const earlier = views.find(v => v.step < mine.step && v.sentAt !== null && v.state !== 'done')
  return earlier?.step ?? null
}

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

  const [email, lang, blockedBy] = await Promise.all([
    lookupClientEmail(clientId),
    lookupClientLanguage(clientId),
    blockedByStep(clientId, moduleId),
  ])

  return NextResponse.json({
    link: moduleLink(req.nextUrl.origin, moduleId, blockedBy !== null),
    email,
    lang,
    // So the office is told before the email goes out, not after the client
    // calls asking why the link does nothing.
    blockedBy,
  })
}

/**
 * POST /api/admin/modules/send  { clientId, moduleId, email?, lang? }
 *
 * Records that the module was handed to this client and emails them the link.
 * The record is what the client's own portal reads to decide whether to offer
 * the module at all, so it is written even when the email fails — the office can
 * copy the link and send it themselves, and the client can still get in.
 */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const clientId = typeof body?.clientId === 'string' ? body.clientId.trim() : ''
  const moduleId = asModule(body?.moduleId)
  if (!clientId || !moduleId) {
    return NextResponse.json({ error: 'Missing clientId or moduleId' }, { status: 400 })
  }

  const definition = moduleById(moduleId)
  if (!definition?.built) {
    return NextResponse.json(
      { error: `${definition?.name ?? 'That module'} has not been built yet, so it cannot be sent.` },
      { status: 400 }
    )
  }

  const supabase = getSupabase()
  const { data: client } = await supabase
    .from('clients')
    .select('name')
    .eq('id', clientId)
    .maybeSingle()
  if (!client) return NextResponse.json({ error: 'Client not found.' }, { status: 404 })

  const to = String(body?.email ?? '').trim() || (await lookupClientEmail(clientId))
  const lang: Lang = isLang(body?.lang) ? body.lang : await lookupClientLanguage(clientId)
  const blockedBy = await blockedByStep(clientId, moduleId)
  const link = moduleLink(req.nextUrl.origin, moduleId, blockedBy !== null)

  // Recorded first. A module the client cannot open is worse than one they were
  // told about twice, and the office may well be sending the link by hand.
  const { error: writeError } = await supabase
    .from('client_module_sends')
    .upsert(
      {
        client_id: clientId,
        module_id: moduleId,
        sent_at: new Date().toISOString(),
        sent_to: to || null,
        sent_lang: lang,
        created_by: 'admin',
      },
      { onConflict: 'client_id,module_id' }
    )

  if (writeError) {
    console.error('module send write failed:', writeError)
    return NextResponse.json({ error: 'Could not record the send.', link }, { status: 500 })
  }

  if (!to.includes('@')) {
    return NextResponse.json({
      sent: false,
      recorded: true,
      link,
      lang,
      blockedBy,
      // The second half of this sentence has to change when the step lands
      // locked, or the office is told to hand over a link that will refuse the
      // client — and told it by the same screen that just warned them.
      error:
        blockedBy === null
          ? 'No email address on file, so nothing was emailed. The step is open to them — copy the link and send it yourself.'
          : `No email address on file, so nothing was emailed. The step is recorded, but stays locked until Step ${blockedBy} is submitted; the link goes to their step list.`,
    })
  }

  try {
    await sendAssignmentEmail({
      to,
      clientName: client.name || 'there',
      // "Step 2 · Questions about your pay and breaks", in their language —
      // not the office's internal row name.
      setName: stepName(definition, lang),
      questionCount: moduleQuestionCount(moduleId),
      link,
      lang,
    })
  } catch (err) {
    console.error('module send email failed:', err)
    return NextResponse.json({
      sent: false,
      recorded: true,
      link,
      lang,
      blockedBy,
      error: err instanceof Error ? err.message : 'Could not send the email.',
    })
  }

  return NextResponse.json({ sent: true, recorded: true, email: to, link, lang, blockedBy })
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

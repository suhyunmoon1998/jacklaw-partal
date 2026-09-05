import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { isAdmin } from '@/lib/adminAuth'
import { Lang, isLang } from '@/lib/langs'
import { ModuleId, moduleById, moduleQuestionCount } from '@/lib/modules'
import { lookupClientEmail, lookupClientLanguage, sendAssignmentEmail } from '@/lib/sendAssignmentEmail'

const asModule = (value: unknown): ModuleId | null =>
  value === 'module1' || value === 'module2' || value === 'module3' ? value : null

const moduleLink = (origin: string, moduleId: ModuleId) =>
  `${origin}${moduleById(moduleId)?.href ?? '/dashboard'}`

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

  const [email, lang] = await Promise.all([
    lookupClientEmail(clientId),
    lookupClientLanguage(clientId),
  ])

  return NextResponse.json({ link: moduleLink(req.nextUrl.origin, moduleId), email, lang })
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
  const link = moduleLink(req.nextUrl.origin, moduleId)

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
      error:
        'No email address on file, so nothing was emailed. The module is open to them — copy the link and send it yourself.',
    })
  }

  try {
    await sendAssignmentEmail({
      to,
      clientName: client.name || 'there',
      // What the client is told it is called, in their language — not the
      // office's internal row name.
      setName: definition.clientName[lang] ?? definition.clientName.en,
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
      error: err instanceof Error ? err.message : 'Could not send the email.',
    })
  }

  return NextResponse.json({ sent: true, recorded: true, email: to, link, lang })
}

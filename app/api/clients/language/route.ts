import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { isLang } from '@/lib/langs'
import { denyClient } from '@/lib/clientAuth'

/**
 * GET /api/clients/language?clientId=…
 *
 * The language the office has on file for this client, for a phone that has
 * never been given one. Same guard as the write below.
 */
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get('clientId')?.trim() ?? ''
  if (!clientId) return NextResponse.json({ error: 'clientId is required.' }, { status: 400 })

  const denied = await denyClient(req, clientId)
  if (denied) return denied

  const { data, error } = await getSupabase()
    .from('clients')
    .select('portal_lang')
    .eq('id', clientId)
    .maybeSingle()
  if (error) return NextResponse.json({ error: 'Could not read the language.' }, { status: 500 })
  return NextResponse.json({ lang: isLang(data?.portal_lang) ? data.portal_lang : null })
}

/**
 * POST /api/clients/language  { clientId, lang }
 *
 * Records the language a client is reading the portal in, so the office can
 * write to them in it — the invitation email, and any extra questions built
 * for them, both follow this rather than guessing from a months-old intake
 * answer.
 *
 * Unauthenticated, like the other client-facing routes here: it takes a client
 * id and writes one preference. The worst a wrong id can do is show that client
 * a questionnaire in the wrong language, which they can change back from the
 * header themselves.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const clientId = typeof body?.clientId === 'string' ? body.clientId.trim() : ''
  const lang = body?.lang

  if (!clientId || !isLang(lang)) {
    return NextResponse.json({ error: 'clientId and a known lang are required.' }, { status: 400 })
  }

  const denied = await denyClient(req, clientId)
  if (denied) return denied

  const { error } = await getSupabase()
    .from('clients')
    .update({ portal_lang: lang })
    .eq('id', clientId)

  if (error) {
    console.error('portal language save failed:', error)
    return NextResponse.json({ error: 'Could not save the language.' }, { status: 500 })
  }

  return NextResponse.json({ saved: true, lang })
}

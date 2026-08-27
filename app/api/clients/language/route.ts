import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { isLang } from '@/lib/langs'

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

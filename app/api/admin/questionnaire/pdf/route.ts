import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { generateAnswersPdfForOffice } from '@/lib/generateAnswersPdf'
import { formatPhone } from '@/lib/auth'
import { translateAnswersCached } from '@/lib/translationCache'
import { answersLanguage } from '@/lib/machineTranslate'
import { isAdmin } from '@/lib/adminAuth'

/**
 * Putting a client's own words into English takes longer than drawing a PDF.
 * This is headroom for that, not the expected time.
 */
export const maxDuration = 120


// GET /api/admin/questionnaire/pdf?clientId=xxx
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clientId = req.nextUrl.searchParams.get('clientId')
  if (!clientId) return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })

  const [{ data: client }, { data: qState }] = await Promise.all([
    getSupabase().from('clients').select('name, phone, case_type, portal_lang').eq('id', clientId).maybeSingle(),
    getSupabase().from('questionnaire_states').select('answers').eq('client_id', clientId).maybeSingle(),
  ])

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  // The office reads case files in English, and the PDF's built-in font cannot
  // draw Chinese or Korean at all. Answers already in English cost nothing here:
  // the translator only calls out for text it detects as another language —
  // and, for a client who reads the portal in Spanish, for what they typed.
  const raw = qState?.answers ?? {}
  const answers = await translateAnswersCached(raw, answersLanguage(raw, client.portal_lang))

  const pdf = await generateAnswersPdfForOffice(
    client.name,
    client.case_type,
    formatPhone(client.phone ?? ''),
    answers
  )

  const safeName = client.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '')

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeName || 'client'}-intake.pdf"`,
    },
  })
}

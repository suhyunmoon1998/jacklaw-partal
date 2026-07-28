import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { generateAnswersPdf } from '@/lib/generateAnswersPdf'
import { formatPhone } from '@/lib/auth'

function isAdmin(req: NextRequest) {
  return req.headers.get('x-admin-key') === process.env.ADMIN_PASSWORD
}

// GET /api/admin/questionnaire/pdf?clientId=xxx
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clientId = req.nextUrl.searchParams.get('clientId')
  if (!clientId) return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })

  const [{ data: client }, { data: qState }] = await Promise.all([
    getSupabase().from('clients').select('name, phone, case_type').eq('id', clientId).maybeSingle(),
    getSupabase().from('questionnaire_states').select('answers').eq('client_id', clientId).maybeSingle(),
  ])

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const pdf = await generateAnswersPdf(
    client.name,
    client.case_type,
    formatPhone(client.phone ?? ''),
    qState?.answers ?? {}
  )

  const safeName = client.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '')

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeName || 'client'}-intake.pdf"`,
    },
  })
}

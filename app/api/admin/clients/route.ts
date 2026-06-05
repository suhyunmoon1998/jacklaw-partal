import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

function isAdmin(req: NextRequest) {
  return req.headers.get('x-admin-key') === process.env.ADMIN_PASSWORD
}

// GET /api/admin/clients — all clients + questionnaire/doc stats
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: clients, error } = await getSupabase()
    .from('clients')
    .select('id, name, phone, case_type, onboarding_status, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Fetch failed' }, { status: 500 })

  // Fetch questionnaire states and document counts in parallel
  const [{ data: qStates }, { data: docs }] = await Promise.all([
    getSupabase().from('questionnaire_states').select('client_id, completed_sections, submitted, last_saved'),
    getSupabase().from('documents').select('client_id'),
  ])

  const qMap = Object.fromEntries((qStates ?? []).map(q => [q.client_id, q]))
  const docCount = (docs ?? []).reduce<Record<string, number>>((acc, d) => {
    acc[d.client_id] = (acc[d.client_id] ?? 0) + 1
    return acc
  }, {})

  const enriched = (clients ?? []).map(c => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    caseType: c.case_type,
    onboardingStatus: c.onboarding_status,
    createdAt: c.created_at,
    questionnaire: qMap[c.id]
      ? {
          completedSections: qMap[c.id].completed_sections ?? [],
          submitted: qMap[c.id].submitted,
          lastSaved: qMap[c.id].last_saved ?? '',
        }
      : { completedSections: [], submitted: false, lastSaved: '' },
    documentCount: docCount[c.id] ?? 0,
  }))

  return NextResponse.json({ clients: enriched })
}

// POST /api/admin/clients — add client
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, phone, caseType } = await req.json()
  const digits = (phone ?? '').replace(/\D/g, '')

  if (!name || digits.length < 7 || !caseType) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const id = `client-${Date.now()}`
  const { data, error } = await getSupabase()
    .from('clients')
    .insert({ id, name, phone: digits, case_type: caseType })
    .select()
    .single()

  if (error) {
    const msg = error.code === '23505' ? 'Phone number already registered.' : 'Insert failed.'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  return NextResponse.json({ client: data })
}

// DELETE /api/admin/clients?id=xxx
export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await getSupabase().from('clients').delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'Delete failed' }, { status: 500 })

  return NextResponse.json({ success: true })
}

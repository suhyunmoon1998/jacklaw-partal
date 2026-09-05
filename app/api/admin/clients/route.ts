import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { isLang } from '@/lib/langs'
import { MODULES_GIVEN_ON_CREATE } from '@/lib/modules'

function isAdmin(req: NextRequest) {
  return req.headers.get('x-admin-key') === process.env.ADMIN_PASSWORD
}

// GET /api/admin/clients — all clients + questionnaire/doc stats
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: clients, error } = await getSupabase()
    .from('clients')
    .select('id, name, phone, case_type, case_name, onboarding_status, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Fetch failed' }, { status: 500 })

  // Questionnaire states, documents, and the question sets each client can see.
  // Assignments are here because the list's status column speaks for everything
  // asked of a client, not only the onboarding questionnaire — a client added
  // solely to be sent a set would otherwise read as "Not Started" after
  // finishing it.
  const [{ data: qStates }, { data: docs }, { data: assignments }] = await Promise.all([
    getSupabase().from('questionnaire_states').select('client_id, completed_sections, submitted, last_saved'),
    getSupabase().from('documents').select('client_id'),
    getSupabase().from('client_question_set_assignments').select('client_id, status'),
  ])

  const qMap = Object.fromEntries((qStates ?? []).map(q => [q.client_id, q]))
  const docCount = (docs ?? []).reduce<Record<string, number>>((acc, d) => {
    acc[d.client_id] = (acc[d.client_id] ?? 0) + 1
    return acc
  }, {})

  // A draft is a set the office has built but not released, so it was never
  // asked of the client and does not count towards their progress.
  const setCount = (assignments ?? []).reduce<Record<string, { total: number; completed: number }>>(
    (acc, a) => {
      if (a.status === 'draft') return acc
      const row = (acc[a.client_id] ??= { total: 0, completed: 0 })
      row.total += 1
      if (a.status === 'completed') row.completed += 1
      return acc
    },
    {}
  )

  const enriched = (clients ?? []).map(c => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    caseType: c.case_type,
    caseName: c.case_name ?? '',
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
    assignments: setCount[c.id] ?? { total: 0, completed: 0 },
  }))

  return NextResponse.json({ clients: enriched })
}

// POST /api/admin/clients — add client
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, phone, caseType, lang } = await req.json()
  const digits = (phone ?? '').replace(/\D/g, '')

  if (!name || digits.length < 7 || !caseType) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const id = `client-${Date.now()}`
  const { data, error } = await getSupabase()
    .from('clients')
    .insert({
      id,
      name,
      phone: digits,
      case_type: caseType,
      // A starting language, so the first thing sent to a client who has answered
      // nothing yet still reads in theirs. The moment they pick one in the portal
      // themselves, that write wins — this is a seed, not a setting.
      ...(isLang(lang) ? { portal_lang: lang } : {}),
    })
    .select()
    .single()

  if (error) {
    const msg = error.code === '23505' ? 'Phone number already registered.' : 'Insert failed.'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // The intake questionnaire is theirs from the moment they exist — that is what
  // "every client receives this" means, and what the person adding them expects.
  // Without this row the portal opens to nothing at all.
  const grantIntake = () =>
    getSupabase()
      .from('client_module_sends')
      .upsert(
        MODULES_GIVEN_ON_CREATE.map(moduleId => ({
          client_id: id,
          module_id: moduleId,
          created_by: 'on-create',
        })),
        { onConflict: 'client_id,module_id' }
      )

  // Retried once, because this row is now the only thing that puts the intake
  // questionnaire on the client's screen. Before the steps existed a failure
  // here cost nothing — the card was drawn for everyone regardless. Now a
  // client whose row did not get written opens the portal to an empty list and
  // has no way to tell anyone, so a transient failure is worth one more try.
  let { error: moduleError } = await grantIntake()
  if (moduleError) ({ error: moduleError } = await grantIntake())

  // The client exists either way, so the add is not failed over this. But the
  // office is told, in the response, because the remedy is theirs: press Send
  // on Step 1 from this client's row and the questionnaire opens.
  if (moduleError) {
    console.error('could not open the intake questionnaire to', id, moduleError)
    return NextResponse.json({
      client: data,
      warning:
        'The client was added, but their intake questionnaire could not be opened automatically. Press Send on Step 1 for this client so they can see it.',
    })
  }

  return NextResponse.json({ client: data })
}

// PATCH /api/admin/clients — update a client's case name
export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, caseName } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await getSupabase()
    .from('clients')
    .update({ case_name: (caseName ?? '').trim() || null })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

  return NextResponse.json({ success: true })
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

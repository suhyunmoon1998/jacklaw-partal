import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { isLang } from '@/lib/langs'
import { MODULES_GIVEN_ON_CREATE, moduleSectionCount } from '@/lib/modules'

function isAdmin(req: NextRequest) {
  return req.headers.get('x-admin-key') === process.env.ADMIN_PASSWORD
}

/**
 * Name tags on a client, cleaned up.
 *
 * The same rules the case tags follow — trimmed, capped, de-duplicated without
 * regard to case — so the two lists cannot end up with different ideas of what
 * a tag is.
 */
function tagged(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of raw) {
    const tag = String(item ?? '').trim().replace(/\s+/g, ' ').slice(0, 40)
    if (!tag) continue
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(tag)
    if (out.length === 8) break
  }
  return out
}

// GET /api/admin/clients — all clients + questionnaire/doc stats
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: clients, error } = await getSupabase()
    .from('clients')
    .select('id, name, phone, case_type, case_name, case_folder_id, tags, onboarding_status, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Fetch failed' }, { status: 500 })

  // Questionnaire states, documents, and the question sets each client can see.
  // Assignments are here because the list's status column speaks for everything
  // asked of a client, not only the onboarding questionnaire — a client added
  // solely to be sent a set would otherwise read as "Not Started" after
  // finishing it.
  const [{ data: qStates }, { data: docs }, { data: assignments }, { data: sends }] =
    await Promise.all([
      getSupabase()
        .from('questionnaire_states')
        .select(
          'client_id, completed_sections, submitted, last_saved, m2_completed_sections, m2_submitted'
        ),
      getSupabase().from('documents').select('client_id'),
      getSupabase().from('client_question_set_assignments').select('client_id, status'),
      // Which steps this client has actually been handed. A module nobody sent
      // is not a module the client is behind on.
      getSupabase().from('client_module_sends').select('client_id, module_id, sent_at, opened_at'),
    ])

  const qMap = Object.fromEntries((qStates ?? []).map(q => [q.client_id, q]))

  const sendMap = (sends ?? []).reduce<Record<string, Record<string, { sentAt: string; openedAt: string | null }>>>(
    (acc, s) => {
      ;(acc[s.client_id] ??= {})[s.module_id] = { sentAt: s.sent_at, openedAt: s.opened_at ?? null }
      return acc
    },
    {}
  )
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
    caseFolderId: c.case_folder_id ?? null,
    tags: c.tags ?? [],
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
    /**
     * Enough for the caller to run stepViews() itself.
     *
     * One overall bar said 100% for a client who had finished the intake and
     * never been sent anything else, and the same 100% for one who had finished
     * all three — the office could not tell those apart at a glance. The
     * per-step state is computed by the same function the client's own
     * dashboard uses, so the two screens cannot disagree about what is done.
     */
    moduleSends: sendMap[c.id] ?? {},
    moduleProgress: {
      module1: {
        submitted: Boolean(qMap[c.id]?.submitted),
        completedSections: qMap[c.id]?.completed_sections ?? [],
        totalSections: moduleSectionCount('module1'),
      },
      module2: {
        submitted: Boolean(qMap[c.id]?.m2_submitted),
        completedSections: qMap[c.id]?.m2_completed_sections ?? [],
        totalSections: moduleSectionCount('module2'),
      },
      module3: {
        submitted: false,
        completedSections: [],
        totalSections: moduleSectionCount('module3'),
      },
    },
  }))

  return NextResponse.json({ clients: enriched })
}

// POST /api/admin/clients — add client
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, phone, caseType, lang, secondCase } = await req.json()
  const digits = (phone ?? '').replace(/\D/g, '')

  if (!name || digits.length < 7 || !caseType) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  /**
   * A number already on file is usually a mistake and occasionally the point.
   *
   * One person suing two employers needs a row per employer — a row holds one
   * set of questionnaire answers, and the two jobs have different dates, pay
   * and managers. The database no longer refuses it, so the check lives here
   * and asks rather than blocks: the office confirms and sends `secondCase`.
   */
  if (!secondCase) {
    const { data: already } = await getSupabase()
      .from('clients')
      .select('id, name')
      .eq('phone', digits)
      .limit(1)

    if (already?.length) {
      return NextResponse.json(
        { error: 'PHONE_IN_USE', existingName: already[0].name },
        { status: 409 }
      )
    }
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

  if (error) return NextResponse.json({ error: 'Insert failed.' }, { status: 400 })

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

/**
 * PATCH /api/admin/clients — the client's case name, the folder they are in,
 * or both.
 *
 * Each field is applied only when it is actually sent, because they are edited
 * from different places: the case name from the client row, the folder from the
 * Cases tab, the tags from the chips under their name. A patch that always wrote
 * all of them would have one control blanking what another had set.
 *
 * `caseFolderId: null` is a real instruction — take them out of the folder —
 * which is why presence is tested rather than truthiness.
 */
export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id } = body
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const patch: Record<string, unknown> = {}
  if ('caseName' in body) patch.case_name = String(body.caseName ?? '').trim() || null
  if ('caseFolderId' in body) patch.case_folder_id = body.caseFolderId || null
  if ('tags' in body) patch.tags = tagged(body.tags)

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { error } = await getSupabase().from('clients').update(patch).eq('id', id)

  if (error) {
    // A folder deleted in another tab is the ordinary way this fails, and it is
    // worth saying so rather than reporting a generic failure.
    const msg = error.code === '23503' ? 'That case no longer exists.' : 'Update failed'
    return NextResponse.json({ error: msg }, { status: error.code === '23503' ? 400 : 500 })
  }

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

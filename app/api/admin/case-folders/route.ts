import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { isAdmin } from '@/lib/adminAuth'


/**
 * Two folders with the same name are a filing mistake, so the database refuses
 * them. That arrives as a constraint code; the office needs a sentence.
 */
const DUPLICATE = 'A case with that name already exists.'

function named(raw: unknown): string | null {
  const name = String(raw ?? '').trim()
  return name.length ? name.slice(0, 120) : null
}

/**
 * Name tags on a case, cleaned up.
 *
 * Free text on purpose — the point is a label the office recognises, not a
 * value from a list somebody has to maintain. Trimmed, de-duplicated without
 * regard to case so "Retaliation" and "retaliation" cannot both sit on one
 * case, capped so a stray paste cannot become a tag, and capped in number so
 * the row stays readable.
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

// GET /api/admin/case-folders — every folder, with how many clients are in it
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: folders, error }, { data: clients }] = await Promise.all([
    getSupabase()
      .from('case_folders')
      .select('id, name, tags, created_at, updated_at')
      .order('name', { ascending: true }),
    getSupabase().from('clients').select('case_folder_id'),
  ])

  if (error) return NextResponse.json({ error: 'Fetch failed' }, { status: 500 })

  const counts = (clients ?? []).reduce<Record<string, number>>((acc, c) => {
    if (c.case_folder_id) acc[c.case_folder_id] = (acc[c.case_folder_id] ?? 0) + 1
    return acc
  }, {})

  return NextResponse.json({
    folders: (folders ?? []).map(f => ({
      id: f.id,
      name: f.name,
      tags: f.tags ?? [],
      createdAt: f.created_at,
      updatedAt: f.updated_at,
      clientCount: counts[f.id] ?? 0,
    })),
    // Clients belonging to no folder are not an error state — a client can be
    // added before anyone has decided which case they are on — so the count is
    // reported rather than hidden.
    unassignedCount: (clients ?? []).filter(c => !c.case_folder_id).length,
  })
}

// POST /api/admin/case-folders — make a folder
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const name = named(body.name)
  if (!name) return NextResponse.json({ error: 'Give the case a name.' }, { status: 400 })

  const { data, error } = await getSupabase()
    .from('case_folders')
    .insert({ name, tags: tagged(body.tags) })
    .select('id, name, tags, created_at, updated_at')
    .single()

  if (error) {
    return NextResponse.json(
      { error: error.code === '23505' ? DUPLICATE : 'Could not create the case.' },
      { status: 400 }
    )
  }

  return NextResponse.json({
    folder: {
      id: data.id,
      name: data.name,
      tags: data.tags ?? [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      clientCount: 0,
    },
  })
}

// PATCH /api/admin/case-folders — rename a folder
export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id } = body
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  // Renaming and re-tagging come from different controls, so only what was
  // actually sent is written — otherwise editing the tags would blank the name.
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if ('name' in body) {
    const name = named(body.name)
    if (!name) return NextResponse.json({ error: 'A case needs a name.' }, { status: 400 })
    patch.name = name
  }
  if ('tags' in body) patch.tags = tagged(body.tags)

  const { data, error } = await getSupabase()
    .from('case_folders')
    .update(patch)
    .eq('id', id)
    .select('id, name, tags, updated_at')
    .single()

  if (error) {
    return NextResponse.json(
      { error: error.code === '23505' ? DUPLICATE : 'Rename failed.' },
      { status: 400 }
    )
  }
  if (!data) return NextResponse.json({ error: 'That case no longer exists.' }, { status: 404 })

  return NextResponse.json({
    folder: { id: data.id, name: data.name, tags: data.tags ?? [], updatedAt: data.updated_at },
  })
}

/**
 * DELETE /api/admin/case-folders?id=xxx — put the folder away, keep the people.
 *
 * The foreign key is ON DELETE SET NULL, so everyone in the folder lands back in
 * Unassigned. Nobody is removed from the system by tidying up the filing, and
 * the count goes back in the response so the office can see where they went.
 */
export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { count } = await getSupabase()
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('case_folder_id', id)

  const { error } = await getSupabase().from('case_folders').delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'Delete failed' }, { status: 500 })

  return NextResponse.json({ success: true, unassigned: count ?? 0 })
}

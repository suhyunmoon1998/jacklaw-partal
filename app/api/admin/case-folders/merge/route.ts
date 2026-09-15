import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

function isAdmin(req: NextRequest) {
  return req.headers.get('x-admin-key') === process.env.ADMIN_PASSWORD
}

/**
 * POST /api/admin/case-folders/merge — fold one case into another.
 *
 * The case names this started from were free text, typed one client at a time,
 * so the same employer arrives spelled several ways: "350" and "350 atelier"
 * are one case. Fixing that by hand is move-every-client-then-delete, and the
 * half-done state in between is a case that looks emptier than it is.
 *
 * The clients move FIRST and the folder is dropped second, which is the only
 * safe order: the foreign key is ON DELETE SET NULL, so deleting first would
 * scatter everyone into Unassigned and leave nothing pointing at where they
 * had been. If the delete then fails, everyone is already where they belong
 * and an empty folder is all that is left to tidy.
 */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { fromId, intoId } = await req.json()
  if (!fromId || !intoId) return NextResponse.json({ error: 'Missing case' }, { status: 400 })
  if (fromId === intoId) {
    return NextResponse.json({ error: 'Pick a different case to merge into.' }, { status: 400 })
  }

  // Both ends are read before anything moves, so a case deleted in another tab
  // is reported as such rather than silently emptying this one.
  const { data: ends } = await getSupabase()
    .from('case_folders')
    .select('id, name')
    .in('id', [fromId, intoId])

  const from = (ends ?? []).find(f => f.id === fromId)
  const into = (ends ?? []).find(f => f.id === intoId)
  if (!from || !into) {
    return NextResponse.json({ error: 'One of those cases no longer exists.' }, { status: 404 })
  }

  const { data: moved, error: moveError } = await getSupabase()
    .from('clients')
    .update({ case_folder_id: intoId })
    .eq('case_folder_id', fromId)
    .select('id')

  if (moveError) {
    return NextResponse.json({ error: 'Could not move the clients.' }, { status: 500 })
  }

  const { error: dropError } = await getSupabase().from('case_folders').delete().eq('id', fromId)

  // The clients are already safe in the target, so this is not a failed merge —
  // it is a merge with an empty folder still on the shelf, and saying so is
  // more use than an error that suggests nothing happened.
  if (dropError) {
    return NextResponse.json({
      moved: moved?.length ?? 0,
      into: into.name,
      warning: `Everyone moved to "${into.name}", but "${from.name}" could not be deleted. Delete it from the list.`,
    })
  }

  return NextResponse.json({ moved: moved?.length ?? 0, into: into.name, from: from.name })
}

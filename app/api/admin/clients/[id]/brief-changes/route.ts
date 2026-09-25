import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/adminAuth'
import { compare } from '@/lib/briefChanges'
import { keepSnapshot, listSnapshots } from '@/lib/briefSnapshots'
import { assembleBrief } from '@/lib/briefVersions'
import { baselineFor, summarise, versionsOf } from '@/lib/briefHistory'

/**
 * What changed since the last version, and keeping this one for the next.
 *
 * A POST rather than a GET because it writes: the brief as it stands becomes
 * the version the next comparison is made against. The office is not asked to
 * remember to do it — opening the sheet is what records it.
 *
 * The brief is assembled here rather than taken from the request, so what is
 * kept is what is on file and not whatever a browser sent. And it is compared
 * against the last version that DIFFERS from it: opening the sheet a second
 * time used to compare the brief with itself and report that nothing moved.
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const current = await assembleBrief(params.id)
    if (!current) return NextResponse.json({ changes: null, first: true })

    const rows = await listSnapshots(params.id)
    const { baseline, isNew } = baselineFor(rows, current)

    const changes = baseline
      ? compare({
          before: { brief: baseline.brief, facts: baseline.facts, readOn: baseline.readOn },
          after: current,
        })
      : null

    // Kept after the comparison, so this version becomes the next one's
    // baseline. A first reading records itself and reports no changes, which
    // is the truth: there is nothing yet to have changed from.
    if (isNew) {
      await keepSnapshot(params.id, { ...current, readOn: current.brief.readOn ?? null, reason: 'opened' })
    }

    return NextResponse.json({ changes, first: !baseline })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

/**
 * Every version kept, newest first, each with what it changed from the one
 * before. Read-only: looking at the history does not add to it.
 */
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const versions = versionsOf(await listSnapshots(params.id)).map(v => ({
      ...v,
      summary: summarise(v.changes),
    }))
    return NextResponse.json({ versions })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/adminAuth'
import { Brief } from '@/lib/caseBrief'
import { FactSnapshot, compare } from '@/lib/briefChanges'
import { keepSnapshot, lastSnapshot } from '@/lib/briefSnapshots'

/**
 * What changed since the last reading, and keeping this one for the next.
 *
 * A POST rather than a GET because it writes: the brief the panel is holding
 * becomes the version the next comparison is made against. The office is not
 * asked to remember to do it — opening the sheet is what records it.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const brief = body?.brief as Brief | undefined
  const facts = (body?.facts ?? []) as FactSnapshot[]
  if (!brief) return NextResponse.json({ error: 'No brief to compare.' }, { status: 400 })

  const previous = await lastSnapshot(params.id)

  const changes = previous
    ? compare({
        before: { brief: previous.brief, facts: previous.facts, readOn: previous.readOn },
        after: { brief, facts },
      })
    : null

  // Kept after the comparison, so this reading becomes the next one's baseline.
  // A first reading records itself and reports no changes, which is the truth:
  // there is nothing yet to have changed from.
  await keepSnapshot(params.id, { brief, facts, readOn: brief.readOn ?? null })

  return NextResponse.json({ changes, first: !previous })
}

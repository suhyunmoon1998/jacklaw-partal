import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/adminAuth'
import { readLedger } from '@/lib/factStore'
import { standing } from '@/lib/factLedger'
import { STAGES, Stage, nextStage } from '@/lib/caseReadingShape'
import { readingFingerprint, runStage } from '@/lib/caseReading'
import { clearReading, readReading, saveStage } from '@/lib/caseReadingStore'

/**
 * One stage of a case reading.
 *
 * The hosting plan caps a request at 300 seconds. Ten claims read against the
 * statutes, the Wage Order and the cases took 100 seconds once and 73 minutes
 * on a loaded afternoon, so an undivided reading would fail in the middle
 * having been paid for. Each stage gets its own request and the panel walks
 * them, which is the same shape the damages reading already uses.
 */
export const maxDuration = 300

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const entries = await readLedger(params.id)
    const fingerprint = readingFingerprint(entries)
    const row = await readReading(params.id, fingerprint)
    return NextResponse.json({
      reading: row?.reading ?? null,
      stale: row?.stale ?? false,
      updatedAt: row?.updatedAt ?? null,
      facts: standing(entries).length,
      next: nextStage(row && !row.stale ? row.reading : null),
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const stage = String(body?.stage ?? '') as Stage
  if (!STAGES.includes(stage)) {
    return NextResponse.json({ error: `Send one of: ${STAGES.join(', ')}.` }, { status: 400 })
  }

  const entries = await readLedger(params.id)
  if (!standing(entries).length) {
    return NextResponse.json(
      { error: 'This client has no facts on file, so there is nothing to read.' },
      { status: 409 }
    )
  }
  const fingerprint = readingFingerprint(entries)
  const row = await readReading(params.id, fingerprint)
  const stored = row && !row.stale ? row.reading : {}

  // The first stage starts the reading over; the rest build on it. A stage run
  // out of order against a half-read file would produce claims read without
  // the Wage Order settled, which is a quieter kind of wrong than an error.
  if (stage !== 'wage order' && !stored.wageOrder) {
    return NextResponse.json(
      { error: 'The Wage Order has to be worked out before the claims can be read.' },
      { status: 409 }
    )
  }

  let patch
  try {
    patch = await runStage(stage, entries, stage === 'wage order' ? {} : stored)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 })
  }

  try {
    const merged = await saveStage(params.id, fingerprint, stage === 'wage order' ? patch : { ...stored, ...patch })
    return NextResponse.json({ reading: merged, next: nextStage(merged), stale: false })
  } catch (err) {
    // A stage that ran and could not be stored has been paid for and lost, so
    // it fails loudly rather than letting the walk carry on to the next one.
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

/** Throws the reading away. The next run starts from the Wage Order. */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    await clearReading(params.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

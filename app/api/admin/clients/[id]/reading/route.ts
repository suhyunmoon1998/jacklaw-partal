import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/adminAuth'
import { readLedger } from '@/lib/factStore'
import { standing } from '@/lib/factLedger'
import { STAGES, Stage, isRead, nextStage, staleStages } from '@/lib/caseReadingShape'
import { snapshotNow } from '@/lib/briefVersions'
import { readingFingerprint, runStage, stampsNow } from '@/lib/caseReading'
import { clearReading, readReading, saveStage } from '@/lib/caseReadingStore'
import { WageOrderChoice, checkChoice, isUsable } from '@/lib/wageOrderChoice'
import { describeSpend, totalSpend } from '@/lib/spend'

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

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const entries = await readLedger(params.id)
    const fingerprint = readingFingerprint(entries)
    const row = await readReading(params.id, fingerprint)
    const stored = row && !row.stale ? row.reading : null
    // Worked out here because the screen has no ledger to hash.
    const now = stampsNow(entries, stored ?? {})
    return NextResponse.json({
      reading: row?.reading ?? null,
      stale: row?.stale ?? false,
      staleStages: row?.stale ? STAGES.slice() : staleStages(stored, now),
      updatedAt: row?.updatedAt ?? null,
      facts: standing(entries).length,
      next: nextStage(stored, now),
      spent: totalSpend(row?.reading.spent ?? {}),
      spentSaid: describeSpend(totalSpend(row?.reading.spent ?? {})),
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
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

  // A proposal that contradicts itself must not become the law ten claims are
  // read under. This is not hypothetical: one proposed Order 7 while quoting
  // the provision that names restaurants in Order 5, and five claims were read
  // under the wrong Order before anybody looked at the prose.
  if (stage === 'claims 1' || stage === 'claims 2') {
    const choice = stored.wageOrder as WageOrderChoice
    if (!isUsable(choice)) {
      return NextResponse.json(
        {
          error:
            'The Wage Order proposal contradicts itself, so the claims cannot be read under it. ' +
            'Work out the Wage Order again.',
          problems: checkChoice(choice),
        },
        { status: 409 }
      )
    }
  }

  // A whole reading is about to be written over, in part or from the start.
  // Kept first, so the brief it produced is still there to compare against.
  // Taken before every stage of a re-walk, not only the first; a version that
  // did not change is not kept twice, and one caught mid-walk says which stage.
  if (row && isRead(row.reading, stage)) {
    await snapshotNow(params.id, `before "${stage}" was read again`)
  }

  let patch
  try {
    // `force` reads the FEHA claims even where the screen in code found nothing
    // to read — a person has looked at the facts and decided otherwise.
    // The Wage Order is handed the reading too. It reads nothing from it, but
    // the patch carries every stage's stamp forward from it: handed {}, a
    // re-read Order wiped the spine's stamp and a current chronology showed as
    // stale, inviting three Opus calls to read it again unchanged.
    patch = await runStage(stage, entries, stored, {
      forceFeha: stage === 'claims 3' && body?.force === true,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 })
  }

  try {
    // The Wage Order stage keeps whatever else is on file rather than wiping
    // it: a re-read because its model moved must not throw away ten claims and
    // a chronology that are still current. If the Order it settles differs,
    // the claims stages go stale on their own stamp and are run again.
    const merged = await saveStage(params.id, fingerprint, { ...stored, ...patch })
    const now = stampsNow(entries, merged)
    const problems = merged.wageOrder ? checkChoice(merged.wageOrder as WageOrderChoice) : []
    return NextResponse.json({
      reading: merged,
      next: problems.some(p => p.severity === 'blocking') ? 'wage order' : nextStage(merged, now),
      staleStages: staleStages(merged, now),
      wageOrderProblems: problems,
      spent: totalSpend(merged.spent ?? {}),
      spentSaid: describeSpend(totalSpend(merged.spent ?? {})),
      stale: false,
    })
  } catch (err) {
    // A stage that ran and could not be stored has been paid for and lost, so
    // it fails loudly rather than letting the walk carry on to the next one.
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

/** Throws the reading away. The next run starts from the Wage Order. */
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    await snapshotNow(params.id, 'before the reading was cleared')
    await clearReading(params.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

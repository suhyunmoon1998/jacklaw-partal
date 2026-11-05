import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/adminAuth'
import { readLedger } from '@/lib/factStore'
import { standing } from '@/lib/factLedger'
import { STAGES, Stage, StoredReading, isRead, nextStage, staleStages } from '@/lib/caseReadingShape'
import { snapshotNow } from '@/lib/briefVersions'
import { readingFingerprint, runStage, stampFor, stampsNow } from '@/lib/caseReading'
import { attorneyOrderOf, clearReading, readReading, saveStage, whatStands } from '@/lib/caseReadingStore'
import { WageOrderChoice, checkChoice, chooseOrder, isUsable, orderNumber, takeBackOrder, whyNotUsable } from '@/lib/wageOrderChoice'
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

/**
 * What the panel may run next, and why it may not.
 *
 * A proposal that contradicts itself can come out differently on a second
 * reading, so the Wage Order is what is next. No Order at all cannot: nothing
 * has changed, and reading it again pays a model to say so again. Nothing runs
 * until a person settles it, and the panel says what is needed.
 */
function whatIsNext(stored: StoredReading, now: Partial<Record<Stage, string>>) {
  const next = nextStage(stored, now)
  const choice = stored.wageOrder as WageOrderChoice | undefined
  const orderProblem = choice ? whyNotUsable(choice) : ''
  if (!orderProblem) return { next, orderProblem }
  if (orderNumber(choice?.proposal.order)) return { next: 'wage order' as Stage, orderProblem }
  return { next: next === 'claims 1' || next === 'claims 2' ? null : next, orderProblem }
}

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const entries = await readLedger(params.id)
    const fingerprint = readingFingerprint(entries)
    const row = await readReading(params.id, fingerprint)
    const stored = whatStands(row)
    // Worked out here because the screen has no ledger to hash.
    const now = stampsNow(entries, stored)
    return NextResponse.json({
      reading: row?.reading ?? null,
      stale: row?.stale ?? false,
      staleStages: row?.stale ? STAGES.slice() : staleStages(stored, now),
      updatedAt: row?.updatedAt ?? null,
      facts: standing(entries).length,
      ...whatIsNext(stored, now),
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
  const stored = whatStands(row)

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
  // under the wrong Order before anybody looked at the prose. And with no Order
  // at all, every duty that comes from one would report as needing authority.
  if (stage === 'claims 1' || stage === 'claims 2') {
    const choice = stored.wageOrder as WageOrderChoice
    if (!isUsable(choice)) {
      return NextResponse.json({ error: whyNotUsable(choice), problems: checkChoice(choice) }, { status: 409 })
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
    const merged = await saveStage(params.id, fingerprint, patch, stored)
    const now = stampsNow(entries, merged)
    const problems = merged.wageOrder ? checkChoice(merged.wageOrder as WageOrderChoice) : []
    return NextResponse.json({
      reading: merged,
      ...whatIsNext(merged, now),
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

/**
 * An attorney chooses the Wage Order, or takes the choice back with an empty one.
 *
 * Nothing is read here and nothing is paid for. The claims follow on the next
 * walk or that night, under this Order. Claims already read under another show
 * as stale on their own stamp, and re-reading them stays somebody's decision.
 */
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const asked = String(body?.order ?? '').trim()
  if (asked && !orderNumber(asked)) {
    return NextResponse.json({ error: 'Choose one of the seventeen Wage Orders.' }, { status: 400 })
  }

  try {
    const entries = await readLedger(params.id)
    const fingerprint = readingFingerprint(entries)
    const row = await readReading(params.id, fingerprint)
    const choice = row?.reading.wageOrder as WageOrderChoice | undefined
    if (!row || !choice) {
      return NextResponse.json({ error: 'The Wage Order has to be worked out first.' }, { status: 409 })
    }

    const updated = asked ? chooseOrder(choice, asked, new Date().toISOString()) : takeBackOrder(choice)
    if (row.reading.claims1) await snapshotNow(params.id, 'before the Wage Order was changed by hand')

    // Kept off the facts: when they have moved, the stages read against the old
    // ones do not carry over, and this is what the reading starts again from.
    const stored = row.stale ? {} : row.reading
    const merged = await saveStage(
      params.id,
      fingerprint,
      { wageOrder: updated, stamps: { 'wage order': stampFor(entries, 'wage order', { wageOrder: updated }) } },
      stored
    )
    const now = stampsNow(entries, merged)
    return NextResponse.json({ reading: merged, stale: false, staleStages: staleStages(merged, now), ...whatIsNext(merged, now) })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

/**
 * Throws the reading away. The next run starts from the Wage Order, which an
 * attorney's choice of it survives: it was never read from what is being cleared.
 */
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    await snapshotNow(params.id, 'before the reading was cleared')
    const entries = await readLedger(params.id)
    const fingerprint = readingFingerprint(entries)
    const row = await readReading(params.id, fingerprint)
    const kept = row ? attorneyOrderOf(row.reading) : {}
    await clearReading(params.id)
    if (kept.wageOrder) await saveStage(params.id, fingerprint, kept)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

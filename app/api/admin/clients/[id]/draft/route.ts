import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/adminAuth'
import { assembleBrief } from '@/lib/briefVersions'
import { readLedger } from '@/lib/factStore'
import { draftBasis, draftBrief } from '@/lib/briefDraft'
import { canKeepDrafts, keepDraft, lastDrafts } from '@/lib/briefDraftStore'
import { readingFingerprint } from '@/lib/caseReading'
import { readReading } from '@/lib/caseReadingStore'
import { STAGES, isRead } from '@/lib/caseReadingShape'
import { DraftKind } from '@/lib/briefDraftShape'
import { Meter, describeSpend } from '@/lib/spend'

/**
 * The model-written sections of the brief.
 *
 * GET is free: the newest draft of each kind, and whether what it was written
 * from has moved since. POST writes one kind — the trial sections or the
 * factual summary — which calls the model and costs money, so nothing calls it
 * but a person pressing the button on the sheet that shows that kind.
 */
export const maxDuration = 300

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const [drafts, current, entries] = await Promise.all([
      lastDrafts(params.id),
      assembleBrief(params.id),
      readLedger(params.id),
    ])
    const stale = (kind: DraftKind) => {
      const d = drafts[kind]
      return Boolean(d && current && d.basis !== draftBasis(kind, current.brief, entries))
    }
    return NextResponse.json({ drafts, stale: { trial: stale('trial'), factual: stale('factual') } })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const kind: DraftKind = body?.which === 'factual' ? 'factual' : 'trial'

  const cannot = await canKeepDrafts()
  if (cannot) return NextResponse.json({ error: cannot }, { status: 500 })

  const [current, entries] = await Promise.all([assembleBrief(params.id), readLedger(params.id)])
  if (!current) {
    return NextResponse.json(
      { error: 'Nothing has been read for this client yet, so there is nothing to draft from.' },
      { status: 409 }
    )
  }
  const row = await readReading(params.id, readingFingerprint(entries))
  // A reading taken against facts that have since moved cites ids that are
  // gone; a draft from it would be paid for and come back mostly struck.
  if (row?.stale) {
    return NextResponse.json(
      { error: 'The facts have changed since this case was read. Read it again, then draft.' },
      { status: 409 }
    )
  }
  if (kind === 'trial') {
    // A half-read case drafted as if whole omits claims without a word. Every
    // wage-and-hour stage and the spine must be read; FEHA, when unread, is
    // said in the brief's review items, which the draft is handed.
    const unread = STAGES.filter(s => s !== 'claims 3' && !isRead(row?.reading, s))
    if (!current.brief.claims.length || unread.length) {
      return NextResponse.json(
        { error: `The reading is not finished (${unread.join(', ') || 'no claims read'}), so the trial sections would leave part of the case out.` },
        { status: 409 }
      )
    }
  }

  const meter = new Meter()
  let draft
  try {
    draft = await draftBrief(kind, current.brief, entries, meter)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message, spentSaid: describeSpend(meter.spent) }, { status: 502 })
  }
  try {
    await keepDraft(params.id, draft, meter.spent)
  } catch (err) {
    // Returned anyway: it was paid for, and the sheet shows it with the error.
    return NextResponse.json({ error: (err as Error).message, draft }, { status: 500 })
  }
  return NextResponse.json({ draft, stale: false, spent: meter.spent, spentSaid: describeSpend(meter.spent) })
}

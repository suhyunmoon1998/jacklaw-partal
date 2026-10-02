import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/adminAuth'
import { STAGES, Stage, StoredAnalysis } from '@/lib/caseAnalysisShape'
import { analysisFingerprint } from '@/lib/caseAnalysis'
import { gather, load, present, runAnalysisStage } from '@/lib/analysisRun'

/**
 * One stage of a reading, not the whole one.
 *
 * The hosting plan caps a request at 300 seconds and an undivided reading of a
 * full questionnaire measured at 260 — close enough to the ceiling that a file
 * with one more issue than that one would fail after four minutes of work. Each
 * stage gets its own request instead, with room to spare, and the panel walks
 * through them.
 */
export const maxDuration = 300

/**
 * GET — the stored reading, if there is one.
 *
 * A reading whose fingerprint no longer matches the client is returned anyway,
 * marked stale. Hiding it would leave the office with an empty panel the moment
 * a client answers one more question; showing it silently would pass an old
 * reading off as current. The panel shows it with the date and a Re-run button.
 */
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const input = await gather(params.id)
  if (!input) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const row = await load(params.id)
  if (!row) return NextResponse.json({ analysis: null, parts: {}, nextStage: 'baseline' })

  return NextResponse.json(present(row, (row.result ?? {}) as StoredAnalysis, analysisFingerprint(input)))
}

/**
 * POST { stage } — run one stage and keep what it produced.
 *
 * 'baseline' starts a fresh reading and discards whatever was on file, so a
 * re-run cannot end up with this week's findings sitting on last week's
 * baseline. The later stages build on what is stored.
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const stage = String(body?.stage ?? '') as Stage
  if (!STAGES.includes(stage)) {
    return NextResponse.json(
      { error: `Send one of: ${STAGES.join(', ')}.` },
      { status: 400 }
    )
  }

  return runAnalysisStage(params.id, stage)
}

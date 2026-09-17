import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { isAdmin } from '@/lib/adminAuth'
import { LAW_VERSION } from '@/lib/caLaw'
import {
  AnalysisInput,
  STAGES,
  Stage,
  StoredAnalysis,
  completed,
  nextStage,
} from '@/lib/caseAnalysisShape'
import {
  ANALYSIS_MODEL,
  NotEnoughAnswers,
  analysisFingerprint,
  runStage,
} from '@/lib/caseAnalysis'
import { AnswerValue } from '@/types'

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

/** Everything the reading is built from, gathered in one place. */
async function gather(clientId: string): Promise<AnalysisInput | null> {
  const db = getSupabase()
  const [{ data: client }, { data: state }, { data: docs }] = await Promise.all([
    db.from('clients').select('id, name, case_type, case_name').eq('id', clientId).maybeSingle(),
    db.from('questionnaire_states').select('answers').eq('client_id', clientId).maybeSingle(),
    db.from('documents').select('name').eq('client_id', clientId),
  ])
  if (!client) return null

  return {
    clientName: client.name ?? '',
    caseType: client.case_type ?? '',
    caseName: client.case_name ?? '',
    answers: (state?.answers ?? {}) as Record<string, AnswerValue>,
    // Titles only. What a document says is not read here; the reading says what
    // to look for in them, which is a job for whoever opens the file.
    documents: (docs ?? []).map(d => String(d.name ?? '')).filter(Boolean),
  }
}

async function load(clientId: string) {
  const { data } = await getSupabase()
    .from('case_analyses')
    .select('fingerprint, law_version, model, result, duration_ms, created_at')
    .eq('client_id', clientId)
    .maybeSingle()
  return data
}

/** What both verbs answer with, so the panel reads one shape either way. */
function present(
  row: { fingerprint: string; law_version: string; model: string; duration_ms: number | null; created_at: string } | null,
  stored: StoredAnalysis,
  currentFingerprint: string
) {
  return {
    analysis: completed(stored),
    // So the panel knows whether to offer Run, Continue, or nothing.
    nextStage: nextStage(stored),
    createdAt: row?.created_at,
    model: row?.model,
    durationMs: row?.duration_ms,
    stale: row ? row.fingerprint !== currentFingerprint : false,
    // Named separately so a stale badge can say WHY, rather than leaving the
    // office to guess whether the client answered more or the law file moved.
    lawChanged: row ? row.law_version !== LAW_VERSION : false,
  }
}

/**
 * GET — the stored reading, if there is one.
 *
 * A reading whose fingerprint no longer matches the client is returned anyway,
 * marked stale. Hiding it would leave the office with an empty panel the moment
 * a client answers one more question; showing it silently would pass an old
 * reading off as current. The panel shows it with the date and a Re-run button.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const input = await gather(params.id)
  if (!input) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const row = await load(params.id)
  if (!row) return NextResponse.json({ analysis: null, nextStage: 'baseline' })

  return NextResponse.json(present(row, (row.result ?? {}) as StoredAnalysis, analysisFingerprint(input)))
}

/**
 * POST { stage } — run one stage and keep what it produced.
 *
 * 'baseline' starts a fresh reading and discards whatever was on file, so a
 * re-run cannot end up with this week's findings sitting on last week's
 * baseline. The later stages build on what is stored.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const stage = String(body?.stage ?? '') as Stage
  if (!STAGES.includes(stage)) {
    return NextResponse.json(
      { error: `Send one of: ${STAGES.join(', ')}.` },
      { status: 400 }
    )
  }

  const input = await gather(params.id)
  if (!input) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const row = await load(params.id)
  const fingerprint = analysisFingerprint(input)
  const before: StoredAnalysis = stage === 'baseline' ? {} : ((row?.result ?? {}) as StoredAnalysis)

  // Stages after the first build on the one before, and the answers may have
  // moved between requests. Carrying on would staple new findings to a baseline
  // drawn from different facts, so the reading restarts instead.
  if (stage !== 'baseline' && row && row.fingerprint !== fingerprint) {
    return NextResponse.json(
      {
        error: 'The answers changed while this was being read. Start the reading again.',
        restart: true,
      },
      { status: 409 }
    )
  }

  const started = Date.now()
  try {
    const stored = await runStage(input, stage, before)
    // Each stage adds its own time to the total, so the office sees what the
    // whole reading cost rather than only its last leg.
    const durationMs = (stage === 'baseline' ? 0 : row?.duration_ms ?? 0) + (Date.now() - started)

    const { error } = await getSupabase()
      .from('case_analyses')
      .upsert(
        {
          client_id: params.id,
          fingerprint,
          law_version: LAW_VERSION,
          model: ANALYSIS_MODEL,
          result: stored,
          duration_ms: durationMs,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'client_id' }
      )
    if (error) {
      console.error('could not store analysis stage:', error)
      // The last stage returns the whole reading, so a failed write there costs
      // only the keeping of it. The earlier two are read back by the stage after
      // them: carrying on would send the office to a stage that cannot find its
      // input and fails with "the baseline has not been read yet", which says
      // nothing about what actually went wrong. Stop here and say so.
      if (stage !== 'assembly') {
        return NextResponse.json(
          {
            error:
              'The reading ran but could not be saved, so the next stage has nothing to build on. ' +
              'This is a database problem, not a problem with the answers.',
          },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      ...present(
        { fingerprint, law_version: LAW_VERSION, model: ANALYSIS_MODEL, duration_ms: durationMs, created_at: new Date().toISOString() },
        stored,
        fingerprint
      ),
      stored: !error,
    })
  } catch (err) {
    if (err instanceof NotEnoughAnswers) {
      return NextResponse.json({ error: err.message, notEnough: true }, { status: 422 })
    }
    console.error(`case analysis (${stage}) failed:`, err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'The reading could not be run.' },
      { status: 502 }
    )
  }
}

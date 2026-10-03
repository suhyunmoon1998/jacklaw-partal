import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
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
import { snapshotNow } from '@/lib/briefVersions'
import { loadAssignedSets } from '@/lib/assignedSets'
import { AnswerValue } from '@/types'


/*
 * Running one stage of a client's damages reading, shared by the two callers
 * allowed to: the admin panel (app/api/admin/clients/[id]/analysis) and
 * Eleanor, server to server, after Jack presses ANALYZE / REFRESH DAMAGES on
 * the case (app/api/eleanor/analysis). One body of code, so the two cannot
 * drift apart in what they store or what they refuse.
 */

/** Everything the reading is built from, gathered in one place. */
export async function gather(clientId: string): Promise<(AnalysisInput & { setsError: string | null }) | null> {
  const db = getSupabase()
  const [{ data: client }, { data: state }, { data: docs }, assigned] = await Promise.all([
    db.from('clients').select('id, name, case_type, case_name').eq('id', clientId).maybeSingle(),
    db.from('questionnaire_states').select('answers').eq('client_id', clientId).maybeSingle(),
    db.from('documents').select('name').eq('client_id', clientId),
    // Follow-up answers too. Without them a reading re-run after a client
    // answered a round reads exactly what it read before.
    loadAssignedSets(clientId),
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
    sets: assigned.sets,
    setsError: assigned.error,
  }
}

export async function load(clientId: string) {
  const { data } = await getSupabase()
    .from('case_analyses')
    .select('fingerprint, law_version, model, result, duration_ms, created_at')
    .eq('client_id', clientId)
    .maybeSingle()
  return data
}

/** What both verbs answer with, so the panel reads one shape either way. */
export function present(
  row: { fingerprint: string; law_version: string; model: string; duration_ms: number | null; created_at: string } | null,
  stored: StoredAnalysis,
  currentFingerprint: string
) {
  return {
    analysis: completed(stored),
    /**
     * Each stage's output on its own, so the panel can show the summary the
     * moment it lands rather than holding everything back for four minutes.
     * `analysis` stays: it is null until the reading is whole, which is what
     * tells the panel whether it is looking at a finished reading.
     */
    parts: stored,
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

/** One stage's result: the HTTP status and body both callers answer with, and what is now on file. */
export interface AnalysisStageResult {
  status: number
  body: Record<string, unknown>
  /** What is stored after the stage. Absent unless the stage ran. */
  stored?: StoredAnalysis
}

/**
 * Run one stage and keep what it produced.
 *
 * 'baseline' starts a fresh reading and discards whatever was on file, so a
 * re-run cannot end up with this week's findings sitting on last week's
 * baseline. The later stages build on what is stored.
 *
 * Returns a plain result rather than a response, because a third caller has
 * no request to answer: the reading started when a client submits Module 2,
 * and the night that finishes it (lib/damagesAuto.ts). All three go through
 * this one body, so none can store or refuse differently.
 */
export async function runAnalysisCore(clientId: string, stage: Stage): Promise<AnalysisStageResult> {
  const input = await gather(clientId)
  if (!input) return { status: 404, body: { error: 'Not found' } }
  // A reading taken without the follow-up answers would be stored as current
  // and read as whole. Refuse rather than pay for that.
  if (input.setsError) {
    return {
      status: 502,
      body: { error: `The client's question sets could not be read (${input.setsError}), so nothing was run.` },
    }
  }

  const row = await load(clientId)
  const fingerprint = analysisFingerprint(input)
  const before: StoredAnalysis = stage === 'baseline' ? {} : ((row?.result ?? {}) as StoredAnalysis)

  // Stages after the first build on the one before, and the answers may have
  // moved between requests. Carrying on would staple new findings to a baseline
  // drawn from different facts, so the reading restarts instead.
  if (stage !== 'baseline' && row && row.fingerprint !== fingerprint) {
    return {
      status: 409,
      body: {
        error: 'The answers changed while this was being read. Start the reading again.',
        restart: true,
      },
    }
  }

  // 'baseline' discards the damages reading on file. The brief built on it is
  // kept first, so the next version can say what the re-read changed.
  if (stage === 'baseline' && completed((row?.result ?? null) as StoredAnalysis | null)) {
    await snapshotNow(clientId, 'before the damages were read again')
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
          client_id: clientId,
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
      // The last stage returns the whole reading; any earlier one is read back
      // by the stage after it. This compared against 'assembly', which stopped
      // being last when 'inputs' was added after it.
      if (stage !== STAGES[STAGES.length - 1]) {
        return {
          status: 500,
          body: {
            error:
              'The reading ran but could not be saved, so the next stage has nothing to build on. ' +
              'This is a database problem, not a problem with the answers.',
          },
        }
      }
    }

    return {
      status: 200,
      body: {
        ...present(
          { fingerprint, law_version: LAW_VERSION, model: ANALYSIS_MODEL, duration_ms: durationMs, created_at: new Date().toISOString() },
          stored,
          fingerprint
        ),
        stored: !error,
      },
      stored,
    }
  } catch (err) {
    if (err instanceof NotEnoughAnswers) {
      return { status: 422, body: { error: err.message, notEnough: true } }
    }
    console.error(`case analysis (${stage}) failed:`, err)
    return {
      status: 502,
      body: { error: err instanceof Error ? err.message : 'The reading could not be run.' },
    }
  }
}

/** The same stage, answered as a response, for the admin panel and Eleanor. */
export async function runAnalysisStage(clientId: string, stage: Stage): Promise<NextResponse> {
  const result = await runAnalysisCore(clientId, stage)
  return NextResponse.json(result.body, { status: result.status })
}

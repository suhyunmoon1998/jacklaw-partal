import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { isAdmin } from '@/lib/adminAuth'
import { LAW_VERSION } from '@/lib/caLaw'
import {
  ANALYSIS_MODEL,
  AnalysisInput,
  NotEnoughAnswers,
  analysisFingerprint,
  analyzeCase,
} from '@/lib/caseAnalysis'
import { AnswerValue } from '@/types'

/**
 * A reading is several model calls, and it is slow.
 *
 * Measured end to end against a real 184-answer file: 260 seconds. The default
 * cuts that off partway and shows the office a failure for work that is still
 * running — and the office then presses the button again and pays for it twice.
 * The ceiling here is roughly double what was measured, because the number of
 * issues a file raises is what drives the time and this one was not the worst
 * case.
 */
export const maxDuration = 600

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
    // Titles only. What a document says is not read here; the analysis says
    // what to look for in them, which is a job for whoever opens the file.
    documents: (docs ?? []).map(d => String(d.name ?? '')).filter(Boolean),
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

  const { data: row } = await getSupabase()
    .from('case_analyses')
    .select('fingerprint, law_version, model, result, duration_ms, created_at')
    .eq('client_id', params.id)
    .maybeSingle()

  if (!row) return NextResponse.json({ analysis: null })

  return NextResponse.json({
    analysis: row.result,
    createdAt: row.created_at,
    model: row.model,
    durationMs: row.duration_ms,
    stale: row.fingerprint !== analysisFingerprint(input),
    // Named separately so a stale badge can say WHY, rather than leaving the
    // office to guess whether the client answered more or the law file moved.
    lawChanged: row.law_version !== LAW_VERSION,
  })
}

/** POST — run it now, and keep the result. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const input = await gather(params.id)
  if (!input) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const started = Date.now()
  try {
    const analysis = await analyzeCase(input)
    const durationMs = Date.now() - started

    const { error } = await getSupabase()
      .from('case_analyses')
      .upsert(
        {
          client_id: params.id,
          fingerprint: analysisFingerprint(input),
          law_version: LAW_VERSION,
          model: ANALYSIS_MODEL,
          result: analysis,
          duration_ms: durationMs,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'client_id' }
      )
    // A reading that could not be stored is still a reading. It is handed back
    // and the office is told it was not kept, rather than losing two minutes of
    // Opus to a database error.
    if (error) console.error('could not store analysis:', error)

    return NextResponse.json({
      analysis,
      createdAt: new Date().toISOString(),
      model: ANALYSIS_MODEL,
      durationMs,
      stale: false,
      lawChanged: false,
      stored: !error,
    })
  } catch (err) {
    if (err instanceof NotEnoughAnswers) {
      return NextResponse.json({ error: err.message, notEnough: true }, { status: 422 })
    }
    console.error('case analysis failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'The analysis could not be run.' },
      { status: 502 }
    )
  }
}

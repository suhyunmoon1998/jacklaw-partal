import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { advancesTo, getAssignmentDetail } from '@/lib/questionSets'
import { notifyFirmAssignmentCompleted } from '@/lib/sendAssignmentEmail'
import { AnswerValue, AssignmentStatus } from '@/types'

/**
 * Every request carries the client id the browser session holds, and it has to
 * match the assignment's owner. That is what stops one client's link from
 * opening another client's assignment.
 */
function authorize(assignmentClientId: string, requestClientId: string | null): boolean {
  return !!requestClientId && requestClientId === assignmentClientId
}

// GET /api/assignments/[id]?clientId=xxx
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const clientId = req.nextUrl.searchParams.get('clientId')

  const assignment = await getAssignmentDetail(params.id)
  if (!assignment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!authorize(assignment.clientId, clientId)) {
    return NextResponse.json({ error: 'This questionnaire belongs to a different client.' }, { status: 403 })
  }
  if (assignment.status === 'draft') {
    return NextResponse.json({ error: 'This questionnaire is not available yet.' }, { status: 404 })
  }

  return NextResponse.json({ assignment })
}

// POST /api/assignments/[id]  { clientId, answers, submitted? }
// `answers` carries only the questions that changed since the last save.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { clientId, answers, submitted } = await req.json()

  const supabase = getSupabase()
  const { data: row } = await supabase
    .from('client_question_set_assignments')
    .select('id, client_id, question_set_id, status')
    .eq('id', params.id)
    .maybeSingle()

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!authorize(row.client_id, clientId)) {
    return NextResponse.json({ error: 'This questionnaire belongs to a different client.' }, { status: 403 })
  }
  if (row.status === 'draft') {
    return NextResponse.json({ error: 'This questionnaire is not available yet.' }, { status: 404 })
  }

  const entries = Object.entries((answers ?? {}) as Record<string, AnswerValue>)
  if (entries.length > 0) {
    const { error } = await supabase
      .from('question_set_responses')
      .upsert(
        entries.map(([question_key, answer]) => ({
          assignment_id: params.id,
          client_id: row.client_id,
          question_set_id: row.question_set_id,
          question_key,
          answer,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: 'assignment_id,question_key' }
      )

    if (error) {
      console.error('assignment answer save error:', error)
      return NextResponse.json({ error: 'Save failed' }, { status: 500 })
    }
  }

  const current = row.status as AssignmentStatus
  const next: AssignmentStatus = submitted ? 'completed' : 'in_progress'

  // Status only ever moves forward, so reopening a completed set to re-read an
  // answer cannot knock it back to in_progress.
  if (advancesTo(current, next)) {
    const patch: Record<string, unknown> = { status: next, updated_at: new Date().toISOString() }
    if (next === 'completed') {
      patch.completed_at = new Date().toISOString()
      // Answered in one sitting without a prior autosave — record a start too.
      if (current !== 'in_progress') patch.started_at = new Date().toISOString()
    } else {
      patch.started_at = new Date().toISOString()
    }
    await supabase.from('client_question_set_assignments').update(patch).eq('id', params.id)

    // Fires once, on the transition into completed.
    if (next === 'completed') {
      const detail = await getAssignmentDetail(params.id)
      if (detail) {
        await notifyFirmAssignmentCompleted(
          detail.clientName,
          detail.questionSetName,
          detail.questions,
          detail.answers
        )
      }
    }
  }

  return NextResponse.json({ success: true })
}

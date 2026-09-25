import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { unreviewedRound } from '@/lib/followUpStore'
import { isAdmin } from '@/lib/adminAuth'
import { advancesTo, getAssignmentDetail, STATUS_TIMESTAMP } from '@/lib/questionSets'
import { AssignmentStatus } from '@/types'

// GET /api/admin/assignments/[id] — one assignment with its questions + answers
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const assignment = await getAssignmentDetail(params.id)
  if (!assignment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ assignment })
}

// PATCH /api/admin/assignments/[id]  { status }
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { status } = await req.json()
  const next = status as AssignmentStatus
  if (!STATUS_TIMESTAMP.hasOwnProperty(next)) {
    return NextResponse.json({ error: 'Unknown status.' }, { status: 400 })
  }

  const supabase = getSupabase()
  const { data: row } = await supabase
    .from('client_question_set_assignments')
    .select('status, sent_at')
    .eq('id', params.id)
    .maybeSingle()
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const current = row.status as AssignmentStatus

  // Leaving draft is what makes an assignment visible to the client, and for a
  // generated round of follow-up questions that is the thing a person has to
  // approve first. The send route already refused; this is the other door —
  // "Release to client" moves the status directly, so without this check the
  // gate could be walked around without anybody meaning to.
  if (current === 'draft' && next !== 'draft') {
    const unread = await unreviewedRound(params.id)
    if (unread) {
      return NextResponse.json(
        {
          error:
            'These questions were written by the follow-up reader and nobody has approved them yet. ' +
            'Open the client, read them under Analysis, and approve the round first.',
          needsReview: unread.planId,
        },
        { status: 409 }
      )
    }
  }
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  const now = new Date().toISOString()

  if (advancesTo(current, next)) {
    patch.status = next
    const stamp = STATUS_TIMESTAMP[next]
    if (stamp) patch[stamp] = now
  } else if (next === 'sent') {
    // "Mark sent" on a client who has already started: record that the link went
    // out — every time, so the date reflects the most recent send — but never
    // drag their progress back to Sent.
    patch.sent_at = now
  } else if (next === 'draft') {
    // The one deliberate step backwards — an admin parking an assignment so the
    // client stops seeing it.
    patch.status = 'draft'
  }

  const { error } = await supabase
    .from('client_question_set_assignments')
    .update(patch)
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: 'Could not update status.' }, { status: 500 })

  return NextResponse.json({ success: true })
}

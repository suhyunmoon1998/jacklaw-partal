import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { isAdmin } from '@/lib/adminAuth'
import { advancesTo, assignmentLink, getAssignmentDetail } from '@/lib/questionSets'
import { lookupClientEmail, sendAssignmentEmail } from '@/lib/sendAssignmentEmail'
import { AssignmentStatus } from '@/types'

// GET /api/admin/assignments/[id]/send — the link plus the email we would use
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const assignment = await getAssignmentDetail(params.id)
  if (!assignment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    link: assignmentLink(req.nextUrl.origin, params.id),
    email: await lookupClientEmail(assignment.clientId),
  })
}

// POST /api/admin/assignments/[id]/send  { email? }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const assignment = await getAssignmentDetail(params.id)
  if (!assignment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const to = String(body?.email ?? '').trim() || (await lookupClientEmail(assignment.clientId))
  const link = assignmentLink(req.nextUrl.origin, params.id)

  if (!to.includes('@')) {
    return NextResponse.json(
      { error: 'No email address on file for this client. Enter one, or copy the link and send it yourself.', link },
      { status: 400 }
    )
  }

  try {
    await sendAssignmentEmail({
      to,
      clientName: assignment.clientName || 'there',
      setName: assignment.questionSetName,
      // The set description is a staff-only note, so it stays out of the client's email.
      questionCount: assignment.questionCount,
      link,
    })
  } catch (err) {
    console.error('assignment send failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not send the email.', link },
      { status: 502 }
    )
  }

  // Recorded only after the email actually went out, so "Sent" on the admin
  // screen always means a message left the building. sent_at is stamped on every
  // send — including reminders to a client already working — while the status
  // only moves forward, so a reminder cannot drag their progress backwards.
  const now = new Date().toISOString()
  const patch: Record<string, unknown> = { updated_at: now, sent_at: now }
  if (advancesTo(assignment.status as AssignmentStatus, 'sent')) patch.status = 'sent'

  await getSupabase().from('client_question_set_assignments').update(patch).eq('id', params.id)

  return NextResponse.json({ sent: true, email: to, link })
}

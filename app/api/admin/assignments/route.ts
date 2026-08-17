import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { isAdmin } from '@/lib/adminAuth'
import { DEFAULT_SET_ID, listAssignments } from '@/lib/questionSets'

// GET /api/admin/assignments?clientId=xxx — every set assigned to one client
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clientId = req.nextUrl.searchParams.get('clientId')
  if (!clientId) return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })

  return NextResponse.json({ assignments: await listAssignments(clientId) })
}

// POST /api/admin/assignments  { clientId, questionSetId, asDraft? }
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { clientId, questionSetId, asDraft } = await req.json()
  if (!clientId || !questionSetId) {
    return NextResponse.json({ error: 'Missing clientId or questionSetId' }, { status: 400 })
  }

  if (questionSetId === DEFAULT_SET_ID) {
    return NextResponse.json(
      { error: 'Every client already has the default onboarding questionnaire — it does not need assigning.' },
      { status: 400 }
    )
  }

  const supabase = getSupabase()

  const { data: set } = await supabase
    .from('question_sets')
    .select('id, status')
    .eq('id', questionSetId)
    .maybeSingle()
  if (!set) return NextResponse.json({ error: 'Question set not found.' }, { status: 404 })

  const { data, error } = await supabase
    .from('client_question_set_assignments')
    .insert({
      client_id: clientId,
      question_set_id: questionSetId,
      status: asDraft ? 'draft' : 'assigned',
      created_by: 'admin',
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('assignment insert error:', error)
    return NextResponse.json({ error: 'Could not assign question set.' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}

// DELETE /api/admin/assignments?id=xxx — removes the assignment and its answers
export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await getSupabase().from('client_question_set_assignments').delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'Could not remove assignment.' }, { status: 500 })

  return NextResponse.json({ success: true })
}

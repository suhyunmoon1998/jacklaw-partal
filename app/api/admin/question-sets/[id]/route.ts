import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { isAdmin } from '@/lib/adminAuth'
import { DEFAULT_SET_ID, getQuestionSetDetail, normalizeQuestions, replaceQuestions } from '@/lib/questionSets'

// GET /api/admin/question-sets/[id] — the set and its ordered questions
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const set = await getQuestionSetDetail(params.id)
  if (!set) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ set })
}

// PATCH /api/admin/question-sets/[id]  { name?, description?, status?, questions? }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (params.id === DEFAULT_SET_ID) {
    return NextResponse.json(
      { error: 'The default onboarding questionnaire is built in and cannot be edited here. Duplicate it to make an editable copy.' },
      { status: 400 }
    )
  }

  const body = await req.json()
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (typeof body.name === 'string') {
    const name = body.name.trim()
    if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
    patch.name = name
  }
  if (typeof body.description === 'string') patch.description = body.description.trim()
  if (body.status === 'active' || body.status === 'archived') patch.status = body.status

  const { error } = await getSupabase().from('question_sets').update(patch).eq('id', params.id)
  if (error) {
    console.error('question set update error:', error)
    return NextResponse.json({ error: 'Could not save changes.' }, { status: 500 })
  }

  // Questions are replaced wholesale: the editor holds the whole list, and this
  // is what makes reordering and removal a single save.
  if (body.questions !== undefined) {
    await replaceQuestions(params.id, normalizeQuestions(body.questions))
  }

  return NextResponse.json({ success: true })
}

// DELETE /api/admin/question-sets/[id] — archives if already assigned to anyone
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (params.id === DEFAULT_SET_ID) {
    return NextResponse.json({ error: 'The default onboarding questionnaire cannot be deleted.' }, { status: 400 })
  }

  const supabase = getSupabase()

  const { count } = await supabase
    .from('client_question_set_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('question_set_id', params.id)

  // Deleting a set a client has already answered would orphan their answers, so
  // an assigned set is archived instead — it disappears from the assign picker
  // but every existing assignment keeps working.
  if ((count ?? 0) > 0) {
    const { error } = await supabase
      .from('question_sets')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', params.id)
    if (error) return NextResponse.json({ error: 'Could not archive.' }, { status: 500 })
    return NextResponse.json({ archived: true, assignments: count })
  }

  const { error } = await supabase.from('question_sets').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: 'Could not delete.' }, { status: 500 })

  return NextResponse.json({ deleted: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { isAdmin } from '@/lib/adminAuth'
import { getQuestionSetDetail, replaceQuestions } from '@/lib/questionSets'

// POST /api/admin/question-sets/[id]/duplicate  { name? }
// Also the way to fork the built-in onboarding questionnaire into an editable set.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const source = await getQuestionSetDetail(params.id)
  if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const name = String(body?.name ?? '').trim() || `${source.name} (Copy)`

  const { data: set, error } = await getSupabase()
    .from('question_sets')
    .insert({ name, name_es: source.nameEs || null, description: source.description })
    .select()
    .single()

  if (error || !set) {
    console.error('question set duplicate error:', error)
    return NextResponse.json({ error: 'Could not duplicate.' }, { status: 500 })
  }

  await replaceQuestions(set.id, source.questions)

  return NextResponse.json({ id: set.id })
}

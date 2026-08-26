import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { isAdmin } from '@/lib/adminAuth'
import {
  defaultQuestionSet,
  listQuestionSets,
  nameTranslationsFrom,
  normalizeQuestions,
  replaceQuestions,
  setNameColumns,
} from '@/lib/questionSets'

// GET /api/admin/question-sets — every reusable set, plus the built-in default
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sets = await listQuestionSets()
  // The default onboarding questionnaire lives in code, not in these tables, so
  // it is prepended here rather than seeded into the database where the two
  // copies could drift apart.
  return NextResponse.json({ sets: [defaultQuestionSet(), ...sets] })
}

// POST /api/admin/question-sets  { name, description?, questions? }
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const name = String(body.name ?? '').trim()
  if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 })

  const questions = normalizeQuestions(body.questions)
  if (questions.length === 0) {
    return NextResponse.json({ error: 'Add at least one usable question.' }, { status: 400 })
  }

  const { data: set, error } = await getSupabase()
    .from('question_sets')
    .insert({
      name,
      ...setNameColumns(nameTranslationsFrom(body.nameTranslations)),
      description: String(body.description ?? '').trim(),
    })
    .select()
    .single()

  if (error || !set) {
    console.error('question set insert error:', error)
    return NextResponse.json({ error: 'Could not create question set.' }, { status: 500 })
  }

  try {
    await replaceQuestions(set.id, questions)
  } catch (err) {
    // The set row exists but has no questions — remove it rather than leaving
    // an empty set in the picker.
    await getSupabase().from('question_sets').delete().eq('id', set.id)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not save the questions.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ id: set.id })
}

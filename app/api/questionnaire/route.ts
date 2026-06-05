import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

// GET /api/questionnaire?clientId=xxx
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get('clientId')
  if (!clientId) return NextResponse.json({ state: null }, { status: 400 })

  const { data } = await getSupabase()
    .from('questionnaire_states')
    .select('*')
    .eq('client_id', clientId)
    .maybeSingle()

  if (!data) {
    return NextResponse.json({
      state: { answers: {}, completedSections: [], submitted: false, lastSaved: '' },
    })
  }

  return NextResponse.json({
    state: {
      answers: data.answers,
      completedSections: data.completed_sections,
      submitted: data.submitted,
      lastSaved: data.last_saved ?? '',
    },
  })
}

// POST /api/questionnaire  { clientId, answers, completedSections, submitted }
export async function POST(req: NextRequest) {
  const { clientId, answers, completedSections, submitted } = await req.json()
  if (!clientId) return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })

  const { error } = await getSupabase()
    .from('questionnaire_states')
    .upsert({
      client_id: clientId,
      answers,
      completed_sections: completedSections,
      submitted: submitted ?? false,
      last_saved: new Date().toISOString(),
    }, { onConflict: 'client_id' })

  if (error) {
    console.error('questionnaire save error:', error)
    return NextResponse.json({ error: 'Save failed' }, { status: 500 })
  }

  // Update client onboarding status
  const status = submitted ? 'completed' : completedSections.length > 0 ? 'in_progress' : 'not_started'
  await getSupabase().from('clients').update({ onboarding_status: status }).eq('id', clientId)

  return NextResponse.json({ success: true })
}

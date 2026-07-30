import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { sendIntakeNotificationEmails } from '@/lib/sendIntakeEmail'

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

  const supabase = getSupabase()

  const { data: existing } = await supabase
    .from('questionnaire_states')
    .select('submitted')
    .eq('client_id', clientId)
    .maybeSingle()
  const wasSubmitted = existing?.submitted ?? false

  const { error } = await supabase
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
  await supabase.from('clients').update({ onboarding_status: status }).eq('id', clientId)

  // Notify the firm the moment a client's intake first reaches 100% (submitted transitions false -> true).
  // Keyed off the DB's prior state rather than the client's request, so it fires exactly once even if
  // the client retries the save or the browser is closed right after submit.
  if (submitted && !wasSubmitted) {
    const { data: client } = await supabase
      .from('clients')
      .select('name, case_type')
      .eq('id', clientId)
      .maybeSingle()

    if (client) {
      await sendIntakeNotificationEmails(client.name, client.case_type, answers)
    }
  }

  return NextResponse.json({ success: true })
}

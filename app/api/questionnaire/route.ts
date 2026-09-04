import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { sendIntakeNotificationEmails } from '@/lib/sendIntakeEmail'

/**
 * Both modules write here.
 *
 * The answers are one record — Module 2 asks nothing Module 1 established, and
 * its skip logic reads Module 1's answers directly, which only works if they
 * live together. What is kept apart is how far through each module the client
 * is, so finishing one says nothing about the other.
 */
type ModuleId = 'module1' | 'module2'

const PROGRESS_COLUMNS: Record<ModuleId, { sections: string; submitted: string; saved: string }> = {
  module1: { sections: 'completed_sections', submitted: 'submitted', saved: 'last_saved' },
  module2: { sections: 'm2_completed_sections', submitted: 'm2_submitted', saved: 'm2_last_saved' },
}

const asModule = (value: unknown): ModuleId => (value === 'module2' ? 'module2' : 'module1')

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
      state: {
        answers: {},
        completedSections: [],
        submitted: false,
        lastSaved: '',
        module2: { completedSections: [], submitted: false, lastSaved: '' },
      },
    })
  }

  return NextResponse.json({
    state: {
      answers: data.answers,
      completedSections: data.completed_sections,
      submitted: data.submitted,
      lastSaved: data.last_saved ?? '',
      // Defaulted rather than assumed: a row written before Module 2 existed
      // has nulls here until the migration's defaults are applied.
      module2: {
        completedSections: data.m2_completed_sections ?? [],
        submitted: data.m2_submitted ?? false,
        lastSaved: data.m2_last_saved ?? '',
      },
    },
  })
}

// POST /api/questionnaire  { clientId, answers, completedSections, submitted }
export async function POST(req: NextRequest) {
  const { clientId, answers, completedSections, submitted, module } = await req.json()
  if (!clientId) return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })

  const moduleId = asModule(module)
  const column = PROGRESS_COLUMNS[moduleId]
  const supabase = getSupabase()

  const { data: existing } = await supabase
    .from('questionnaire_states')
    .select('submitted, m2_submitted')
    .eq('client_id', clientId)
    .maybeSingle()
  const wasSubmitted = Boolean(
    moduleId === 'module1' ? existing?.submitted : existing?.m2_submitted
  )

  const { error } = await supabase
    .from('questionnaire_states')
    .upsert({
      client_id: clientId,
      answers,
      [column.sections]: completedSections,
      [column.submitted]: submitted ?? false,
      [column.saved]: new Date().toISOString(),
      // Every write touches last_saved so the office can see the file moved,
      // whichever module the client was in.
      last_saved: new Date().toISOString(),
    }, { onConflict: 'client_id' })

  if (error) {
    console.error('questionnaire save error:', error)
    return NextResponse.json({ error: 'Save failed' }, { status: 500 })
  }

  // Onboarding status speaks for Module 1, which is the questionnaire every
  // client receives. Module 2 progress shows on its own row in the admin panel.
  if (moduleId === 'module1') {
    const status = submitted ? 'completed' : completedSections.length > 0 ? 'in_progress' : 'not_started'
    await supabase.from('clients').update({ onboarding_status: status }).eq('id', clientId)
  }

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

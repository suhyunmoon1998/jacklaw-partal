import { NextRequest, NextResponse, after } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { sendIntakeNotificationEmails } from '@/lib/sendIntakeEmail'
import { submissionLanguage } from '@/lib/machineTranslate'
import { denyClient } from '@/lib/clientAuth'
import { readDamagesWhileTimeAllows } from '@/lib/damagesAuto'

/**
 * Long enough for the damages reading begun after a Module 2 submission
 * (below). The client's request is answered first; only that work runs on.
 */
export const maxDuration = 300

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

  const denied = denyClient(req, clientId)
  if (denied) return denied

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

  const denied = denyClient(req, clientId)
  if (denied) return denied

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
      .select('name, case_type, portal_lang')
      .eq('id', clientId)
      .maybeSingle()

    if (client) {
      // Whichever says the client wrote in something other than English: the
      // portal language, or the answers themselves. Gustavo Arce Cordero reads
      // the portal in English and answered in Spanish, so neither alone is
      // enough.
      const lang = [client.portal_lang, submissionLanguage(answers)].find(l => l && l !== 'en') ?? 'en'
      await sendIntakeNotificationEmails(client.name, client.case_type, answers, moduleId, lang)
    }

    // Module 2 is where the pay, the hours and the breaks are answered, so the
    // damages reading starts the moment it is submitted — once, on the same
    // false-to-true transition as the notice above (owner's decision,
    // 2026-10-03). After the client has their answer; whatever this request's
    // clock does not cover, the nightly run finishes (lib/damagesAuto.ts).
    if (moduleId === 'module2') {
      const began = Date.now()
      try {
        after(async () => {
          try {
            const run = await readDamagesWhileTimeAllows(clientId, began)
            console.log(
              `damages on Module 2 for ${clientId}: ${run.ran ? `read ${run.stages.join(', ')}` : 'did not run'}` +
                `${run.next ? `; ${run.next} next` : ''}${run.reason ? ` (${run.reason})` : ''}`
            )
          } catch (err) {
            console.error(`damages on Module 2 for ${clientId} failed; the night will try:`, err)
          }
        })
      } catch (err) {
        // Outside a request (a test, a script) there is nothing to run after.
        console.warn('damages on Module 2 not scheduled:', err)
      }
    }
  }

  return NextResponse.json({ success: true })
}

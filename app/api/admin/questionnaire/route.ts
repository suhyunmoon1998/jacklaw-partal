import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

function isAdmin(req: NextRequest) {
  return req.headers.get('x-admin-key') === process.env.ADMIN_PASSWORD
}

// GET /api/admin/questionnaire?clientId=xxx
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clientId = req.nextUrl.searchParams.get('clientId')
  if (!clientId) return NextResponse.json({ state: null }, { status: 400 })

  const { data } = await getSupabase()
    .from('questionnaire_states')
    .select('*')
    .eq('client_id', clientId)
    .maybeSingle()

  /**
   * Both modules, not just the first.
   *
   * The row was selected whole and then only Module 1's columns were mapped
   * out of it, so `module2` came back undefined. Every screen reading this
   * fell to its default — completedSections: [], submitted: false — and drew
   * "Not Started" for a client who had finished Module 2 and whose own record
   * said m2_submitted. The two screens disagreed about the same client in the
   * same modal: the list showed 100% because it reads a different route, which
   * does map these columns.
   */
  return NextResponse.json({
    state: data
      ? {
          answers: data.answers,
          completedSections: data.completed_sections ?? [],
          submitted: Boolean(data.submitted),
          lastSaved: data.last_saved ?? '',
          module2: {
            completedSections: data.m2_completed_sections ?? [],
            submitted: Boolean(data.m2_submitted),
            lastSaved: data.m2_last_saved ?? '',
          },
        }
      : {
          answers: {},
          completedSections: [],
          submitted: false,
          lastSaved: '',
          module2: { completedSections: [], submitted: false, lastSaved: '' },
        },
  })
}

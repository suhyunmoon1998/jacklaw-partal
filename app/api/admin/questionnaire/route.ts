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

  return NextResponse.json({
    state: data
      ? { answers: data.answers, completedSections: data.completed_sections, submitted: data.submitted, lastSaved: data.last_saved ?? '' }
      : { answers: {}, completedSections: [], submitted: false, lastSaved: '' },
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { ModuleId } from '@/lib/modules'

const asModule = (value: unknown): ModuleId | null =>
  value === 'module1' || value === 'module2' || value === 'module3' ? value : null

/**
 * POST /api/modules/opened  { clientId, moduleId }
 *
 * Records the first time a client actually opened a step we sent them.
 *
 * Only ever called from a questionnaire the client can really open. A step they
 * were shown the locked screen for has not been opened in any sense the office
 * cares about, and stamping it there would burn the "New" badge for the day the
 * step actually unlocks.
 *
 * The update names both columns, so it can only touch a send row that already
 * exists — an invented client id writes nothing.
 *
 * Failure is silent by design. This is a read receipt on a questionnaire, and
 * nothing about the client's ability to answer it should depend on the receipt
 * being written.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const clientId = typeof body?.clientId === 'string' ? body.clientId.trim() : ''
  const moduleId = asModule(body?.moduleId)
  if (!clientId || !moduleId) {
    return NextResponse.json({ recorded: false }, { status: 400 })
  }

  const { error } = await getSupabase()
    .from('client_module_sends')
    .update({ opened_at: new Date().toISOString() })
    .eq('client_id', clientId)
    .eq('module_id', moduleId)

  if (error) {
    console.error('could not record that the client opened a step:', error)
    return NextResponse.json({ recorded: false }, { status: 500 })
  }

  return NextResponse.json({ recorded: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { isEleanorService } from '@/lib/eleanorService'
import { STAGES, Stage } from '@/lib/caseAnalysisShape'
import { runAnalysisStage } from '@/lib/analysisRun'

export const dynamic = 'force-dynamic'
/** Each stage is one request, inside the hosting plan's 300-second cap (see the admin route). */
export const maxDuration = 300

/**
 * One stage of a client's damages reading, run for Eleanor.
 *
 * Jack presses ANALYZE / REFRESH DAMAGES on a case in Eleanor; Eleanor walks the
 * reading's stages here one request at a time, exactly as the admin panel does,
 * and reads the stored result back from the shared database. Nothing reaches the
 * client, nothing is sent, and no answer leaves this server in the reply beyond
 * what the admin panel's own reply carries.
 *
 * The same code as the admin panel's Run (lib/analysisRun.ts), so a reading
 * started in one can be continued in the other. Only Eleanor's server holds the
 * secret (lib/eleanorService.ts).
 */

const noStore = { 'Cache-Control': 'no-store' }
const clientIdOf = (value: unknown) => (typeof value === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(value.trim()) ? value.trim() : null)

export async function POST(req: NextRequest) {
  if (!isEleanorService(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStore })
  const body = await req.json().catch(() => null)
  const clientId = clientIdOf(body?.clientId)
  const stage = String(body?.stage ?? '') as Stage
  if (!clientId || !STAGES.includes(stage)) {
    return NextResponse.json({ error: `Send a clientId and one of: ${STAGES.join(', ')}.` }, { status: 400, headers: noStore })
  }
  const response = await runAnalysisStage(clientId, stage)
  response.headers.set('Cache-Control', 'no-store')
  return response
}

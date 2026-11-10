import { NextRequest, NextResponse } from 'next/server'
import { isEleanorService } from '@/lib/eleanorService'
import { holdingsWithStatus, proposeHolding } from '@/lib/authority/fetchedOpinionStore'

export const dynamic = 'force-dynamic'

/**
 * Holdings proposed from an opinion Eleanor fetched. POST proposes one: refused
 * unless its quotation is in the stored text word for word and it names elements
 * the claim library holds. Proposed is all Eleanor can make it — an attorney
 * approves or rejects on the admin screen. GET lists those waiting.
 */
const noStore = { 'Cache-Control': 'no-store' }

export async function GET(req: NextRequest) {
  if (!isEleanorService(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStore })
  const proposed = await holdingsWithStatus('Proposed')
  return NextResponse.json(
    { proposed: proposed.map(({ opinion: { text: _text, ...opinion }, ...h }) => ({ ...h, opinion })) },
    { headers: noStore }
  )
}

export async function POST(req: NextRequest) {
  if (!isEleanorService(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStore })
  const body = await req.json().catch(() => null)
  const result = await proposeHolding({ ...(body && typeof body === 'object' ? body : {}), proposedBy: 'Eleanor' })
  const status = result.ok ? 200 : result.reason === 'StoreFailed' ? 503 : result.reason === 'IdTaken' ? 409 : 400
  return NextResponse.json(result, { status, headers: noStore })
}

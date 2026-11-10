import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/adminAuth'
import { decideHolding, holdingsWithStatus } from '@/lib/authority/fetchedOpinionStore'

export const dynamic = 'force-dynamic'

/** The attorney's review of holdings proposed from fetched opinions: list them, approve or reject one. */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const status = req.nextUrl.searchParams.get('status')
  const wanted = status === 'Approved' || status === 'Rejected' ? status : 'Proposed'
  return NextResponse.json({ holdings: await holdingsWithStatus(wanted) }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null)
  const id = typeof body?.id === 'string' ? body.id.trim() : ''
  const decision = body?.decision === 'Approved' || body?.decision === 'Rejected' ? body.decision : null
  if (!id || !decision) return NextResponse.json({ error: 'Send an id and a decision (Approved or Rejected).' }, { status: 400 })
  // The admin session is the office's; the decision is recorded as the attorney's.
  const result = await decideHolding(id, decision, 'Jack')
  return NextResponse.json(result, { status: result.ok ? 200 : result.reason === 'NotProposed' ? 409 : 503 })
}

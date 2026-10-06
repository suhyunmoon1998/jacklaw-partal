import { NextRequest, NextResponse } from 'next/server'
import { verifiedPhone } from '@/lib/clientAuth'
import { caseChoices, clientsOnNumber } from '@/lib/clientCases'

export const dynamic = 'force-dynamic'

/**
 * POST /api/clients/lookup
 *
 * The cases on the number this browser has just proved it holds.
 *
 * It used to take a phone number in the body and answer, to anyone, with the
 * name and the case on it — so an employer who knew a worker's number learned
 * the worker was a client, and what the case was called. Now it takes nothing
 * from the caller: the number comes from the cookie the texted code set
 * (app/api/clients/code/verify), and without one the answer is empty.
 */
export async function POST(req: NextRequest) {
  const number = verifiedPhone(req)
  if (!number) {
    return NextResponse.json({ clients: [] }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  }
  try {
    const clients = await caseChoices(await clientsOnNumber(number))
    return NextResponse.json({ clients }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('lookup error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ clients: [] }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}

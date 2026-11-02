import { NextRequest, NextResponse } from 'next/server'
import { origin } from '@/lib/assignmentInvite'
import { readBookingRequest } from '@/lib/consultations/request'
import { book } from '@/lib/consultations/store'

/**
 * POST /api/consultations
 *   { start, name, email, phone, adverseParty, otherParties, summary, ack, lang }
 *
 * Books a free consultation (lib/consultations/store.ts). Every refusal is a
 * `reason` or a `field` the page shows in the client's language:
 *
 *   field        that box is missing or wrong
 *   taken   409  someone took the time first; pick another
 *   limit   409  this address or number already holds upcoming bookings
 *   unavailable  the calendar or the database would not take it; nothing was booked
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const read = readBookingRequest(body)
  if ('bot' in read) return NextResponse.json({ ok: true })
  if ('field' in read) return NextResponse.json({ field: read.field }, { status: 400 })

  try {
    const result = await book(read.request, origin(req))
    if (!result.ok) {
      const status = result.reason === 'taken' || result.reason === 'limit' ? 409 : 503
      return NextResponse.json({ reason: result.reason }, { status })
    }
    return NextResponse.json({
      id: result.id,
      start: result.start.toISOString(),
      end: result.end.toISOString(),
      meetUrl: result.meetUrl,
    })
  } catch (err) {
    console.error('consultation booking:', err instanceof Error ? err.message : err)
    return NextResponse.json({ reason: 'unavailable' }, { status: 503 })
  }
}

import { NextResponse } from 'next/server'
import { DURATION_MINUTES, OFFICE_TIME_ZONE } from '@/lib/consultations/config'
import { hostAvailability } from '@/lib/consultations/availability'
import { openSlots } from '@/lib/consultations/slots'

/**
 * GET /api/consultations/slots
 *
 * The times /book offers: every date in the horizon with the start times at
 * least one host can take. Says nothing about who the hosts are or what is on
 * their calendars — only that a time is open.
 *
 * `open: false` when online booking cannot work at all (no calendar access, or
 * no hosts), so the page can say "call us" instead of showing an empty week.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const now = new Date()
    const { hosts } = await hostAvailability(now)
    const days = openSlots(hosts, now)
    return NextResponse.json(
      { open: hosts.length > 0, timeZone: OFFICE_TIME_ZONE, durationMinutes: DURATION_MINUTES, days },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err) {
    console.error('consultation slots:', err instanceof Error ? err.message : err)
    return NextResponse.json({ reason: 'unavailable' }, { status: 503 })
  }
}

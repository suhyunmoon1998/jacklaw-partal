import { NextRequest, NextResponse } from 'next/server'
import { isEleanorService } from '@/lib/eleanorService'
import { claimIdsFrom, readClientAuthorityPack } from '@/lib/authorityPackStore'

export const dynamic = 'force-dynamic'

/**
 * A client's Authority Pack, for Eleanor: the provisions and holdings on file
 * for each claim the case reading raises, with when each was fetched, when the
 * pack is due to be checked again, and what it cannot settle. The same rule as
 * /api/eleanor/authority: Eleanor is handed the office's record, not asked what
 * the law says. Only Eleanor's server holds the secret (lib/eleanorService.ts).
 */
const noStore = { 'Cache-Control': 'no-store' }
const clientIdOf = (value: string | null) => (value && /^[A-Za-z0-9_-]{1,100}$/.test(value.trim()) ? value.trim() : null)

export async function GET(req: NextRequest) {
  if (!isEleanorService(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStore })
  const clientId = clientIdOf(req.nextUrl.searchParams.get('clientId'))
  if (!clientId) return NextResponse.json({ error: 'Send a clientId.' }, { status: 400, headers: noStore })
  try {
    const pack = await readClientAuthorityPack(clientId, claimIdsFrom(req.nextUrl.searchParams.get('claims')))
    return NextResponse.json(pack, { headers: noStore })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not build the pack.' }, { status: 500, headers: noStore })
  }
}

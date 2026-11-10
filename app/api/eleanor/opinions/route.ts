import { NextRequest, NextResponse } from 'next/server'
import { isEleanorService } from '@/lib/eleanorService'
import { listOpinions, saveOpinion } from '@/lib/authority/fetchedOpinionStore'

export const dynamic = 'force-dynamic'

/**
 * Opinions and DLSE precedents Eleanor fetched from the issuing body, kept in full
 * (lib/authority/fetchedOpinions.ts). POST stores one — the source must be one
 * of the closed list, and a key already held with other text is refused; GET
 * lists what is held, without the texts. Public law, no client data. Only
 * Eleanor's server holds the secret.
 */
const noStore = { 'Cache-Control': 'no-store' }

export async function GET(req: NextRequest) {
  if (!isEleanorService(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStore })
  return NextResponse.json({ opinions: await listOpinions() }, { headers: noStore })
}

export async function POST(req: NextRequest) {
  if (!isEleanorService(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStore })
  const result = await saveOpinion(await req.json().catch(() => null))
  const status = result.ok ? 200 : result.reason === 'StoreFailed' ? 503 : result.reason === 'KeyHeldWithOtherText' ? 409 : 400
  return NextResponse.json(result, { status, headers: noStore })
}

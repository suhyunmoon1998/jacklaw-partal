import { NextRequest, NextResponse } from 'next/server'
import { isEleanorService } from '@/lib/eleanorService'
import { CLAIMS } from '@/lib/authority/claims'

export const dynamic = 'force-dynamic'

/**
 * The claim catalog, for Eleanor to label a stored reading.
 *
 * A stored reading names each claim by id ("meal-periods"). The name the office
 * uses and the provisions each claim is read out of live here, written by hand
 * (lib/authority/claims.ts). Eleanor shows them beside the reading rather than
 * keeping a second copy that could drift from this one. No client data; only
 * Eleanor's server holds the secret.
 */
export async function GET(req: NextRequest) {
  if (!isEleanorService(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  return NextResponse.json(
    {
      claims: CLAIMS.map(claim => ({
        id: claim.id,
        name: claim.name,
        sections: claim.sections,
        caci: claim.caci ?? null,
        elements: claim.elements.map(element => ({ key: element.key, says: element.says, from: element.from })),
      })),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

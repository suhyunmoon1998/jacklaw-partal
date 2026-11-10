import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/adminAuth'
import { claimIdsFrom, readClientAuthorityPack } from '@/lib/authorityPackStore'

export const dynamic = 'force-dynamic'

/** The client's Authority Pack, for the office's screen. Reads only. */
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    return NextResponse.json(await readClientAuthorityPack(params.id, claimIdsFrom(req.nextUrl.searchParams.get('claims'))), {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not build the pack.' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { isEleanorService } from '@/lib/eleanorService'
import { FETCHED_ON } from '@/lib/authority'
import { readAuthority, searchAuthority } from '@/lib/authority/lookup'

export const dynamic = 'force-dynamic'

/**
 * California authority on file, for Eleanor to quote rather than remember.
 *
 *   POST { q: "meal period waiver", limit: 8 }       the best-matching provisions and holdings
 *   POST { keys: ["Lab. Code § 512", "IWC 5 sec 11"] }  those provisions, word for word
 *
 * Public law fetched from the bodies that issue it (lib/authority/index.ts) and
 * the office's verbatim holdings; no client data. Only Eleanor's server holds
 * the secret. A POST body, not a query string, so a question — which can still
 * name a client — never sits in a URL or a request log; nothing here logs it.
 */
const NOTE =
  'Text as fetched from the issuing body on the date given with each provision, held by the JackLaw Portal. ' +
  'Check the current text before relying on it in a filing. Which IWC Wage Order governs turns on the ' +
  "employer's industry and is an attorney's decision. Anything not on file is not stated."

const noStore = { 'Cache-Control': 'no-store' }

export async function POST(req: NextRequest) {
  if (!isEleanorService(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStore })
  const body = (await req.json().catch(() => null)) as { q?: unknown; limit?: unknown; keys?: unknown } | null
  const keys = Array.isArray(body?.keys) ? body.keys.filter((k): k is string => typeof k === 'string').map(k => k.trim()).filter(Boolean) : []
  const q = typeof body?.q === 'string' ? body.q.trim() : ''

  if (keys.length) {
    if (keys.length > 4 || keys.some(k => k.length > 80)) {
      return NextResponse.json({ error: 'At most four keys, each under 80 characters.' }, { status: 400, headers: noStore })
    }
    return NextResponse.json({ note: NOTE, items: readAuthority(keys) }, { headers: noStore })
  }
  if (q) {
    if (q.length > 200) return NextResponse.json({ error: 'Ask in under 200 characters.' }, { status: 400, headers: noStore })
    const limit = typeof body?.limit === 'number' && Number.isInteger(body.limit) ? body.limit : 8
    return NextResponse.json(
      { note: NOTE, caciSupplement: FETCHED_ON.caciSupplement ?? null, hits: searchAuthority(q, limit) },
      { headers: noStore }
    )
  }
  return NextResponse.json({ error: 'Send { q } to search or { keys } to read.' }, { status: 400, headers: noStore })
}

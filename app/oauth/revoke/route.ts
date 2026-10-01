import { NextRequest, NextResponse } from 'next/server'
import { mcpConfig, noStore } from '@/lib/mcp/auth'
import { revokeRefreshToken } from '@/lib/mcp/refresh'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function POST(req: NextRequest) {
  const fail = (error: string, status = 400) => NextResponse.json({ error }, { status, headers: noStore })
  const c = mcpConfig()
  if (!c) return fail('temporarily_unavailable', 503)
  if (!req.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')) return fail('invalid_request')
  const raw = await req.text()
  if (raw.length > 12_000) return fail('invalid_request', 413)
  const p = new URLSearchParams(raw)
  if ([...p.keys()].some(k => p.getAll(k).length !== 1)) return fail('invalid_request')
  if (p.get('client_id') !== c.clientId) return fail('invalid_client')
  const token = p.get('token') ?? ''
  if (!token) return fail('invalid_request')
  // RFC 7009: unknown/revoked tokens also return success without revealing their status.
  if (/^[A-Za-z0-9_-]{43}$/.test(token)) {
    try { await revokeRefreshToken(token) } catch { return fail('temporarily_unavailable', 503) }
  }
  return new NextResponse(null, { status: 200, headers: noStore })
}

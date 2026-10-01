import { NextRequest, NextResponse } from 'next/server'
import { challenge, issueToken, mcpConfig, noStore, READ_SCOPE, TOKEN_SECONDS } from '@/lib/mcp/auth'
import { consumeCode } from '@/lib/mcp/codes'

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
  if (p.get('grant_type') !== 'authorization_code') return fail('unsupported_grant_type')
  if (p.get('client_id') !== c.clientId) return fail('invalid_client')
  if (p.get('resource') !== c.resource || !c.redirects.includes(p.get('redirect_uri') ?? '')) return fail('invalid_grant')
  const code = p.get('code') ?? '', verifier = p.get('code_verifier') ?? ''
  if (!/^[A-Za-z0-9_-]{43}$/.test(code) || !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) return fail('invalid_grant')
  try {
    if (!await consumeCode(code, c.clientId, p.get('redirect_uri')!, c.resource, challenge(verifier))) return fail('invalid_grant')
    return NextResponse.json({ access_token: await issueToken(), token_type: 'Bearer', expires_in: TOKEN_SECONDS, scope: READ_SCOPE }, { headers: noStore })
  } catch { return fail('temporarily_unavailable', 503) }
}

import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/adminAuth'
import { consentSeal, mcpConfig, noStore, parseGrant, validConsent } from '@/lib/mcp/auth'
import { saveCode } from '@/lib/mcp/codes'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status, headers: noStore })

export async function GET(req: NextRequest) {
  if (!mcpConfig()) return fail('MCP is not configured', 503)
  const grant = parseGrant(req.nextUrl.searchParams)
  if (!grant) return fail('Invalid authorization request')
  const expires = String(Date.now() + 600_000)
  const hidden = [...req.nextUrl.searchParams, ['expires', expires], ['seal', consentSeal(req, grant, expires)]]
    .map(([name, value]) => `<input type="hidden" name="${escape(name)}" value="${escape(value)}">`).join('')
  const content = isAdmin(req)
    ? `<p>This connection lets ChatGPT read all clients' names, intake answers, document metadata, fact records and stored case analyses available to the office administrator.</p>
       <p>It cannot send messages, change records, download document contents, or start paid analyses. Access tokens last one hour and renew automatically. Reconnect after 30 days without renewal or after 90 days total. Disconnect in ChatGPT to stop using this connection. The office can revoke all connections by rotating its admin password or MCP signing secret.</p>
       <p>OAuth client: <strong>${escape(grant.client_id)}</strong></p><p>Return address: ${escape(grant.redirect_uri)}</p>
       <form method="post" action="/oauth/authorize">${hidden}<button name="decision" value="allow">Allow read access</button> <button name="decision" value="deny">Cancel</button></form>`
    : '<p>Sign in to the staff portal in another tab, then reload this page to review the connection.</p><p><a href="/admin" target="_blank" rel="noopener noreferrer">Open staff sign-in</a></p>'
  return new NextResponse(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Connect JackLaw Portal</title><body><main><h1>Connect JackLaw Portal</h1>${content}</main></body></html>`, {
    headers: { ...noStore, 'Content-Type': 'text/html; charset=utf-8', 'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'" },
  })
}

export async function POST(req: NextRequest) {
  if (!mcpConfig()) return fail('MCP is not configured', 503)
  if (!isAdmin(req)) return fail('Staff sign-in required', 401)
  if (!req.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')) return fail('Invalid form')
  const raw = await req.text()
  if (raw.length > 12_000) return fail('Request too large', 413)
  const params = new URLSearchParams(raw)
  const grant = parseGrant(params)
  if (!grant || !validConsent(req, grant, params.get('expires') ?? '', params.get('seal') ?? '')) return fail('Invalid consent', 403)
  const decision = params.get('decision')
  if (decision !== 'allow' && decision !== 'deny') return fail('Invalid decision')
  const redirect = new URL(grant.redirect_uri)
  redirect.searchParams.set('state', grant.state)
  redirect.searchParams.set('iss', mcpConfig()!.origin)
  if (decision === 'deny') redirect.searchParams.set('error', 'access_denied')
  else {
    try { redirect.searchParams.set('code', await saveCode(grant)) }
    catch { return fail('Authorization could not be saved', 503) }
  }
  return new NextResponse(null, { status: 303, headers: { ...noStore, Location: redirect.toString(), 'Referrer-Policy': 'no-referrer' } })
}

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { ADMIN_COOKIE, mintAdminSession } from '@/lib/adminAuth'
import { authorizationEpoch, authorized, challenge, consentSeal, issueToken, mcpConfig, parseGrant, READ_SCOPE, validConsent } from '@/lib/mcp/auth'
import { POST, GET } from '@/app/api/mcp/route'
import { GET as consentPage, POST as consentPost } from '@/app/oauth/authorize/route'
import { POST as exchange } from '@/app/oauth/token/route'
import { POST as revoke } from '@/app/oauth/revoke/route'
import { GET as metadata } from '@/app/.well-known/oauth-authorization-server/route'

const db = vi.hoisted(() => ({ results: [] as { data: unknown; error: unknown }[], calls: [] as unknown[][] }))
vi.mock('@/lib/supabase', () => ({ getSupabase: () => ({ rpc: (name: string, args: unknown) => { db.calls.push(['rpc', name, args]); return Promise.resolve(db.results.shift() ?? { data: null, error: null }) }, from: (table: string) => {
  const response = db.results.shift() ?? { data: null, error: null }
  db.calls.push(['from', table])
  const chain: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'is', 'gt', 'order', 'range', 'ilike', 'insert', 'delete', 'maybeSingle']) {
    chain[method] = (...args: unknown[]) => { db.calls.push([method, ...args]); return chain }
  }
  chain.then = (resolve: (value: unknown) => void) => Promise.resolve(response).then(resolve)
  return chain
} }) }))

const origin = 'https://portal.example'
const callback = 'https://chatgpt.com/connector_platform_oauth_redirect'
const verifier = 'v'.repeat(43)
function grantParams() {
  return new URLSearchParams({ response_type: 'code', client_id: 'jacklaw-test', redirect_uri: callback,
    resource: `${origin}/api/mcp`, scope: READ_SCOPE, code_challenge_method: 'S256', code_challenge: challenge(verifier), state: 'opaque-state' })
}
function adminCookie() { return `${ADMIN_COOKIE}=${mintAdminSession(process.env.ADMIN_PASSWORD!).value}` }
async function rpc(method: string, params: unknown = {}) {
  return POST(new NextRequest(`${origin}/api/mcp`, { method: 'POST',
    headers: { authorization: `Bearer ${await issueToken()}`, 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) }))
}
async function call(name: string, args: unknown) {
  const response = await rpc('tools/call', { name, arguments: args })
  expect(response.status).toBe(200)
  return (await response.json()).result
}

beforeEach(() => {
  vi.stubEnv('MCP_PUBLIC_ORIGIN', origin)
  vi.stubEnv('MCP_SIGNING_SECRET', 's'.repeat(48))
  vi.stubEnv('MCP_CLIENT_ID', 'jacklaw-test')
  vi.stubEnv('MCP_REDIRECT_URIS', callback)
  vi.stubEnv('ADMIN_PASSWORD', 'admin-test-password-only')
  db.calls = []; db.results = []
})
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers() })

describe('staff OAuth boundary', () => {
  it('fails closed when not configured', async () => {
    vi.stubEnv('MCP_SIGNING_SECRET', '')
    expect(mcpConfig()).toBeNull()
    expect((await POST(new NextRequest(`${origin}/api/mcp`, { method: 'POST' }))).status).toBe(503)
    expect(db.calls).toEqual([])
  })
  it('rejects admin cookies and query tokens at the MCP endpoint', async () => {
    const r = await POST(new NextRequest(`${origin}/api/mcp?token=${await issueToken()}`, { method: 'POST', headers: { cookie: adminCookie() } }))
    expect(r.status).toBe(401)
    expect(r.headers.get('www-authenticate')).toContain('/.well-known/oauth-protected-resource')
    expect(db.calls).toEqual([])
  })
  it('rejects tokens after expiry, tampering or admin password rotation', async () => {
    const token = await issueToken()
    const req = (t: string) => new NextRequest(`${origin}/api/mcp`, { headers: { authorization: `Bearer ${t}` } })
    expect(await authorized(req(token))).toBe(true)
    expect(await authorized(req(`x${token}`))).toBe(false)
    vi.useFakeTimers(); vi.setSystemTime(Date.now() + 3_601_000)
    expect(await authorized(req(token))).toBe(false)
    vi.useRealTimers(); vi.stubEnv('ADMIN_PASSWORD', 'rotated')
    expect(await authorized(req(token))).toBe(false)
  })
  it('rejects cross-origin requests before touching client data', async () => {
    const r = await POST(new NextRequest(`${origin}/api/mcp`, { method: 'POST', headers: { origin: 'https://evil.example', authorization: `Bearer ${await issueToken()}` } }))
    expect(r.status).toBe(403); expect(db.calls).toEqual([])
  })
  it('rejects another resource or client and revokes pending codes after rotation', async () => {
    const token = await issueToken(), epoch = authorizationEpoch()
    const req = new NextRequest(`${origin}/api/mcp`, { headers: { authorization: `Bearer ${token}` } })
    vi.stubEnv('MCP_CLIENT_ID', 'another-client')
    expect(await authorized(req)).toBe(false)
    vi.stubEnv('MCP_CLIENT_ID', 'jacklaw-test'); vi.stubEnv('MCP_PUBLIC_ORIGIN', 'https://other.example')
    expect(await authorized(req)).toBe(false)
    vi.stubEnv('MCP_PUBLIC_ORIGIN', origin); vi.stubEnv('MCP_SIGNING_SECRET', 'x'.repeat(48))
    expect(await authorized(req)).toBe(false)
    expect(authorizationEpoch()).not.toBe(epoch)
  })
  it('checks exact redirect, audience, scope, S256 and duplicate parameters', () => {
    expect(parseGrant(grantParams())).not.toBeNull()
    for (const [key, value] of [['redirect_uri', `${callback}/other`], ['resource', 'https://other.example'], ['scope', 'jacklaw:write'], ['code_challenge_method', 'plain'], ['client_id', 'other']]) {
      const p = grantParams(); p.set(key, value); expect(parseGrant(p)).toBeNull()
    }
    const p = grantParams(); p.append('client_id', 'other'); expect(parseGrant(p)).toBeNull()
  })
  it('binds consent to the signed-in session, origin, request and expiry', () => {
    const req = new NextRequest(`${origin}/oauth/authorize`, { headers: { cookie: adminCookie(), origin } })
    const grant = parseGrant(grantParams())!, expires = String(Date.now() + 60_000)
    const seal = consentSeal(req, grant, expires)
    expect(validConsent(req, grant, expires, seal)).toBe(true)
    for (const badOrigin of ['null', 'https://evil.example', '']) {
      const bad = new NextRequest(req.url, { headers: { cookie: req.headers.get('cookie')!, origin: badOrigin } })
      expect(validConsent(bad, grant, expires, seal)).toBe(false)
    }
    expect(validConsent(req, { ...grant, state: 'changed' }, expires, seal)).toBe(false)
    expect(validConsent(req, grant, '0', seal)).toBe(false)
    expect(validConsent(new NextRequest(`${origin}/oauth/authorize`), grant, expires, seal)).toBe(false)
  })
  it('requires sign-in and explicit consent; GET never issues a code', async () => {
    const guest = await consentPage(new NextRequest(`${origin}/oauth/authorize?${grantParams()}`))
    expect(await guest.text()).toContain('Open staff sign-in')
    const staff = await consentPage(new NextRequest(`${origin}/oauth/authorize?${grantParams()}`, { headers: { cookie: adminCookie() } }))
    expect(await staff.text()).toContain('Allow read access')
    expect(staff.headers.get('referrer-policy')).toBe('same-origin')
    expect(staff.headers.get('content-security-policy')).toContain(`form-action 'self' ${callback};`)
    expect(staff.headers.get('content-security-policy')).not.toContain('*')
    expect(staff.headers.get('content-security-policy')).toContain("frame-ancestors 'none'")
    expect(db.calls).toEqual([])
  })
  it('allows cancellation without writing a code and includes issuer/state', async () => {
    const cookie = adminCookie()
    const req = new NextRequest(`${origin}/oauth/authorize`, { headers: { cookie, origin } })
    const p = grantParams(), expires = String(Date.now() + 60_000)
    p.set('expires', expires); p.set('seal', consentSeal(req, parseGrant(grantParams())!, expires)); p.set('decision', 'deny')
    const r = await consentPost(new NextRequest(req.url, { method: 'POST', headers: { cookie, origin, 'content-type': 'application/x-www-form-urlencoded' }, body: p.toString() }))
    const redirect = new URL(r.headers.get('location')!)
    expect(r.headers.get('referrer-policy')).toBe('no-referrer')
    expect(r.status).toBe(303); expect(redirect.searchParams.get('iss')).toBe(origin)
    expect(redirect.searchParams.get('state')).toBe('opaque-state')
    expect(redirect.searchParams.get('error')).toBe('access_denied'); expect(db.calls).toEqual([])
  })
  it('exchanges a code only via matching PKCE and atomic consumption', async () => {
    const p = new URLSearchParams({ grant_type: 'authorization_code', client_id: 'jacklaw-test',
      code: 'c'.repeat(43), code_verifier: verifier, redirect_uri: callback, resource: `${origin}/api/mcp` })
    const request = () => new NextRequest(`${origin}/oauth/token`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: p.toString() })
    db.results.push({ data: { code_hash: 'hash' }, error: null }, { data: null, error: null })
    const r = await exchange(request()); expect(r.status).toBe(200)
    const body = await r.json(); expect(body.scope).toBe(READ_SCOPE)
    expect(body.refresh_token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    db.results.push({ data: { id: 'active' }, error: null })
    expect(await authorized(new NextRequest(`${origin}/api/mcp`, { headers: { authorization: `Bearer ${body.access_token}` } }))).toBe(true)
    expect(db.calls).toContainEqual(['delete'])
    expect(db.calls).toContainEqual(['eq', 'code_challenge', challenge(verifier)])
    expect(db.calls).toContainEqual(['eq', 'authorization_epoch', authorizationEpoch()])
    // Deleted, expired, wrong-PKCE and replayed codes all return no matching row.
    expect((await exchange(request())).status).toBe(400)
  })
  it('refuses an authorization POST without a consent seal', async () => {
    const p = grantParams(); p.set('decision', 'allow')
    const r = await consentPost(new NextRequest(`${origin}/oauth/authorize`, { method: 'POST', headers: { cookie: adminCookie(), origin, 'content-type': 'application/x-www-form-urlencoded' }, body: p.toString() }))
    expect(r.status).toBe(403); expect(db.calls).toEqual([])
  })
  it('advertises only implemented OAuth features', async () => {
    const meta = await metadata().json()
    expect(meta.code_challenge_methods_supported).toEqual(['S256'])
    expect(meta.grant_types_supported).toEqual(['authorization_code', 'refresh_token'])
    expect(meta.registration_endpoint).toBeUndefined()
  })
})

describe('MCP protocol and client data', () => {
  it('initializes over the real SDK transport and lists seven read-only tools', async () => {
    const r = await rpc('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'test', version: '1' } })
    expect(r.status).toBe(200); expect((await r.json()).result.serverInfo.name).toBe('jacklaw-portal')
    const listing = await rpc('tools/list')
    const { result } = await listing.json()
    expect(result.tools).toHaveLength(7)
    for (const t of result.tools) expect(t.annotations.readOnlyHint).toBe(true)
    expect(db.calls).toEqual([])
    expect(listing.headers.get('cache-control')).toBe('no-store')
  })
  it('supports no persistent SSE stream', async () => {
    expect((await GET(new NextRequest(`${origin}/api/mcp`, { headers: { authorization: `Bearer ${await issueToken()}` } }))).status).toBe(405)
  })
  it('returns search pagination and escapes literal wildcards', async () => {
    db.results.push({ data: [{ id: 'one' }, { id: 'two' }], error: null })
    const r = await call('search_clients', { query: 'A_%', limit: 1 })
    expect(JSON.parse(r.content[0].text)).toEqual({ items: [{ id: 'one' }], nextOffset: 1 })
    expect(db.calls).toContainEqual(['ilike', 'name', '%A\\_\\%%'])
  })
  it('preserves original multilingual answers and unknown labels', async () => {
    db.results.push({ data: { id: 'client-a' }, error: null }, { data: { answers: { unknown_key: '답변 원문', email: 'test@example.test' }, submitted: false, m2_submitted: true }, error: null })
    const r = await call('get_client_intake', { clientId: 'client-a' })
    const data = JSON.parse(r.content[0].text)
    expect(data.answers.find((a: { key: string }) => a.key === 'unknown_key')).toEqual({ key: 'unknown_key', question: null, answer: '답변 원문' })
    expect(data.module2.submitted).toBe(true)
    expect(db.calls).toContainEqual(['eq', 'client_id', 'client-a'])
  })
  it('never turns a database failure into an empty intake', async () => {
    db.results.push({ data: { id: 'client-a' }, error: null }, { data: null, error: { message: 'private database detail' } })
    const r = await call('get_client_intake', { clientId: 'client-a' })
    expect(r.isError).toBe(true); expect(r.content[0].text).not.toContain('private database detail')
  })
  it('blocks an assignment belonging to a different client before reading answers', async () => {
    db.results.push({ data: { id: 'client-a' }, error: null }, { data: null, error: null })
    const r = await call('get_assignment_answers', { clientId: 'client-a', assignmentId: '11111111-1111-4111-8111-111111111111' })
    expect(r.isError).toBe(true)
    expect(db.calls).toContainEqual(['eq', 'client_id', 'client-a'])
    expect(db.calls).not.toContainEqual(['from', 'question_set_responses'])
  })
  it('labels stored analysis as not revalidated', async () => {
    db.results.push({ data: { id: 'client-a' }, error: null }, { data: { result: { claims1: [{ conclusion: 'stored' }] }, updated_at: 'old-date' }, error: null })
    const r = await call('get_client_reading', { clientId: 'client-a', section: 'claims1' })
    expect(JSON.parse(r.content[0].text).freshness).toBe('not_revalidated')
  })
  it('rejects unknown write tools and invalid client arguments without DB calls', async () => {
    expect((await call('delete_client', { clientId: 'client-a' })).isError).toBe(true)
    expect((await call('get_client_intake', { clientId: '' })).isError).toBe(true)
    expect(db.calls).toEqual([])
  })
})


describe('rotating refresh tokens', () => {
  const sid = '11111111-1111-4111-8111-111111111111'
  function request(params: Record<string, string>, path = 'token') {
    return new NextRequest(`${origin}/oauth/${path}`, { method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: 'jacklaw-test', ...params }).toString() })
  }
  const params = { grant_type: 'refresh_token', refresh_token: 'r'.repeat(43) }
  it('rotates refresh tokens and binds access to an active server-side session', async () => {
    db.results.push({ data: sid, error: null })
    const r = await exchange(request(params)), body = await r.json()
    expect(r.status).toBe(200)
    expect(body.refresh_token).not.toBe(params.refresh_token)
    expect(body.expires_in).toBe(3600)
    expect(JSON.stringify(db.calls)).not.toContain(params.refresh_token)
    const req = new NextRequest(`${origin}/api/mcp`, { headers: { authorization: `Bearer ${body.access_token}` } })
    db.results.push({ data: { id: sid }, error: null })
    expect(await authorized(req)).toBe(true)
    expect(await authorized(req)).toBe(false)
    expect(db.calls).toContainEqual(['is', 'revoked_at', null])
  })
  it('rejects replay/expired refresh tokens and storage failures', async () => {
    expect((await exchange(request(params))).status).toBe(400)
    db.results.push({ data: null, error: { message: 'private error' } })
    const r = await exchange(request(params))
    expect(r.status).toBe(503)
    expect(await r.text()).not.toContain('private error')
  })
  it('rejects wrong clients, expanded scopes and resources without consuming tokens', async () => {
    for (const extra of [{ client_id: 'other' }, { scope: 'jacklaw:write' }, { resource: 'https://other.example' }]) {
      expect((await exchange(request({ ...params, ...extra }))).status).toBe(400)
    }
    expect(db.calls).toEqual([])
  })
  it('fails closed on session-check errors and secret rotation', async () => {
    const token = await issueToken(sid)
    const req = new NextRequest(`${origin}/api/mcp`, { headers: { authorization: `Bearer ${token}` } })
    db.results.push({ data: null, error: { message: 'offline' } })
    expect(await authorized(req)).toBe(false)
    vi.stubEnv('ADMIN_PASSWORD', 'rotated')
    expect(await authorized(req)).toBe(false)
  })
  it('revokes without exposing whether a refresh token exists', async () => {
    const r = await revoke(request({ token: 'r'.repeat(43) }, 'revoke'))
    expect(r.status).toBe(200)
    expect(r.headers.get('cache-control')).toBe('no-store')
    expect(db.calls[0][1]).toBe('mcp_revoke_refresh')
    expect(JSON.stringify(db.calls)).not.toContain('r'.repeat(43))
  })
})

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'
import { NextRequest } from 'next/server'
import { ADMIN_COOKIE, isAdmin } from '@/lib/adminAuth'

export const READ_SCOPE = 'jacklaw:read'
export const TOKEN_SECONDS = 3600
export const noStore = { 'Cache-Control': 'no-store', Pragma: 'no-cache' }

/** Disabled until the deployment owner configures every value. No public defaults. */
export function mcpConfig() {
  const origin = process.env.MCP_PUBLIC_ORIGIN
  const secret = process.env.MCP_SIGNING_SECRET
  const clientId = process.env.MCP_CLIENT_ID
  const redirects = (process.env.MCP_REDIRECT_URIS ?? '').split(',').map(s => s.trim()).filter(Boolean)
  if (!origin || !secret || secret.length < 32 || !clientId || !redirects.length || !process.env.ADMIN_PASSWORD) return null
  try {
    const url = new URL(origin)
    if (url.protocol !== 'https:' || url.origin !== origin || url.username || url.password) return null
    for (const r of redirects) {
      const u = new URL(r)
      if (u.protocol !== 'https:' || u.username || u.password || u.hash) return null
    }
  } catch { return null }
  return { origin, secret, clientId, redirects, resource: `${origin}/api/mcp` }
}

export function same(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}
export const hash = (s: string) => createHash('sha256').update(s).digest('hex')
export const challenge = (s: string) => createHash('sha256').update(s).digest('base64url')
export const randomCode = () => randomBytes(32).toString('base64url')

export interface Grant {
  client_id: string
  redirect_uri: string
  resource: string
  scope: string
  code_challenge: string
  state: string
}

export function parseGrant(params: URLSearchParams): Grant | null {
  const c = mcpConfig()
  // Reject duplicate parameters rather than choosing between conflicting values.
  if (!c || [...params.keys()].some(k => params.getAll(k).length !== 1)) return null
  if (params.get('response_type') !== 'code' || params.get('client_id') !== c.clientId ||
      !c.redirects.includes(params.get('redirect_uri') ?? '') || params.get('resource') !== c.resource ||
      params.get('scope') !== READ_SCOPE || params.get('code_challenge_method') !== 'S256' ||
      !/^[A-Za-z0-9_-]{43}$/.test(params.get('code_challenge') ?? '')) return null
  const state = params.get('state') ?? ''
  if (state.length > 2048) return null
  return {
    client_id: c.clientId, redirect_uri: params.get('redirect_uri')!, resource: c.resource,
    scope: READ_SCOPE, code_challenge: params.get('code_challenge')!, state,
  }
}

/** Consent is tied to this admin session and the exact request, not just a cookie. */
export function consentSeal(req: NextRequest, grant: Grant, expires: string) {
  const c = mcpConfig()
  if (!c || !isAdmin(req)) return ''
  return createHmac('sha256', c.secret)
    .update(JSON.stringify([req.cookies.get(ADMIN_COOKIE)?.value, grant, expires])).digest('hex')
}

export function validConsent(req: NextRequest, grant: Grant, expires: string, seal: string) {
  const c = mcpConfig()
  const when = Number(expires)
  return Boolean(c && req.headers.get('origin') === c.origin && isAdmin(req) &&
    Number.isSafeInteger(when) && when > Date.now() && when <= Date.now() + 600_000 &&
    seal && same(seal, consentSeal(req, grant, expires)))
}

// Rotating either the separate MCP secret or the admin password revokes all tokens.
function signingKey() {
  const c = mcpConfig()
  if (!c) throw new Error('MCP is not configured')
  return createHmac('sha256', c.secret).update(process.env.ADMIN_PASSWORD!).digest()
}

/** Pending authorizations must also be revoked when either secret is rotated. */
export function authorizationEpoch() {
  return createHash('sha256').update(signingKey()).digest('hex')
}

export async function issueToken(sessionId?: string) {
  const c = mcpConfig()!
  return new SignJWT({ scope: READ_SCOPE, client_id: c.clientId, ...(sessionId ? { sid: sessionId } : {}) })
    .setProtectedHeader({ alg: 'HS256', typ: 'at+jwt' })
    .setSubject('portal-admin').setIssuer(c.origin).setAudience(c.resource)
    .setIssuedAt().setExpirationTime(`${TOKEN_SECONDS}s`).setJti(randomCode()).sign(signingKey())
}

export async function authorized(req: NextRequest) {
  const c = mcpConfig()
  const auth = req.headers.get('authorization') ?? ''
  if (!c || !auth.startsWith('Bearer ') || auth.length > 8192) return false
  try {
    const { payload } = await jwtVerify(auth.slice(7), signingKey(), {
      issuer: c.origin, audience: c.resource, algorithms: ['HS256'], typ: 'at+jwt',
      requiredClaims: ['exp', 'iat', 'sub', 'jti'], maxTokenAge: TOKEN_SECONDS,
    })
    if (payload.sub !== 'portal-admin' || payload.scope !== READ_SCOPE || payload.client_id !== c.clientId) return false
    // Legacy one-hour tokens remain valid until expiry. New connections are revocable immediately.
    if (payload.sid === undefined) return true
    if (typeof payload.sid !== 'string' || !/^[0-9a-f-]{36}$/.test(payload.sid)) return false
    const { activeSession } = await import('./refresh')
    return await activeSession(payload.sid)
  } catch { return false }
}

export function authorizationMetadata() {
  const c = mcpConfig()!
  return {
    issuer: c.origin, authorization_endpoint: `${c.origin}/oauth/authorize`,
    token_endpoint: `${c.origin}/oauth/token`, response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'], token_endpoint_auth_methods_supported: ['none'],
    revocation_endpoint: `${c.origin}/oauth/revoke`, revocation_endpoint_auth_methods_supported: ['none'],
    code_challenge_methods_supported: ['S256'], scopes_supported: [READ_SCOPE],
    authorization_response_iss_parameter_supported: true,
  }
}

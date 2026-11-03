/**
 * Signing in to the office's Google calendars without a key.
 *
 * The jacklaw.com organization forbids service account keys, so production
 * trades the Vercel function's own OIDC token at Google's STS and has IAM sign
 * the delegation JWT (lib/consultations/google.ts). Nothing here reaches
 * Google or Vercel: both are stubbed, and what is checked is exactly what
 * would have been sent — which token went where, and that the JWT IAM is
 * asked to sign says "act as this host, for these two scopes and no others".
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@vercel/oidc', () => ({ getVercelOidcToken: vi.fn(async () => 'vercel-oidc-token') }))

const PROVIDER = 'projects/123456789/locations/global/workloadIdentityPools/vercel/providers/vercel'
const SA = 'portal-calendar@jacklaw-portal.iam.gserviceaccount.com'
const STS = 'https://sts.googleapis.com/v1/token'
const TOKEN = 'https://oauth2.googleapis.com/token'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

interface Call {
  url: string
  init: RequestInit
}

function stubGoogle(overrides: { signJwt?: () => Response } = {}) {
  const calls: Call[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL, init: RequestInit = {}) => {
      const u = String(url)
      calls.push({ url: u, init })
      if (u === STS) return json({ access_token: 'federated', expires_in: 3600 })
      if (u.includes(':signJwt')) {
        if (overrides.signJwt) return overrides.signJwt()
        const { payload } = JSON.parse(String(init.body))
        return json({ signedJwt: `signed-for-${JSON.parse(payload).sub}` })
      }
      if (u === TOKEN) return json({ access_token: 'calendar', expires_in: 3600 })
      if (u.endsWith('/freeBusy')) {
        return json({ calendars: { primary: { busy: [{ start: '2026-11-04T17:00:00Z', end: '2026-11-04T18:00:00Z' }] } } })
      }
      throw new Error(`unexpected fetch ${u}`)
    })
  )
  return calls
}

const FROM = new Date('2026-11-04T00:00:00Z')
const TO = new Date('2026-11-05T00:00:00Z')

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL', SA)
  vi.stubEnv('GOOGLE_WORKLOAD_IDENTITY_PROVIDER', PROVIDER)
  vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY', '')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('keyless sign-in to the hosts’ calendars', () => {
  it('trades the Vercel token, has IAM sign the delegation, then reads the calendar', async () => {
    const calls = stubGoogle()
    const { busyTimes, calendarConfigured, SCOPES } = await import('@/lib/consultations/google')
    expect(calendarConfigured()).toBe(true)

    const busy = await busyTimes('anna@jacklaw.com', FROM, TO)
    expect(busy).toEqual([{ start: new Date('2026-11-04T17:00:00Z'), end: new Date('2026-11-04T18:00:00Z') }])
    expect(calls.map(c => c.url.split('?')[0])).toEqual([
      STS,
      `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(SA)}:signJwt`,
      TOKEN,
      'https://www.googleapis.com/calendar/v3/freeBusy',
    ])

    const sts = JSON.parse(String(calls[0].init.body))
    expect(sts).toMatchObject({
      audience: `//iam.googleapis.com/${PROVIDER}`,
      subjectToken: 'vercel-oidc-token',
      subjectTokenType: 'urn:ietf:params:oauth:token-type:jwt',
      grantType: 'urn:ietf:params:oauth:grant-type:token-exchange',
    })

    expect((calls[1].init.headers as Record<string, string>).Authorization).toBe('Bearer federated')
    const claims = JSON.parse(JSON.parse(String(calls[1].init.body)).payload)
    expect(claims).toMatchObject({ iss: SA, sub: 'anna@jacklaw.com', scope: SCOPES.join(' '), aud: TOKEN })
    expect(claims.exp - claims.iat).toBe(3600)

    const exchange = new URLSearchParams(String(calls[2].init.body))
    expect(exchange.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer')
    expect(exchange.get('assertion')).toBe('signed-for-anna@jacklaw.com')

    expect((calls[3].init.headers as Record<string, string>).Authorization).toBe('Bearer calendar')
  })

  it('keeps the federated token but has a JWT signed for each host', async () => {
    const calls = stubGoogle()
    const { busyTimes } = await import('@/lib/consultations/google')
    await busyTimes('anna@jacklaw.com', FROM, TO)
    await busyTimes('ben@jacklaw.com', FROM, TO)
    expect(calls.filter(c => c.url === STS)).toHaveLength(1)
    expect(calls.filter(c => c.url.includes(':signJwt'))).toHaveLength(2)
  })

  it('says which step Google refused, so "Check calendar" can show it', async () => {
    stubGoogle({ signJwt: () => json({ error: { message: 'Permission iam.serviceAccounts.signJwt denied' } }, 403) })
    const { busyTimes } = await import('@/lib/consultations/google')
    await expect(busyTimes('anna@jacklaw.com', FROM, TO)).rejects.toThrow(
      `Signing as ${SA} was refused: 403 Permission iam.serviceAccounts.signJwt denied`
    )
  })

  it('counts as not configured when the provider name is malformed', async () => {
    vi.stubEnv('GOOGLE_WORKLOAD_IDENTITY_PROVIDER', 'vercel')
    const { calendarConfigured } = await import('@/lib/consultations/google')
    expect(calendarConfigured()).toBe(false)
  })
})

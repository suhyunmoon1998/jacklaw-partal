import { SignJWT, importPKCS8 } from 'jose'
import { getVercelOidcToken } from '@vercel/oidc'

/**
 * The office's Google Workspace calendars, through one service account.
 *
 * The service account is given domain-wide delegation in the Workspace admin
 * console for exactly SCOPES, and then acts as each host in turn (the JWT's
 * `sub`). That is what lets it read a host's free/busy and put a consultation
 * on their calendar with a Meet link — a service account acting as itself can
 * do neither — without the portal ever holding anyone's password or refresh
 * token. Taking the delegation away in the admin console stops all of it.
 *
 * The delegation JWT has to be signed as the service account, and there are
 * two ways to do that:
 *
 *   Keyless, in production. The jacklaw.com organization forbids service
 *   account keys (iam.disableServiceAccountKeyCreation), so there is no key
 *   to sign with. Instead the Vercel function's own OIDC token is traded at
 *   Google's STS for a federated token (workload identity pool, locked to
 *   this project's production deployments), and IAM signs the JWT for us
 *   (signJwt; the pool's principal holds Service Account Token Creator on the
 *   account). Nothing secret is stored anywhere.
 *
 *   With a key, for local development only, where there is no Vercel token.
 *
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL        the service account
 *   GOOGLE_WORKLOAD_IDENTITY_PROVIDER   projects/<number>/locations/global/workloadIdentityPools/<pool>/providers/<provider>
 *   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY  optional instead: its private_key, PEM; "\n" may be escaped
 *
 * No Google SDK: a handful of REST calls (jose signs the local-key JWT).
 */

export const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.freebusy',
]

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const STS_URL = 'https://sts.googleapis.com/v1/token'
const IAM_CREDENTIALS = 'https://iamcredentials.googleapis.com/v1'
const API = 'https://www.googleapis.com/calendar/v3'

export class CalendarError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message)
    this.name = 'CalendarError'
  }
}

export function serviceAccountEmail(): string | null {
  return process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() || null
}

const PROVIDER = /^projects\/\d+\/locations\/global\/workloadIdentityPools\/[a-z0-9-]+\/providers\/[a-z0-9-]+$/

/** The workload identity provider's resource name, when it is set and well formed. */
export function workloadIdentityProvider(): string | null {
  const value = process.env.GOOGLE_WORKLOAD_IDENTITY_PROVIDER?.trim() ?? ''
  return PROVIDER.test(value) ? value : null
}

function privateKey(): string | null {
  return process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n') || null
}

export function calendarConfigured(): boolean {
  return Boolean(serviceAccountEmail() && (privateKey() || workloadIdentityProvider()))
}

/** What the delegation JWT says: this service account, acting as this host, for SCOPES. */
export function delegationClaims(serviceAccount: string, hostEmail: string, now: number) {
  return { iss: serviceAccount, sub: hostEmail, scope: SCOPES.join(' '), aud: TOKEN_URL, iat: now, exp: now + 3600 }
}

/** Google's answer as JSON, or a CalendarError that says which step refused and why. */
async function googleJson(res: Response, step: string): Promise<Record<string, unknown>> {
  const body: { error?: string | { message?: string }; error_description?: string } & Record<string, unknown> =
    await res.json().catch(() => ({}))
  if (res.ok) return body
  const reason = (typeof body.error === 'object' ? body.error?.message : body.error) || body.error_description || ''
  throw new CalendarError(`${step}: ${res.status}${reason ? ` ${reason}` : ''}`, res.status)
}

/** The federated token, kept until a minute before it lapses. One per process. */
let federated: { value: string; expires: number } | null = null

/** This Vercel deployment's own identity, traded at Google's STS for a federated token. */
async function federatedToken(provider: string): Promise<string> {
  if (federated && federated.expires > Date.now() + 60_000) return federated.value
  let subjectToken: string
  try {
    subjectToken = await getVercelOidcToken()
  } catch (err) {
    throw new CalendarError(`No Vercel OIDC token (${err instanceof Error ? err.message : err}). Keyless sign-in only works on Vercel.`)
  }
  const body = await googleJson(
    await fetch(STS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audience: `//iam.googleapis.com/${provider}`,
        grantType: 'urn:ietf:params:oauth:grant-type:token-exchange',
        requestedTokenType: 'urn:ietf:params:oauth:token-type:access_token',
        scope: 'https://www.googleapis.com/auth/cloud-platform',
        subjectTokenType: 'urn:ietf:params:oauth:token-type:jwt',
        subjectToken,
      }),
    }),
    // A refusal here means the pool or provider does not accept this
    // deployment: wrong issuer, audience, or the condition on the subject.
    'Google did not accept the Vercel identity'
  )
  if (typeof body.access_token !== 'string') throw new CalendarError('Google STS returned no token.')
  federated = { value: body.access_token, expires: Date.now() + Number(body.expires_in ?? 3600) * 1000 }
  return federated.value
}

/** The delegation JWT for one host, signed with the local key or, keylessly, by IAM. */
async function delegationAssertion(hostEmail: string): Promise<string> {
  const issuer = serviceAccountEmail()
  if (!issuer) throw new CalendarError('Google Calendar is not configured.')
  const now = Math.floor(Date.now() / 1000)
  const claims = delegationClaims(issuer, hostEmail, now)

  const pem = privateKey()
  if (pem) {
    const { scope, iss, sub, aud, iat, exp } = claims
    return new SignJWT({ scope })
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
      .setIssuer(iss)
      .setSubject(sub)
      .setAudience(aud)
      .setIssuedAt(iat)
      .setExpirationTime(exp)
      .sign(await importPKCS8(pem, 'RS256'))
  }

  const provider = workloadIdentityProvider()
  if (!provider) throw new CalendarError('Google Calendar is not configured.')
  const body = await googleJson(
    await fetch(`${IAM_CREDENTIALS}/projects/-/serviceAccounts/${encodeURIComponent(issuer)}:signJwt`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${await federatedToken(provider)}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: JSON.stringify(claims) }),
    }),
    // A 403 here means the pool's principal lacks Service Account Token
    // Creator on the service account, or the IAM Credentials API is off.
    `Signing as ${issuer} was refused`
  )
  if (typeof body.signedJwt !== 'string') throw new CalendarError('Google IAM returned no signed JWT.')
  return body.signedJwt
}

/** One token per host, kept until a minute before it lapses. */
const tokens = new Map<string, { value: string; expires: number }>()

async function accessToken(hostEmail: string): Promise<string> {
  const cached = tokens.get(hostEmail)
  if (cached && cached.expires > Date.now() + 60_000) return cached.value

  const assertion = await delegationAssertion(hostEmail)
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || typeof body.access_token !== 'string') {
    // "unauthorized_client" here almost always means the delegation in the
    // admin console is missing, or lists different scopes than SCOPES.
    throw new CalendarError(
      `Google refused a token for ${hostEmail}: ${body.error ?? res.status}${body.error_description ? ` (${body.error_description})` : ''}`,
      res.status
    )
  }
  tokens.set(hostEmail, { value: body.access_token, expires: Date.now() + Number(body.expires_in ?? 3600) * 1000 })
  return body.access_token
}

async function call(hostEmail: string, path: string, init: RequestInit = {}): Promise<Response> {
  const token = await accessToken(hostEmail)
  return fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers },
  })
}

async function failure(res: Response, what: string): Promise<CalendarError> {
  const body = await res.json().catch(() => ({}))
  return new CalendarError(`${what}: ${body?.error?.message ?? res.status}`, res.status)
}

/** The busy blocks on a host's primary calendar between two instants. */
export async function busyTimes(hostEmail: string, from: Date, to: Date): Promise<{ start: Date; end: Date }[]> {
  const res = await call(hostEmail, '/freeBusy', {
    method: 'POST',
    body: JSON.stringify({ timeMin: from.toISOString(), timeMax: to.toISOString(), items: [{ id: 'primary' }] }),
  })
  if (!res.ok) throw await failure(res, `Free/busy for ${hostEmail}`)
  const body = await res.json()
  const calendar = body?.calendars?.primary
  if (calendar?.errors?.length) {
    throw new CalendarError(`Free/busy for ${hostEmail}: ${calendar.errors.map((e: { reason?: string }) => e.reason).join(', ')}`)
  }
  return (calendar?.busy ?? []).map((b: { start: string; end: string }) => ({ start: new Date(b.start), end: new Date(b.end) }))
}

export interface NewEvent {
  /** Doubles as the Meet request id, so a retried call cannot make two rooms. */
  bookingId: string
  start: Date
  end: Date
  timeZone: string
  summary: string
  /** On the host's calendar only: the client is not a guest (see createConsultationEvent). */
  description: string
}

function meetLink(event: {
  hangoutLink?: string
  conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] }
}): string | null {
  return (
    event.hangoutLink ??
    event.conferenceData?.entryPoints?.find(p => p.entryPointType === 'video')?.uri ??
    null
  )
}

/**
 * Puts the consultation on the host's calendar with a Google Meet room.
 *
 * The client is deliberately not a guest on the event. A guest can see the
 * organizer's address, and the office does not want clients to have the
 * hosts' own email (owner, 2026-11-03: not jack@jacklaw.com). The client gets
 * the Meet link from the portal's own confirmation instead, in their
 * language, and the host admits them when they ask to join.
 */
export async function createConsultationEvent(
  hostEmail: string,
  event: NewEvent
): Promise<{ eventId: string; meetUrl: string | null }> {
  const res = await call(hostEmail, '/calendars/primary/events?conferenceDataVersion=1&sendUpdates=none', {
    method: 'POST',
    body: JSON.stringify({
      summary: event.summary,
      description: event.description,
      start: { dateTime: event.start.toISOString(), timeZone: event.timeZone },
      end: { dateTime: event.end.toISOString(), timeZone: event.timeZone },
      visibility: 'private',
      conferenceData: {
        createRequest: { requestId: event.bookingId, conferenceSolutionKey: { type: 'hangoutsMeet' } },
      },
    }),
  })
  if (!res.ok) throw await failure(res, `Creating the event for ${hostEmail}`)
  const created = await res.json()

  let meetUrl = meetLink(created)
  // The room is usually made with the event; when Google says it is still
  // pending, one read a moment later finds it.
  if (!meetUrl && created?.conferenceData?.createRequest?.status?.statusCode === 'pending') {
    await new Promise(r => setTimeout(r, 1500))
    const again = await call(hostEmail, `/calendars/primary/events/${encodeURIComponent(created.id)}`)
    if (again.ok) meetUrl = meetLink(await again.json())
  }
  return { eventId: created.id, meetUrl }
}

/** Takes a consultation off the host's calendar. Already gone counts as done. */
export async function deleteConsultationEvent(hostEmail: string, eventId: string): Promise<void> {
  const res = await call(hostEmail, `/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=none`, {
    method: 'DELETE',
  })
  if (!res.ok && res.status !== 404 && res.status !== 410) throw await failure(res, `Deleting the event for ${hostEmail}`)
}

import { SignJWT, importPKCS8 } from 'jose'

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
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL        the account's client_email
 *   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY  its private_key, PEM; "\n" may be escaped
 *
 * No SDK: three REST calls and a signed JWT (jose, already used for MCP).
 */

export const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.freebusy',
]

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
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

export function calendarConfigured(): boolean {
  return Boolean(serviceAccountEmail() && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)
}

/** One token per host, kept until a minute before it lapses. */
const tokens = new Map<string, { value: string; expires: number }>()

async function accessToken(hostEmail: string): Promise<string> {
  const cached = tokens.get(hostEmail)
  if (cached && cached.expires > Date.now() + 60_000) return cached.value

  const issuer = serviceAccountEmail()
  const pem = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!issuer || !pem) throw new CalendarError('Google Calendar is not configured.')

  const key = await importPKCS8(pem, 'RS256')
  const now = Math.floor(Date.now() / 1000)
  const assertion = await new SignJWT({ scope: SCOPES.join(' ') })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(issuer)
    .setSubject(hostEmail)
    .setAudience(TOKEN_URL)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key)

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
  /** Visible to the client too if the event reaches their calendar: nothing staff-only. */
  description: string
  attendee: { email: string; name: string }
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
 * The client is listed as a guest, so Meet lets them straight in, but Google
 * is told not to email them (`sendUpdates=none`): the portal sends its own
 * confirmation, in their language.
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
      attendees: [{ email: event.attendee.email, displayName: event.attendee.name }],
      guestsCanInviteOthers: false,
      guestsCanSeeOtherGuests: false,
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

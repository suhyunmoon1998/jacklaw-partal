/**
 * Twilio, over its REST API.
 *
 * No SDK: two form posts, and the SDK would be a megabyte of dependency for
 * them. Everything here is written so the rest of the app can be built,
 * deployed and tested before the account exists — `isConfigured()` is false
 * until the three variables are set, and the callers report "not configured"
 * rather than pretending a message went out.
 *
 * Required:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_FROM_NUMBER   the firm's sending number, E.164 (+1...)
 */

const API = 'https://api.twilio.com/2010-04-01'

export function isConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER
  )
}

export type SendResult =
  | { ok: true; id: string }
  | { ok: false; error: string; unconfigured?: true }

/**
 * US numbers, in the form Twilio wants.
 *
 * Ten digits are assumed to be American because every client on file is; an
 * eleven-digit number starting with 1 is the same number written differently.
 * Anything else is passed through with a + so a genuinely foreign number is
 * attempted rather than silently mangled into a wrong one.
 */
export function toE164(raw: string): string | null {
  const digits = String(raw ?? '').replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (digits.length > 11) return `+${digits}`
  return null
}

async function post(path: string, form: Record<string, string>): Promise<SendResult> {
  if (!isConfigured()) {
    return { ok: false, error: 'Twilio is not configured', unconfigured: true }
  }
  const sid = process.env.TWILIO_ACCOUNT_SID as string
  const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')

  try {
    const res = await fetch(`${API}/Accounts/${sid}/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(form).toString(),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { ok: false, error: body?.message ? String(body.message) : `Twilio ${res.status}` }
    }
    return { ok: true, id: String(body.sid ?? '') }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Twilio request failed' }
  }
}

export function sendSms(to: string, body: string): Promise<SendResult> {
  const number = toE164(to)
  if (!number) return Promise.resolve({ ok: false, error: `Unusable phone number: ${to}` })
  return post('Messages.json', {
    To: number,
    From: process.env.TWILIO_FROM_NUMBER as string,
    Body: body,
  })
}

/**
 * Places a call that plays one message and hangs up.
 *
 * The script is handed over as TwiML in the request rather than hosted at a
 * URL, so there is no second endpoint for Twilio to reach and nothing to keep
 * in sync with the language the client reads in.
 */
export function placeCall(to: string, twiml: string): Promise<SendResult> {
  const number = toE164(to)
  if (!number) return Promise.resolve({ ok: false, error: `Unusable phone number: ${to}` })
  return post('Calls.json', {
    To: number,
    From: process.env.TWILIO_FROM_NUMBER as string,
    Twiml: twiml,
  })
}

/** XML text nodes cannot carry these raw, and a client's name may contain them. */
export function xmlEscape(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

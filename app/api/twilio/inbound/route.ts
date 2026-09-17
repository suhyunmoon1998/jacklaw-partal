import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { getSupabase } from '@/lib/supabase'
import { toE164 } from '@/lib/twilio'
import { readsAs } from '@/lib/optOut'

/**
 * POST /api/twilio/inbound — what a client texts back.
 *
 * Twilio stops delivering to a number that replies STOP on its own, at the
 * account level, and this endpoint is not what makes that work. It is here so
 * the office can SEE it: without the flag, the texts simply go quiet and nobody
 * knows whether the client opted out, changed number, or was never reached.
 *
 * It also stops the CALL, which Twilio's own STOP does not cover. A client who
 * has asked a law office to stop texting has not invited it to ring them
 * instead — so this flag is the ONLY thing standing between a client who said
 * stop and a prerecorded call from their lawyer five days later. Everything
 * below is written on the assumption that failing to record an opt-out is the
 * worst thing this file can do.
 *
 * Twilio expects TwiML or an empty 200. Nothing is replied here: the carrier
 * sends its own confirmation for STOP, and a second message on top of it reads
 * as the firm arguing with the opt-out.
 */

export const dynamic = 'force-dynamic'

/**
 * Twilio signs every request it sends. Without checking that, this endpoint is
 * an unauthenticated write into the clients table through the service role:
 * anyone who knows a client's mobile number could clear their opt-out and put
 * them back on the ladder, or set it and quietly mute somebody the office is
 * trying to reach.
 *
 * The scheme is Twilio's: HMAC-SHA1 of the full request URL followed by each
 * POST parameter's name and value, sorted by name, keyed on the auth token.
 */
function signed(req: NextRequest, form: FormData): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN
  const given = req.headers.get('x-twilio-signature')
  if (!token || !given) return false

  // The URL Twilio signed is the one it was configured with. Behind Vercel the
  // request arrives as http internally, so the proxy's own headers are used to
  // rebuild what the sender saw.
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? ''
  const proto = req.headers.get('x-forwarded-proto') ?? 'https'
  const url = `${proto}://${host}${req.nextUrl.pathname}`

  const keys = Array.from(form.keys()).sort()
  let payload = url
  for (const key of keys) payload += key + String(form.get(key) ?? '')

  const expected = createHmac('sha1', token).update(Buffer.from(payload, 'utf8')).digest('base64')
  const a = Buffer.from(expected)
  const b = Buffer.from(given)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null)
  if (!form) return empty()

  if (!signed(req, form)) {
    console.error('twilio inbound: bad or missing signature — ignored')
    return new NextResponse('<Response/>', { status: 403, headers: { 'Content-Type': 'text/xml' } })
  }

  const from = String(form.get('From') ?? '')
  const body = String(form.get('Body') ?? '')

  const meaning = readsAs(body)
  const stopping = meaning === 'stop'
  const starting = meaning === 'start'

  // The number arrives as +1XXXXXXXXXX; the column holds bare digits.
  const e164 = toE164(from)
  const digits = (e164 ?? from).replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '')

  if (!stopping && !starting) {
    // Everything else is a client talking to their lawyer — "I already sent it",
    // "who is this", a question in Korean. It is not for this endpoint to answer,
    // but the office needs to know it happened, and until now it was dropped.
    console.warn(`twilio inbound: reply from ${digits || from} not a keyword: ${body.slice(0, 160)}`)
    return empty()
  }

  if (digits.length < 10) {
    console.error(`twilio inbound: ${stopping ? 'STOP' : 'START'} from unusable number ${from}`)
    return empty()
  }

  // One person can be on two cases, which is two rows sharing a number. Opting
  // out is about the person, so every row for that number is set.
  //
  // Matched on both the bare ten digits and the eleven-digit form, because rows
  // were created by hand over months and not all of them are canonical. An
  // opt-out that misses because of a leading 1 is a client who said stop and
  // gets called anyway.
  const { data, error } = await getSupabase()
    .from('clients')
    .update({ sms_opt_out: stopping })
    .in('phone', [digits, `1${digits}`, `+1${digits}`])
    .select('id')

  if (error) {
    console.error('twilio inbound: could not record opt-out for', digits, error)
    return empty()
  }

  // A PostgREST update that matched nothing returns no error, so without this a
  // STOP that hit no row is indistinguishable from one that worked — and the
  // client keeps their place on the ladder. This is the single most important
  // thing this endpoint can notice.
  if (!data || data.length === 0) {
    console.error(
      `twilio inbound: ${stopping ? 'STOP' : 'START'} from ${digits} matched NO client row — ` +
        `the opt-out was NOT recorded and this person is still on the reminder ladder`
    )
    return empty()
  }

  console.info(`twilio inbound: ${stopping ? 'STOP' : 'START'} from ${digits} applied to ${data.length} row(s)`)
  return empty()
}

const empty = () =>
  new NextResponse('<Response/>', {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  })

import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { toE164 } from '@/lib/twilio'

/**
 * POST /api/twilio/inbound — what a client texts back.
 *
 * Twilio stops delivering to a number that replies STOP on its own, at the
 * account level, and this endpoint is not what makes that work. It is here so
 * the office can SEE it: without the flag, the texts simply go quiet and nobody
 * knows whether the client opted out, changed number, or was never reached.
 *
 * It also stops the CALL, which STOP does not cover. A client who has asked a
 * law office to stop texting has not invited it to ring them instead.
 *
 * Twilio expects TwiML or an empty 200. Nothing is replied here: the carrier
 * sends its own confirmation for STOP, and a second message on top of it reads
 * as the firm arguing with the opt-out.
 */

const STOP = new Set(['stop', 'stopall', 'unsubscribe', 'cancel', 'end', 'quit', 'stop all'])
const START = new Set(['start', 'unstop', 'yes'])

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null)
  if (!form) return empty()

  const from = String(form.get('From') ?? '')
  const word = String(form.get('Body') ?? '').trim().toLowerCase()

  const stopping = STOP.has(word)
  const starting = START.has(word)
  if (!stopping && !starting) return empty()

  // The number arrives as +1XXXXXXXXXX; the column holds bare digits.
  const e164 = toE164(from)
  const digits = (e164 ?? from).replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '')
  if (digits.length < 10) return empty()

  // One person can be on two cases, which is two rows sharing a number. Opting
  // out is about the person, so every row for that number is set.
  const { error } = await getSupabase()
    .from('clients')
    .update({ sms_opt_out: stopping })
    .eq('phone', digits)

  if (error) console.error('could not record opt-out for', digits, error)

  return empty()
}

const empty = () =>
  new NextResponse('<Response/>', {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  })

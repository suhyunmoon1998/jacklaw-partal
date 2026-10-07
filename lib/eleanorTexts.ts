/**
 * Texts from the firm's own people, passed on to Eleanor.
 *
 * Eleanor answers Jack's and David's texts (her ADR 0144), and the owner chose
 * that she use this portal's number rather than one of her own, so the firm
 * keeps one registered number. Twilio delivers every reply to that number here,
 * to /api/twilio/inbound. A text from a number named in
 * ELEANOR_SMS_MEMBER_PHONES is not a client's reply: it is handed to Eleanor
 * exactly as Twilio sent it, its signature included, and Eleanor checks that
 * signature again before she reads a word of it. Eleanor's answer goes out from
 * the same number, to the member only.
 *
 * What never happens:
 * - A client's text never goes to Eleanor. Only a number on the list is passed
 *   on; everything else stays with the portal's own handling, as before.
 * - A carrier keyword (STOP, START, HELP…) is never passed on. Twilio acts on
 *   it for the whole number, and the portal's opt-out bookkeeping still sees it.
 * - Nothing is logged with the number or the words.
 *
 * Settings, server-side:
 * - ELEANOR_SMS_MEMBER_PHONES: the members' numbers, comma-separated. One
 *   malformed entry and nobody is passed on: a typo must not quietly route a
 *   stranger's texts to Eleanor or drop a member's.
 * - ELEANOR_SMS_INBOUND_URL: Eleanor's https://…/api/sms/inbound.
 */

import { toE164 } from '@/lib/twilio'

const maxMembers = 20
/** Twilio waits 15 seconds for this route. Eleanor acknowledges at once and answers afterwards. */
const relayTimeoutMs = 10_000

/** The words Twilio itself acts on for the whole number. Never Eleanor's to read. */
const carrierKeywords = new Set(['stop', 'stopall', 'unsubscribe', 'cancel', 'end', 'quit', 'start', 'unstop', 'yes', 'help', 'info'])

export function isCarrierKeyword(text: string): boolean {
  return carrierKeywords.has(String(text ?? '').trim().toLowerCase().replace(/[.!]+$/, ''))
}

export function eleanorMemberPhones(raw: string | undefined = process.env.ELEANOR_SMS_MEMBER_PHONES): Set<string> {
  const entries = String(raw ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  if (entries.length === 0 || entries.length > maxMembers) return new Set()
  const phones = new Set<string>()
  for (const entry of entries) {
    const e164 = toE164(entry)
    // A number Twilio would not send: the whole list is refused, not just this entry.
    if (!e164 || !/^\+\d{11,15}$/.test(e164)) return new Set()
    phones.add(e164)
  }
  return phones
}

export function isEleanorMember(from: string, raw?: string): boolean {
  const e164 = toE164(from)
  return !!e164 && eleanorMemberPhones(raw).has(e164)
}

function eleanorInboundUrl(raw: string | undefined = process.env.ELEANOR_SMS_INBOUND_URL): string | null {
  const url = String(raw ?? '').trim()
  return /^https:\/\/[a-z0-9.-]+(?::\d+)?\/api\/sms\/inbound$/i.test(url) ? url : null
}

export type RelayOutcome = 'Relayed' | 'NotConfigured' | 'Rejected' | 'Unreachable'

/**
 * Passes Twilio's request on unchanged: the same parameters, form-encoded, and
 * Twilio's own signature. The signature covers the parameters and this portal's
 * webhook URL, so Eleanor can tell the text really came from Twilio and nobody
 * between changed it.
 */
export async function relayToEleanor(
  form: FormData,
  signature: string,
  fetcher: typeof fetch = fetch
): Promise<{ outcome: RelayOutcome; status?: number }> {
  const url = eleanorInboundUrl()
  if (!url || !signature) return { outcome: 'NotConfigured' }
  const body = new URLSearchParams()
  for (const [key, value] of Array.from(form.entries())) {
    if (typeof value === 'string') body.append(key, value)
  }
  try {
    const response = await fetcher(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Twilio-Signature': signature },
      body: body.toString(),
      signal: AbortSignal.timeout(relayTimeoutMs),
      cache: 'no-store',
    })
    return response.ok ? { outcome: 'Relayed' } : { outcome: 'Rejected', status: response.status }
  } catch {
    return { outcome: 'Unreachable' }
  }
}

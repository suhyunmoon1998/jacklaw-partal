import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHmac } from 'crypto'
import { NextRequest } from 'next/server'

/**
 * Jack and David text Eleanor on the portal's number, and the portal passes
 * those texts on (lib/eleanorTexts.ts). What is tested is that only a member's
 * text leaves the portal, that it leaves exactly as Twilio signed it, and that
 * a client's text and every opt-out are handled as they always were.
 */

const db = vi.hoisted(() => ({ calls: [] as string[] }))
vi.mock('@/lib/supabase', () => ({
  getSupabase: () => ({
    from: (table: string) => {
      db.calls.push(table)
      // Every call returns the chain, and awaiting it gives one synthetic row.
      const chain: Record<string, unknown> = {
        select: () => chain,
        update: () => chain,
        in: () => chain,
        then: (resolve: (v: unknown) => void) => resolve({ data: [{ id: 'row-1', name: 'Synthetic Client' }], error: null }),
      }
      return chain
    },
  }),
}))
vi.mock('@/lib/inboundNotice', () => ({ tellOfficePossibleStop: vi.fn(async () => undefined) }))

import { eleanorMemberPhones, isCarrierKeyword, isEleanorMember, relayToEleanor } from '@/lib/eleanorTexts'
import { POST } from '@/app/api/twilio/inbound/route'

const TOKEN = 't'.repeat(32)
const PORTAL_URL = 'https://portal.example/api/twilio/inbound'
const ELEANOR_URL = 'https://eleanor.example/api/sms/inbound'
const MEMBER = '+13105550101'
const CLIENT = '+12135550199'
const SID = 'SM' + 'a'.repeat(32)

function sign(params: Record<string, string>, url = PORTAL_URL, token = TOKEN) {
  let payload = url
  for (const key of Object.keys(params).sort()) payload += key + params[key]
  return createHmac('sha1', token).update(Buffer.from(payload, 'utf8')).digest('base64')
}

function inbound(params: Record<string, string>, signature = sign(params)) {
  return new NextRequest(PORTAL_URL, {
    method: 'POST',
    body: new URLSearchParams(params).toString(),
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'x-forwarded-host': 'portal.example',
      'x-forwarded-proto': 'https',
      'x-twilio-signature': signature,
    },
  })
}

const text = (from: string, body: string) => ({ MessageSid: SID, From: from, To: '+18665225529', Body: body, NumMedia: '0' })

let fetched: { url: string; init: RequestInit }[] = []
let answer: () => Promise<Response> = async () => new Response('<Response/>', { status: 200 })

beforeEach(() => {
  db.calls = []
  fetched = []
  answer = async () => new Response('<Response/>', { status: 200 })
  process.env.TWILIO_AUTH_TOKEN = TOKEN
  process.env.ELEANOR_SMS_MEMBER_PHONES = `${MEMBER}, (213) 555-0102`
  process.env.ELEANOR_SMS_INBOUND_URL = ELEANOR_URL
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    fetched.push({ url: String(url), init })
    return answer()
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.ELEANOR_SMS_MEMBER_PHONES
  delete process.env.ELEANOR_SMS_INBOUND_URL
})

describe('who counts as a member', () => {
  it('reads the numbers however they were typed', () => {
    expect(Array.from(eleanorMemberPhones('+13105550101, (213) 555-0102, 1-818-555-0103'))).toEqual([
      '+13105550101',
      '+12135550102',
      '+18185550103',
    ])
    expect(isEleanorMember('3105550101', '+13105550101')).toBe(true)
    expect(isEleanorMember(CLIENT, '+13105550101')).toBe(false)
  })

  it('admits nobody when one entry is malformed, the list is empty, or it is too long', () => {
    expect(eleanorMemberPhones('+13105550101, 555-01').size).toBe(0)
    expect(eleanorMemberPhones('').size).toBe(0)
    expect(eleanorMemberPhones(' , ').size).toBe(0)
    delete process.env.ELEANOR_SMS_MEMBER_PHONES
    expect(eleanorMemberPhones().size).toBe(0)
    expect(eleanorMemberPhones(Array.from({ length: 21 }, (_, i) => `+1310555${String(1000 + i)}`).join(',')).size).toBe(0)
  })

  it('knows the words Twilio acts on for the whole number, and nothing longer', () => {
    for (const s of ['STOP', 'stop.', 'Help', 'START', 'unsubscribe']) expect(isCarrierKeyword(s), s).toBe(true)
    for (const s of ['stop the reminders for her', 'help me find the deadline', 'what is due']) {
      expect(isCarrierKeyword(s), s).toBe(false)
    }
  })
})

describe('passing a text on', () => {
  it('sends Twilio’s own parameters and signature, form-encoded, to Eleanor', async () => {
    const params = text(MEMBER, 'What is due this week?')
    const form = new FormData()
    for (const [k, v] of Object.entries(params)) form.append(k, v)
    const result = await relayToEleanor(form, sign(params))
    expect(result.outcome).toBe('Relayed')
    expect(fetched).toHaveLength(1)
    expect(fetched[0].url).toBe(ELEANOR_URL)
    const headers = fetched[0].init.headers as Record<string, string>
    expect(headers['X-Twilio-Signature']).toBe(sign(params))
    expect(headers['Content-Type']).toBe('application/x-www-form-urlencoded')
    // The same parameters Twilio signed, so the signature still holds at Eleanor.
    const sent = Object.fromEntries(new URLSearchParams(String(fetched[0].init.body)))
    expect(sent).toEqual(params)
    expect(sign(sent)).toBe(sign(params))
  })

  it('sends nothing without an https Eleanor address ending in /api/sms/inbound', async () => {
    for (const bad of ['', 'http://eleanor.example/api/sms/inbound', 'https://eleanor.example/api/other']) {
      process.env.ELEANOR_SMS_INBOUND_URL = bad
      const result = await relayToEleanor(new FormData(), 'sig')
      expect(result.outcome, bad).toBe('NotConfigured')
    }
    expect(fetched).toHaveLength(0)
  })

  it('says when Eleanor refused it or could not be reached', async () => {
    answer = async () => new Response('<Response/>', { status: 403 })
    expect(await relayToEleanor(new FormData(), 'sig')).toEqual({ outcome: 'Rejected', status: 403 })
    answer = async () => { throw new Error('down') }
    expect(await relayToEleanor(new FormData(), 'sig')).toEqual({ outcome: 'Unreachable' })
  })
})

describe('the inbound route', () => {
  it('passes a member’s question to Eleanor and touches no client row', async () => {
    const res = await POST(inbound(text(MEMBER, 'Stop the reminders for the Tuesday client and tell me what is due')))
    expect(res.status).toBe(200)
    expect(fetched).toHaveLength(1)
    expect(fetched[0].url).toBe(ELEANOR_URL)
    expect(db.calls).toEqual([])
  })

  it('keeps a client’s reply in the portal', async () => {
    const res = await POST(inbound(text(CLIENT, 'I already sent it')))
    expect(res.status).toBe(200)
    expect(fetched).toHaveLength(0)
  })

  it('never passes on a carrier keyword, even from a member, so the opt-out is still recorded', async () => {
    const res = await POST(inbound(text(MEMBER, 'STOP')))
    expect(res.status).toBe(200)
    expect(fetched).toHaveLength(0)
    expect(db.calls).toEqual(['clients'])
  })

  it('refuses a forged request before anything is passed on', async () => {
    const res = await POST(inbound(text(MEMBER, 'What is due?'), 'forged'))
    expect(res.status).toBe(403)
    expect(fetched).toHaveLength(0)
  })

  it('answers Twilio normally when Eleanor is down, and logs neither the number nor the words', async () => {
    answer = async () => { throw new Error('down') }
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const res = await POST(inbound(text(MEMBER, 'What is due this week?')))
    expect(res.status).toBe(200)
    const logged = errors.mock.calls.flat().join(' ')
    expect(logged).toMatch(/could not be passed to Eleanor \(Unreachable\)/)
    expect(logged).not.toMatch(/0101|What is due/)
    errors.mockRestore()
  })
})

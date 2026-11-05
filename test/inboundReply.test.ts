import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHmac } from 'crypto'
import { NextRequest } from 'next/server'

/*
 * A client's text reaching somebody who can answer it.
 *
 * Every reply that was not a bare STOP or START used to be logged by its length
 * and dropped. These run the whole route with a real signature and a fake mail
 * service. Synthetic people and numbers only.
 */

const db = vi.hoisted(() => ({
  rows: [] as { name: string }[],
  error: null as { message: string } | null,
  updates: [] as unknown[],
}))
vi.mock('@/lib/supabase', () => ({
  getSupabase: () => ({
    from: () => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        update: (patch: unknown) => {
          db.updates.push(patch)
          return chain
        },
        in: () => chain,
        then: (resolve: (v: unknown) => void) => resolve({ data: db.rows, error: db.error }),
      }
      return chain
    },
  }),
}))

const mail = vi.hoisted(() => ({
  sent: [] as { from: string; to: string[]; subject: string; html: string; attachments?: { filename: string; content: Buffer }[] }[],
  failure: null as { message: string } | null,
}))
vi.mock('resend', () => ({
  Resend: class {
    emails = {
      send: async (message: (typeof mail.sent)[number]) => {
        mail.sent.push(message)
        return { error: mail.failure }
      },
    }
  },
}))

import { POST } from '@/app/api/twilio/inbound/route'

const TOKEN = 't'.repeat(32)
const URL_SIGNED = 'https://portal.example/api/twilio/inbound'
const CLIENT = '+12135550199'

function sign(params: Record<string, string>) {
  let payload = URL_SIGNED
  for (const key of Object.keys(params).sort()) payload += key + params[key]
  return createHmac('sha1', TOKEN).update(Buffer.from(payload, 'utf8')).digest('base64')
}

function inbound(params: Record<string, string>) {
  return new NextRequest(URL_SIGNED, {
    method: 'POST',
    body: new URLSearchParams(params).toString(),
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'x-forwarded-host': 'portal.example',
      'x-forwarded-proto': 'https',
      'x-twilio-signature': sign(params),
    },
  })
}

const text = (body: string, from = CLIENT, extra: Record<string, string> = {}) => ({
  MessageSid: 'SM' + 'a'.repeat(32),
  From: from,
  To: '+18665550100',
  Body: body,
  NumMedia: '0',
  ...extra,
})

let fetched: { url: string; auth: string | null }[] = []

beforeEach(() => {
  vi.stubEnv('TWILIO_AUTH_TOKEN', TOKEN)
  vi.stubEnv('TWILIO_ACCOUNT_SID', 'ACsynthetic')
  vi.stubEnv('RESEND_API_KEY', 're_synthetic')
  vi.stubEnv('FIRM_EMAIL', 'office@example.test')
  vi.stubEnv('ELEANOR_SMS_MEMBER_PHONES', '')
  db.rows = [{ name: 'Synthetic Client' }]
  db.error = null
  db.updates = []
  mail.sent = []
  mail.failure = null
  fetched = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      fetched.push({ url, auth: new Headers(init?.headers).get('authorization') })
      return new Response(new Uint8Array([1, 2, 3]), { status: 200 })
    })
  )
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('a client’s text', () => {
  it('reaches the office with the words, the name and a number to call back', async () => {
    const res = await POST(inbound(text('问一下你们的代理费用比例是多少')))
    expect(res.status).toBe(200)
    expect(mail.sent).toHaveLength(1)
    const [message] = mail.sent
    expect(message.to).toEqual(['office@example.test'])
    expect(message.subject).toBe('Text from Synthetic Client')
    expect(message.html).toContain('问一下你们的代理费用比例是多少')
    expect(message.html).toContain('Synthetic Client')
    expect(message.html).toContain('(213) 555-0199')
    expect(message.html).toContain('https://portal.example/admin')
    expect(db.updates).toEqual([])
  })

  it('names every case on a shared number', async () => {
    db.rows = [{ name: 'First Case' }, { name: 'Second Case' }]
    await POST(inbound(text('I already sent it')))
    expect(mail.sent[0].subject).toBe('Text from First Case, Second Case')
  })

  it('still reaches the office from a number nobody has on file', async () => {
    db.rows = []
    await POST(inbound(text('Do you take wage cases?')))
    expect(mail.sent[0].subject).toBe('Text from (213) 555-0199 (not on file)')
    expect(mail.sent[0].html).toContain('Nobody on file has this number.')
  })

  it('does not call a failed lookup nobody', async () => {
    db.rows = []
    db.error = { message: 'down' }
    await POST(inbound(text('Hello?')))
    expect(mail.sent[0].subject).toBe('Text from (213) 555-0199')
    expect(mail.sent[0].html).toContain('could not look up')
    expect(mail.sent[0].html).toContain('Hello?')
  })

  it('writes an overseas number as it came rather than cutting it to ten digits', async () => {
    db.rows = []
    await POST(inbound(text('你好', '+8613912345678')))
    expect(mail.sent[0].subject).toBe('Text from +8613912345678 (not on file)')
  })

  it('escapes what the client wrote and keeps all of it', async () => {
    const long = 'word '.repeat(300) + '<script>alert(1)</script>'
    await POST(inbound(text(long)))
    expect(mail.sent[0].html).toContain('&lt;script&gt;')
    expect(mail.sent[0].html).not.toContain('<script>')
    expect(mail.sent[0].html).toContain('word word')
    expect(mail.sent[0].html.split('word ').length).toBeGreaterThan(300)
  })

  it('tells the office that a reply may mean stop and changes nothing', async () => {
    await POST(inbound(text('They told me to stop coming in but the message about my pay never came')))
    expect(mail.sent[0].subject).toBe('A client’s reply may be asking us to stop texting: Synthetic Client'.replace('’', "'"))
    expect(mail.sent[0].html).toContain('Stop texts &amp; calls')
    expect(db.updates).toEqual([])
  })

  it('sends nothing to the office for a plain STOP, which is recorded instead', async () => {
    await POST(inbound(text('STOP')))
    expect(mail.sent).toEqual([])
    expect(db.updates).toEqual([{ sms_opt_out: true }])
  })

  it('refuses a forged request before anything is sent', async () => {
    const params = text('Hello')
    const req = new NextRequest(URL_SIGNED, {
      method: 'POST',
      body: new URLSearchParams(params).toString(),
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'x-forwarded-host': 'portal.example',
        'x-forwarded-proto': 'https',
        'x-twilio-signature': 'forged',
      },
    })
    expect((await POST(req)).status).toBe(403)
    expect(mail.sent).toEqual([])
  })

  it('answers Twilio normally when the email fails, and logs neither the number nor the words', async () => {
    mail.failure = { message: 'down' }
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const res = await POST(inbound(text('A private question about my case')))
    expect(res.status).toBe(200)
    const logged = [...errors.mock.calls, ...info.mock.calls].flat().join(' ')
    expect(logged).toMatch(/could not be emailed to the office/)
    expect(logged).not.toMatch(/private question|555-?0199/)
    errors.mockRestore()
    info.mockRestore()
  })
})

describe('a photo in a client’s text', () => {
  const photo = {
    NumMedia: '1',
    MediaUrl0: 'https://api.twilio.com/2010-04-01/Accounts/ACsynthetic/Messages/MM1/Media/ME1',
    MediaContentType0: 'image/jpeg',
  }

  it('is attached, because the link alone needs the Twilio login to open', async () => {
    await POST(inbound(text('', CLIENT, photo)))
    expect(fetched).toHaveLength(1)
    expect(fetched[0].auth).toMatch(/^Basic /)
    expect(mail.sent[0].attachments).toHaveLength(1)
    expect(mail.sent[0].attachments?.[0].filename).toBe('texted-file-1.jpg')
    expect(mail.sent[0].html).toContain('The text had no words in it.')
    expect(mail.sent[0].html).toContain('1 file they sent is attached.')
  })

  it('still reaches the office when the file cannot be fetched, and says so', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })))
    await POST(inbound(text('Here is my pay stub', CLIENT, photo)))
    expect(mail.sent[0].attachments).toBeUndefined()
    expect(mail.sent[0].html).toContain('Here is my pay stub')
    expect(mail.sent[0].html).toContain('1 file they sent could not be attached.')
  })

  it('never hands the Twilio login to any other address', async () => {
    await POST(inbound(text('Look', CLIENT, { ...photo, MediaUrl0: 'https://elsewhere.example/file.jpg' })))
    expect(fetched).toEqual([])
    expect(mail.sent[0].html).toContain('could not be attached')
  })
})

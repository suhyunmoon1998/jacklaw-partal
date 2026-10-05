import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/*
 * Update texts (lib/clientUpdates.ts, lib/clientUpdateSend.ts, and kind=update
 * on app/api/eleanor/sends).
 *
 * What is tested: that every sentence exists, by hand, in all four languages;
 * that only those sentences can be asked for; that what the client reads is
 * exactly what was previewed and sealed; that the text is claimed before it
 * goes out, so it never goes twice; and that a client who said STOP is never
 * texted. The database and Twilio are in memory. Synthetic people only.
 */

type Row = Record<string, unknown>
let tables: Record<string, Row[]> = {}
const texts: { to: string; body: string }[] = []
let failNextText = false

function from(table: string) {
  const filters: [string, unknown][] = []
  const rows = () => (tables[table] ?? []).filter(row => filters.every(([column, value]) => row[column] === value))
  const api: Record<string, unknown> = {
    select: () => api,
    eq: (column: string, value: unknown) => { filters.push([column, value]); return api },
    maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
    then: (resolve: (value: unknown) => void) => resolve({ data: rows(), error: null }),
    insert: (row: Row) => {
      const result = (() => {
        if (!(table in tables)) return { data: null, error: { code: '42P01', message: 'relation does not exist' } }
        const list = tables[table]
        // The partial unique index: one sending-or-sent row per client and seal.
        if (table === 'client_updates' && list.some(r => r.client_id === row.client_id && r.seal === row.seal && ['sending', 'sent'].includes(String(r.status)))) {
          return { data: null, error: { code: '23505', message: 'duplicate key' } }
        }
        const stored = { id: `u${list.length + 1}`, ...row }
        list.push(stored)
        return { data: { id: stored.id }, error: null }
      })()
      const chain: Record<string, unknown> = {
        select: () => chain,
        single: async () => result,
        then: (resolve: (value: unknown) => void) => resolve({ error: result.error }),
      }
      return chain
    },
    update: (patch: Row) => {
      const where: [string, unknown][] = []
      const chain: Record<string, unknown> = {
        eq: (column: string, value: unknown) => { where.push([column, value]); return chain },
        then: (resolve: (value: unknown) => void) => {
          for (const row of tables[table] ?? []) if (where.every(([c, v]) => row[c] === v)) Object.assign(row, patch)
          resolve({ error: null })
        },
      }
      return chain
    },
  }
  return api
}

let textingOn = true
vi.mock('@/lib/supabase', () => ({ getSupabase: () => ({ from }) }))
vi.mock('@/lib/twilio', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/twilio')>()),
  isConfigured: () => textingOn,
  sendSms: vi.fn(async (to: string, body: string) => {
    if (failNextText) { failNextText = false; return { ok: false, error: 'Carrier rejected' } }
    texts.push({ to, body })
    return { ok: true, id: `SM${texts.length}` }
  }),
  placeCall: vi.fn(async () => ({ ok: false, error: 'no calls in tests' })),
}))

import { UPDATE_BOOK, UPDATE_SENTENCE_KEYS, formatUpdateSentences, parseUpdateSentences, renderUpdate, writeDay } from '@/lib/clientUpdates'
import { isUpdateSendingHour, planClientUpdate } from '@/lib/clientUpdateSend'
import { GET, POST } from '@/app/api/eleanor/sends/route'
import { NextRequest } from 'next/server'

const SECRET = 'synthetic-eleanor-service-secret-0123456789'
// 11:00 in Los Angeles on Monday 5 October 2026.
const MORNING = new Date('2026-10-05T18:00:00.000Z')

beforeEach(() => {
  texts.length = 0
  failNextText = false
  textingOn = true
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(MORNING)
  process.env.ELEANOR_PORTAL_SERVICE_SECRET = SECRET
  tables = {
    clients: [
      { id: 'c1', name: 'Maria Synthetic Example', phone: '(555) 010-1234', portal_lang: 'es', sms_opt_out: false },
      { id: 'c2', name: 'Kim Synthetic', phone: '(555) 010-5678', portal_lang: 'ko', sms_opt_out: true },
    ],
    client_updates: [],
  }
})

afterEach(() => {
  vi.useRealTimers()
})

describe('what an update can say', () => {
  it('every sentence is written in all four languages, with the firm first and the STOP line last', () => {
    for (const lang of ['en', 'es', 'zh', 'ko'] as const) {
      const book = UPDATE_BOOK[lang]
      expect(book.greeting).toMatch(/^866 JACK LAW[:：]/)
      expect(book.greeting).toContain('{name}')
      expect(book.closing).toContain('STOP')
      expect(book.closing).toContain('(866) 522-5529')
      for (const key of UPDATE_SENTENCE_KEYS) {
        expect(book[key], `${lang}.${key}`).toBeTruthy()
        expect(book[key].includes('{date}'), `${lang}.${key}`).toBe(key.startsWith('date_'))
      }
    }
    // Written, not copied: no language is another's English.
    for (const lang of ['es', 'zh', 'ko'] as const) {
      for (const key of UPDATE_SENTENCE_KEYS) expect(UPDATE_BOOK[lang][key]).not.toBe(UPDATE_BOOK.en[key])
    }
  })

  it('writes a day the way each language does, the same on every server', () => {
    expect(writeDay('2026-10-20', 'en')).toBe('Tuesday, October 20, 2026')
    expect(writeDay('2026-10-20', 'es')).toBe('martes 20 de octubre de 2026')
    expect(writeDay('2026-10-20', 'zh')).toBe('2026年10月20日（星期二）')
    expect(writeDay('2026-10-20', 'ko')).toBe('2026년 10월 20일(화)')
  })

  it('reads only its own sentences, each once, a real day ahead on a dated one, at most four', () => {
    const today = '2026-10-05'
    expect(parseUpdateSentences('date_mediation:2026-10-20,docs_received', today)).toEqual({
      ok: true,
      sentences: [{ key: 'date_mediation', date: '2026-10-20' }, { key: 'docs_received' }],
    })
    for (const bad of [
      '', 'say_anything', 'date_mediation', 'date_mediation:2026-02-30', 'date_mediation:2026-10-04',
      'docs_received:2026-10-20', 'docs_received,docs_received', 'working_on_it:x:y',
      'docs_received,answers_received,prepare_call,working_on_it,date_trial:2026-11-01',
    ]) {
      expect(parseUpdateSentences(bad, today).ok, bad).toBe(false)
    }
    expect(parseUpdateSentences(42, today).ok).toBe(false)
    expect(formatUpdateSentences([{ key: 'date_trial', date: '2026-11-02' }, { key: 'working_on_it' }])).toBe('date_trial:2026-11-02,working_on_it')
  })

  it('renders greeting, sentences in order and closing, with the first name only', () => {
    const sentences = [{ key: 'date_mediation' as const, date: '2026-10-20' }, { key: 'docs_received' as const }]
    expect(renderUpdate('en', 'Maria Synthetic Example', sentences)).toBe(
      '866 JACK LAW: Hi Maria, here is an update on your case. ' +
        'Your mediation is scheduled for Tuesday, October 20, 2026. We will contact you before then to prepare. ' +
        'We received the documents you uploaded. Thank you.\n' +
        'Questions? Reply to this text or call us at (866) 522-5529.\nReply STOP to stop these texts.'
    )
    const spanish = renderUpdate('es', 'Maria Synthetic Example', sentences)
    expect(spanish).toContain('Hola Maria,')
    expect(spanish).toContain('martes 20 de octubre de 2026')
    expect(renderUpdate('zh', 'Wang Synthetic', sentences)).toContain('2026年10月20日（星期二）举行。在此之前，我们会联系您做准备。我们已收到')
    expect(renderUpdate('ko', 'Kim Synthetic', sentences)).toContain('Kim님,')
    for (const lang of ['en', 'es', 'zh', 'ko'] as const) expect(renderUpdate(lang, 'X', sentences)).not.toMatch(/[{}]/)
  })

  it('goes out between 8 am and 9 pm in Los Angeles', () => {
    expect(isUpdateSendingHour(new Date('2026-10-05T15:00:00.000Z'))).toBe(true) // 08:00 PDT
    expect(isUpdateSendingHour(new Date('2026-10-06T03:59:00.000Z'))).toBe(true) // 20:59 PDT
    expect(isUpdateSendingHour(new Date('2026-10-06T04:00:00.000Z'))).toBe(false) // 21:00 PDT
    expect(isUpdateSendingHour(new Date('2026-10-05T14:59:00.000Z'))).toBe(false) // 07:59 PDT
  })
})

describe('planning one update', () => {
  it('is refused for a client who said STOP, one with no number, one who is not there, or a sentence not in the book', async () => {
    expect(await planClientUpdate('c2', 'working_on_it')).toMatchObject({ ok: false, reason: 'OptedOut' })
    tables.clients[0].phone = '12'
    expect(await planClientUpdate('c1', 'working_on_it')).toMatchObject({ ok: false, reason: 'NoPhone' })
    expect(await planClientUpdate('nobody', 'working_on_it')).toMatchObject({ ok: false, reason: 'UnknownClient' })
    expect(await planClientUpdate('c1', 'tell_them_anything')).toMatchObject({ ok: false, reason: 'InvalidSentences' })
  })

  it('writes to them in the language the office set, and keeps the English beside it', async () => {
    const planned = await planClientUpdate('c1', 'docs_received')
    if (!planned.ok) throw new Error('expected a plan')
    expect(planned.plan).toMatchObject({ lang: 'es', day: '2026-10-05', sentences: 'docs_received' })
    expect(planned.plan.body).toContain('Recibimos los documentos que subió.')
    expect(planned.plan.english).toContain('We received the documents you uploaded.')
  })
})

describe('the route', () => {
  const base = 'https://portal.test/api/eleanor/sends'
  const previewUrl = `${base}?kind=update&clientId=c1&sentences=${encodeURIComponent('date_mediation:2026-10-20,docs_received')}`
  const request = (url: string, init: { method?: string; auth?: string; body?: unknown } = {}) =>
    new NextRequest(url, {
      method: init.method ?? 'GET',
      headers: { ...(init.auth ? { authorization: init.auth } : {}), 'content-type': 'application/json' },
      ...(init.body ? { body: JSON.stringify(init.body) } : {}),
    })
  const send = (fingerprint: string, sentences = 'date_mediation:2026-10-20,docs_received') =>
    POST(request(base, { method: 'POST', auth: `Bearer ${SECRET}`, body: { kind: 'update', clientId: 'c1', sentences, fingerprint } }))

  it('refuses anyone without the secret', async () => {
    expect((await GET(request(previewUrl))).status).toBe(401)
    expect((await POST(request(base, { method: 'POST', body: { kind: 'update', clientId: 'c1', sentences: 'docs_received', fingerprint: '0'.repeat(64) } }))).status).toBe(401)
    expect(texts).toHaveLength(0)
  })

  it('previews the exact words in their language and in English, masked, and sends only what was previewed, once', async () => {
    const previewed = await (await GET(request(previewUrl, { auth: `Bearer ${SECRET}` }))).json()
    expect(previewed.ok).toBe(true)
    expect(previewed.preview).toMatchObject({
      kind: 'update', clientId: 'c1', clientName: 'Maria Synthetic Example', lang: 'es', text: '•••-•••-1234',
      sentences: 'date_mediation:2026-10-20,docs_received', day: '2026-10-05',
    })
    expect(previewed.preview.body).toContain('martes 20 de octubre de 2026')
    expect(previewed.preview.english).toContain('Tuesday, October 20, 2026')
    expect(JSON.stringify(previewed)).not.toMatch(/010-1234|5550101234/)
    expect(texts).toHaveLength(0)
    expect(tables.client_updates).toHaveLength(0)

    // Their number changes after Jack approved: nothing is sent.
    tables.clients[0].phone = '(555) 010-9999'
    const stale = await send(previewed.fingerprint)
    expect(stale.status).toBe(409)
    expect((await stale.json()).reason).toBe('PreviewChanged')
    expect(texts).toHaveLength(0)

    tables.clients[0].phone = '(555) 010-1234'
    const sent = await send(previewed.fingerprint)
    expect(sent.status).toBe(200)
    expect(await sent.json()).toMatchObject({ ok: true, recorded: true, textSent: true })
    expect(texts).toEqual([{ to: '(555) 010-1234', body: previewed.preview.body }])
    expect(tables.client_updates).toHaveLength(1)
    expect(tables.client_updates[0]).toMatchObject({
      client_id: 'c1', seal: previewed.fingerprint, day: '2026-10-05', sentences: 'date_mediation:2026-10-20,docs_received',
      lang: 'es', status: 'sent', provider_id: 'SM1', requested_by: 'eleanor',
    })

    // The same approval again: the claim is taken, nothing goes twice.
    const again = await send(previewed.fingerprint)
    expect(again.status).toBe(409)
    expect(await again.json()).toMatchObject({ ok: false, reason: 'AlreadySent' })
    expect(texts).toHaveLength(1)
  })

  it('does not carry an approval to another day', async () => {
    const previewed = await (await GET(request(previewUrl, { auth: `Bearer ${SECRET}` }))).json()
    vi.setSystemTime(new Date('2026-10-06T18:00:00.000Z'))
    const nextDay = await send(previewed.fingerprint)
    expect((await nextDay.json()).reason).toBe('PreviewChanged')
    expect(texts).toHaveLength(0)
  })

  it('a failed text releases its claim, so it can be approved again', async () => {
    const previewed = await (await GET(request(`${base}?kind=update&clientId=c1&sentences=working_on_it`, { auth: `Bearer ${SECRET}` }))).json()
    failNextText = true
    const failed = await send(previewed.fingerprint, 'working_on_it')
    expect(failed.status).toBe(502)
    expect(await failed.json()).toMatchObject({ ok: false, reason: 'NotSent', recorded: true })
    expect(tables.client_updates[0]).toMatchObject({ status: 'failed', error: 'Carrier rejected' })
    const retried = await send(previewed.fingerprint, 'working_on_it')
    expect(retried.status).toBe(200)
    expect(texts).toHaveLength(1)
  })

  it('never texts late at night, a client who said STOP, or with texting off, and never without its record', async () => {
    const previewed = await (await GET(request(`${base}?kind=update&clientId=c1&sentences=working_on_it`, { auth: `Bearer ${SECRET}` }))).json()
    vi.setSystemTime(new Date('2026-10-06T05:30:00.000Z')) // 22:30 PDT, still 5 October in Los Angeles
    const late = await send(previewed.fingerprint, 'working_on_it')
    expect((await late.json()).reason).toBe('QuietHours')
    vi.setSystemTime(MORNING)

    const stop = await GET(request(`${base}?kind=update&clientId=c2&sentences=working_on_it`, { auth: `Bearer ${SECRET}` }))
    expect(stop.status).toBe(409)
    expect((await stop.json()).reason).toBe('OptedOut')

    textingOn = false
    const off = await GET(request(`${base}?kind=update&clientId=c1&sentences=working_on_it`, { auth: `Bearer ${SECRET}` }))
    expect((await off.json()).reason).toBe('TextingOff')
    textingOn = true

    // Before the table exists the claim cannot be written, so nothing goes out.
    delete tables.client_updates
    const unrecorded = await send(previewed.fingerprint, 'working_on_it')
    expect(unrecorded.status).toBe(503)
    expect((await unrecorded.json()).reason).toBe('Unrecordable')
    expect(texts).toHaveLength(0)
  })

  it('rejects a sentence that is not in the book before reading anything', async () => {
    const bad = await GET(request(`${base}?kind=update&clientId=c1&sentences=${encodeURIComponent('free text here')}`, { auth: `Bearer ${SECRET}` }))
    expect(bad.status).toBe(400)
    expect((await bad.json()).reason).toBe('InvalidSentences')
    const none = await GET(request(`${base}?kind=update&clientId=c1`, { auth: `Bearer ${SECRET}` }))
    expect(none.status).toBe(400)
  })
})

describe('one way to send an update', () => {
  const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8')
  it('the words come only from the book, through one sender, claimed before the text', () => {
    const route = read('app/api/eleanor/sends/route.ts')
    const sender = read('lib/clientUpdateSend.ts')
    expect(route).toMatch(/deliverClientUpdate\(getSupabase\(\), plan, fingerprint\)/)
    expect(sender).toMatch(/renderUpdate\(lang, name, parsed\.sentences\)/)
    // The claim is inserted before the text is sent.
    expect(sender.indexOf(".from('client_updates')")).toBeLessThan(sender.indexOf('await sendSms('))
    // No translation service, no model.
    const book = read('lib/clientUpdates.ts')
    expect(book + sender).not.toMatch(/machineTranslate|translate\(|anthropic|openai|fetch\(/i)
    const migration = read('supabase/migrations/0026_client_updates.sql')
    expect(migration).toMatch(/grant select, insert, update, delete, references, trigger, truncate\s+on table public\.client_updates to service_role;/)
    expect(migration).toMatch(/where status in \('sending', 'sent'\)/)
  })
})

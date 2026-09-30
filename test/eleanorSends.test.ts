import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/*
 * Sends Eleanor makes after Jack approves them (app/api/eleanor/sends).
 *
 * The database and Twilio are both in memory: what is tested is who is let
 * in, what a preview reveals, that a send happens only for exactly what was
 * previewed, and that a reminder rung is claimed before the text goes out.
 */

type Row = Record<string, unknown>
let tables: Record<string, Row[]> = {}
const texts: { to: string; body: string }[] = []

function from(table: string) {
  const filters: [string, unknown][] = []
  const rows = () => (tables[table] ?? []).filter(row => filters.every(([column, value]) => row[column] === value))
  const api: Record<string, unknown> = {
    select: () => api,
    eq: (column: string, value: unknown) => { filters.push([column, value]); return api },
    maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
    then: (resolve: (value: unknown) => void) => resolve({ data: rows(), error: null }),
    insert: async (row: Row) => {
      const list = (tables[table] ??= [])
      if (table === 'client_reminders' && list.some(r =>
        r.kind === row.kind && (row.assignment_id ? r.assignment_id === row.assignment_id : r.client_id === row.client_id && r.module_id === row.module_id))) {
        return { error: { code: '23505', message: 'duplicate key' } }
      }
      list.push({ ...row })
      return { error: null }
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

vi.mock('@/lib/supabase', () => ({ getSupabase: () => ({ from }) }))
vi.mock('@/lib/twilio', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/twilio')>()),
  isConfigured: () => true,
  sendSms: vi.fn(async (to: string, body: string) => { texts.push({ to, body }); return { ok: true, id: `SM${texts.length}` } }),
  placeCall: vi.fn(async () => ({ ok: false, error: 'no calls in tests' })),
}))

import { isEleanorService, maskEmail, maskPhone, sendFingerprint } from '@/lib/eleanorService'
import { deliverReminder, planManualReminder } from '@/lib/reminderSend'
import { getSupabase } from '@/lib/supabase'
import { GET, POST } from '@/app/api/eleanor/sends/route'
import { NextRequest } from 'next/server'

const SECRET = 'synthetic-eleanor-service-secret-0123456789'
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()

beforeEach(() => {
  texts.length = 0
  process.env.ELEANOR_PORTAL_SERVICE_SECRET = SECRET
  tables = {
    clients: [{ id: 'c1', name: 'Maria Synthetic', phone: '(555) 010-1234', portal_lang: 'es', sms_opt_out: false }],
    client_module_sends: [{ client_id: 'c1', module_id: 'module1', sent_at: daysAgo(3) }],
    questionnaire_states: [{ client_id: 'c1', submitted: false, m2_submitted: false }],
    client_reminders: [],
    client_question_set_assignments: [],
    question_sets: [],
  }
})

const request = (url: string, init: { method?: string; auth?: string; body?: unknown } = {}) =>
  new NextRequest(url, {
    method: init.method ?? 'GET',
    headers: { ...(init.auth ? { authorization: init.auth } : {}), 'content-type': 'application/json' },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  })

describe('who may call', () => {
  it('only the bearer secret, and only a long one', () => {
    const withAuth = (auth?: string) => request('https://portal.test/api/eleanor/sends', { auth })
    expect(isEleanorService(withAuth(`Bearer ${SECRET}`))).toBe(true)
    expect(isEleanorService(withAuth('Bearer wrong'))).toBe(false)
    expect(isEleanorService(withAuth())).toBe(false)
    process.env.ELEANOR_PORTAL_SERVICE_SECRET = 'too-short'
    expect(isEleanorService(withAuth('Bearer too-short'))).toBe(false)
    delete process.env.ELEANOR_PORTAL_SERVICE_SECRET
    expect(isEleanorService(withAuth('Bearer '))).toBe(false)
  })
})

describe('what a preview reveals', () => {
  it('masks the number and the address', () => {
    expect(maskPhone('(555) 010-1234')).toBe('•••-•••-1234')
    expect(maskEmail('maria@example.com')).toBe('m•••@example.com')
    expect(maskEmail('not-an-email')).toBe('')
  })

  it('seals the facts regardless of order, changes with any of them, and cannot be read back', () => {
    const a = sendFingerprint(SECRET, { phone: '5550101234', lang: 'es' })
    expect(sendFingerprint(SECRET, { lang: 'es', phone: '5550101234' })).toBe(a)
    expect(sendFingerprint(SECRET, { phone: '5550109999', lang: 'es' })).not.toBe(a)
    expect(a).not.toContain('5550101234')
  })
})

describe('the next reminder text', () => {
  it('is the day-2 text, then the day-5 text, never the call', async () => {
    let plan = await planManualReminder('c1', 'module1')
    expect(plan.ok && plan.item.kind).toBe('day2')
    tables.client_reminders.push({ client_id: 'c1', module_id: 'module1', kind: 'day2' })
    plan = await planManualReminder('c1', 'module1')
    expect(plan.ok && plan.item.kind).toBe('day5')
    tables.client_reminders.push({ client_id: 'c1', module_id: 'module1', kind: 'day5' })
    plan = await planManualReminder('c1', 'module1')
    expect(!plan.ok && plan.reason).toBe('TextRemindersUsed')
  })

  it('is refused for a step not sent, one submitted, or a client who said STOP', async () => {
    expect(await planManualReminder('c1', 'module2')).toMatchObject({ ok: false, reason: 'NotSent' })
    tables.questionnaire_states[0].submitted = true
    expect(await planManualReminder('c1', 'module1')).toMatchObject({ ok: false, reason: 'AlreadySubmitted' })
    tables.questionnaire_states[0].submitted = false
    tables.clients[0].sms_opt_out = true
    expect(await planManualReminder('c1', 'module1')).toMatchObject({ ok: false, reason: 'OptedOut' })
  })

  it('claims the rung before texting, so it can never go out twice', async () => {
    const plan = await planManualReminder('c1', 'module1')
    if (!plan.ok) throw new Error('expected a plan')
    const first = await deliverReminder(getSupabase(), plan.item, 'https://portal.test')
    const second = await deliverReminder(getSupabase(), plan.item, 'https://portal.test')
    expect(first.status).toBe('sent')
    expect(second).toMatchObject({ status: 'skipped', error: 'already claimed' })
    expect(texts).toHaveLength(1)
    expect(tables.client_reminders).toHaveLength(1)
    expect(tables.client_reminders[0]).toMatchObject({ kind: 'day2', status: 'sent', provider_id: 'SM1' })
  })
})

describe('the route', () => {
  const url = 'https://portal.test/api/eleanor/sends?kind=reminder&clientId=c1&chasing=module1'

  it('refuses anyone without the secret', async () => {
    expect((await GET(request(url))).status).toBe(401)
    expect((await POST(request('https://portal.test/api/eleanor/sends', { method: 'POST', body: { kind: 'reminder', clientId: 'c1', chasing: 'module1', fingerprint: '0'.repeat(64) } }))).status).toBe(401)
    expect(texts).toHaveLength(0)
  })

  it('previews the exact words without the full number, and sends only what was previewed', async () => {
    const previewed = await (await GET(request(url, { auth: `Bearer ${SECRET}` }))).json()
    expect(previewed.ok).toBe(true)
    expect(previewed.preview).toMatchObject({ kind: 'reminder', rung: 'day2', lang: 'es', text: '•••-•••-1234' })
    expect(typeof previewed.preview.body).toBe('string')
    expect(JSON.stringify(previewed)).not.toMatch(/010-1234|5550101234/)
    expect(texts).toHaveLength(0)

    // The number changes after Jack approved: nothing is sent.
    tables.clients[0].phone = '(555) 010-9999'
    const stale = await POST(request('https://portal.test/api/eleanor/sends', {
      method: 'POST', auth: `Bearer ${SECRET}`, body: { kind: 'reminder', clientId: 'c1', chasing: 'module1', fingerprint: previewed.fingerprint },
    }))
    expect(stale.status).toBe(409)
    expect((await stale.json()).reason).toBe('PreviewChanged')
    expect(texts).toHaveLength(0)
    expect(tables.client_reminders).toHaveLength(0)

    tables.clients[0].phone = '(555) 010-1234'
    const sent = await POST(request('https://portal.test/api/eleanor/sends', {
      method: 'POST', auth: `Bearer ${SECRET}`, body: { kind: 'reminder', clientId: 'c1', chasing: 'module1', fingerprint: previewed.fingerprint },
    }))
    expect(sent.status).toBe(200)
    expect(await sent.json()).toMatchObject({ ok: true, textSent: true })
    expect(texts).toHaveLength(1)
    expect(texts[0].body).toBe(previewed.preview.body)
  })

  it('rejects a malformed request before reading anything', async () => {
    const bad = await GET(request('https://portal.test/api/eleanor/sends?kind=reminder&clientId=c1&chasing=module9', { auth: `Bearer ${SECRET}` }))
    expect(bad.status).toBe(400)
  })
})

describe('one way to send', () => {
  const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8')
  it('the admin panel, the daily chase and Eleanor share the same send code', () => {
    const admin = read('app/api/admin/modules/send/route.ts')
    const cron = read('app/api/cron/reminders/route.ts')
    const eleanor = read('app/api/eleanor/sends/route.ts')
    expect(admin).toMatch(/performModuleSend\(planned\.plan, 'admin'\)/)
    expect(eleanor).toMatch(/performModuleSend\(plan, 'eleanor'\)/)
    expect(cron).toMatch(/deliverReminder\(db, item, origin\)/)
    expect(eleanor).toMatch(/deliverReminder\(getSupabase\(\), item, origin\)/)
    expect(eleanor).not.toMatch(/export async function (PUT|PATCH|DELETE)/)
    expect(eleanor).not.toMatch(/placeCall/)
  })
})

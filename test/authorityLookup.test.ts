import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/eleanor/authority/route'
import { section } from '@/lib/authority'
import { HOLDINGS } from '@/lib/authority/cases'
import { PART_CHARS, citedInTitle, normalizeKey, readAuthority, searchAuthority } from '@/lib/authority/lookup'

const SECRET = 'y'.repeat(40)
const ask = (body: unknown, auth = true) =>
  POST(
    new NextRequest('https://portal.example/api/eleanor/authority', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json', ...(auth ? { authorization: `Bearer ${SECRET}` } : {}) },
    })
  )

/**
 * Eleanor reads the law the office holds instead of remembering it. What is
 * tested is that what she is handed is the stored text itself, that what is
 * not held says so, and that the door opens only to her server.
 */
describe('reading a provision by the name a model writes', () => {
  it('reads the forms a citation comes in', () => {
    expect(normalizeKey('Labor Code § 226.7')).toBe('LAB 226.7')
    expect(normalizeKey('Lab. Code section 512')).toBe('LAB 512')
    expect(normalizeKey('Cal. Gov. Code § 12940')).toBe('GOV 12940')
    expect(normalizeKey('Code Civ. Proc. § 340')).toBe('CCP 340')
    expect(normalizeKey('Bus. & Prof. Code 17200')).toBe('BPC 17200')
    expect(normalizeKey('Wage Order 5, § 11')).toBe('IWC 5 sec 11')
    expect(normalizeKey('IWC Wage Order No. 5 sec 12')).toBe('IWC 5 sec 12')
    expect(normalizeKey('IWC 5 sec 11')).toBe('IWC 5 sec 11')
    expect(normalizeKey('CACI No. 2766a')).toBe('CACI 2766A')
    expect(normalizeKey('2 CCR 11068')).toBe('CCR2 11068')
  })

  it('reads a bare number only where one code holds it, and never as a Wage Order', () => {
    expect(normalizeKey('12940')).toBe('GOV 12940')
    expect(normalizeKey('§ 512')).toBe('LAB 512')
    expect(normalizeKey('anything at all')).toBeNull()
  })

  it('hands over the stored text, with where and when it was fetched', () => {
    const [item] = readAuthority(['Lab. Code § 512'])
    expect(item.onFile).toBe(true)
    expect(item.cite).toBe('Lab. Code § 512')
    expect(item.text).toBe(section('LAB', '512'))
    expect(item.fetched?.from).toMatch(/leginfo\.legislature\.ca\.gov/)
  })

  it('says what is not held, rather than anything about it', () => {
    const [item] = readAuthority(['Labor Code § 226.8'])
    expect(item.onFile).toBe(false)
    expect(item.text).toBeUndefined()
    expect(item.note).toMatch(/NOT ON FILE/)
  })

  it('gives a long provision in parts, each naming the next', () => {
    const long = readAuthority(['LAB 1182.14'])[0]
    expect(long.part?.of).toBeGreaterThan(1)
    expect(long.text!.length).toBeLessThanOrEqual(PART_CHARS)
    expect(long.part?.next).toBe('LAB 1182.14 part 2')
    const second = readAuthority(['LAB 1182.14 part 2'])[0]
    expect(second.text).not.toBe(long.text)
    expect(section('LAB', '1182.14')).toContain(second.text!.slice(0, 200))
  })

  it('lists a Wage Order’s sections when no section is named, and says who decides which applies', () => {
    const [item] = readAuthority(['Wage Order 5'])
    expect(item.text).toMatch(/IWC 5 sec 11/)
    expect(item.note).toMatch(/attorney/)
  })

  it('quotes a holding verbatim, with what it does not decide', () => {
    const h = HOLDINGS[0]
    const [item] = readAuthority([h.id])
    expect(item.kind).toBe('holding')
    expect(item.text).toContain(h.quote)
    expect(item.text).toContain(h.limits)
    expect(item.text).toMatch(/not yet reviewed by an attorney/)
  })
})

describe('what to read beside a provision', () => {
  it('reads the statutes a CACI title cites', () => {
    expect(citedInTitle('2766A. Meal Break Violations—Essential Factual Elements (Lab. Code, §§ 226.7, 512)')).toEqual(['LAB 226.7', 'LAB 512'])
    expect(citedInTitle('2743. Equal Pay Act—Retaliation—Essential Factual Elements (Lab. Code, § 1197.5(k))')).toEqual(['LAB 1197.5'])
  })

  it('names the instructions and holdings tied to a statute, and the statutes an instruction cites', () => {
    const [statute] = readAuthority(['LAB 512'])
    expect(statute.topics).toContain('Meal periods')
    const keys = (statute.related ?? []).map(r => r.key)
    expect(keys).toEqual(expect.arrayContaining(['CACI 2766A', 'brinker-provide-means-relieve']))
    const [instruction] = readAuthority(['CACI 2766A'])
    expect((instruction.related ?? []).map(r => r.key)).toEqual(['LAB 226.7', 'LAB 512'])
  })
})

describe('searching what is on file', () => {
  it('finds the meal-period provisions for a meal-period question', () => {
    const hits = searchAuthority('meal period second meal waiver')
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.map(h => h.key)).toEqual(expect.arrayContaining(['LAB 512']))
    for (const hit of hits) expect(hit.fetched.on).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('does not fill the answer with one Wage Order section seventeen times', () => {
    const hits = searchAuthority('meal periods', 10)
    const bySection: Record<string, number> = {}
    for (const h of hits.filter(x => x.kind === 'wage order')) {
      const s = h.key.split(' sec ')[1]
      bySection[s] = (bySection[s] ?? 0) + 1
    }
    for (const n of Object.values(bySection)) expect(n).toBeLessThanOrEqual(2)
  })

  it('leads with the provision a query names', () => {
    expect(searchAuthority('Gov. Code § 12940')[0].key).toBe('GOV 12940')
  })
})

describe('the door', () => {
  it('opens only with the service secret, and keeps the question out of the URL', async () => {
    process.env.ELEANOR_PORTAL_SERVICE_SECRET = SECRET
    expect((await ask({ q: 'overtime' }, false)).status).toBe(401)
    const res = await ask({ q: 'overtime' })
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-store')
    const body = await res.json()
    expect(body.hits.length).toBeGreaterThan(0)
    expect(body.note).toMatch(/Check the current text/)
  })

  it('reads keys, and refuses more than four', async () => {
    process.env.ELEANOR_PORTAL_SERVICE_SECRET = SECRET
    const res = await ask({ keys: ['LAB 512', 'CACI 2766A'] })
    const body = await res.json()
    expect(body.items.map((i: { key: string }) => i.key)).toEqual(['LAB 512', 'CACI 2766A'])
    expect((await ask({ keys: ['1', '2', '3', '4', '5'] })).status).toBe(400)
    expect((await ask({})).status).toBe(400)
  })
})

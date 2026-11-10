import { describe, expect, it } from 'vitest'
import { buildAuthorityPack, claimsRaised, PACK_CLAIM_IDS } from '@/lib/authorityPack'
import { ANNOTATIONS_STATUS, CITATOR_STATUS, REVERIFY_BEFORE } from '@/lib/authorityPackShape'
import type { StoredReading } from '@/lib/caseReadingShape'

// A reading as stored: the matrix's findings by claim, and the Order proposed for the employer.
const reading = (wageOrder: unknown): StoredReading => ({
  wageOrder,
  claims1: [
    { claimId: 'meal-periods', standing: 'gaps to close', elements: [] },
    { claimId: 'rest-periods', standing: 'elements met', elements: [] },
  ],
  claims2: [
    { claimId: 'overtime', standing: 'not raised by these facts', elements: [] },
    { claimId: 'not-a-claim', standing: 'elements met', elements: [] },
  ],
  claims3: [],
})
const proposed = { confirmed: false, proposal: { order: '9' } }
const settled = { confirmed: true, proposal: { order: '9' } }

describe('a case Authority Pack', () => {
  it('takes the claims the reading raises, and only those', () => {
    expect(claimsRaised(reading(proposed))).toEqual([
      { claimId: 'meal-periods', standing: 'gaps to close' },
      { claimId: 'rest-periods', standing: 'elements met' },
    ])
  })

  it('quotes nothing from a Wage Order an attorney has not settled, and says so', () => {
    const pack = buildAuthorityPack(reading(proposed), '2026-11-09')
    expect(pack.wageOrder).toMatchObject({ order: null, settled: false })
    const rest = pack.claims.find(c => c.claimId === 'rest-periods')!
    expect(rest.provisions.some(p => p.key.startsWith('IWC'))).toBe(false)
    expect(rest.gaps.some(g => /Wage Order 9 is proposed, not settled/.test(g))).toBe(true)
  })

  it('reads the settled Order, and every provision it lists is on file with the day it was fetched', () => {
    const pack = buildAuthorityPack(reading(settled), '2026-11-09')
    const rest = pack.claims.find(c => c.claimId === 'rest-periods')!
    expect(rest.provisions.map(p => p.key)).toContain('IWC 9 sec 12')
    for (const p of pack.claims.flatMap(c => c.provisions)) {
      expect(p.onFile, p.key).toBe(true)
      expect(p.fetched?.on, p.key).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it("carries the holdings on file, checked word for word, and what each does not decide", () => {
    const meal = buildAuthorityPack(reading(settled), '2026-11-09').claims.find(c => c.claimId === 'meal-periods')!
    expect(meal.holdings.length).toBeGreaterThan(0)
    expect(meal.holdings.map(h => h.cite).join(' ')).toMatch(/Brinker/)
    for (const h of meal.holdings) {
      expect(h.verbatim, h.id).toBe(true)
      expect(h.limits.length, h.id).toBeGreaterThan(0)
      expect(h.bearsOn.length, h.id).toBeGreaterThan(0)
    }
    expect(meal.adverse.note).toMatch(/No contrary authority is held/)
  })

  it('never claims a citator check or paid annotations, and is due again a quarter after its oldest text', () => {
    const pack = buildAuthorityPack(reading(settled), '2026-11-09')
    expect(pack.verification.citator).toBe(CITATOR_STATUS)
    expect(pack.verification.annotations).toBe(ANNOTATIONS_STATUS)
    expect(pack.verification.reverifyBefore).toEqual(REVERIFY_BEFORE)
    const asOf = pack.verification.asOf!
    const due = new Date(`${asOf}T00:00:00Z`)
    due.setUTCDate(due.getUTCDate() + 90)
    expect(pack.verification.reverifyBy).toBe(due.toISOString().slice(0, 10))
    expect(buildAuthorityPack(reading(settled), '2099-01-01').verification.due).toBe(true)
  })

  it('adds a pleaded claim the reading has not read, with no standing', () => {
    const pack = buildAuthorityPack(reading(settled), '2026-11-09', ['wage-statements', 'nope'])
    expect(pack.claims.find(c => c.claimId === 'wage-statements')).toMatchObject({ standing: null })
    expect(pack.claims.some(c => c.claimId === 'nope')).toBe(false)
  })

  it('builds for every claim in the library', () => {
    const pack = buildAuthorityPack({ wageOrder: settled }, '2026-11-09', PACK_CLAIM_IDS)
    expect(pack.claims.map(c => c.claimId)).toEqual(PACK_CLAIM_IDS)
    for (const c of pack.claims) expect(c.provisions.length, c.claimId).toBeGreaterThan(0)
  })
})

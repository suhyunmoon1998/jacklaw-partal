import { describe, it, expect } from 'vitest'
import {
  CLAIMS_PER_STAGE,
  STAGES,
  STAGE_LABEL,
  StoredReading,
  allClaims,
  describe as describeReading,
  isComplete,
  nextStage,
} from '@/lib/caseReadingShape'
import { claimsFor, readingFingerprint } from '@/lib/caseReading'
import { CLAIMS } from '@/lib/authority/claims'
import { LedgerEntry } from '@/lib/factLedger'

const fact = (over: Partial<LedgerEntry> = {}): LedgerEntry => ({
  id: 'c1:f001', proposition: 'She worked five days a week.', verbatim: '월 화 금 토 일',
  provenance: { kind: 'portal answer', pinpoint: 'schedule', on: '' },
  period: '', actors: [], location: '', status: 'REPORTED',
  confidenceBasis: '', corroboration: [], contrary: '', legalTags: [], damagesTags: [],
  openLoop: '', addedBy: 'test', supersededBy: null, supersededWhy: null,
  ...over,
})

describe('walking a reading through its stages', () => {
  it('settles the Wage Order before reading any claim', () => {
    // The rest-period duty is read out of section 12 of an Order. Reading the
    // claims first produces an element that reports as needing an authority
    // the portal holds seventeen times over.
    expect(STAGES[0]).toBe('wage order')
    expect(nextStage(null)).toBe('wage order')
    expect(nextStage({})).toBe('wage order')
  })

  it('asks for each stage in turn and then stops', () => {
    const walk: StoredReading = {}
    expect(nextStage(walk)).toBe('wage order')
    walk.wageOrder = { proposal: { order: '5' } }
    expect(nextStage(walk)).toBe('claims 1')
    walk.claims1 = []
    expect(nextStage(walk)).toBe('claims 2')
    walk.claims2 = []
    expect(nextStage(walk)).toBe('spine')
    walk.spine = {}
    expect(nextStage(walk)).toBeNull()
    expect(isComplete(walk)).toBe(true)
  })

  it('treats an empty claims half as read, because that is a real answer', () => {
    // A half in which no claim is raised by the facts returns an empty array,
    // and a walk that took that for "not read yet" would run it again forever.
    expect(nextStage({ wageOrder: {}, claims1: [] })).toBe('claims 2')
  })

  it('names every stage for the person watching it run', () => {
    for (const s of STAGES) expect(STAGE_LABEL[s].length).toBeGreaterThan(15)
  })

  it('says how far along it is, because half-read is not the same as thin', () => {
    expect(describeReading(null)).toBe('Not read yet.')
    expect(describeReading({ wageOrder: {} })).toBe('1 of 4 stages read.')
    expect(describeReading({ wageOrder: {}, claims1: [], claims2: [], spine: {} })).toBe('Read in full.')
  })

  it('joins the two claim halves back into one list', () => {
    expect(allClaims<string>({ claims1: ['a', 'b'], claims2: ['c'] })).toEqual(['a', 'b', 'c'])
    expect(allClaims({})).toEqual([])
  })

  it('cuts the claims in two with none lost and none read twice', () => {
    const one = claimsFor('claims 1')
    const two = claimsFor('claims 2')
    expect(one.length + two.length).toBe(CLAIMS.length)
    expect(one).toHaveLength(CLAIMS_PER_STAGE)
    const ids = [...one, ...two].map(c => c.id)
    expect(new Set(ids).size).toBe(CLAIMS.length)
  })
})

describe('knowing when a reading has gone stale', () => {
  it('changes when a fact changes status, not only when one is added', () => {
    // A fact that moves from REPORTED to DISPUTED is a different fact for
    // every layer above, and a matrix read before the change is stale even
    // though the ledger is the same length.
    const before = readingFingerprint([fact()])
    const after = readingFingerprint([fact({ status: 'DISPUTED' })])
    expect(after).not.toBe(before)
  })

  it('changes when a fact is superseded by a follow-up answer', () => {
    // This is the whole point of pointing it at the ledger. A matrix saying an
    // element is contradicted, read against a fact the client has since
    // corrected, is a wrong answer with a date on it.
    const before = readingFingerprint([fact()])
    const after = readingFingerprint([fact({ supersededBy: 'c1:f099' })])
    expect(after).not.toBe(before)
  })

  it('does not change when the facts are merely reordered', () => {
    const a = readingFingerprint([fact({ id: 'c1:f001' }), fact({ id: 'c1:f002' })])
    const b = readingFingerprint([fact({ id: 'c1:f002' }), fact({ id: 'c1:f001' })])
    expect(a).toBe(b)
  })

  it('ignores a superseded fact’s replacement being added later', () => {
    const one = readingFingerprint([fact({ id: 'c1:f001' })])
    const two = readingFingerprint([fact({ id: 'c1:f001' }), fact({ id: 'c1:f002' })])
    expect(one).not.toBe(two)
  })
})

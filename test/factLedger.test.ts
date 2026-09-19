import { describe, it, expect } from 'vitest'
import { LedgerEntry, openLoops, standing, taggedWith, unsettled } from '@/lib/factLedger'
import { sourceText } from '@/lib/factExtraction'

const fact = (over: Partial<LedgerEntry> = {}): LedgerEntry => ({
  id: 'c1:f001',
  proposition: 'She worked five days a week.',
  verbatim: '월 화 금 토 일',
  provenance: { kind: 'portal answer', pinpoint: 'm2_days_per_week', on: '2026-09-11' },
  period: '2024-07-28 to 2026-08-31',
  actors: [],
  location: '',
  status: 'REPORTED',
  confidenceBasis: 'client memory',
  corroboration: [],
  contrary: '',
  legalTags: [],
  damagesTags: [],
  openLoop: '',
  addedBy: 'test',
  supersededBy: null,
  supersededWhy: null,
  ...over,
})

describe('what the ledger currently holds', () => {
  it('drops a fact that a later one replaced, and keeps it on file', () => {
    // The corpus is explicit that new information never silently overwrites
    // history. The superseded fact is still a row; it is just not standing.
    const entries = [
      fact({ id: 'c1:f001', supersededBy: 'c1:f002', supersededWhy: 'Paystub gave the real rate.' }),
      fact({ id: 'c1:f002' }),
    ]
    expect(standing(entries).map(e => e.id)).toEqual(['c1:f002'])
    expect(entries).toHaveLength(2)
  })

  it('finds the facts that bear on a claim, whatever case they were tagged in', () => {
    const entries = [
      fact({ id: 'c1:f001', legalTags: ['Meal periods'] }),
      fact({ id: 'c1:f002', legalTags: ['meal periods', 'Off-the-clock work'] }),
      fact({ id: 'c1:f003', legalTags: ['Rest periods'] }),
    ]
    expect(taggedWith(entries, 'meal periods').map(e => e.id)).toEqual(['c1:f001', 'c1:f002'])
  })

  it('never offers a superseded fact as proof of anything', () => {
    const entries = [
      fact({ id: 'c1:f001', legalTags: ['Overtime'], supersededBy: 'c1:f002' }),
      fact({ id: 'c1:f002', legalTags: ['Overtime'] }),
    ]
    expect(taggedWith(entries, 'Overtime').map(e => e.id)).toEqual(['c1:f002'])
  })
})

describe('what the office still has to settle', () => {
  it('puts a contradiction ahead of a gap', () => {
    // A client whose own answers disagree is a credibility problem the other
    // side finds first. A missing rate is only a number nobody has yet.
    const entries = [
      fact({ id: 'c1:f001', status: 'REPORTED' }),
      fact({ id: 'c1:f002', status: 'UNKNOWN' }),
      fact({ id: 'c1:f003', status: 'DISPUTED' }),
      fact({ id: 'c1:f004', status: 'CONFIRMED' }),
    ]
    expect(unsettled(entries).map(e => e.status)).toEqual(['DISPUTED', 'UNKNOWN', 'REPORTED'])
  })

  it('leaves a corroborated fact alone', () => {
    expect(unsettled([fact({ status: 'CONFIRMED' })])).toHaveLength(0)
  })

  it('lists what to go and get, against the fact that needs it', () => {
    const entries = [
      fact({ id: 'c1:f001', openLoop: 'Hourly rate at hire — paystubs' }),
      fact({ id: 'c1:f002', openLoop: '' }),
    ]
    expect(openLoops(entries)).toEqual([
      { factId: 'c1:f001', need: 'Hourly rate at hire — paystubs' },
    ])
  })
})

describe('the answers handed to the extractor', () => {
  it('carries the question id, so a fact can name where it came from', () => {
    // Provenance is mandatory in the corpus. A fact whose source is "the client
    // said so" cannot be checked by the person reading it.
    const { text } = sourceText({
      clientId: 'c1',
      clientName: 'Test',
      answers: { m2_meal_given: 'No' },
    })
    expect(text).toContain('[m2_meal_given]')
    expect(text).toContain('ANSWER: No')
  })

  it('leaves out an answer the client took back', () => {
    const { text, answered } = sourceText({
      clientId: 'c1',
      clientName: 'Test',
      answers: { m2_rest_given: 'No', m2_rest_count: '2' },
    })
    expect(answered).toBe(1)
    expect(text).not.toContain('ANSWER: 2')
  })
})

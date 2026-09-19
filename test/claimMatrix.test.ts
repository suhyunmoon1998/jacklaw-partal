import { describe, it, expect } from 'vitest'
import { ClaimFinding, factSheet, ranked, unresolved } from '@/lib/claimMatrix'
import { LedgerEntry } from '@/lib/factLedger'

const fact = (over: Partial<LedgerEntry> = {}): LedgerEntry => ({
  id: 'c1:f001',
  proposition: 'She worked five days a week.',
  verbatim: '월 화 금 토 일',
  provenance: { kind: 'portal answer', pinpoint: 'weekly_schedule', on: '' },
  period: '', actors: [], location: '', status: 'REPORTED',
  confidenceBasis: 'client memory', corroboration: [], contrary: '',
  legalTags: [], damagesTags: [], openLoop: '',
  addedBy: 'test', supersededBy: null, supersededWhy: null,
  ...over,
})

const finding = (over: Partial<ClaimFinding> = {}): ClaimFinding => ({
  claimId: 'meal-periods',
  standing: 'gaps to close',
  elements: [],
  defense: '',
  adverse: [],
  damagesInputs: [],
  damagesMissing: [],
  ...over,
})

describe('the facts handed to the matrix', () => {
  it('gives every fact its id, so a finding can cite it and a reader can follow it back', () => {
    const sheet = factSheet([fact({ id: 'c1:f007' })])
    expect(sheet).toContain('c1:f007')
    expect(sheet).toContain('[REPORTED]')
    expect(sheet).toContain('from: weekly_schedule')
  })

  it('shows what cuts against a fact in the fact itself', () => {
    // The corpus requires adverse evidence in the record rather than a separate
    // file. A matrix that never sees it cannot weigh it.
    const sheet = factSheet([fact({ contrary: 'Her pay stub shows a different rate.' })])
    expect(sheet).toContain('CUTS AGAINST: Her pay stub shows a different rate.')
  })

  it('never offers a superseded fact as proof', () => {
    const sheet = factSheet([
      fact({ id: 'c1:f001', supersededBy: 'c1:f002' }),
      fact({ id: 'c1:f002' }),
    ])
    expect(sheet).not.toContain('c1:f001')
    expect(sheet).toContain('c1:f002')
  })
})

describe('reading the matrix back', () => {
  it('puts the claims a lawyer should look at first, first', () => {
    const out = ranked([
      finding({ claimId: 'a', standing: 'not raised by these facts' }),
      finding({ claimId: 'b', standing: 'blocked' }),
      finding({ claimId: 'c', standing: 'elements met' }),
      finding({ claimId: 'd', standing: 'gaps to close' }),
    ])
    expect(out.map(f => f.claimId)).toEqual(['c', 'd', 'b', 'a'])
  })

  it('collects every element nobody can answer yet — the development plan', () => {
    // Two different reasons an element is open, and they need different work:
    // 'unknown' is a fact to go and get, 'needs authority' is a Wage Order or a
    // case the office has not put on file. Both belong on the list.
    const out = unresolved([
      finding({
        claimId: 'rest-periods',
        elements: [
          { key: 'duty-owed', state: 'needs authority', facts: [], reasoning: '', wouldSettleIt: 'Wage Order 5' },
          { key: 'not-provided', state: 'partially supported', facts: ['c1:f001'], reasoning: '', wouldSettleIt: '' },
          { key: 'paid-time', state: 'unknown', facts: [], reasoning: '', wouldSettleIt: 'Pay stubs' },
        ],
      }),
    ])
    expect(out).toHaveLength(2)
    expect(out.map(o => o.state).sort()).toEqual(['needs authority', 'unknown'])
    expect(out.find(o => o.element === 'duty-owed')!.need).toBe('Wage Order 5')
  })
})

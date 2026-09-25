import { describe, it, expect } from 'vitest'
import { ClaimFinding, ELEMENT_STATES, STANDINGS, factSheet, ranked, settle, unresolved } from '@/lib/claimMatrix'
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

describe('the closed sets, checked after the call rather than in its schema', () => {
  // In the output schema one mislabelled value cost the whole claim; the
  // follow-up rounds lost twenty questions to one rung label that way.
  const raw = (over: Record<string, unknown> = {}) => ({
    claimId: 'minimum-wage',
    standing: 'gaps to close',
    elements: [
      { key: 'paid-less', state: 'supported', facts: ['f001'], reasoning: 'Paid nothing for the tip work.', wouldSettleIt: '' },
    ],
    defense: '',
    adverse: [],
    damagesInputs: [],
    damagesMissing: [],
    ...over,
  })

  it('passes a well-formed finding through unchanged', () => {
    expect(settle(raw())).toEqual(raw())
  })

  it('reads a label written with different case, hyphens or spacing as the label', () => {
    const f = settle(raw({
      standing: ' Gaps-to-Close ',
      elements: [{ key: 'k', state: 'Partially_Supported', facts: [], reasoning: 'r', wouldSettleIt: '' }],
    }))
    expect(f.standing).toBe('gaps to close')
    expect(f.elements[0].state).toBe('partially supported')
  })

  it('keeps an element with a state outside the five, shown as unknown and saying what it was given', () => {
    const f = settle(raw({
      elements: [
        { key: 'a', state: 'likely supported', facts: ['f002'], reasoning: 'She says so.', wouldSettleIt: 'Pay stubs' },
        { key: 'b', state: 'contradicted', facts: ['f003'], reasoning: 'Stub shows pay.', wouldSettleIt: '' },
      ],
    }))
    expect(f.elements.map(e => e.state)).toEqual(['unknown', 'contradicted'])
    expect(f.elements[0].reasoning).toContain('"likely supported"')
    expect(f.elements[0].reasoning).toContain('She says so.')
    expect(f.elements[0].facts).toEqual(['f002'])
  })

  it('refuses a standing outside the four, so the claim is read again rather than shown wrong', () => {
    expect(() => settle(raw({ standing: 'probably met' }))).toThrow(/probably met/)
  })

  it('ranks by the same four the check allows', () => {
    expect(STANDINGS).toHaveLength(4)
    expect(ELEMENT_STATES).toContain('needs authority')
  })
})

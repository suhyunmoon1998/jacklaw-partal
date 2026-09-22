import { describe, it, expect } from 'vitest'
import { claimTitle, shortRef, summarise, Finding } from '@/components/admin/ReadingDocument'

const el = (key: string, state: string, wouldSettleIt = '') => ({
  key,
  state,
  reasoning: `reasoning for ${key}`,
  wouldSettleIt,
})

const claim = (claimId: string, standing: string, elements: Finding['elements'], extra: Partial<Finding> = {}): Finding => ({
  claimId,
  standing,
  elements,
  adverse: [],
  defense: '',
  ...extra,
})

describe('the fact reference on a page a person reads', () => {
  it('drops the client id, which is identical on every one of them', () => {
    expect(shortRef('client-1789099693038:f068 — he did no work during the meal')).toBe(
      'f068 — he did no work during the meal'
    )
  })

  it('drops it everywhere in a sentence, not just at the front', () => {
    expect(shortRef('Compare client-1:f001 against client-1:f002.')).toBe('Compare f001 against f002.')
  })

  it('leaves a sentence with no reference alone', () => {
    expect(shortRef('The employer will say the meal was made available.')).toBe(
      'The employer will say the meal was made available.'
    )
  })
})

describe('a claim id as a heading', () => {
  it('reads as words', () => {
    expect(claimTitle('meal-periods')).toBe('Meal periods')
    expect(claimTitle('wage-statements')).toBe('Wage statements')
    expect(claimTitle('ucl')).toBe('Ucl')
  })
})

describe('summarising a reading', () => {
  const findings: Finding[] = [
    claim('meal-periods', 'gaps to close', [
      el('over-five-hours', 'partially supported', 'punch records'),
      el('no-thirty-minutes', 'supported'),
      el('not-waived', 'unknown', 'the personnel file'),
      el('second-meal', 'unknown', 'time records'),
    ], { adverse: ['client-1:f052 — final wages paid on the last day'], damagesMissing: ['whether tips are discretionary'] }),
    claim('overtime', 'gaps to close', [
      el('over-eight-hours', 'supported'),
      el('not-paid', 'unknown', 'payroll records'),
    ]),
    claim('gratuities', 'not raised by these facts', [el('taking', 'unknown', 'nothing')]),
  ]

  const s = summarise(findings)

  it('counts every claim, including the ones these facts do not raise', () => {
    expect(s.claims).toBe(3)
    expect(s.byStanding).toEqual({ 'gaps to close': 2, 'not raised by these facts': 1 })
  })

  it('tallies elements across all the claims', () => {
    expect(s.byState).toEqual({ 'partially supported': 1, supported: 2, unknown: 4 })
  })

  it('lists what to get next only for elements that are not settled', () => {
    // An element already supported may well name a document worth holding,
    // but it is not a thing to chase, and putting it on the list buries the
    // three that are.
    const wants = s.wouldSettle.map(w => w.want)
    expect(wants).toContain('punch records')
    expect(wants).toContain('the personnel file')
    expect(wants).toContain('payroll records')
    expect(wants).toContain('nothing')
    expect(s.wouldSettle.every(w => w.want !== '')).toBe(true)
  })

  it('does not rank a claim these facts do not raise as strongest or thinnest', () => {
    // Otherwise "where the case is thinnest" leads with a claim nobody is
    // bringing, which is exactly the wrong thing to put in front of someone
    // deciding what to do next.
    expect(s.strongest.map(f => f.claimId)).not.toContain('gratuities')
    expect(s.thinnest.map(t => t.claim.claimId)).not.toContain('gratuities')
  })

  it('puts the claim with most unsettled elements first among the thinnest', () => {
    expect(s.thinnest[0].claim.claimId).toBe('meal-periods')
    expect(s.thinnest[0].unknown).toBe(2)
  })

  it('counts the facts that cut against us and what blocks a damages figure', () => {
    expect(s.adverseCount).toBe(1)
    expect(s.damagesMissing).toEqual([
      { claim: 'meal-periods', want: 'whether tips are discretionary' },
    ])
  })

  it('survives a claim that came back without elements or adverse facts', () => {
    // A stage that failed halfway has stored a finding shaped like this, and
    // the summary is the first thing rendered — it cannot be the thing that
    // throws.
    const thin = summarise([{ claimId: 'x', standing: 'blocked' } as unknown as Finding])
    expect(thin.claims).toBe(1)
    expect(thin.adverseCount).toBe(0)
    expect(thin.wouldSettle).toEqual([])
  })
})

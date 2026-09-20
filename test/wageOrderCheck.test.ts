import { describe, it, expect } from 'vitest'
import { WageOrderChoice, checkChoice, isUsable } from '@/lib/wageOrderChoice'

const choice = (over: Partial<WageOrderChoice['proposal']> = {}, dlse: WageOrderChoice['dlse'] = null): WageOrderChoice => ({
  proposal: {
    order: '5',
    industry: 'Public Housekeeping Industry',
    businessIs: 'restaurant',
    reliedOn: "IWC Wage Order 5, Section 2(R)(1): 'Public Housekeeping Industry' means ... Restaurants ...",
    because: 'The employer is a restaurant.',
    facts: ['f017'],
    rejected: [{ order: '7', why: 'Mercantile covers selling goods.' }],
    whatWouldSettleIt: '',
    ...over,
  },
  dlse,
  confirmed: false,
  caveat: '',
})

describe('checking a Wage Order proposal before ten claims are read under it', () => {
  it('passes one whose field and reasoning agree', () => {
    expect(checkChoice(choice({}, { entry: 'Restaurants', orders: '5', agrees: true }))).toEqual([])
    expect(isUsable(choice())).toBe(true)
  })

  it('catches the real one: Order 7 proposed while quoting Order 5', () => {
    // This happened, on a restaurant worker's file. Everything the model wrote
    // said Order 5 — the provision it quoted, the industry it named, the Order
    // it listed as rejected — and the field said 7. Five claims were read
    // under the wrong Order before anybody read the prose.
    const broken = choice({
      order: '7',
      industry: "restaurant employer classified under mercantile industry's plain language does not fit; employer is a restaurant, which Wage Order 5 governs",
    }, { entry: 'Restaurants', orders: '5', agrees: false })

    const problems = checkChoice(broken)
    expect(isUsable(broken)).toBe(false)
    expect(problems.filter(p => p.severity === 'blocking').length).toBeGreaterThanOrEqual(2)
    expect(problems.map(p => p.says).join(' ')).toContain('relied on is Order 5')
  })

  it('catches an Order that is both the answer and ruled out', () => {
    const contradictory = choice({ order: '7', reliedOn: 'IWC Wage Order 7, Section 2(I)' })
    expect(checkChoice(contradictory).some(p => p.says.includes('ruled out'))).toBe(true)
    expect(isUsable(contradictory)).toBe(false)
  })

  it('catches an industry that is an argument rather than a name', () => {
    const wordy = choice({ industry: 'this is plainly a restaurant and so the mercantile order cannot apply here at all' })
    expect(checkChoice(wordy).some(p => p.says.includes('reads as a sentence'))).toBe(true)
  })

  it('warns, but does not block, when only the pamphlet disagrees', () => {
    // It is secondary and says so itself, so a lawyer decides. But it is the
    // check that caught the broken one, and it is not passed over in silence.
    const disputed = choice({}, { entry: 'Restaurants', orders: '7', agrees: false })
    const problems = checkChoice(disputed)
    expect(problems).toHaveLength(1)
    expect(problems[0].severity).toBe('warning')
    expect(isUsable(disputed)).toBe(true)
  })

  it('says nothing about a proposal that reached no Order', () => {
    expect(checkChoice(choice({ order: '' }))).toEqual([])
    expect(isUsable(choice({ order: '' }))).toBe(false)
  })
})

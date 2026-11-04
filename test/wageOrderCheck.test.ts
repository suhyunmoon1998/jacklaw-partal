import { describe, it, expect } from 'vitest'
import { ORDERS, WageOrderChoice, checkChoice, isUsable, orderNumber, tidyChoice } from '@/lib/wageOrderChoice'
import { proposedOrder } from '@/lib/caseReading'
import { section } from '@/lib/authority'

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

describe('the Order as a number, however the model wrote it', () => {
  it('reads every way a stored reading has written it', () => {
    for (const written of ['5', 'IWC Wage Order 5', 'Wage Order 5', 'Order 5', 'IWC 5', 'Order 5 (Public Housekeeping)', '5 (Public Housekeeping)', 'IWC Wage Order 5-2001', 'Order 5, Section 2(R)']) {
      expect(orderNumber(written), written).toBe('5')
    }
  })

  it('leaves a bare number exactly as it is, so no current reading goes stale and is paid for again', () => {
    for (const order of ORDERS) expect(orderNumber(order)).toBe(order)
  })

  it('is empty when there is no one Order in the text', () => {
    for (const written of ['', 'none', 'MW', '18', '0', '5 or 7', 'Order 5 and Order 7', '5/7', 'Public Housekeeping', null, undefined]) {
      expect(orderNumber(written), String(written)).toBe('')
    }
  })

  it('corrects a stored reading, so the Order on file is found', () => {
    // A real one. Written this way the lookup missed, and the matrix was told the
    // Order was NOT ON FILE on a file whose Order is in the library.
    const stored = tidyChoice(choice({
      order: 'IWC Wage Order 5',
      rejected: [{ order: 'IWC Wage Order 7 (Mercantile Industry)', why: 'x' }, { order: 'not a number', why: 'y' }],
    }))
    expect(stored.proposal.order).toBe('5')
    expect(stored.proposal.rejected.map(r => r.order)).toEqual(['7', 'not a number'])
    expect(stored.caveat).toBe('Proposed IWC Wage Order 5, not confirmed by an attorney. Every rest-period and hours finding below depends on it.')
    const order = proposedOrder({ wageOrder: stored })
    expect(order).toBe('5')
    expect(section('IWC', `${order} sec 12`)).toBeTruthy()
    expect(section('IWC', 'IWC Wage Order 5 sec 12')).toBeNull()
  })

  it('says plainly when none was proposed', () => {
    const stored = tidyChoice(choice({ order: 'none' }))
    expect(stored.proposal.order).toBe('')
    expect(stored.caveat).toContain('No Wage Order proposed')
    expect(isUsable(stored)).toBe(false)
  })

  it('passes over anything that is not a proposal', () => {
    expect(tidyChoice(null)).toBeNull()
    expect(tidyChoice({})).toEqual({})
  })

  it('catches an Order proposed and ruled out, in whatever words', () => {
    const contradictory = choice({ order: 'IWC Wage Order 7', reliedOn: '', rejected: [{ order: 'Order 7 (Mercantile)', why: 'x' }] })
    expect(checkChoice(contradictory).some(p => p.says.includes('ruled out'))).toBe(true)
    expect(isUsable(contradictory)).toBe(false)
  })

  it('catches a provision cited the way the schema asks for it', () => {
    expect(checkChoice(choice({ order: '7', rejected: [], reliedOn: 'IWC 5 sec 2' })).some(p => p.says.includes('relied on is Order 5'))).toBe(true)
  })
})

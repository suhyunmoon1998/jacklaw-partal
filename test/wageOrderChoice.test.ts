import { describe, it, expect } from 'vitest'
import { ORDERS, applicability, dlseGuide, dlseOn } from '@/lib/wageOrderChoice'
import { section } from '@/lib/authority'

describe('what each Wage Order says it covers', () => {
  it('pulls an applicability sentence out of every one of the seventeen', () => {
    for (const order of ORDERS) {
      const says = applicability(order)
      expect(says.length, `Order ${order} yielded nothing`).toBeGreaterThan(40)
      expect(says.toLowerCase(), `Order ${order}`).toContain('this')
    }
  })

  it('stops before the exemption tests, which answer a different question', () => {
    // Section 1 runs to thirteen thousand characters and all but the opening is
    // the executive, administrative and professional tests — whether THIS
    // employee is covered, not which Order covers the employer.
    const five = applicability('5')
    expect(five).toMatch(/public housekeeping industry/i)
    expect(five).not.toMatch(/executive exemption/i)
    expect(five.length).toBeLessThan(section('IWC', '5 sec 1')!.length / 10)
  })

  it('distinguishes the two Orders a restaurant case is actually decided between', () => {
    expect(applicability('5')).toMatch(/public housekeeping/i)
    expect(applicability('7')).toMatch(/mercantile/i)
    // And the definition that settles it names the establishment in its own text.
    expect(section('IWC', '5 sec 2')).toMatch(/Restaurants, night clubs, taverns/i)
  })
})

describe('the DLSE pamphlet, consulted after the fact', () => {
  it('agrees that a restaurant is Order 5', () => {
    const said = dlseOn('restaurant', '5')
    expect(said!.entry).toBe('Restaurants')
    expect(said!.orders).toBe('5')
    expect(said!.agrees).toBe(true)
  })

  it('reports disagreement rather than hiding it', () => {
    // If the proposal had said Order 7 for a restaurant, the cross-check has to
    // contradict it out loud.
    expect(dlseOn('restaurant', '7')!.agrees).toBe(false)
  })

  it('prefers the entry that is about the business, not one that mentions it', () => {
    // Loose matching answered 'restaurant' with 'Fruit and vegetables,
    // preparing for restaurant, bakeries, etc. — Order 1'. A wrong cross-check
    // is worse than none, so every query term must be in the entry and the
    // shortest qualifying entry wins.
    expect(dlseOn('restaurant', '5')!.entry).not.toMatch(/fruit/i)
    expect(dlseOn('retail store', '7')!.entry).toBe('Retail stores')
    expect(dlseOn('dry cleaning', '6')!.agrees).toBe(true)
  })

  it('returns nothing rather than a bad match when there is nothing to compare', () => {
    expect(dlseOn('', '5')).toBeNull()
    // The index is keyed on businesses, not on the Orders' industry names.
    expect(dlseOn('public housekeeping industry', '5')).toBeNull()
  })

  it('carries the pamphlet’s own account of its standing', () => {
    // It says courts need not follow it and that it is no safe harbour. That
    // sentence travels with it, because the corpus forbids resting a material
    // conclusion on a secondary source.
    const guide = dlseGuide()
    expect(guide.standing).toMatch(/safe harbor|not required to follow/i)
    expect(guide.source).toMatch(/Division of Labor Standards Enforcement/i)
    expect(guide.text).toMatch(/main purpose of the business/i)
  })
})

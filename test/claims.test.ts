import { describe, it, expect } from 'vitest'
import { CLAIMS, claimById, sectionsUsed } from '@/lib/authority/claims'
import { ORDERS } from '@/lib/wageOrderChoice'
import { parseKey, section } from '@/lib/authority'

describe('the claims the matrix is allowed to reason about', () => {
  it('cites only sections the portal actually holds', () => {
    // The guarantee this whole design rests on: an element is read out of a
    // section whose text is on file, so the matrix can quote it rather than
    // trust anyone's memory of it. A section that is not on file is a claim
    // that cannot be grounded, and the build should say so.
    for (const key of sectionsUsed()) {
      if (key.includes('{order}')) continue // checked below, against every Order
      const { law, num } = parseKey(key)
      expect(section(law, num), `${key} is cited by a claim but is not on file`).toBeTruthy()
    }
  })

  it('holds every Wage Order a claim template could resolve to', () => {
    // A duty written as 'IWC {order} sec 12' is only groundable if the section
    // exists in whichever Order the case turns out to be under. Any one of the
    // seventeen is reachable, so all seventeen have to carry it.
    const templates = sectionsUsed().filter(k => k.includes('{order}'))
    expect(templates.length).toBeGreaterThan(0)
    for (const t of templates) {
      for (const order of ORDERS) {
        const { law, num } = parseKey(t.replace('{order}', order))
        expect(section(law, num), `${t} does not resolve for Order ${order}`).toBeTruthy()
      }
    }
  })

  it('reads each element out of a section that carries the words it uses', () => {
    // Spot checks against the operative language. If the statute text changes
    // under us, or an element drifts away from what its section says, these go.
    const meal = claimById('meal-periods')!
    expect(section('LAB', '512')).toMatch(/more than five hours/i)
    expect(section('LAB', '512')).toMatch(/not less than 30 minutes/i)
    expect(meal.elements.find(e => e.key === 'over-five-hours')!.from).toBe('LAB 512')

    const ot = claimById('overtime')!
    expect(section('LAB', '510')).toMatch(/one and one-half times/i)
    expect(section('LAB', '510')).toMatch(/twice the regular rate/i)
    expect(ot.elements.find(e => e.key === 'not-paid-premium')!.from).toBe('LAB 510')

    const tips = claimById('gratuities')!
    expect(section('LAB', '351')).toMatch(/sole property of the employee/i)
    expect(tips.elements.find(e => e.key === 'sole-property')!.from).toBe('LAB 351')

    const wait = claimById('final-pay')!
    expect(section('LAB', '203')).toMatch(/willfully fails to pay/i)
    expect(section('LAB', '203')).toMatch(/not continue for more than 30 days/i)
    expect(wait.elements.find(e => e.key === 'willful')!.from).toBe('LAB 203')
  })

  it('reads the rest-period duty out of the Order, not the Labor Code', () => {
    // Section 226.7 gives the remedy and points at the Wage Order for the duty
    // — "mandated pursuant to an applicable statute, or applicable regulation,
    // standard, or order of the Industrial Welfare Commission". The duty
    // element has to be read from the Order, and the Order has to say it.
    const duty = claimById('rest-periods')!.elements.find(e => e.key === 'duty-owed')!
    expect(duty.from).toBe('IWC {order} sec 12')
    expect(section('IWC', '5 sec 12')).toMatch(/ten \(10\)\s*\n?\s*minutes net rest time/i)

    // Until an Order is settled for the employer, the element still announces
    // what is missing rather than picking one — which Order applies is a legal
    // classification, and holding all seventeen does not make it.
    expect(duty.needsAuthority).toBeTruthy()
    expect(duty.needsAuthority).toMatch(/Wage Order/i)
    expect(duty.needsAuthority).toMatch(/not been settled/i)

    // And the remedy it does carry is the one the statute actually states.
    expect(section('LAB', '226.7')).toMatch(/one additional hour of pay/i)
  })

  it('marks the elements that turn on cases nobody has put on file', () => {
    const unresolved = CLAIMS.flatMap(c =>
      c.elements.filter(e => e.needsAuthority).map(e => `${c.id}:${e.key}`)
    )
    // Not zero, and that is the point — a matrix that claimed every element was
    // answerable from six statutes would be lying about what it has.
    expect(unresolved.length).toBeGreaterThan(4)
    for (const c of CLAIMS) {
      for (const e of c.elements) {
        if (!e.needsAuthority) continue
        expect(e.needsAuthority.length, `${c.id}:${e.key} says nothing useful`).toBeGreaterThan(30)
      }
    }
  })

  it('covers the claims this office questionnaire actually asks about', () => {
    const ids = CLAIMS.map(c => c.id)
    for (const id of [
      'meal-periods', 'rest-periods', 'overtime', 'minimum-wage',
      'final-pay', 'wage-statements', 'expenses', 'gratuities',
      'whistleblower', 'ucl',
    ]) {
      expect(ids, `${id} is missing`).toContain(id)
    }
  })

  it('names the defence to expect on every claim', () => {
    // The corpus requires the strongest defence to be stated before opposing
    // counsel states it. A claim with no expected defence is a claim nobody has
    // thought about from the other side.
    for (const c of CLAIMS) {
      expect(c.expectedDefense.length, `${c.id}`).toBeGreaterThan(30)
      expect(c.remedy.length, `${c.id}`).toBeGreaterThan(30)
      expect(c.elements.length, `${c.id}`).toBeGreaterThan(1)
    }
  })
})

describe('handing a claim to the matrix', () => {
  it('quotes the Order once one is settled, and says it is missing until then', async () => {
    // The bug this covers: with an Order supplied the element kept its
    // "AUTHORITY NOT ON FILE" line anyway, so the model went on reporting the
    // duty as unsettled while the text of Order 5 section 12 sat in front of
    // it. Nothing in the output looked wrong — it just never improved.
    const { briefForTest } = await import('@/lib/claimMatrix')
    const rest = claimById('rest-periods')!

    const open = briefForTest(rest)
    expect(open).toContain('an IWC Wage Order, not yet settled')
    expect(open).toContain('AUTHORITY NOT ON FILE')
    // Assert on the Order's own heading, not on a phrase from its text: the
    // Brinker holding quotes and discusses the same language, so a loose match
    // finds it whether the Order was quoted or not.
    expect(open).not.toContain('=== IWC Wage Order')

    const settled = briefForTest(rest, '5')
    expect(settled).toContain('=== IWC Wage Order 5, § 12 ===')
    expect(settled).toMatch(/ten \(10\)\s*\n?\s*minutes net rest time/i)
    expect(settled).not.toContain('not yet settled')
    expect(settled).not.toContain('AUTHORITY NOT ON FILE')
  })

  it('hands over the cases that decide an element, with their edges', async () => {
    const { briefForTest } = await import('@/lib/claimMatrix')
    const rest = briefForTest(claimById('rest-periods')!, '5')
    expect(rest).toContain('=== THE CASES THAT DECIDE THESE ELEMENTS ===')
    expect(rest).toContain('Augustus v. ABM Security Services, Inc. (2016) 2 Cal.5th 257')
    expect(rest).toContain('WHAT IT DOES NOT DECIDE')

    const meal = briefForTest(claimById('meal-periods')!, '5')
    expect(meal).toContain('Brinker Restaurant Corp. v. Superior Court')
    // The sentence the meal-period element actually turns on.
    expect(meal).toMatch(/relieve the employee of all duty for the designated period/i)
  })
})

describe('a matrix run that loses a claim', () => {
  it('reports which one rather than returning a shorter list', async () => {
    // Ten claims run together. The first time one of them came back with a
    // value the output schema rejected, the rejection propagated and destroyed
    // the other nine — a hundred seconds and the cost of ten readings, gone,
    // for one flake. Worse, a bare array of nine findings looks exactly like a
    // complete matrix for a case with nine claims in it.
    const { buildMatrix } = await import('@/lib/claimMatrix')
    const shape = await buildMatrix([], [])
    expect(shape).toHaveProperty('findings')
    expect(shape).toHaveProperty('failed')
    expect(shape.findings).toEqual([])
    expect(shape.failed).toEqual([])
  })
})

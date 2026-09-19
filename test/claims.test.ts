import { describe, it, expect } from 'vitest'
import { CLAIMS, claimById, sectionsUsed } from '@/lib/authority/claims'
import { section } from '@/lib/authority'

describe('the claims the matrix is allowed to reason about', () => {
  it('cites only sections the portal actually holds', () => {
    // The guarantee this whole design rests on: an element is read out of a
    // section whose text is on file, so the matrix can quote it rather than
    // trust anyone's memory of it. A section that is not on file is a claim
    // that cannot be grounded, and the build should say so.
    for (const key of sectionsUsed()) {
      const [law, num] = key.split(' ')
      expect(section(law, num), `${key} is cited by a claim but is not on file`).toBeTruthy()
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

  it('says when an element cannot be settled from what is on file', () => {
    // Rest periods are the clearest case: section 226.7 gives the remedy and
    // points at the Wage Order for the duty. The Orders are not on file, so the
    // duty element must announce that rather than state a rule from memory.
    const rest = claimById('rest-periods')!
    const duty = rest.elements.find(e => e.key === 'duty-owed')!
    expect(duty.needsAuthority).toBeTruthy()
    expect(duty.needsAuthority).toMatch(/Wage Order/i)
    expect(duty.needsAuthority).toMatch(/NOT ON FILE/i)

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

import { describe, it, expect } from 'vitest'
import { Brief } from '@/lib/caseBrief'
import { methodFor, missingInformation } from '@/lib/missingInformation'

/**
 * The brief already said everything that was missing — in three places, in no
 * order, well over a hundred lines on a real file. That is not a list of
 * priorities. This is the short ranked one, and every line has to say what is
 * missing, why it matters, who holds it and how to get it.
 */
const brief = (over: Partial<Brief> = {}): Brief => ({
  clientName: 'Dayeon Kim',
  caseType: 'Wage & Hour',
  factCount: 204,
  readOn: null,
  absent: [],
  overview: { summary: '', baseline: [] },
  chronology: { events: [], coreStory: [], conflicts: [] },
  claims: [],
  wageOrder: null,
  strengths: [],
  weaknesses: [],
  defenses: [],
  damages: { issues: [], totals: null, drivers: '', doubleCounting: [], missingInputs: [] },
  questions: [],
  evidence: [],
  people: [],
  review: [],
  changes: null,
  ...over,
})

const record = (over: Record<string, unknown> = {}) =>
  ({
    record: 'Wage statements, Feb–Jul 2025',
    tier: 'defendant record',
    inHand: false,
    proves: { facts: [], note: 'Whether the two-hour blocks were ever paid.' },
    bearsOn: [],
    howToGetIt: 'Employer payroll records, by document request.',
    ifMissing: '',
    ...over,
  }) as never

describe('how the office would go and get it', () => {
  it('sends employer-held records to discovery', () => {
    expect(methodFor('Employer payroll records, by document request.')).toBe('discovery')
    expect(methodFor('Punch and POS time records')).toBe('discovery')
  })

  it('sends a missing rule to research, not to the client', () => {
    expect(methodFor('The applicable Wage Order text.')).toBe('research')
    expect(methodFor('The City of Los Angeles minimum wage ordinance')).toBe('research')
  })

  it('names a subpoena only where the reading did', () => {
    expect(methodFor('Subpoena the carrier for phone records')).toBe('subpoena')
    expect(methodFor('Carrier statements for the employment period')).toBe('third party')
  })

  it('puts anything with no named holder back to the client', () => {
    // The cheapest step, and the one that cannot be aimed at the wrong party.
    expect(methodFor('Whether she gave 72 hours notice')).toBe('client')
  })

  it('asks a coworker through a witness interview', () => {
    expect(methodFor('The coworker who rotated the tip task')).toBe('witness')
  })
})

describe('what comes first', () => {
  it('puts the input that blocks every figure above a single element', () => {
    const items = missingInformation(
      brief({
        damages: {
          issues: [],
          totals: null,
          drivers: '',
          doubleCounting: [],
          missingInputs: ['Her hourly rate and each change date, from the pay stubs.'],
        },
        claims: [
          {
            claimId: 'meal-periods',
            standing: 'gaps to close',
            elements: [
              {
                key: 'not-waived',
                state: 'supported',
                reasoning: '',
                wouldSettleIt: 'The personnel file, confirming no written waiver was signed.',
              },
            ],
            adverse: [],
            defense: '',
          },
        ],
      })
    )
    expect(items[0].what).toContain('hourly rate')
    expect(items[0].why).toContain('cannot be computed')
  })

  it('ranks a defendant record above the client’s own memory', () => {
    const items = missingInformation(
      brief({
        evidence: [
          record({ record: 'Her own recollection of the shifts', tier: 'client testimony' }),
          record({ record: 'Punch and POS records', tier: 'defendant record' }),
        ],
      })
    )
    expect(items.map(i => i.what)).toEqual(['Punch and POS records', 'Her own recollection of the shifts'])
  })

  it('ranks an element the reading could not settle above one it could', () => {
    const el = (key: string, state: string, wouldSettleIt: string) => ({
      key,
      state,
      reasoning: '',
      wouldSettleIt,
    })
    const items = missingInformation(
      brief({
        claims: [
          {
            claimId: 'meal-periods',
            standing: 'gaps to close',
            elements: [
              el('settled', 'supported', 'Confirmation of the shift lengths.'),
              el('open', 'contradicted', 'A follow-up pinning down the interruptions.'),
            ],
            adverse: [],
            defense: '',
          },
        ],
      })
    )
    expect(items[0].what).toContain('pinning down')
  })
})

describe('the list itself', () => {
  it('never runs past ten', () => {
    const many = Array.from({ length: 30 }, (_, i) => `Missing thing ${i}`)
    const items = missingInformation(
      brief({ damages: { issues: [], totals: null, drivers: '', doubleCounting: [], missingInputs: many } })
    )
    expect(items).toHaveLength(10)
  })

  it('says who holds it when the reading said, and stays empty when it did not', () => {
    const items = missingInformation(brief({ evidence: [record()] }))
    expect(items[0].source).toBe('Employer payroll records, by document request.')

    const fromElement = missingInformation(
      brief({
        claims: [
          {
            claimId: 'final-pay',
            standing: 'gaps to close',
            elements: [
              { key: 'due-date', state: 'partial', reasoning: '', wouldSettleIt: 'Her resignation notice.' },
            ],
            adverse: [],
            defense: '',
          },
        ],
      })
    )
    // Not guessed at. A guessed custodian is a subpoena to the wrong place.
    expect(fromElement[0].source).toBe('')
  })

  it('merges the same thing wanted for two reasons, keeping both', () => {
    const items = missingInformation(
      brief({
        evidence: [record({ record: 'Pay stubs', proves: { facts: [], note: 'Whether the hours appear.' } })],
        damages: {
          issues: [],
          totals: null,
          drivers: '',
          doubleCounting: [],
          missingInputs: ['Pay stubs'],
        },
      })
    )
    expect(items).toHaveLength(1)
    expect(items[0].why).toContain('Whether the hours appear')
    expect(items[0].why).toContain('cannot be computed')
    // And keeps the custodian the spine knew, which the damages line did not.
    expect(items[0].source).toBe('Employer payroll records, by document request.')
  })

  it('is empty when nothing is outstanding', () => {
    expect(missingInformation(brief())).toEqual([])
  })
})

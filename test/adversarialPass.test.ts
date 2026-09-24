import { describe, it, expect } from 'vitest'
import { Brief } from '@/lib/caseBrief'
import { FOR_A_PERSON, adversarialPass } from '@/lib/adversarialPass'

const brief = (over: Partial<Brief> = {}): Brief => ({
  clientName: 'Dayeon Kim',
  caseType: 'Wage & Hour',
  factCount: 0,
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

describe('reading the draft as the other side would', () => {
  it('finds an element called supported that cites nothing', () => {
    const found = adversarialPass(
      brief({
        claims: [
          {
            claimId: 'meal-periods',
            standing: 'gaps to close',
            elements: [{ key: 'relieved', state: 'supported', reasoning: '', wouldSettleIt: '' }],
            adverse: [],
            defense: '',
          },
        ],
      })
    )
    expect(found[0].what).toContain('cites no fact')
  })

  it('finds a damages input assumed rather than proved', () => {
    const found = adversarialPass(
      brief({
        damages: {
          issues: [{ category: 'Overtime', basis: 'ESTIMATE' } as never],
          totals: null,
          drivers: '',
          doubleCounting: [],
          missingInputs: [],
        },
      })
    )
    expect(found[0].what).toContain('rests on an estimate')
  })

  it('names a witness who has never been named', () => {
    const found = adversarialPass(
      brief({
        people: [
          {
            name: 'unnamed manager or lead',
            aliases: [],
            kind: 'individual',
            alignment: 'company',
            identified: false,
            facts: [
              { id: 'f1', proposition: 'p', status: 'REPORTED' },
              { id: 'f2', proposition: 'p', status: 'REPORTED' },
              { id: 'f3', proposition: 'p', status: 'REPORTED' },
            ],
            knowsAbout: [],
            nextStep: '',
            weight: 0,
          },
        ],
      })
    )
    expect(found.some(f => f.what.includes('never been named'))).toBe(true)
  })

  it('raises nothing on a draft these questions cannot fault', () => {
    expect(adversarialPass(brief())).toEqual([])
  })

  it('keeps the questions no code can ask, rather than dropping them', () => {
    // A clean result must not read as "the standard was satisfied".
    expect(FOR_A_PERSON.length).toBeGreaterThan(3)
  })
})

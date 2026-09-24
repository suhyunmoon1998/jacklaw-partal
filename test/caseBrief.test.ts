import { describe, it, expect } from 'vitest'
import { BriefInput, buildBrief, readsAsStrong, readsAsWeak, reviewItems } from '@/lib/caseBrief'

/**
 * The brief puts four separate readings into the order a lawyer reads a case.
 * What it must never do is imply something the readings did not find, or go
 * quiet about a section it has nothing for — a blank heading reads as "nothing
 * here", and "we never ran it" is a different thing entirely.
 */
const base = (over: Partial<BriefInput> = {}): BriefInput => ({
  clientName: 'Dayeon Kim',
  caseType: 'Wage & Hour',
  analysis: null,
  findings: [],
  wageOrder: null,
  spine: null,
  pendingQuestions: [],
  factCount: 0,
  readOn: null,
  stale: false,
  staleStages: [],
  ...over,
})

const finding = (over: Partial<BriefInput['findings'][number]> = {}) => ({
  claimId: 'meal-periods',
  standing: 'supported',
  elements: [],
  adverse: [],
  defense: '',
  ...over,
})

describe('a section with nothing in it', () => {
  it('says why, rather than coming out blank', () => {
    const brief = buildBrief(base())
    const keys = brief.absent.map(s => s.key)
    expect(keys).toContain('damages')
    expect(keys).toContain('claims')
    expect(keys).toContain('facts')
    for (const s of brief.absent) expect(s.absent).toBeTruthy()
  })

  it('reports nothing absent once the readings are there', () => {
    const brief = buildBrief(
      base({
        analysis: { summary: 'x', baseline: [], issues: [], totals: null } as never,
        findings: [finding()],
        spine: { events: [] },
        pendingQuestions: [{ text: 'When did that start?' }],
      })
    )
    expect(brief.absent).toHaveLength(0)
  })
})

describe('reading how an element stands', () => {
  it('tells support from its negation', () => {
    expect(readsAsStrong('supported')).toBe(true)
    // The trap: "not supported" contains "supported".
    expect(readsAsStrong('not supported on this record')).toBe(false)
    expect(readsAsStrong('unsupported')).toBe(false)
    expect(readsAsWeak('not supported on this record')).toBe(true)
    expect(readsAsWeak('contradicted by her own answers')).toBe(true)
  })

  it('does not call a partial result a strength', () => {
    expect(readsAsStrong('partially supported')).toBe(false)
    expect(readsAsWeak('partially supported')).toBe(false)
  })

  it('counts a wording it cannot place as neither', () => {
    expect(readsAsStrong('needs authority')).toBe(false)
    expect(readsAsWeak('needs authority')).toBe(false)
    expect(readsAsStrong('unknown')).toBe(false)
  })
})

describe('where the strength of a case is actually written', () => {
  it('reads the elements, not the claim heading', () => {
    // Every claim on a real file came back "gaps to close" or "not raised by
    // these facts". Reading strength off that left a case with eight
    // supported elements showing nothing at all under "where it is strongest".
    const brief = buildBrief(
      base({
        findings: [
          finding({
            claimId: 'meal-periods',
            standing: 'gaps to close',
            elements: [
              { key: 'over-five-hours', state: 'supported', reasoning: '', wouldSettleIt: '' },
              { key: 'no-thirty-minutes', state: 'contradicted', reasoning: '', wouldSettleIt: '' },
              { key: 'provided-means-relieved', state: 'partially supported', reasoning: '', wouldSettleIt: '' },
            ],
          }),
        ],
      })
    )
    expect(brief.strengths).toEqual(['meal-periods · over-five-hours — supported'])
    expect(brief.weaknesses).toEqual(['meal-periods · no-thirty-minutes — contradicted'])
  })

  it('takes the client id off a fact reference', () => {
    const brief = buildBrief(
      base({
        findings: [
          finding({ adverse: ['client-1789103134380:f069 — she got a meal break every day.'] }),
        ],
      })
    )
    expect(brief.weaknesses[0]).toBe('meal-periods — f069 — she got a meal break every day.')
  })
})

describe('the chronology', () => {
  it('reads the sentence off the field the spine writes it in', () => {
    // The spine calls it `event`. Mapping `what` printed twenty-nine rows of
    // a date and a blank.
    const brief = buildBrief(
      base({ spine: { events: [{ when: 'July 28, 2024', event: 'She started work.' }] } })
    )
    expect(brief.chronology.events).toEqual([
      { when: 'July 28, 2024', what: 'She started work.' },
    ])
  })

  it('drops a row that has a date and nothing to say', () => {
    const brief = buildBrief(
      base({ spine: { events: [{ when: 'Undated', event: '' }, { when: 'x', event: 'Something.' }] } })
    )
    expect(brief.chronology.events).toHaveLength(1)
  })
})

describe('strengths and weaknesses', () => {
  it('keeps an adverse fact even under a supported element', () => {
    // A supported element with a bad fact under it still has the bad fact,
    // and burying it is how a firm is surprised at a deposition.
    const brief = buildBrief(
      base({
        findings: [
          finding({
            standing: 'gaps to close',
            elements: [{ key: 'relieved', state: 'supported', reasoning: '', wouldSettleIt: '' }],
            adverse: ['She answered "0 days" for working through the meal.'],
          }),
        ],
      })
    )
    expect(brief.strengths).toEqual(['meal-periods · relieved — supported'])
    expect(brief.weaknesses).toEqual([
      'meal-periods — She answered "0 days" for working through the meal.',
    ])
  })

  it('carries each claim’s anticipated defense', () => {
    const brief = buildBrief(
      base({ findings: [finding({ defense: 'The employer will say the schedule was increased for it.' })] })
    )
    expect(brief.defenses).toEqual([
      { claimId: 'meal-periods', defense: 'The employer will say the schedule was increased for it.' },
    ])
  })
})

describe('missing damages inputs', () => {
  it('gathers them from every reading that named one, without repeating', () => {
    const brief = buildBrief(
      base({
        analysis: {
          missingFacts: ['The hourly rate for 2025.'],
          issues: [{ confirm: ['The hourly rate for 2025.', 'When the rotation began.'] }],
        } as never,
        findings: [finding({ damagesMissing: ['When the rotation began.'] })],
      })
    )
    expect(brief.damages.missingInputs).toEqual([
      'The hourly rate for 2025.',
      'When the rotation began.',
    ])
  })
})

describe('evidence requests', () => {
  it('lists only what the office does not already hold', () => {
    const brief = buildBrief(
      base({
        spine: {
          records: [
            { record: 'Wage statements, Feb–Jul 2025', inHand: false } as never,
            { record: 'Her offer letter', inHand: true } as never,
          ],
        },
      })
    )
    expect(brief.evidence.map(r => r.record)).toEqual(['Wage statements, Feb–Jul 2025'])
  })
})

describe('what goes to an attorney rather than being decided here', () => {
  it('always raises the wage order, because everything below depends on it', () => {
    const items = reviewItems(
      base({
        wageOrder: {
          proposal: { order: '5', industry: 'Public Housekeeping', businessIs: '', reliedOn: '', because: '' },
          dlse: null,
          caveat: '',
        },
      })
    )
    expect(items[0].what).toContain('Wage Order 5')
  })

  it('says so louder when the DLSE points somewhere else', () => {
    const items = reviewItems(
      base({
        wageOrder: {
          proposal: { order: '5', industry: 'Public Housekeeping', businessIs: '', reliedOn: '', because: '' },
          dlse: { entry: 'restaurant', orders: '5', agrees: false },
          caveat: '',
        },
      })
    )
    expect(items[0].why).toContain('DLSE')
  })

  it('raises a reading taken against facts that have since moved', () => {
    const items = reviewItems(base({ stale: true }))
    expect(items.some(i => i.what.includes('facts have moved'))).toBe(true)
  })

  it('raises what rests on the client’s word alone', () => {
    const items = reviewItems(
      base({ spine: { restingOnTestimonyAlone: [{ facts: ['f1'], note: 'the 120 minutes' }] } })
    )
    expect(items.some(i => i.what.includes('word alone'))).toBe(true)
  })

  it('raises nothing at all when there is nothing to raise', () => {
    expect(reviewItems(base())).toEqual([])
  })
})

describe('what changed since last time', () => {
  it('is null, and does not pretend otherwise', () => {
    // Readings are replaced rather than kept, so there is nothing to compare.
    // Saying "no changes" would be a lie about a comparison never made.
    expect(buildBrief(base()).changes).toBeNull()
  })
})

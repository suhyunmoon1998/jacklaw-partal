import { describe, it, expect } from 'vitest'
import { Brief } from '@/lib/caseBrief'
import { bareFactId, blocked, citationsIn, factIdsIn, readsAsEstimated, releaseTest } from '@/lib/releaseTest'

/**
 * The office already refuses a follow-up question written in legal jargon, and
 * a test asserts it refuses one. Analysis had no equivalent: a citation to a
 * statute whose text nobody holds, a fact id nothing in the ledger carries, or
 * an estimate written as a certainty all passed, because the schemas check
 * shape and nothing checked the rest.
 *
 * The scope is narrow on purpose, and these tests are named for what is
 * actually being asked. "On file" means the text is in lib/authority and
 * nothing more: not that the provision is current, not that it governs this
 * employer or this period. That is an attorney's judgement and no test here
 * stands in for it.
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

const issue = (over: Record<string, unknown> = {}) =>
  ({
    category: 'Meal periods',
    headline: '',
    because: [],
    law: '',
    why: '',
    strength: 'moderate',
    math: '2 h x 22 weeks x $17.50',
    estimate: '$770',
    basis: 'FACT',
    confirm: ['The hourly rate for 2025.'],
    ...over,
  }) as never

/**
 * The ledger as it actually is.
 *
 * case_facts stores `client-1789103134380:f001`, and the readings cite the
 * same fact both ways — whole in an element's `facts`, bare in prose. This
 * shipped once comparing a bare id against a prefixed set, which reported
 * every one of a real client's 204 facts as missing. The fixture carries the
 * prefix so that cannot pass again.
 */
const LEDGER = {
  factIds: new Set([
    'client-1789103134380:f068',
    'client-1789103134380:f136',
    'client-1789103134380:f163',
  ]),
}
const NO_LEDGER = { factIds: new Set<string>() }

describe('finding citations in prose', () => {
  it('reads the shapes a lawyer actually writes', () => {
    expect(citationsIn('under Lab. Code § 512 and Labor Code section 226.7')).toEqual([
      'LAB 512',
      'LAB 226.7',
    ])
    expect(citationsIn('Wage Order 5, § 12 governs rest periods')).toEqual(['IWC 5 sec 12'])
    expect(citationsIn('see CACI No. 2766A')).toEqual(['CACI 2766A'])
  })

  it('raises nothing on prose that cites nothing', () => {
    expect(citationsIn('She came in two hours early to count the tips.')).toEqual([])
  })
})

describe('a citation whose text the office does not hold', () => {
  it('blocks, whoever the document is for', () => {
    const problems = releaseTest(
      brief({ overview: { summary: 'Barred by Lab. Code § 99999.', baseline: [] } }),
      LEDGER
    )
    expect(problems[0].rule).toBe('citation not on file')
    // Always a block: an unverified rule must not be applied, internal or not.
    expect(problems[0].severity).toBe('block')
    expect(blocked(problems)).toBe(true)
  })

  it('passes a provision whose text is on file — and claims nothing more', () => {
    const problems = releaseTest(
      brief({ overview: { summary: 'Meal periods under Lab. Code § 512.', baseline: [] } }),
      LEDGER
    )
    // Passing means the text was found. Whether § 512 is current, or governs
    // this employer's industry and this client's period, is not tested here
    // and is not implied by this passing.
    expect(problems.filter(p => p.rule === 'citation not on file')).toEqual([])
  })
})

describe('a fact id the ledger does not carry', () => {
  it('blocks', () => {
    const problems = releaseTest(
      brief({ chronology: { events: [], coreStory: [{ facts: ['f999'], note: 'x' }], conflicts: [] } }),
      LEDGER
    )
    expect(problems.some(p => p.rule === 'fact not in ledger' && p.what.includes('f999'))).toBe(true)
  })

  it('says nothing when the ledger was never loaded', () => {
    // An empty set means the facts are unknown, not that no id is on file.
    const problems = releaseTest(
      brief({ chronology: { events: [], coreStory: [{ facts: ['f999'], note: 'x' }], conflicts: [] } }),
      NO_LEDGER
    )
    expect(problems.filter(p => p.rule === 'fact not in ledger')).toEqual([])
  })
})

describe('contrary evidence', () => {
  it('blocks when an adverse fact did not survive into the document', () => {
    // Dayeon Kim's own answer: she describes tip work after clocking out and
    // separately answers that she did no work after her end time. A document
    // that drops the second is a document that will surprise somebody.
    const adverse = 'She answered that she did no work after her stated end time.'
    const problems = releaseTest(
      brief({
        claims: [
          { claimId: 'off-the-clock', standing: 'supported', elements: [], adverse: [adverse], defense: '' },
        ],
        weaknesses: [],
      }),
      LEDGER
    )
    expect(problems[0].rule).toBe('hidden contrary evidence')
    expect(problems[0].severity).toBe('block')
  })

  it('passes once the document carries it', () => {
    const adverse = 'She answered that she did no work after her stated end time.'
    const problems = releaseTest(
      brief({
        claims: [
          { claimId: 'off-the-clock', standing: 'supported', elements: [], adverse: [adverse], defense: '' },
        ],
        weaknesses: [`off-the-clock — ${adverse}`],
      }),
      LEDGER
    )
    expect(problems.filter(p => p.rule === 'hidden contrary evidence')).toEqual([])
  })
})

describe('an estimate written as a certainty', () => {
  it('knows a hedged figure from a bare one', () => {
    expect(readsAsEstimated('$770')).toBe(false)
    expect(readsAsEstimated('44 hours')).toBe(false)
    expect(readsAsEstimated('$12,400.00')).toBe(false)
    expect(readsAsEstimated('about $770')).toBe(true)
    expect(readsAsEstimated('$700–$850')).toBe(true)
    expect(readsAsEstimated('roughly 44 hours')).toBe(true)
  })

  it('accepts the shapes a real reading actually writes', () => {
    // All four are from Dayeon Kim's brief. Every one was objected to by the
    // first version of this, which knew hedge words and a dollar range and
    // nothing else — so the office was told four times that its own carefully
    // qualified arithmetic was unsafe, which is how a check gets ignored.
    for (const figure of [
      '34.6 / 43.4 / 52.0 unpaid hours; dollar value = hours x $R, rate not established',
      '10.9 - 32.6 straight-time hours, most likely ~21.7 hrs x $R',
      '~21.7 unpaid OT hours most likely; value = OT hrs x 1.5 x $R, rate not established',
      '327R to 545R; at a rate still to be pulled from pay stubs. No dollar figure can be stated until R is established.',
    ]) {
      expect(readsAsEstimated(figure), figure.slice(0, 40)).toBe(true)
    }
  })

  it('flags internally and blocks on the way out', () => {
    const b = brief({ damages: { issues: [issue({ basis: 'ESTIMATE', estimate: '$770' })], totals: null, drivers: '', doubleCounting: [], missingInputs: ['x'] } })
    expect(releaseTest(b, LEDGER, 'internal')[0].severity).toBe('flag')
    expect(releaseTest(b, LEDGER, 'external')[0].severity).toBe('block')
    expect(blocked(releaseTest(b, LEDGER, 'external'))).toBe(true)
  })

  it('passes a figure the reading itself calls a fact', () => {
    const b = brief({ damages: { issues: [issue({ basis: 'FACT', estimate: '$770' })], totals: null, drivers: '', doubleCounting: [], missingInputs: ['x'] } })
    expect(releaseTest(b, LEDGER).filter(p => p.rule === 'unsupported certainty')).toEqual([])
  })
})

describe('arithmetic and its inputs', () => {
  it('flags a figure with no formula behind it', () => {
    const b = brief({ damages: { issues: [issue({ math: '', estimate: '$770' })], totals: null, drivers: '', doubleCounting: [], missingInputs: ['x'] } })
    expect(b && releaseTest(b, LEDGER).some(p => p.rule === 'deadline without inputs')).toBe(true)
  })

  it('flags an estimate that names nothing to confirm it', () => {
    const b = brief({ damages: { issues: [issue({ basis: 'ASSUMPTION', estimate: 'about $770', confirm: [] })], totals: null, drivers: '', doubleCounting: [], missingInputs: ['x'] } })
    expect(releaseTest(b, LEDGER).some(p => p.rule === 'allegation as proof')).toBe(true)
  })
})

describe('a document that asks for nothing', () => {
  it('is flagged', () => {
    expect(releaseTest(brief(), LEDGER).some(p => p.rule === 'no relief requested')).toBe(true)
  })

  it('passes once it asks for one thing', () => {
    const b = brief({ questions: [{ text: 'When did the rotation start?' }] })
    expect(releaseTest(b, LEDGER).filter(p => p.rule === 'no relief requested')).toEqual([])
  })
})

describe('a document this test has no objection to', () => {
  it('raises nothing — which is not a warrant that it is sound', () => {
    const b = brief({
      overview: { summary: 'Meal periods under Lab. Code § 512.', baseline: [] },
      questions: [{ text: 'When did the rotation start?' }],
      damages: { issues: [issue()], totals: null, drivers: '', doubleCounting: [], missingInputs: [] },
    })
    expect(releaseTest(b, LEDGER, 'external')).toEqual([])
    expect(blocked(releaseTest(b, LEDGER, 'external'))).toBe(false)
  })
})

describe('reading fact ids out of prose', () => {
  it('takes them with or without the client prefix', () => {
    expect(factIdsIn('client-1789103134380:f068 and f136')).toEqual(['f068', 'f136'])
  })

  it('reduces an id to the part that identifies the fact', () => {
    expect(bareFactId('client-1789103134380:f068')).toBe('f068')
    expect(bareFactId('f068')).toBe('f068')
  })
})

describe('the two forms a fact id is written in', () => {
  it('matches a prefixed ledger against a bare citation', () => {
    const problems = releaseTest(
      brief({ overview: { summary: 'She said so at f068.', baseline: [] }, questions: [{ text: 'q' }] }),
      LEDGER
    )
    expect(problems.filter(p => p.rule === 'fact not in ledger')).toEqual([])
  })

  it('matches a prefixed ledger against a prefixed citation', () => {
    const problems = releaseTest(
      brief({
        claims: [
          {
            claimId: 'meal-periods',
            standing: 'supported',
            elements: [
              {
                key: 'relieved',
                state: 'supported',
                reasoning: '',
                wouldSettleIt: '',
                facts: ['client-1789103134380:f068'],
              },
            ],
            adverse: [],
            defense: '',
          },
        ],
        questions: [{ text: 'q' }],
      }),
      LEDGER
    )
    expect(problems.filter(p => p.rule === 'fact not in ledger')).toEqual([])
  })

  it('still catches one that is genuinely absent, whichever form it is in', () => {
    const problems = releaseTest(
      brief({ overview: { summary: 'See client-1789103134380:f999.', baseline: [] }, questions: [{ text: 'q' }] }),
      LEDGER
    )
    expect(problems.some(p => p.rule === 'fact not in ledger' && p.what.includes('f999'))).toBe(true)
  })
})

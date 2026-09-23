import { describe, it, expect } from 'vitest'
import { Brief } from '@/lib/caseBrief'
import { blocked, citationsIn, factIdsIn, readsAsEstimated, releaseTest } from '@/lib/releaseTest'

/**
 * The office already refuses a follow-up question written in legal jargon, and
 * a test asserts it refuses one. Analysis had no equivalent: a citation to a
 * statute nobody holds, a fact id nothing in the ledger carries, or an
 * estimate written as a certainty all passed, because the schemas check shape
 * and nothing checked truth.
 *
 * Every case below is something that must never reach a demand letter.
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

const LEDGER = { factIds: new Set(['f068', 'f136', 'f163']) }
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

describe('a citation to authority nobody holds', () => {
  it('blocks, whoever the document is for', () => {
    const problems = releaseTest(
      brief({ overview: { summary: 'Barred by Lab. Code § 99999.', baseline: [] } }),
      LEDGER
    )
    expect(problems[0].rule).toBe('invented citation')
    // Always a block: an unverified rule must not be applied, internal or not.
    expect(problems[0].severity).toBe('block')
    expect(blocked(problems)).toBe(true)
  })

  it('passes a provision that is on file', () => {
    const problems = releaseTest(
      brief({ overview: { summary: 'Meal periods under Lab. Code § 512.', baseline: [] } }),
      LEDGER
    )
    expect(problems.filter(p => p.rule === 'invented citation')).toEqual([])
  })
})

describe('a fact id nothing in the ledger holds', () => {
  it('blocks', () => {
    const problems = releaseTest(
      brief({ chronology: { events: [], coreStory: [{ facts: ['f999'], note: 'x' }], conflicts: [] } }),
      LEDGER
    )
    expect(problems.some(p => p.rule === 'invented fact' && p.what.includes('f999'))).toBe(true)
  })

  it('says nothing when the ledger was never loaded', () => {
    // An empty set means the facts are unknown, not that every id is invented.
    const problems = releaseTest(
      brief({ chronology: { events: [], coreStory: [{ facts: ['f999'], note: 'x' }], conflicts: [] } }),
      NO_LEDGER
    )
    expect(problems.filter(p => p.rule === 'invented fact')).toEqual([])
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
    expect(readsAsEstimated('about $770')).toBe(true)
    expect(readsAsEstimated('$700–$850')).toBe(true)
    expect(readsAsEstimated('roughly 44 hours')).toBe(true)
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

describe('a clean document', () => {
  it('raises nothing at all', () => {
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
})

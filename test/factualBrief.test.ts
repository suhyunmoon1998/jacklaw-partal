import { describe, it, expect } from 'vitest'
import {
  LedgerFact,
  buildFactualBrief,
  isProof,
  legalConclusionsIn,
  proofWeight,
  shortIds,
} from '@/lib/factualBrief'

/**
 * The corpus keeps two documents apart on purpose: the factual brief develops
 * the record "without arguing legal conclusions" (sec. 5) and holds damage
 * facts only, leaving entitlement and formulas to the living brief (sec. 12).
 * Every test here is about that line holding.
 *
 * The field values are the ones the production ledger actually carries.
 */
const fact = (over: Partial<LedgerFact> = {}): LedgerFact => ({
  id: 'client-1789103134380:f035',
  proposition: 'She usually worked 6.5 to 7 hours a day.',
  verbatim: 'about 6 and half to 7 hours',
  status: 'REPORTED',
  provenance: { kind: 'client memory', pinpoint: 'full_name — What is your full legal name?', on: '2026-09-16' },
  period: 'Feb 2025 – Jul 2025',
  actors: ['manager'],
  corroboration: [],
  contrary: '',
  legalTags: ['overtime'],
  damagesTags: [],
  openLoop: '',
  ...over,
})

const input = (over: Record<string, unknown> = {}) =>
  ({
    clientName: 'Dayeon Kim',
    caseType: 'Wage & Hour',
    ledger: [fact()],
    spine: null,
    readOn: null,
    ...over,
  }) as never

describe('the line between the two documents', () => {
  it('carries no claim standing, element state, figure or formula', () => {
    const brief = buildFactualBrief(input())
    const shape = Object.keys(brief)
    for (const forbidden of ['claims', 'strengths', 'totals', 'review']) {
      expect(shape, forbidden).not.toContain(forbidden)
    }
  })

  it('catches a line that argues instead of reporting', () => {
    // A rule nobody can check is a preference.
    const brief = buildFactualBrief(
      input({ ledger: [fact({ proposition: 'The meal period element is supported.' })] })
    )
    const found = legalConclusionsIn(brief)
    expect(found).toHaveLength(1)
    expect(found[0].where).toContain('overtime')
  })

  it('says nothing about a plain factual sentence', () => {
    expect(legalConclusionsIn(buildFactualBrief(input()))).toEqual([])
  })
})

describe('what to lead with', () => {
  it('ranks a corroborated fact above her account alone', () => {
    const confirmed = fact({ status: 'CONFIRMED', corroboration: ['punch records'] })
    const reported = fact({ status: 'REPORTED' })
    expect(proofWeight(confirmed)).toBeGreaterThan(proofWeight(reported))
  })

  it('puts an "I don’t know" last', () => {
    expect(proofWeight(fact({ status: 'UNKNOWN', verbatim: '' }))).toBe(0)
  })
})

describe('issue by issue', () => {
  const ledger = [
    fact({ id: 'f1', legalTags: ['meal-periods'], corroboration: ['punch records'] }),
    fact({ id: 'f2', legalTags: ['meal-periods'], contrary: 'She answered 0 days working through the meal.' }),
    fact({ id: 'f3', legalTags: ['meal-periods'], status: 'DISPUTED' }),
    fact({ id: 'f4', legalTags: ['overtime'], openLoop: 'Obtain the punch records for Feb–Jul 2025.' }),
  ]

  it('groups the facts under the issue each is tagged to', () => {
    const brief = buildFactualBrief(input({ ledger }))
    const meal = brief.issues.find(i => i.issue === 'meal-periods')!
    expect(meal.account).toHaveLength(3)
    expect(meal.corroborated.map(f => f.id)).toEqual(['f1'])
    expect(meal.disputed.map(f => f.id)).toEqual(['f3'])
  })

  it('keeps the harmful fact with its issue rather than in another file', () => {
    const brief = buildFactualBrief(input({ ledger }))
    const meal = brief.issues.find(i => i.issue === 'meal-periods')!
    expect(meal.harmful[0].contrary).toContain('0 days working through the meal')
  })

  it('carries the open loop to the issue it belongs to', () => {
    const brief = buildFactualBrief(input({ ledger }))
    expect(brief.issues.find(i => i.issue === 'overtime')!.open).toEqual([
      'Obtain the punch records for Feb–Jul 2025.',
    ])
  })
})

describe('damages facts, and only facts', () => {
  it('groups the inputs the ledger tags, without computing anything', () => {
    const brief = buildFactualBrief(
      input({
        ledger: [
          fact({ id: 'f1', damagesTags: ['rate'], status: 'UNKNOWN' }),
          fact({ id: 'f2', damagesTags: ['hours per day'] }),
          fact({ id: 'f3', damagesTags: ['hours per day'] }),
        ],
      })
    )
    expect(brief.damages.map(d => d.input)).toEqual(['hours per day', 'rate'])
    // No figure, no formula — that is the other document's job.
    expect(JSON.stringify(brief.damages)).not.toMatch(/\$|x 1\.5|total/i)
  })

  it('marks an input nothing on file settles', () => {
    const brief = buildFactualBrief(
      input({ ledger: [fact({ damagesTags: ['rate'], status: 'UNKNOWN' })] })
    )
    expect(brief.damages[0].unresolved).toBe(true)
  })
})

describe('what cuts against, all in one place', () => {
  it('gathers contrary facts, testimony-only points and date conflicts', () => {
    const brief = buildFactualBrief(
      input({
        ledger: [fact({ contrary: 'Her own answer says otherwise.' })],
        spine: {
          restingOnTestimonyAlone: [{ facts: ['f1'], note: 'the 120 minutes' }],
          dateConflicts: [{ what: 'Final pay 8/15 precedes the last day 8/31.' }],
          anomalies: [{ what: 'Timekeeping changed mid-employment.' }],
        },
      })
    )
    expect(brief.weaknesses).toHaveLength(4)
    expect(brief.weaknesses.map(w => w.kind)).toEqual([
      'Contrary fact',
      'Rests on her word alone',
      'Date conflict',
      'Anomaly',
    ])
  })

  it('does not call a contradiction a proof gap', () => {
    // The spine files a self-contradiction under restingOnTestimonyAlone too.
    // Labelling every one of them "rests on her word alone" told the office a
    // contradiction was a corroboration problem.
    const brief = buildFactualBrief(
      input({
        spine: {
          restingOnTestimonyAlone: [
            { facts: [], note: 'The meal-period answers contradict each other.' },
            { facts: [], note: 'The office holds no time record for any of it.' },
          ],
        },
      })
    )
    expect(brief.weaknesses.map(w => w.kind)).toEqual([
      'Contradiction in her own answers',
      'Rests on her word alone',
    ])
  })

  it('takes the client id off the fact references', () => {
    const brief = buildFactualBrief(
      input({
        spine: {
          restingOnTestimonyAlone: [
            { facts: ['client-1789103134380:f107', 'client-1789103134380:f109'], note: 'x' },
          ],
        },
      })
    )
    expect(brief.weaknesses[0].from).toBe('f107, f109')
    expect(shortIds('client-1789103134380:f068')).toBe('f068')
  })
})

describe('what counts as proof', () => {
  it('refuses a fact nothing but her own account supports', () => {
    // "Strongest proof" first listed her name, her date of birth and her home
    // address: with one corroborated fact in the ledger the ranking had
    // nothing to sort by and fell back to the order the intake asks questions.
    expect(isProof(fact({ status: 'REPORTED', corroboration: [] }))).toBe(false)
    expect(isProof(fact({ status: 'CONFIRMED' }))).toBe(true)
    expect(isProof(fact({ corroboration: ['punch records'] }))).toBe(true)
  })

  it('says so plainly when the file has no corroborated fact at all', () => {
    const brief = buildFactualBrief(input({ ledger: [fact({ status: 'REPORTED' })] }))
    expect(brief.strongestProof).toEqual([])
    expect(brief.absent.find(a => a.key === 'proof')?.why).toContain('corroborated')
  })

  it('ranks a material fact above an identity answer', () => {
    const material = fact({ corroboration: ['punch records'], damagesTags: ['rate'] })
    const identity = fact({ corroboration: ['ID'] })
    expect(proofWeight(material)).toBeGreaterThan(proofWeight(identity))
  })
})

describe('an answer she gave in Korean', () => {
  it('shows the English beside her words, and does not replace them', () => {
    const brief = buildFactualBrief(
      input({
        ledger: [
          fact({
            status: 'CONFIRMED',
            verbatim: '2시간 일찍 나와서 팁정리하라고 요구',
            verbatimEnglish: 'Asked to come in two hours early to sort tips',
          }),
        ],
      })
    )
    const f = brief.strongestProof[0]
    expect(f.verbatim).toBe('2시간 일찍 나와서 팁정리하라고 요구')
    expect(f.verbatimEnglish).toBe('Asked to come in two hours early to sort tips')
  })
})

describe('a superseded fact', () => {
  it('is left out of the current record but not deleted from the ledger', () => {
    const brief = buildFactualBrief(
      input({ ledger: [fact(), fact({ id: 'old', supersededBy: 'f035' })] })
    )
    expect(brief.factCount).toBe(1)
  })
})

describe('a section with nothing in it', () => {
  it('says why', () => {
    const brief = buildFactualBrief(input({ ledger: [], spine: null }))
    expect(brief.absent.map(a => a.key)).toEqual(['facts', 'chronology'])
    for (const a of brief.absent) expect(a.why).toBeTruthy()
  })
})

import { describe, it, expect } from 'vitest'
import { Brief } from '@/lib/caseBrief'
import {
  FactSnapshot,
  affectedBy,
  compare,
  conclusionChanges,
  factChanges,
  factsUnder,
  nothingChanged,
  unresolvedIn,
} from '@/lib/briefChanges'

/**
 * The four things change tracking has to do, one describe each:
 * keep both sides of a change, recompute only what rests on it, say what the
 * conclusion now is, and never quietly pick a side between two answers that
 * disagree.
 */
const fact = (over: Partial<FactSnapshot> = {}): FactSnapshot => ({
  id: 'f068',
  proposition: 'She did no work during the meal period.',
  verbatim: 'I ate my 30 minutes every day',
  status: 'REPORTED',
  provenance: { kind: 'client memory', pinpoint: 'module2 q41', on: '2026-09-16' },
  supersededBy: null,
  supersededWhy: null,
  ...over,
})

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

const claim = (id: string, standing: string, els: { key: string; state: string; facts?: string[] }[] = []) => ({
  claimId: id,
  standing,
  elements: els.map(e => ({ key: e.key, state: e.state, reasoning: '', wouldSettleIt: '', facts: e.facts })),
  adverse: [],
  defense: '',
})

describe('both sides of a change are kept', () => {
  it('keeps the client’s own words on a superseded fact', () => {
    const before = [fact()]
    const after = [fact({ supersededBy: 'f210', supersededWhy: 'She corrected it on 22 Sep.' })]
    const [change] = factChanges(before, after)
    expect(change.kind).toBe('superseded')
    if (change.kind !== 'superseded') throw new Error('wrong kind')
    expect(change.before.verbatim).toBe('I ate my 30 minutes every day')
    expect(change.before.status).toBe('REPORTED')
    expect(change.before.provenance.pinpoint).toBe('module2 q41')
    expect(change.why).toBe('She corrected it on 22 Sep.')
    expect(change.by).toBe('f210')
  })

  it('tells a status change from a rewording from a new fact', () => {
    expect(factChanges([fact()], [fact({ status: 'DISPUTED' })])[0].kind).toBe('status')
    expect(factChanges([fact()], [fact({ verbatim: 'I ate most days' })])[0].kind).toBe('reworded')
    expect(factChanges([], [fact()])[0].kind).toBe('added')
  })

  it('reports a fact that vanished rather than passing over it', () => {
    const [change] = factChanges([fact()], [])
    expect(change.kind).toBe('superseded')
    if (change.kind !== 'superseded') throw new Error('wrong kind')
    expect(change.by).toBeNull()
  })

  it('says nothing when nothing moved', () => {
    expect(factChanges([fact()], [fact()])).toEqual([])
  })
})

describe('only what rests on a changed fact is read again', () => {
  // Prefixed, as the ledger and an element's `facts` actually store them.
  const b = brief({
    claims: [
      claim('meal-periods', 'supported', [
        { key: 'relieved of duty', state: 'supported', facts: ['client-1789103134380:f068'] },
      ]),
      claim('rest-breaks', 'supported', [
        { key: 'ten minutes', state: 'supported', facts: ['client-1789103134380:f501'] },
      ]),
    ],
  })

  it('matches a prefixed element against a prefixed change', () => {
    const { affected } = affectedBy(b, new Set(['client-1789103134380:f068']))
    expect(affected.claims).toEqual(['meal-periods'])
  })

  it('picks out the claims that cite it whichever form the id is in', () => {
    const { affected, unaffected } = affectedBy(b, new Set(['f068']))
    expect(affected.claims).toEqual(['meal-periods'])
    expect(unaffected.claims).toEqual(['rest-breaks'])
  })

  it('touches nothing when the changed fact is under nothing', () => {
    const { affected, unaffected } = affectedBy(b, new Set(['f999']))
    expect(affected.claims).toEqual([])
    expect(unaffected.claims).toEqual(['meal-periods', 'rest-breaks'])
  })

  it('finds the damages categories that cite a fact in their own prose', () => {
    const withDamages = brief({
      damages: {
        issues: [
          { category: 'Meal periods', because: ['f068 — she ate late'], why: '', math: '' } as never,
          { category: 'Overtime', because: ['f900 — nine hour days'], why: '', math: '' } as never,
        ],
        totals: null,
        drivers: '',
        doubleCounting: [],
        missingInputs: [],
      },
    })
    // The damages reading writes bare ids in prose; the change carries the
    // prefixed ledger id. Both sides are reduced before they are matched.
    expect(
      affectedBy(withDamages, new Set(['client-1789103134380:f068'])).affected.damages
    ).toEqual(['Meal periods'])
    expect(factsUnder(withDamages).damages.get('Overtime')).toEqual(new Set(['f900']))
  })
})

describe('what the conclusion now is', () => {
  it('names the claim, both standings, and the facts that moved under it', () => {
    const before = brief({ claims: [claim('meal-periods', 'supported', [{ key: 'relieved', state: 'supported', facts: ['f068'] }])] })
    const after = brief({ claims: [claim('meal-periods', 'contradicted', [{ key: 'relieved', state: 'contradicted', facts: ['f068'] }])] })
    const changes = conclusionChanges(before, after, new Set(['f068']))

    expect(changes[0]).toEqual({
      what: 'Claim meal-periods',
      from: 'supported',
      to: 'contradicted',
      because: ['f068'],
    })
    // The element under it is reported too — the claim moved because it did.
    expect(changes[1].what).toBe('meal-periods · relieved')
  })

  it('reports a claim that stopped being read at all', () => {
    const before = brief({ claims: [claim('retaliation', 'needs authority')] })
    const changes = conclusionChanges(before, brief(), new Set())
    expect(changes[0]).toEqual({
      what: 'Claim retaliation',
      from: 'needs authority',
      to: 'no longer read',
      because: [],
    })
  })

  it('stays quiet about a claim that did not move', () => {
    const b = brief({ claims: [claim('meal-periods', 'supported')] })
    expect(conclusionChanges(b, b, new Set())).toEqual([])
  })
})

describe('two answers that disagree', () => {
  it('leaves both standing rather than taking the newer one', () => {
    // Dayeon Kim: she describes work after clocking out and separately answers
    // that she did none. The ledger keeps both as DISPUTED, and so does this.
    const disputed = fact({ status: 'DISPUTED', verbatim: 'I did no work after I clocked out' })
    const open = unresolvedIn([disputed, fact({ id: 'f070' })])

    expect(open).toHaveLength(1)
    expect(open[0].id).toBe('f068')
    expect(open[0].verbatim).toBe('I did no work after I clocked out')
    expect(open[0].note).toContain('Nothing here has chosen between them')
  })

  it('carries them through a whole comparison', () => {
    const changes = compare({
      before: { brief: brief(), facts: [fact()], readOn: '2026-09-16' },
      after: { brief: brief(), facts: [fact({ status: 'DISPUTED' })] },
    })
    expect(changes.unresolved).toHaveLength(1)
    expect(changes.facts[0].kind).toBe('status')
    expect(changes.since).toBe('2026-09-16')
  })
})

describe('a comparison with nothing in it', () => {
  it('knows it, so the section can say so in words', () => {
    const b = brief()
    const changes = compare({
      before: { brief: b, facts: [fact()], readOn: '2026-09-16' },
      after: { brief: b, facts: [fact()] },
    })
    expect(nothingChanged(changes)).toBe(true)
  })
})

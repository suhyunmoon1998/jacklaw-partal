import { describe, it, expect } from 'vitest'
import { Brief } from '@/lib/caseBrief'
import { FactSnapshot } from '@/lib/briefChanges'
import { SnapshotRow, baselineFor, canonical, summarise, versionDigest, versionsOf } from '@/lib/briefHistory'

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
  factCount: 1,
  readOn: '2026-09-20T00:00:00Z',
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

const row = (takenAt: string, b: Brief, facts: FactSnapshot[], reason = 'opened'): SnapshotRow => ({
  brief: b,
  facts,
  readOn: b.readOn,
  takenAt,
  reason,
})

const claim = (standing: string) => ({
  claimId: 'meal',
  standing,
  elements: [{ key: 'no-relief', state: standing, reasoning: '', wouldSettleIt: '', facts: ['f068'] }],
  adverse: [],
  defense: '',
})

describe('what makes two briefs the same version', () => {
  it('ignores key order, which jsonb does not keep', () => {
    expect(canonical({ b: 1, a: [{ d: 2, c: 3 }] })).toBe(canonical({ a: [{ c: 3, d: 2 }], b: 1 }))
  })

  it('ignores the extra fields the sheet sent with each fact, like its English rendering', () => {
    const plain = fact()
    const withEnglish = { ...fact(), verbatimEnglish: 'I ate my 30 minutes', actors: ['Min'] } as FactSnapshot
    expect(versionDigest(brief(), [plain])).toBe(versionDigest(brief(), [withEnglish]))
  })

  it('changes when a fact’s status moves', () => {
    expect(versionDigest(brief(), [fact()])).not.toBe(versionDigest(brief(), [fact({ status: 'DISPUTED' })]))
  })
})

describe('opening the sheet again', () => {
  it('does not keep a second copy, and still compares against the version before', () => {
    const v1 = row('2026-09-01', brief({ claims: [claim('gaps to close')] }), [fact()])
    const v2 = row('2026-09-10', brief({ claims: [claim('supported')] }), [fact({ status: 'CONFIRMED' })])
    const current = { brief: v2.brief, facts: v2.facts }

    const { baseline, isNew } = baselineFor([v1, v2], current)
    expect(isNew).toBe(false)
    // Not v2: comparing the brief with itself is what used to report "nothing moved".
    expect(baseline?.takenAt).toBe('2026-09-01')
  })

  it('keeps a brief that differs from the newest version, and compares against it', () => {
    const v1 = row('2026-09-01', brief(), [fact()])
    const { baseline, isNew } = baselineFor([v1], { brief: brief(), facts: [fact({ status: 'DISPUTED' })] })
    expect(isNew).toBe(true)
    expect(baseline?.takenAt).toBe('2026-09-01')
  })

  it('has no baseline on the first version', () => {
    expect(baselineFor([], { brief: brief(), facts: [] })).toEqual({ baseline: null, isNew: true })
  })
})

describe('the history', () => {
  const v1 = row('2026-09-01', brief({ claims: [claim('gaps to close')] }), [fact()])
  const again = row('2026-09-02', v1.brief, v1.facts)
  const v2 = row(
    '2026-09-10',
    brief({ claims: [claim('supported')] }),
    [fact({ status: 'CONFIRMED' })],
    'before the facts were read again'
  )

  it('collapses repeated openings into one version, dated when it was first kept', () => {
    const versions = versionsOf([v1, again, v2])
    expect(versions.map(v => v.takenAt)).toEqual(['2026-09-10', '2026-09-01'])
  })

  it('says what each version changed, and why it was kept', () => {
    const [newest, first] = versionsOf([v1, again, v2])
    expect(newest.reason).toBe('before the facts were read again')
    expect(newest.changes?.conclusions).toContainEqual({
      what: 'Claim meal',
      from: 'gaps to close',
      to: 'supported',
      because: ['f068'],
    })
    expect(first.changes).toBeNull()
  })

  it('keeps a version that moved and moved back as two steps, not one', () => {
    const back = row('2026-09-20', v1.brief, v1.facts)
    expect(versionsOf([v1, v2, back])).toHaveLength(3)
  })

  it('summarises in a line, and names the first version as such', () => {
    const [newest, first] = versionsOf([v1, v2])
    expect(summarise(newest.changes)).toBe('2 conclusions changed · 1 fact changed')
    expect(summarise(first.changes)).toBe('First version kept for this client.')
  })
})

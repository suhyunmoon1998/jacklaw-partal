import { describe, it, expect } from 'vitest'
import { Brief } from '@/lib/caseBrief'
import { LedgerFact } from '@/lib/factualBrief'
import { defenceRecords, isEmployerStatement } from '@/lib/defenceRecord'

/**
 * The corpus keeps defence as a live pair — their position and what it rests
 * on, against this office's answer — and is precise that boilerplate is not
 * the defendant's position until something shows it is being advanced.
 */
const fact = (over: Partial<LedgerFact> = {}): LedgerFact => ({
  id: 'client-1789103134380:f132',
  proposition: 'The manager said the store would not pay for tip-sorting time.',
  verbatim: '팁은 가게 책임이 아니다',
  verbatimEnglish: 'Tips are not the store’s responsibility',
  status: 'REPORTED',
  provenance: { kind: 'client memory', pinpoint: 'm2_p_told_what_said', on: '2026-09-16' },
  actors: ['manager'],
  legalTags: ['off-the-clock work'],
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

const claim = (over: Record<string, unknown> = {}) =>
  ({
    claimId: 'off-the-clock',
    standing: 'gaps to close',
    elements: [{ key: 'hours', state: 'partial', reasoning: '', wouldSettleIt: 'Punch records.' }],
    adverse: ['client-1789103134380:f067 — she does not believe wages are owed.'],
    defense: 'The employer will say the schedule was extended to cover it.',
    ...over,
  }) as never

describe('the employer actually speaking', () => {
  it('is told from a prediction about them', () => {
    expect(isEmployerStatement(fact())).toBe(true)
    // A fact about a manager that records no statement is not their position.
    expect(isEmployerStatement(fact({ proposition: 'A manager set the schedule.' }))).toBe(false)
    expect(isEmployerStatement(fact({ actors: ['coworker'] }))).toBe(false)
  })
})

describe('the paired record', () => {
  it('marks a position the employer took, with what it rests on', () => {
    const [r] = defenceRecords(brief({ claims: [claim()] }), [fact()])
    expect(r.standing).toBe('stated by the employer')
    expect(r.restsOn[0].id).toBe('f132')
    // Her words are carried in English where she answered in Korean.
    expect(r.restsOn[0].verbatim).toContain('not the store')
  })

  it('marks one nothing shows being advanced as predicted', () => {
    const [r] = defenceRecords(brief({ claims: [claim()] }), [])
    expect(r.standing).toBe('predicted')
    expect(r.restsOn).toEqual([])
  })

  it('keeps her own answers that cut against us in the pair', () => {
    // A conflict is a work item, not something to file elsewhere.
    const [r] = defenceRecords(brief({ claims: [claim()] }), [])
    expect(r.response[0]).toBe('f067 — she does not believe wages are owed.')
  })

  it('carries what would settle it', () => {
    const [r] = defenceRecords(brief({ claims: [claim()] }), [])
    expect(r.development).toEqual(['Punch records.'])
  })

  it('puts a position actually taken above a predicted one', () => {
    const rs = defenceRecords(
      brief({ claims: [claim({ claimId: 'rest-periods', defense: 'Predicted.' }), claim()] }),
      [fact()]
    )
    expect(rs[0].claimId).toBe('off-the-clock')
  })

  it('says nothing about a claim with no defence and no adverse fact', () => {
    expect(defenceRecords(brief({ claims: [claim({ defense: '', adverse: [] })] }), [])).toEqual([])
  })
})

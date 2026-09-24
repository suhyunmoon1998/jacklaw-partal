import { describe, it, expect } from 'vitest'
import { FACTUAL_TEMPLATE, TRIAL_TEMPLATE } from '@/lib/briefStandards'
import { LedgerFact, buildFactualBrief } from '@/lib/factualBrief'
import { byTemplate, fromARecord } from '@/lib/factualTemplate'
import { Brief } from '@/lib/caseBrief'
import { trialReadiness } from '@/lib/trialReadiness'

/**
 * The firm's two templates as standards: the factual sheet laid out by one,
 * the case brief measured against the other. What matters most is that a part
 * the template asks for and the file cannot supply says so, and that a check a
 * machine cannot make is handed to a person rather than ticked.
 */

const fact = (over: Partial<LedgerFact> = {}): LedgerFact => ({
  id: 'client-1:f001',
  proposition: 'She took no meal break on most days.',
  verbatim: 'I never got my lunch',
  status: 'REPORTED',
  provenance: { kind: 'portal answer', pinpoint: 'module2 q41', on: '2026-09-16' },
  legalTags: ['meal periods'],
  openLoop: 'Time records for 2024 — from the employer',
  ...over,
})

const factual = (ledger: LedgerFact[], extra: Partial<Parameters<typeof byTemplate>[0]> = {}) =>
  byTemplate({
    brief: buildFactualBrief({ clientName: 'Dayeon Kim', caseType: 'Wage & Hour', ledger, spine: null, readOn: null }),
    ledger,
    baseline: [],
    spine: null,
    ...extra,
  })

describe('the templates as held', () => {
  it('numbers the factual template I–XII and carries its twelve checks', () => {
    expect(FACTUAL_TEMPLATE.sections.map(s => s.n)).toEqual(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'])
    expect(FACTUAL_TEMPLATE.qualityControl).toHaveLength(12)
  })

  it('numbers the trial template Caption, I–XIII and carries its fourteen checks', () => {
    expect(TRIAL_TEMPLATE.sections[0].n).toBe('Caption')
    expect(TRIAL_TEMPLATE.sections.at(-1)!.n).toBe('XIII')
    expect(TRIAL_TEMPLATE.qualityControl).toHaveLength(14)
  })
})

describe('the factual sheet, by the template', () => {
  it('says why a snapshot field is empty rather than leaving it blank', () => {
    const v = factual([fact()])
    const number = v.snapshot.find(s => s.field === 'Case Number / Forum')!
    expect(number.onFile).toBe(false)
    expect(number.source).toMatch(/No filing is recorded/)
    const period = v.snapshot.find(s => s.field === 'Employment / Relevant Period')!
    expect(period.source).toMatch(/damages reading has not been run/)
  })

  it('fills snapshot fields from the employment baseline, and names the source', () => {
    const v = factual([fact()], { baseline: [{ label: 'Hourly rate', value: '$18.00', basis: 'FACT' }] })
    const pay = v.snapshot.find(s => s.field === 'Pay Method / Rate')!
    expect(pay).toMatchObject({ value: '$18.00', onFile: true })
    expect(pay.source).toMatch(/baseline \(FACT\)/)
  })

  it('reads the employment period as start — end, not the pay period', () => {
    const v = factual([fact()], {
      baseline: [
        { label: 'Pay method / pay period', value: 'Paper check, biweekly', basis: 'FACT' },
        { label: 'Start date', value: '7/28/2024', basis: 'FACT' },
        { label: 'End date', value: '8/31/2026', basis: 'FACT' },
        { label: 'Industry / Wage Order', value: 'Restaurant, Order 5', basis: 'ASSUMPTION' },
        { label: 'Rate(s) of pay', value: '$18.00 hourly', basis: 'FACT' },
      ],
    })
    expect(v.snapshot.find(s => s.field === 'Employment / Relevant Period')!.value).toBe('7/28/2024 — 8/31/2026')
    expect(v.snapshot.find(s => s.field === 'Pay Method / Rate')!.value).toBe('Paper check, biweekly; $18.00 hourly')
  })

  it('does not put “manager” forward as a decisionmaker', () => {
    const v = factual([fact({ actors: ['manager'], proposition: 'The manager said breaks were not allowed.' })])
    const s = v.snapshot.find(x => x.field === 'Key Supervisors / Decisionmakers')!
    expect(s.onFile).toBe(false)
  })

  it('develops only material issues in full, and names the rest', () => {
    const v = factual([
      fact(), fact({ id: 'client-1:f002' }), fact({ id: 'client-1:f003' }),
      fact({ id: 'client-1:f004', legalTags: ['tips'] }),
    ])
    expect(v.issues.map(i => i.issue)).toEqual(['meal periods'])
    expect(v.otherIssues).toEqual([{ issue: 'tips', facts: 1 }])
  })

  it('tells a record from her own telling', () => {
    expect(fromARecord(fact())).toBe(false)
    expect(fromARecord(fact({ provenance: { kind: 'payroll record', pinpoint: 'ER-0041', on: '' } }))).toBe(true)
  })

  it('files a payroll record under VI.B and in the issue’s documentary record', () => {
    const paystub = fact({ id: 'client-1:f002', provenance: { kind: 'payroll record', pinpoint: 'paystub ER-0041', on: '' } })
    const v = factual([fact(), fact({ id: 'client-1:f003' }), paystub])
    expect(v.records.find(r => r.key === 'B')!.facts.map(f => f.id)).toEqual(['client-1:f002'])
    expect(v.issues[0].documentary.map(f => f.id)).toEqual(['client-1:f002'])
  })

  it('marks an uncorroborated nugget as her word, not proof', () => {
    const v = factual([fact(), fact({ id: 'client-1:f002' }), fact({ id: 'client-1:f003' })])
    expect(v.issues[0].nugget).toMatchObject({ proof: false })
  })

  it('hands the narrative check to a person, and never marks it met', () => {
    const check = factual([fact()]).checks.find(c => c.n === 10)!
    expect(check.result).toBe('for a person')
  })

  it('does not claim time and payroll were cross-checked when neither is on file', () => {
    expect(factual([fact()]).checks.find(c => c.n === 3)!.result).toBe('not yet')
  })

  it('runs every one of the twelve checks, in order', () => {
    expect(factual([fact()]).checks.map(c => c.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })
})

const brief = (over: Partial<Brief> = {}): Brief => ({
  clientName: 'Dayeon Kim',
  caseType: 'Wage & Hour',
  factCount: 1,
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

const claim = (id: string, els: { key: string; state: string; facts?: string[] }[]) => ({
  claimId: id,
  standing: 'gaps to close',
  elements: els.map(e => ({ key: e.key, state: e.state, reasoning: '', wouldSettleIt: '', facts: e.facts })),
  adverse: [],
  defense: '',
})

describe('the case brief, measured against the trial template', () => {
  it('opens by saying it is not a trial brief', () => {
    expect(trialReadiness(brief(), [fact()], []).headline).toMatch(/^Not a trial brief\./)
  })

  it('names the elements that need an authority the portal does not hold', () => {
    const r = trialReadiness(
      brief({ claims: [claim('rest-periods', [{ key: 'duty', state: 'needs authority', facts: ['f001'] }])] }),
      [fact()],
      []
    )
    const check = r.checks.find(c => c.n === 3)!
    expect(check.result).toBe('gap')
    expect(check.why).toMatch(/rest-periods · duty/)
  })

  it('names the elements that cite no fact', () => {
    const r = trialReadiness(brief({ claims: [claim('meal-periods', [{ key: 'no-relief', state: 'supported' }])] }), [fact()], [])
    expect(r.checks.find(c => c.n === 4)!.why).toMatch(/meal-periods · no-relief/)
  })

  it('will not call a set undisputed when nothing is confirmed by a record', () => {
    const r = trialReadiness(brief(), [fact()], [])
    expect(r.sections.find(s => s.n === 'III')!.readiness).toBe('not on file')
    expect(r.checks.find(c => c.n === 2)!.result).toBe('gap')
  })

  it('leaves drafting and legal judgement to a person', () => {
    const r = trialReadiness(brief(), [fact()], [])
    for (const n of [1, 11, 12, 13, 14]) expect(r.checks.find(c => c.n === n)!.result).toBe('for a person')
    for (const n of ['I', 'X', 'XI', 'XII']) expect(r.sections.find(s => s.n === n)!.readiness).toBe('for a person')
  })

  it('names the claims with no defence recorded', () => {
    const r = trialReadiness(brief({ claims: [claim('overtime', [{ key: 'hours', state: 'supported', facts: ['f001'] }])] }), [fact()], [])
    expect(r.checks.find(c => c.n === 6)!.why).toMatch(/overtime/)
  })
})

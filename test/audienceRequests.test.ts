import { describe, it, expect } from 'vitest'
import { Brief } from '@/lib/caseBrief'
import { Person } from '@/lib/whosWho'
import {
  attorneyRequests,
  audienceRequests,
  discoveryRequests,
  witnessRequests,
} from '@/lib/audienceRequests'
import { MissingItem } from '@/lib/missingInformation'

/**
 * The portal had one audience. Every gap in the case came out as a
 * sixth-grade question for the client, and the ones that could not be phrased
 * that way came out as nothing at all — which is how a payroll custodian and
 * an attorney end up being asked nothing.
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

const person = (over: Partial<Person> = {}): Person => ({
  name: 'manager',
  aliases: [],
  kind: 'individual',
  alignment: 'company',
  identified: false,
  facts: [{ id: 'f001', proposition: 'Directed the tip work.', status: 'REPORTED' }],
  knowsAbout: ['off-the-clock'],
  nextStep: 'Ask the client for a name.',
  weight: 1,
  ...over,
})

const item = (over: Partial<MissingItem> = {}): MissingItem => ({
  what: 'Wage statements, Feb–Jul 2025',
  why: 'Whether the two-hour blocks were ever paid.',
  source: 'Employer payroll',
  method: 'discovery',
  weight: 50,
  ...over,
})

describe('a witness', () => {
  it('is asked what they saw, not whether they agree', () => {
    // This person may end up on the other side. A question that tells them
    // which answer helps is a question that has been wasted.
    const [r] = witnessRequests([person({ identified: true, name: 'Ana Reyes', alignment: 'coworker' })])
    expect(r.text).toContain('what did you personally see or do')
    expect(r.text).not.toMatch(/did the manager force|wasn't it true|do you agree/i)
  })

  it('says to identify somebody the record only describes', () => {
    const [r] = witnessRequests([person({ name: 'unnamed manager or lead' })])
    expect(r.text).toContain('Identify and then ask')
  })

  it('leaves the client and anyone with no facts out of it', () => {
    const rs = witnessRequests([
      person({ alignment: 'client' }),
      person({ alignment: 'coworker', facts: [] }),
    ])
    expect(rs).toEqual([])
  })
})

describe('the other side', () => {
  it('is written formally and carries the period', () => {
    // A request without a period is objected to and produces nothing.
    const [r] = discoveryRequests([item()], ' for the period February to July 2025')
    expect(r.text).toBe(
      'Request for production: all documents sufficient to show wage statements, Feb–Jul 2025 for the period February to July 2025.'
    )
  })

  it('keeps the words a client question may not use', () => {
    // vet() refuses "meal period" in a client question and is right to. A
    // document request that avoids it will not produce meal period records.
    const [r] = discoveryRequests([item({ what: 'Meal period records' })], '')
    expect(r.text).toContain('meal period records')
  })

  it('writes a subpoena only where the reading said so', () => {
    const [r] = discoveryRequests([item({ method: 'subpoena' })], '')
    expect(r.text).toContain('Subpoena, to the custodian')
  })

  it('does not start a discovery fight over what the client can answer', () => {
    expect(discoveryRequests([item({ method: 'client' })], '')).toEqual([])
  })

  it('says so when nobody has been named as the custodian', () => {
    const [r] = discoveryRequests([item({ source: '' })], '')
    expect(r.to).toContain('Custodian not identified')
  })
})

describe('the attorney', () => {
  it('gets what the readings flagged for judgement', () => {
    const rs = attorneyRequests(
      brief({
        review: [
          { what: 'Wage Order 5', why: 'Proposed, not settled.', from: 'Wage order reading' },
        ],
      }),
      []
    )
    expect(rs[0].text).toContain('Wage Order 5')
    expect(rs[0].because).toBe('Wage order reading')
  })

  it('gets the gaps only authority can close', () => {
    const rs = attorneyRequests(brief(), [item({ what: 'The applicable Wage Order text.', method: 'research' })])
    expect(rs[0].text).toContain('Settle the governing authority')
  })

  it('is not sent routine completeness checks', () => {
    // The corpus is explicit that the same settled question should not keep
    // going back to Jack.
    expect(attorneyRequests(brief(), [item({ method: 'discovery' })])).toEqual([])
  })
})

describe('all three at once', () => {
  it('sends each gap to the audience that can close it', () => {
    const all = audienceRequests(
      brief({
        people: [person({ alignment: 'coworker', identified: true, name: 'Ana Reyes' })],
        evidence: [
          {
            record: 'Punch and POS records',
            tier: 'defendant record',
            inHand: false,
            proves: { facts: [], note: 'The hours actually clocked.' },
            bearsOn: [],
            howToGetIt: 'Employer timekeeping system, by document request.',
            ifMissing: '',
          } as never,
        ],
        review: [{ what: 'Wage Order 5', why: 'Proposed, not settled.', from: 'Wage order reading' }],
      })
    )
    expect(all.witness).toHaveLength(1)
    expect(all.discovery).toHaveLength(1)
    expect(all.attorney).toHaveLength(1)
  })
})

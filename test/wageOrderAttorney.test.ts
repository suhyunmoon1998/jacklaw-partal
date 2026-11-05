import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { LedgerEntry } from '@/lib/factLedger'
import type { WageOrderChoice } from '@/lib/wageOrderChoice'

/*
 * What happens when the model cannot say which Wage Order governs, and an
 * attorney settles it.
 *
 * Four clients sat for up to five weeks with no Order, reported as a proposal
 * that "contradicts itself", and nothing a person could do about it. The panel's
 * route and the night run here against an in-memory table. The model is never
 * reached: no key is set, so a call to it would fail the test. Synthetic people
 * only.
 */

const store = vi.hoisted(() => ({
  row: null as { fingerprint: string; result: Record<string, unknown>; updated_at: string } | null,
  tables: {} as Record<string, unknown[]>,
}))

vi.mock('@/lib/supabase', () => ({
  getSupabase: () => ({
    from: (table: string) => {
      const chain: Record<string, unknown> = {}
      for (const method of ['select', 'eq', 'neq', 'not', 'order', 'limit', 'in', 'gt', 'insert']) chain[method] = () => chain
      chain.maybeSingle = async () => ({ data: table === 'case_readings' ? store.row : null, error: null })
      chain.upsert = async (row: { fingerprint?: string; result?: Record<string, unknown> }) => {
        if (table === 'case_readings') {
          store.row = { fingerprint: String(row.fingerprint), result: row.result ?? {}, updated_at: new Date().toISOString() }
        }
        return { error: null }
      }
      chain.delete = () => {
        if (table === 'case_readings') store.row = null
        return chain
      }
      chain.then = (resolve: (v: unknown) => void) =>
        resolve({
          data: table === 'case_readings' ? (store.row ? [{ client_id: 'c1', ...store.row }] : []) : store.tables[table] ?? [],
          error: null,
        })
      return chain
    },
  }),
}))

const ledger = vi.hoisted(() => ({ entries: [] as unknown[] }))
vi.mock('@/lib/factStore', () => ({
  readLedger: async () => ledger.entries,
  readContradictions: async () => [],
}))
vi.mock('@/lib/adminAuth', () => ({ isAdmin: () => true }))
vi.mock('@/lib/briefVersions', () => ({ snapshotNow: vi.fn(async () => undefined) }))

const told = vi.hoisted(() => ({ orderOpen: [] as { clientName: string; problem: string; whatWouldSettleIt: string }[] }))
vi.mock('@/lib/officeNotice', () => ({
  tellOfficeOrderIsOpen: async (input: { clientName: string; problem: string; whatWouldSettleIt: string }) => {
    told.orderOpen.push(input)
  },
}))

const stages = vi.hoisted(() => ({ ran: [] as string[], next: null as null | ((stage: string) => Record<string, unknown>) }))
vi.mock('@/lib/caseReading', async original => {
  const real = await original<typeof import('@/lib/caseReading')>()
  return {
    ...real,
    runStage: async (stage: Parameters<typeof real.runStage>[0], entries: LedgerEntry[], stored: Parameters<typeof real.runStage>[2], opts?: Parameters<typeof real.runStage>[3]) => {
      stages.ran.push(stage)
      if (stages.next) return stages.next(stage)
      return real.runStage(stage, entries, stored, opts)
    },
  }
})

import { GET, PATCH, POST, DELETE } from '@/app/api/admin/clients/[id]/reading/route'
import { GET as NIGHT } from '@/app/api/cron/follow-ups/route'
import { attorneyChose, proposedOrder, readingFingerprint, stampFor } from '@/lib/caseReading'
import { attorneyOrderOf, whatStands } from '@/lib/caseReadingStore'
import { chooseOrder, checkChoice, isUsable, takeBackOrder, tidyChoice, whyNotUsable } from '@/lib/wageOrderChoice'
import { openOrderQuestion } from '@/lib/wageOrderNumber'
import { reviewItems } from '@/lib/caseBrief'

const fact = (id: string): LedgerEntry => ({
  id,
  proposition: 'She rang up customers at the counter.',
  verbatim: 'cashier',
  provenance: { kind: 'portal answer', pinpoint: 'job', on: '' },
  period: '',
  actors: [],
  location: '',
  status: 'REPORTED',
  confidenceBasis: '',
  corroboration: [],
  contrary: '',
  legalTags: [],
  damagesTags: [],
  openLoop: '',
  addedBy: 'test',
  supersededBy: null,
  supersededWhy: null,
})

const noOrder = (): WageOrderChoice => ({
  proposal: {
    order: '',
    industry: '',
    businessIs: '',
    reliedOn: '',
    because: 'The facts do not say what the business does.',
    facts: [],
    rejected: [{ order: '5', why: 'No food is mentioned.' }, { order: '7', why: 'No goods are mentioned.' }],
    whatWouldSettleIt: 'Did customers eat there, or take goods away?',
  },
  dlse: null,
  confirmed: false,
  caveat: '',
})

const props = { params: Promise.resolve({ id: 'c1' }) }
const call = (method: string, body?: unknown) =>
  new NextRequest('https://portal.example/api/admin/clients/c1/reading', {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }),
  })

function fileWith(result: Record<string, unknown>, entries = ledger.entries as LedgerEntry[]) {
  store.row = { fingerprint: readingFingerprint(entries), result, updated_at: new Date().toISOString() }
}

beforeEach(() => {
  vi.unstubAllEnvs()
  vi.stubEnv('ANTHROPIC_API_KEY', '')
  ledger.entries = [fact('c1:f001')]
  store.row = null
  store.tables = {}
  told.orderOpen = []
  stages.ran = []
  stages.next = null
})

describe('an Order an attorney chose', () => {
  it('is settled, even one the model ruled out', () => {
    const chosen = chooseOrder(noOrder(), '7', '2026-11-04T00:00:00Z')
    expect(chosen.proposal.order).toBe('7')
    expect(chosen.confirmed).toBe(true)
    expect(isUsable(chosen)).toBe(true)
    expect(checkChoice(chosen)).toEqual([])
    expect(whyNotUsable(chosen)).toBe('')
    expect(chosen.caveat).toBe('IWC Wage Order 7, chosen by an attorney. Every rest-period and hours finding below depends on it.')
  })

  it('keeps what the model said, across a change of mind, so it can be taken back', () => {
    const proposed = { ...noOrder(), proposal: { ...noOrder().proposal, order: '5', rejected: [] } }
    const first = chooseOrder(proposed, '7', 'a')
    const second = chooseOrder(first, '9', 'b')
    expect(second.chosen).toEqual({ at: 'b', modelSaid: '5' })
    const back = takeBackOrder(second)
    expect(back.proposal.order).toBe('5')
    expect(back.confirmed).toBe(false)
    expect(back.chosen).toBeUndefined()
    expect(back.caveat).toMatch(/^Proposed IWC Wage Order 5, not confirmed/)
  })

  it('compares the pamphlet to the Order actually chosen', () => {
    const proposed: WageOrderChoice = {
      ...noOrder(),
      proposal: { ...noOrder().proposal, order: '5', rejected: [] },
      dlse: { entry: 'Restaurants', orders: '5', agrees: true },
    }
    expect(chooseOrder(proposed, '7', 'a').dlse?.agrees).toBe(false)
    expect(takeBackOrder(chooseOrder(proposed, '7', 'a')).dlse?.agrees).toBe(true)
  })

  it('refuses anything but one of the seventeen', () => {
    expect(() => chooseOrder(noOrder(), '18', 'a')).toThrow()
    expect(() => chooseOrder(noOrder(), '5 or 7', 'a')).toThrow()
  })

  it('stays chosen through the tidying every read does', () => {
    const tidied = tidyChoice(chooseOrder(noOrder(), '7', 'a'))
    expect(tidied.confirmed).toBe(true)
    expect(tidied.caveat).toMatch(/chosen by an attorney/)
  })

  it('does not go stale when the facts move, and reads under its own number', () => {
    const stored = { wageOrder: chooseOrder(noOrder(), '7', 'a') }
    expect(attorneyChose(stored)).toBe(true)
    expect(proposedOrder(stored)).toBe('7')
    expect(stampFor([fact('c1:f001')], 'wage order', stored)).toBe(stampFor([fact('c1:f001'), fact('c1:f002')], 'wage order', stored))
  })

  it('is what survives when the facts move, and nothing else does', () => {
    const chosen = chooseOrder(noOrder(), '7', 'a')
    const reading = { wageOrder: chosen, claims1: [], stamps: { 'wage order': 'attorney: 7', 'claims 1': 'x' } }
    expect(attorneyOrderOf(reading)).toEqual({ wageOrder: chosen, stamps: { 'wage order': 'attorney: 7' } })
    expect(whatStands({ reading, fingerprint: 'old', stale: true, updatedAt: '' })).toEqual(attorneyOrderOf(reading))
    expect(whatStands({ reading: { wageOrder: noOrder(), claims1: [] }, fingerprint: 'old', stale: true, updatedAt: '' })).toEqual({})
  })
})

describe('the question that would settle it', () => {
  it('is offered only while no Order is settled', () => {
    expect(openOrderQuestion(noOrder())).toBe('Did customers eat there, or take goods away?')
    expect(openOrderQuestion(chooseOrder(noOrder(), '7', 'a'))).toBe('')
    expect(openOrderQuestion(undefined)).toBe('')
  })
})

describe('the brief', () => {
  const base = { clientName: 'x', caseType: 'x', analysis: null, claims: [], spine: null, stale: false, staleStages: [], failed: [], questions: [] }
  const items = (wageOrder: unknown) => reviewItems({ ...base, wageOrder } as unknown as Parameters<typeof reviewItems>[0])

  it('says no Order is settled rather than printing a blank one', () => {
    const [item] = items(noOrder())
    expect(item.what).toBe('No Wage Order is settled')
  })

  it('does not ask an attorney to review what an attorney decided', () => {
    expect(items(chooseOrder(noOrder(), '7', 'a')).some(i => i.what.includes('Wage Order'))).toBe(false)
  })
})

describe('the panel, with no Order on file', () => {
  beforeEach(() => {
    const stamp = stampFor(ledger.entries as LedgerEntry[], 'wage order', { wageOrder: noOrder() })
    fileWith({ wageOrder: noOrder(), stamps: { 'wage order': stamp } })
  })

  it('offers nothing to run, and says what is missing without calling it a contradiction', async () => {
    const body = await (await GET(call('GET'), props)).json()
    expect(body.next).toBeNull()
    expect(body.orderProblem).toMatch(/^No Wage Order was proposed/)
    expect(body.orderProblem).not.toMatch(/contradict/)
  })

  it('offers the Wage Order again only when its model has moved since', async () => {
    fileWith({ wageOrder: noOrder(), stamps: { 'wage order': 'read by an older model' } })
    const body = await (await GET(call('GET'), props)).json()
    expect(body.next).toBe('wage order')
    expect(body.orderProblem).toMatch(/^No Wage Order was proposed/)
  })

  it('refuses to read the claims, in the same words', async () => {
    const res = await POST(call('POST', { stage: 'claims 1' }), props)
    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/^No Wage Order was proposed/)
    expect(stages.ran).toEqual([])
  })

  it('lets an attorney choose one, and the claims are next, with nothing paid for', async () => {
    const res = await PATCH(call('PATCH', { order: '5' }), props)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.reading.wageOrder.confirmed).toBe(true)
    expect(body.reading.wageOrder.proposal.order).toBe('5')
    expect(body.next).toBe('claims 1')
    expect(body.orderProblem).toBe('')
    expect(stages.ran).toEqual([])
    expect((store.row?.result.wageOrder as WageOrderChoice).confirmed).toBe(true)
  })

  it('refuses an Order that does not exist and changes nothing', async () => {
    const res = await PATCH(call('PATCH', { order: '18' }), props)
    expect(res.status).toBe(400)
    expect((store.row?.result.wageOrder as WageOrderChoice).confirmed).toBe(false)
  })

  it('goes back to asking when the choice is taken back', async () => {
    await PATCH(call('PATCH', { order: '5' }), props)
    const body = await (await PATCH(call('PATCH', { order: '' }), props)).json()
    expect(body.reading.wageOrder.confirmed).toBe(false)
    expect(body.next).toBeNull()
    expect(body.orderProblem).toMatch(/^No Wage Order was proposed/)
  })

  it('has nothing to choose over before the Wage Order stage has run', async () => {
    store.row = null
    expect((await PATCH(call('PATCH', { order: '5' }), props)).status).toBe(409)
  })
})

describe('the panel, with an attorney’s Order on file', () => {
  beforeEach(() => fileWith({ wageOrder: chooseOrder(noOrder(), '7', 'a'), stamps: { 'wage order': 'attorney: 7' } }))

  it('does not pay a model to read the Wage Order again', async () => {
    // Would fail here: no key is set, so a real call throws and the route answers 502.
    const res = await POST(call('POST', { stage: 'wage order' }), props)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.reading.wageOrder.proposal.order).toBe('7')
    expect(body.next).toBe('claims 1')
  })

  it('keeps it through Read again, which clears the reading first', async () => {
    fileWith({ wageOrder: chooseOrder(noOrder(), '7', 'a'), claims1: [{}], stamps: { 'wage order': 'attorney: 7' } })
    ledger.entries = [fact('c1:f001'), fact('c1:f002')]
    expect((await DELETE(call('DELETE'), props)).status).toBe(200)
    expect(store.row?.result.claims1).toBeUndefined()
    expect((store.row?.result.wageOrder as WageOrderChoice).proposal.order).toBe('7')
  })

  it('lets a reading with no attorney’s Order be cleared outright, as before', async () => {
    fileWith({ wageOrder: noOrder() })
    await DELETE(call('DELETE'), props)
    expect(store.row).toBeNull()
  })
})

describe('the panel, with a proposal that contradicts itself', () => {
  it('still calls it that, and offers the Wage Order again', async () => {
    fileWith({
      wageOrder: { ...noOrder(), proposal: { ...noOrder().proposal, order: '7', reliedOn: 'IWC 5 sec 2', rejected: [] } },
    })
    const body = await (await GET(call('GET'), props)).json()
    expect(body.next).toBe('wage order')
    expect(body.orderProblem).toMatch(/contradicts itself/)
  })
})

describe('the night', () => {
  const night = () =>
    NIGHT(new NextRequest('https://portal.example/api/cron/follow-ups', { headers: { authorization: 'Bearer night-secret' } }))

  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', 'night-secret')
    store.tables = {
      questionnaire_states: [{ client_id: 'c1', m2_submitted: true, completed_sections: [], m2_submitted_at: null }],
      clients: [{ id: 'c1', name: 'Synthetic Client', portal_lang: 'en' }],
      case_facts: [{ created_at: '2026-01-01T00:00:00Z' }],
    }
  })

  it('tells the office once, when it works out that there is no Order, and reads no claims', async () => {
    stages.next = stage => {
      if (stage !== 'wage order') throw new Error(`read ${stage} with no Order`)
      return { wageOrder: noOrder(), stamps: { 'wage order': 's' } }
    }
    const body = await (await night()).json()
    expect(stages.ran).toEqual(['wage order'])
    expect(told.orderOpen).toHaveLength(1)
    expect(told.orderOpen[0].clientName).toBe('Synthetic Client')
    expect(told.orderOpen[0].whatWouldSettleIt).toBe('Did customers eat there, or take goods away?')
    expect(JSON.stringify(body)).toMatch(/No Wage Order was proposed/)
    expect(JSON.stringify(body)).not.toMatch(/contradicts itself/)
  })

  it('does not tell the office again on the nights after, and spends nothing', async () => {
    fileWith({ wageOrder: noOrder() })
    const body = await (await night()).json()
    expect(stages.ran).toEqual([])
    expect(told.orderOpen).toEqual([])
    expect(JSON.stringify(body)).toMatch(/No Wage Order was proposed/)
  })

  it('reads the claims under an attorney’s Order, even after the facts moved', async () => {
    fileWith({ wageOrder: chooseOrder(noOrder(), '7', 'a'), stamps: { 'wage order': 'attorney: 7' } })
    ledger.entries = [fact('c1:f001'), fact('c1:f002')]
    stages.next = stage => (stage === 'claims 1' ? { claims1: [] } : stage === 'claims 2' ? { claims2: [] } : stage === 'claims 3' ? { claims3: [] } : { spine: {} })
    await night()
    expect(stages.ran[0]).toBe('claims 1')
    expect(stages.ran).not.toContain('wage order')
    expect((store.row?.result.wageOrder as WageOrderChoice).proposal.order).toBe('7')
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

/*
 * The damages reading begun when a client submits Module 2 (owner's decision,
 * 2026-10-03), and finished by the night. It never starts for a client who
 * submitted before it shipped, and never re-reads a complete reading unprompted.
 */

const ran: string[] = []
let stored: Record<string, unknown> = {}
let row: { fingerprint: string; result: unknown } | null = null
let refuse: string | null = null

vi.mock('@/lib/caseAnalysis', () => ({ analysisFingerprint: () => 'fp-now' }))
vi.mock('@/lib/analysisRun', () => ({
  gather: vi.fn(async (clientId: string) => (clientId === 'ghost' ? null : { setsError: null })),
  load: vi.fn(async () => row),
  runAnalysisCore: vi.fn(async (_clientId: string, stage: string) => {
    if (refuse === stage) return { status: 502, body: { error: `${stage} failed` } }
    ran.push(stage)
    const key = { baseline: 'overview', findings: 'findings', assembly: 'assembly', inputs: 'inputs' }[stage] as string
    stored = { ...(stage === 'baseline' ? {} : stored), [key]: {} }
    return { status: 200, body: { stored: true }, stored }
  }),
}))

import { DAMAGES_ON_MODULE2_SINCE, owedDamages, readDamagesWhileTimeAllows, startingStage } from '@/lib/damagesAuto'

beforeEach(() => {
  ran.length = 0
  stored = {}
  row = null
  refuse = null
})

describe('where a damages reading picks up', () => {
  it('starts over unless what is on file was read from these answers', () => {
    expect(startingStage(null, 'fp')).toBe('baseline')
    expect(startingStage({ fingerprint: 'old', result: { overview: {}, findings: {} } }, 'fp')).toBe('baseline')
    expect(startingStage({ fingerprint: 'fp', result: { overview: {}, findings: {} } }, 'fp')).toBe('assembly')
    expect(startingStage({ fingerprint: 'fp', result: { overview: {}, findings: {}, assembly: {}, inputs: {} } }, 'fp')).toBeNull()
  })
})

describe('reading the damages while the clock allows', () => {
  it('runs every stage in order when there is time', async () => {
    const run = await readDamagesWhileTimeAllows('c1', Date.now())
    expect(ran).toEqual(['baseline', 'findings', 'assembly', 'inputs'])
    expect(run).toMatchObject({ ran: true, next: null })
  })

  it('begins the first stage whatever the clock says, and no other past the mark', async () => {
    const run = await readDamagesWhileTimeAllows('c1', Date.now() - 200_000)
    expect(ran).toEqual(['baseline'])
    expect(run.next).toBe('findings')
    expect(run.reason).toMatch(/out of time/)
  })

  it('resumes a reading of these answers instead of paying for it again', async () => {
    row = { fingerprint: 'fp-now', result: { overview: {}, findings: {} } }
    stored = { overview: {}, findings: {} }
    await readDamagesWhileTimeAllows('c1', Date.now())
    expect(ran).toEqual(['assembly', 'inputs'])
  })

  it('stops at a stage that fails and says why', async () => {
    refuse = 'findings'
    const run = await readDamagesWhileTimeAllows('c1', Date.now())
    expect(ran).toEqual(['baseline'])
    expect(run).toMatchObject({ ran: true, next: 'findings', reason: 'findings failed' })
  })

  it('does nothing for a complete reading or a client who is not there', async () => {
    row = { fingerprint: 'fp-now', result: { overview: {}, findings: {}, assembly: {}, inputs: {} } }
    expect((await readDamagesWhileTimeAllows('c1')).ran).toBe(false)
    expect((await readDamagesWhileTimeAllows('ghost')).ran).toBe(false)
    expect(ran).toEqual([])
  })
})

describe('who the night owes a damages reading', () => {
  const since = DAMAGES_ON_MODULE2_SINCE
  const after = new Date(Date.parse(since) + 3_600_000).toISOString()
  const before = new Date(Date.parse(since) - 3_600_000).toISOString()

  it('finishes a reading begun since this shipped and not finished', () => {
    expect(
      owedDamages({ finishedModule2: ['a'], submittedModule2At: { a: before }, analyses: [{ clientId: 'a', result: { overview: {} }, writtenAt: after }] })
    ).toEqual(['a'])
  })

  it('leaves alone a reading taken before this shipped, even one that reads as unfinished', () => {
    // Three readings on file were taken before the inputs stage existed.
    const old = { overview: {}, findings: {}, assembly: {} }
    expect(
      owedDamages({ finishedModule2: ['a'], submittedModule2At: { a: after }, analyses: [{ clientId: 'a', result: old, writtenAt: before }] })
    ).toEqual([])
  })

  it('starts one only for a client who submitted Module 2 since this shipped', () => {
    const owed = owedDamages({ finishedModule2: ['new', 'old', 'unknown'], submittedModule2At: { new: after, old: before }, analyses: [] })
    expect(owed).toEqual(['new'])
  })

  it('leaves a complete reading alone, and anyone who has not finished Module 2', () => {
    const complete = { overview: {}, findings: {}, assembly: {}, inputs: {} }
    expect(owedDamages({ finishedModule2: ['a'], submittedModule2At: { a: after }, analyses: [{ clientId: 'a', result: complete, writtenAt: after }] })).toEqual([])
    expect(owedDamages({ finishedModule2: [], submittedModule2At: { a: after }, analyses: [] })).toEqual([])
  })
})

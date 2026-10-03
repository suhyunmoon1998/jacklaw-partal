import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

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

import { DAMAGES_ON_MODULE2_SINCE, claimModule2Submission, owedDamages, readDamagesWhileTimeAllows, startingStage } from '@/lib/damagesAuto'

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

/*
 * The submission time is written once, by the submission (migration 0025).
 * m2_last_saved was read in its place, and every autosave writes it — the one
 * a visit to a long-finished Module 2 makes, too — so an old submission looked
 * new and the night could start a reading nobody had decided on.
 */
describe('the moment Module 2 was submitted', () => {
  // A stand-in for the query the claim makes: update … where m2_submitted_at is null, returning what changed.
  const fakeDb = (answer: { data?: unknown[] | null; error?: { message: string } | null; throws?: boolean }) => {
    const calls: Array<[string, ...unknown[]]> = []
    const chain = {
      update: (values: unknown) => (calls.push(['update', values]), chain),
      eq: (column: string, value: unknown) => (calls.push(['eq', column, value]), chain),
      is: (column: string, value: unknown) => (calls.push(['is', column, value]), chain),
      select: async (columns: string) => {
        calls.push(['select', columns])
        if (answer.throws) throw new Error('network')
        return { data: answer.data ?? null, error: answer.error ?? null }
      },
    }
    return { db: { from: (table: string) => (calls.push(['from', table]), chain) } as never, calls }
  }
  const now = new Date('2026-10-04T05:00:00Z')

  it('is written only while it is empty, and the request that writes it is the first', async () => {
    const { db, calls } = fakeDb({ data: [{ client_id: 'c1' }] })
    expect(await claimModule2Submission(db, 'c1', now)).toBe('first')
    expect(calls).toEqual([
      ['from', 'questionnaire_states'],
      ['update', { m2_submitted_at: '2026-10-04T05:00:00.000Z' }],
      ['eq', 'client_id', 'c1'],
      ['is', 'm2_submitted_at', null],
      ['select', 'client_id'],
    ])
  })

  it('says "again" when it was already written: a second submit or a stale tab begins nothing', async () => {
    expect(await claimModule2Submission(fakeDb({ data: [] }).db, 'c1', now)).toBe('again')
  })

  it('says "unknown" when it cannot be written, so the submission falls back to the flag it already checked', async () => {
    expect(await claimModule2Submission(fakeDb({ error: { message: 'column "m2_submitted_at" does not exist' } }).db, 'c1', now)).toBe('unknown')
    expect(await claimModule2Submission(fakeDb({ throws: true }).db, 'c1', now)).toBe('unknown')
  })

  const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8')

  it('is what the night reads, never the last save, and a failed read starts nothing', () => {
    const cron = read('app/api/cron/follow-ups/route.ts')
    expect(cron).toMatch(/select\('client_id, m2_submitted_at'\)\.not\('m2_submitted_at', 'is', null\)/)
    expect(cron).toMatch(/submittedModule2At: Object\.fromEntries\(\(submissions \?\? \[\]\)/)
    expect(cron).not.toMatch(/s\.m2_last_saved/)
    // Missing column: warned, not thrown, and not counted among the lists that stop the run.
    expect(cron).toMatch(/if \(submissionsErr\) console\.warn/)
    expect(cron).not.toMatch(/listError = [^\n]*submissionsErr/)
  })

  it('is written by the submission, which begins the reading unless the time was already there', () => {
    const route = read('app/api/questionnaire/route.ts')
    expect(route).toMatch(/const claim = moduleId === 'module2' \? await claimModule2Submission\(supabase, clientId\) : 'again'/)
    expect(route).toMatch(/if \(moduleId === 'module2' && claim !== 'again'\) \{/)
    // The reading's clock is the request's: maxDuration counts the emails sent before it.
    expect(route.indexOf('const began = Date.now()')).toBeLessThan(route.indexOf('await req.json()'))
    const migration = read('supabase/migrations/0025_module2_submitted_at.sql')
    expect(migration).toMatch(/alter table public\.questionnaire_states\s+add column if not exists m2_submitted_at timestamptz;/)
  })

  it('reads each client\'s newest search and finished set on their own, not off a cut whole table', () => {
    const cron = read('app/api/cron/follow-ups/route.ts')
    expect(cron).toMatch(/from\('source_searches'\)\.select\('created_at'\)\.eq\('client_id', id\)\.order\('created_at', \{ ascending: false \}\)\.limit\(1\)/)
    expect(cron).not.toMatch(/from\('source_searches'\)\.select\('client_id, created_at'\)/)
    expect(cron).toMatch(/from\('client_question_set_assignments'\)\s*\.select\('completed_at'\)\s*\.eq\('client_id', id\)/)
  })
})

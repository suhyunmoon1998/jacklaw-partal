import { describe, it, expect, vi } from 'vitest'

// The Wage Order proposal is a model call. Its content is beside the point
// here; what is tested is what the stage carries forward from the reading.
vi.mock('@/lib/wageOrderChoice', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/wageOrderChoice')>()),
  proposeWageOrder: vi.fn(async () => ({ proposal: { order: '5' } })),
}))

// The matrix is a model call too. Each test says what it came back with.
const matrixResult = vi.hoisted(() => ({ current: { findings: [] as unknown[], failed: [] as { claimId: string; why: string }[] } }))
vi.mock('@/lib/claimMatrix', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/claimMatrix')>()),
  buildMatrix: vi.fn(async () => matrixResult.current),
}))

import { claimsFor, runStage, stampsNow } from '@/lib/caseReading'
import { StoredReading, staleStages } from '@/lib/caseReadingShape'
import { LedgerEntry } from '@/lib/factLedger'

const fact: LedgerEntry = {
  id: 'c1:f001', proposition: 'She worked five days a week.', verbatim: '월 화 금 토 일',
  provenance: { kind: 'portal answer', pinpoint: 'schedule', on: '' },
  period: '', actors: [], location: '', status: 'REPORTED',
  confidenceBasis: '', corroboration: [], contrary: '', legalTags: [], damagesTags: [],
  openLoop: '', addedBy: 'test', supersededBy: null, supersededWhy: null,
}

describe('reading the Wage Order again', () => {
  it('keeps every other stage current, with what it took and cost', async () => {
    // On DAYEON KIM's file a re-read Order came back the same and the
    // chronology — untouched, and current a minute before — showed as stale,
    // because the stage was handed {} and its patch carried no other stamp.
    const entries = [fact]
    const read: StoredReading = { wageOrder: { proposal: { order: '5' } }, spine: { events: [] } }
    read.stamps = stampsNow(entries, read)
    read.took = { spine: 116 }
    read.spent = { spine: { in: 1, out: 2, cacheWrite: 0, cacheRead: 0, calls: 3 } }
    expect(staleStages(read, stampsNow(entries, read))).not.toContain('spine')

    const patch = await runStage('wage order', entries, read)
    const merged = { ...read, ...patch }

    expect(staleStages(merged, stampsNow(entries, merged))).not.toContain('spine')
    expect(merged.took?.spine).toBe(116)
    expect(merged.spent?.spine?.calls).toBe(3)
    expect(merged.took?.['wage order']).toBeTypeOf('number')
  })
})

describe('a claims stage that did not read every claim', () => {
  // On DAYEON KIM's file the account ran out of credit mid-reading. All five
  // claims of claims 2 failed, and the stage was stored as read, empty, and
  // stamped current — so the panel called it done and the night skipped it.
  const entries = [fact]
  const before: StoredReading = { wageOrder: { proposal: { order: '5' } } }
  const ids = claimsFor('claims 2').map(c => c.id)
  const outOfCredit = "The firm's Anthropic account is out of credit, so the reading could not run."

  it('stores nothing, and says why, when no claim came back', async () => {
    matrixResult.current = { findings: [], failed: ids.map(claimId => ({ claimId, why: outOfCredit })) }
    await expect(runStage('claims 2', entries, before)).rejects.toThrow(/out of credit/)
  })

  it('keeps what came back but shows the stage as stale when some failed', async () => {
    matrixResult.current = {
      findings: [{ claimId: ids[0], standing: 'gaps to close', elements: [], defense: '', adverse: [], damagesInputs: [], damagesMissing: [] }],
      failed: ids.slice(1).map(claimId => ({ claimId, why: outOfCredit })),
    }
    const patch = await runStage('claims 2', entries, before)
    const merged = { ...before, ...patch }
    expect(merged.claims2).toHaveLength(1)
    expect(merged.failed).toHaveLength(ids.length - 1)
    expect(staleStages(merged, stampsNow(entries, merged))).toContain('claims 2')
  })

  it('clears the stage\'s old failures once its claims are read again', async () => {
    matrixResult.current = {
      findings: ids.map(claimId => ({ claimId, standing: 'gaps to close', elements: [], defense: '', adverse: [], damagesInputs: [], damagesMissing: [] })),
      failed: [],
    }
    const earlier = { ...before, failed: [{ claimId: ids[0], why: outOfCredit }, { claimId: 'meal-periods', why: 'other stage' }] }
    const merged = { ...earlier, ...(await runStage('claims 2', entries, earlier)) }
    expect(merged.failed).toEqual([{ claimId: 'meal-periods', why: 'other stage' }])
    expect(staleStages(merged, stampsNow(entries, merged))).not.toContain('claims 2')
  })
})

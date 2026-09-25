import { describe, it, expect, vi } from 'vitest'

// The Wage Order proposal is a model call. Its content is beside the point
// here; what is tested is what the stage carries forward from the reading.
vi.mock('@/lib/wageOrderChoice', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/wageOrderChoice')>()),
  proposeWageOrder: vi.fn(async () => ({ proposal: { order: '5' } })),
}))

import { runStage, stampsNow } from '@/lib/caseReading'
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

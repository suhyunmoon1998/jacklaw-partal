import { describe, it, expect } from 'vitest'
import { LedgerFact } from '@/lib/factualBrief'
import {
  assumptionLog,
  evidenceStatus,
  evidenceStatusMap,
  submissionDigest,
} from '@/lib/submissionPackage'

const fact = (over: Partial<LedgerFact> = {}): LedgerFact => ({
  id: 'client-1789103134380:f029',
  proposition: 'The client does not know her hourly rate.',
  verbatim: "I don't know",
  status: 'UNKNOWN',
  provenance: { kind: 'client memory', pinpoint: 'hourly_rate — What was your hourly rate?', on: '2026-09-16' },
  corroboration: [],
  damagesTags: [],
  openLoop: '',
  ...over,
})

describe('the ledger’s statuses in the standard’s vocabulary', () => {
  it('maps the five to the five', () => {
    expect(evidenceStatus(fact({ status: 'CONFIRMED' }))).toBe('ESTABLISHED')
    expect(evidenceStatus(fact({ status: 'REPORTED', corroboration: ['punch records'] }))).toBe('SUPPORTED')
    expect(evidenceStatus(fact({ status: 'REPORTED' }))).toBe('PARTY CONTENTION / TESTIMONY')
    expect(evidenceStatus(fact({ status: 'DISPUTED' }))).toBe('DISPUTED')
    expect(evidenceStatus(fact({ status: 'UNKNOWN' }))).toBe('UNKNOWN / REQUIRES FOUNDATION')
  })

  it('does not promote an inference to a confirmed fact', () => {
    expect(evidenceStatus(fact({ status: 'INFERRED' }))).toBe('PARTY CONTENTION / TESTIMONY')
  })

  it('counts every label, including the empty ones', () => {
    const map = evidenceStatusMap([fact({ status: 'CONFIRMED' })])
    expect(map).toHaveLength(5)
    expect(map.find(m => m.status === 'ESTABLISHED')?.count).toBe(1)
    expect(map.find(m => m.status === 'DISPUTED')?.count).toBe(0)
  })
})

describe('the damages assumption log', () => {
  it('names the record that would replace the assumption', () => {
    // "Estimated" is not a disclosure. "Estimated, and the pay stubs would
    // settle it" is.
    const [entry] = assumptionLog([
      fact({ damagesTags: ['rate'], openLoop: 'Obtain pay stubs showing the hourly rate.' }),
    ])
    expect(entry.basis).toBe('not established')
    expect(entry.wouldReplace).toBe('Obtain pay stubs showing the hourly rate.')
  })

  it('takes the strongest basis on file for an input', () => {
    const [entry] = assumptionLog([
      fact({ damagesTags: ['hours per day'], status: 'UNKNOWN' }),
      fact({ damagesTags: ['hours per day'], status: 'CONFIRMED' }),
    ])
    expect(entry.basis).toBe('sourced')
  })

  it('calls her own account what it is', () => {
    const [entry] = assumptionLog([fact({ damagesTags: ['frequency'], status: 'REPORTED' })])
    expect(entry.basis).toBe('client testimony')
  })
})

describe('the submission digest', () => {
  it('carries her words and where she said them, with no conclusion', () => {
    const [line] = submissionDigest([fact()])
    expect(line.said).toBe("I don't know")
    expect(line.where).toContain('hourly_rate')
  })

  it('reads in English where she answered in Korean', () => {
    const [line] = submissionDigest([
      fact({ verbatim: '2시간 일찍', verbatimEnglish: 'two hours early' }),
    ])
    expect(line.said).toBe('two hours early')
  })
})

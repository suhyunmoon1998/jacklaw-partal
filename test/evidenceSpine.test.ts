import { describe, it, expect } from 'vitest'
import {
  ANCHOR_KINDS,
  ANOMALY_KINDS,
  PROOF_TIERS,
  SpineRecord,
  TimelineEvent,
  anchors,
  check,
  chronological,
  toObtain,
  undated,
  unevidencedPatterns,
} from '@/lib/evidenceSpine'

const ev = (over: Partial<TimelineEvent> = {}): TimelineEvent => ({
  id: 'e01', when: '', sortKey: '', through: '', event: 'something happened',
  kind: 'incident', facts: [], people: [],
  bearsOn: [], whyItMatters: '', proofTier: 'client testimony', anchor: null,
  ...over,
})

const rec = (over: Partial<SpineRecord> = {}): SpineRecord => ({
  record: 'wage statements', tier: 'defendant record', inHand: false,
  proves: { facts: [], note: '' }, bearsOn: [], howToGetIt: '', ifMissing: '',
  ...over,
})

describe('the order of proof', () => {
  it('is the corpus’s, ranked, with the employer’s own records first', () => {
    expect(PROOF_TIERS[0].key).toBe('defendant record')
    expect(PROOF_TIERS[PROOF_TIERS.length - 1].key).toBe('inference')
    expect(PROOF_TIERS.map(t => t.rank)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('names the nine anomalies the corpus asks for, and no others', () => {
    // Fixed in code so the model detects from a list rather than inventing
    // categories. If this list grows, it grows because the corpus did.
    expect(ANOMALY_KINDS).toHaveLength(9)
    expect(ANOMALY_KINDS).toContain('rounded punches')
    expect(ANOMALY_KINDS).toContain('payroll/time mismatch')
  })
})

describe('putting the timeline in order', () => {
  it('sorts dated events and keeps vaguer dates ahead of precise ones in the same year', () => {
    const out = chronological([
      ev({ id: 'e03', event: 'c', sortKey: '2024-03-15' }),
      ev({ id: 'e01', event: 'a', sortKey: '2023' }),
      ev({ id: 'e02', event: 'b', sortKey: '2024-03' }),
    ])
    expect(out.map(e => e.event)).toEqual(['a', 'b', 'c'])
  })

  it('keeps undated events, at the end', () => {
    // Dropping them would let a reader believe the timeline is whole. It is
    // not: these are the events nobody has placed yet.
    const out = chronological([ev({ id: 'e01', event: 'no date' }), ev({ id: 'e02', event: 'dated', sortKey: '2024-01-02' })])
    expect(out.map(e => e.event)).toEqual(['dated', 'no date'])
    expect(undated(out).map(e => e.event)).toEqual(['no date'])
  })
})

describe('the dates a deadline could run from', () => {
  it('reports every anchor in order, and nothing that is not one', () => {
    const out = anchors([
      ev({ id: 'e03', event: 'quit', sortKey: '2025-04-30', anchor: 'employment ended' }),
      ev({ id: 'e02', event: 'a shift', sortKey: '2024-06-01' }),
      ev({ id: 'e01', event: 'hired', sortKey: '2023-01-09', anchor: 'hired', facts: ['c1:f004'] }),
    ])
    expect(out.map(a => a.kind)).toEqual(['hired', 'employment ended'])
    expect(out[0].facts).toEqual(['c1:f004'])
  })

  it('still reports an anchor whose date nobody could normalize', () => {
    // 'some time in the spring' cannot be counted from, but hiding it would
    // leave the office believing it has no adverse-action date at all. It has
    // one; it needs pinning down, which is a question to ask the client.
    const out = anchors([ev({ when: 'some time in the spring', anchor: 'adverse action' })])
    expect(out).toEqual([
      {
        kind: 'adverse action',
        on: 'some time in the spring',
        when: 'some time in the spring',
        event: 'something happened',
        facts: [],
      },
    ])
  })

  it('covers the kinds a limitations period actually runs from', () => {
    expect(ANCHOR_KINDS).toContain('employment ended')
    expect(ANCHOR_KINDS).toContain('final pay received')
    expect(ANCHOR_KINDS).toContain('last violation')
  })
})

describe('patterns nothing concrete stands behind', () => {
  it('flags a pattern with no representative incident under it', () => {
    // The corpus's point: a pattern proved by no occurrence is an assertion.
    const out = unevidencedPatterns(
      [
        ev({ id: 'e01', event: 'never given rest breaks', kind: 'pattern' }),
        ev({ id: 'e02', event: 'never paid overtime', kind: 'pattern' }),
        ev({ id: 'e03', event: 'asked for a break on 3 March and was refused', kind: 'incident' }),
      ],
      [{ pattern: 'e01', incident: 'e03' }]
    )
    expect(out.map(e => e.event)).toEqual(['never paid overtime'])
  })

  it('does not count a link from something that is not an incident', () => {
    // A pattern cited as proof of another pattern proves nothing. Without this
    // the reading could evidence its whole timeline out of itself.
    const out = unevidencedPatterns(
      [
        ev({ id: 'e01', event: 'never paid overtime', kind: 'pattern' }),
        ev({ id: 'e02', event: 'she was underpaid throughout', kind: 'pattern' }),
      ],
      [{ pattern: 'e01', incident: 'e02' }]
    )
    expect(out.map(e => e.event)).toEqual(['never paid overtime', 'she was underpaid throughout'])
  })
})

describe('what the office has to go and get', () => {
  it('leaves out what is already in hand and puts the strongest proof first', () => {
    const out = toObtain([
      rec({ record: 'her own memory of hours', tier: 'client testimony' }),
      rec({ record: 'the offer letter', tier: 'defendant record', inHand: true }),
      rec({ record: 'timekeeping export', tier: 'defendant record' }),
      rec({ record: 'her bank deposits', tier: 'contemporaneous record' }),
    ])
    expect(out.map(r => r.record)).toEqual([
      'timekeeping export',
      'her bank deposits',
      'her own memory of hours',
    ])
  })
})

describe('checking a reading before anyone relies on it', () => {
  const ledger = [{ id: 'c1:f001' }, { id: 'c1:f002' }] as never

  const reading = (over: Record<string, unknown> = {}) => ({
    events: [], evidenceLinks: [], silences: [], anomalies: [], dateConflicts: [],
    coreStory: [], records: [], restingOnTestimonyAlone: [],
    ...over,
  }) as never

  it('passes a reading whose every reference resolves', () => {
    const out = check(
      reading({
        events: [ev({ id: 'e01', facts: ['c1:f001'], bearsOn: ['meal-periods:over-five-hours'] })],
        coreStory: [{ facts: ['c1:f002'], note: 'the shape of it' }],
      }),
      ledger
    )
    expect(out).toEqual([])
  })

  it('catches a fact id that is not in the ledger', () => {
    // The failure that does not look like one: an invented id reads exactly
    // like a real one.
    const out = check(reading({ events: [ev({ facts: ['c1:f999'] })] }), ledger)
    expect(out).toHaveLength(1)
    expect(out[0]).toContain('c1:f999')
  })

  it('catches a bare element key, which joins to nothing', () => {
    const out = check(
      reading({ events: [ev({ facts: ['c1:f001'], bearsOn: ['no-thirty-minutes'] })] }),
      ledger
    )
    expect(out).toHaveLength(1)
    expect(out[0]).toContain('not a claim element')
  })

  it('catches an evidence link naming a pattern by description instead of id', () => {
    const out = check(
      reading({
        events: [
          ev({ id: 'e01', kind: 'pattern', event: 'never paid overtime', facts: ['c1:f001'] }),
          ev({ id: 'e02', kind: 'incident', facts: ['c1:f002'] }),
        ],
        evidenceLinks: [{ pattern: 'never paid overtime', incident: 'e02' }],
      }),
      ledger
    )
    expect(out).toHaveLength(1)
    expect(out[0]).toContain('not an event in this reading')
  })

  it('catches an evidence link whose two ends are the wrong kind round', () => {
    const out = check(
      reading({
        events: [
          ev({ id: 'e01', kind: 'incident', facts: ['c1:f001'] }),
          ev({ id: 'e02', kind: 'pattern', facts: ['c1:f002'] }),
        ],
        evidenceLinks: [{ pattern: 'e01', incident: 'e02' }],
      }),
      ledger
    )
    expect(out).toHaveLength(2)
    expect(out.join(' ')).toContain('but it is recorded as a')
  })

  it('catches a final paycheck dated before the job ended', () => {
    // On the first real ledger the client gave two separation dates sixteen
    // days apart. Whichever is right, the office needs to see it here and not
    // discover it after the final-pay claim is pleaded.
    const out = check(
      reading({
        events: [
          ev({ id: 'e01', facts: ['c1:f001'], sortKey: '2026-08-31', anchor: 'employment ended' }),
          ev({ id: 'e02', facts: ['c1:f002'], sortKey: '2026-08-15', anchor: 'final pay received' }),
        ],
      }),
      ledger
    )
    expect(out).toHaveLength(1)
    expect(out[0]).toContain('before employment ended')
  })

  it('catches an event dated before the client was hired', () => {
    const out = check(
      reading({
        events: [
          ev({ id: 'e01', facts: ['c1:f001'], sortKey: '2024-07-28', anchor: 'hired' }),
          ev({ id: 'e02', facts: ['c1:f002'], sortKey: '2024-01-01', anchor: 'first violation' }),
        ],
      }),
      ledger
    )
    expect(out).toHaveLength(1)
    expect(out[0]).toContain('before the hire date')
  })
})

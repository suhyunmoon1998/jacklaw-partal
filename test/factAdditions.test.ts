import { describe, it, expect } from 'vitest'
import { afterAdditions, checkSupersessions, nextFactNumber, unreadRows } from '@/lib/factAdditions'
import { standing, LedgerEntry } from '@/lib/factLedger'

const C = 'client-1'
const fact = (n: number, pinpoint: string, over: Partial<LedgerEntry> = {}): LedgerEntry => ({
  id: `${C}:f${String(n).padStart(3, '0')}`,
  proposition: `fact ${n}`, verbatim: '', provenance: { kind: 'portal answer', pinpoint, on: '' },
  period: '', actors: [], location: '', status: 'REPORTED', confidenceBasis: '', corroboration: [],
  contrary: '', legalTags: [], damagesTags: [], openLoop: '', addedBy: 'test',
  supersededBy: null, supersededWhy: null, ...over,
})

// DAYEON KIM's ledger was read from the intake alone; her follow-up set came after.
const ledger = [
  fact(12, 'employer_address — What is the employer\'s street address? intake questionnaire, section: The Employer', { status: 'UNKNOWN' }),
  fact(67, 'm2_owed_now — Do you think the employer still owes you unpaid wages?'),
  fact(204, 'q1_tip_days — How many days a week did you do the tip work?'),
]
const followUp = {
  title: 'Question set: A few more questions about your job',
  rows: [
    { id: 'q1_tip_days', label: 'How many days a week did you do the tip work?', answer: '1' },
    { id: 'q18_address', label: 'What is the street address of the restaurant where you worked?', answer: '1101 Vermont Ave #103, Los Angeles, CA 90006' },
    { id: 'q10_extra', label: 'Anything else?', answer: 'no' },
    { id: 'q19_owed_check', label: 'Which of these is closest to what you meant?', answer: '' },
  ],
}

describe('which answers the ledger has not read', () => {
  it('leaves out rows a fact already came from, and unanswered rows', () => {
    const unread = unreadRows(ledger, [followUp])
    expect(unread).toHaveLength(1)
    expect(unread[0].rows.map(r => r.id)).toEqual(['q18_address', 'q10_extra'])
  })

  it('matches a question id whole, so q1 being read does not mark q10 read', () => {
    const unread = unreadRows([fact(1, 'q1 — first')], [{ title: 's', rows: [{ id: 'q10', label: 'x', answer: 'y' }] }])
    expect(unread[0].rows.map(r => r.id)).toEqual(['q10'])
  })

  it('counts a question as read when the fact names it by its text instead', () => {
    const byText = [fact(5, 'What is the street address of the restaurant where you worked? (follow-up)')]
    expect(unreadRows(byText, [followUp])[0].rows.map(r => r.id)).not.toContain('q18_address')
  })

  it('counts a superseded fact as read — the answer was read, whatever replaced it', () => {
    const replaced = [fact(9, 'q18_address — street', { supersededBy: `${C}:f010`, supersededWhy: 'x' })]
    expect(unreadRows(replaced, [followUp])[0].rows.map(r => r.id)).not.toContain('q18_address')
  })
})

describe('numbering what is added', () => {
  it('continues after the highest id on file, gaps and all', () => {
    expect(nextFactNumber(ledger)).toBe(205)
    expect(nextFactNumber([])).toBe(1)
  })
})

describe('checking a proposed supersession', () => {
  const added = [fact(205, 'q18_address — street address'), fact(206, 'q19_owed_check — owed')]

  it('keeps one that points at a standing fact and a fact just added, with a reason', () => {
    const { kept, setAside } = checkSupersessions(
      [{ oldId: 'f012', newId: 'f205', why: 'She did not know the address; the follow-up gives it.' }],
      ledger, added, C
    )
    expect(setAside).toEqual([])
    expect(kept).toEqual([{ oldId: `${C}:f012`, newId: `${C}:f205`, why: 'She did not know the address; the follow-up gives it.' }])
  })

  it('sets aside ids that are not on file, not just added, or already replaced', () => {
    const withReplaced = [...ledger, fact(3, 'x', { supersededBy: `${C}:f012`, supersededWhy: 'y' })]
    const { kept, setAside } = checkSupersessions(
      [
        { oldId: 'f999', newId: 'f205', why: 'x' },
        { oldId: 'f012', newId: 'f067', why: 'an old fact cannot be the replacement' },
        { oldId: 'f003', newId: 'f205', why: 'already replaced' },
        { oldId: 'f067', newId: 'f206', why: '   ' },
      ],
      withReplaced, added, C
    )
    expect(kept).toEqual([])
    expect(setAside.map(s => s.why)).toEqual([
      'f999 is not a fact on file.',
      'f067 is not one of the facts just added.',
      'f003 was already replaced.',
      'No reason was given for replacing f067.',
    ])
  })

  it('replaces a fact once, keeping the first reason', () => {
    const { kept, setAside } = checkSupersessions(
      [
        { oldId: 'f067', newId: 'f206', why: 'first' },
        { oldId: `${C}:f067`, newId: 'f205', why: 'second' },
      ],
      ledger, added, C
    )
    expect(kept.map(k => k.why)).toEqual(['first'])
    expect(setAside).toHaveLength(1)
  })

  it('leaves the replaced fact in the record, marked, and the new one standing', () => {
    const kept = [{ oldId: `${C}:f012`, newId: `${C}:f205`, why: 'settled' }]
    const after = afterAdditions(ledger, added, kept)
    expect(after).toHaveLength(ledger.length + added.length)
    expect(after.find(e => e.id === `${C}:f012`)?.supersededBy).toBe(`${C}:f205`)
    expect(standing(after).map(e => e.id)).not.toContain(`${C}:f012`)
    expect(standing(after).map(e => e.id)).toContain(`${C}:f205`)
  })
})

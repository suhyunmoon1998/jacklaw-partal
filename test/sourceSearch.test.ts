import { describe, it, expect } from 'vitest'
import { AssignmentFound, recordSearch, searchTotals } from '@/lib/sourceSearch'
import { answersForReading } from '@/lib/modules'

/**
 * The four lists a search record keeps, and the line between them that matters
 * most: a source this reading does not read is not a source it could not open.
 */
const base = { ranAt: '2026-09-23T12:00:00Z', answers: {}, assignments: [], documents: [] }
const cat = (r: ReturnType<typeof recordSearch>, key: string) => r.categories.find(c => c.key === key)!

const set = (over: Partial<AssignmentFound> = {}): AssignmentFound => ({
  name: 'Wage & Hour follow-up',
  status: 'completed',
  detail: { questions: [{ id: 'q1' }, { id: 'q2' }], answers: { q1: 'Every day', q2: '' } },
  ...over,
})

describe('the questionnaire', () => {
  it('says there is none, rather than reporting every section unanswered', () => {
    const q = cat(recordSearch({ ...base, answers: null }), 'questionnaire')
    expect(q.missing).toEqual(['No questionnaire is on file for this client.'])
    expect(q.reviewed).toEqual([])
  })

  it('lists an unanswered section as missing, with how many questions it asked', () => {
    const q = cat(recordSearch(base), 'questionnaire')
    expect(q.reviewed).toEqual([])
    expect(q.missing.length).toBeGreaterThan(0)
    expect(q.missing[0]).toMatch(/none of its \d+ questions answered/)
  })

  it('counts a section as reviewed once anything in it is answered, as the extraction would', () => {
    const first = answersForReading({}).sections[0]
    const id = first.questions[0].id
    const q = cat(recordSearch({ ...base, answers: { [id]: 'Dayeon Kim' } }), 'questionnaire')
    expect(q.reviewed[0]).toMatchObject({ label: first.title, answered: 1 })
    expect(q.missing.some(m => m.startsWith(`${first.title}:`))).toBe(false)
  })
})

describe('assigned question sets', () => {
  it('reviews an answered set and says how much of it was answered', () => {
    const s = cat(recordSearch({ ...base, assignments: [set()] }), 'question sets')
    expect(s.reviewed).toEqual([{ label: 'Wage & Hour follow-up', answered: 1, asked: 2 }])
  })

  it('files a set not yet answered as missing, saying why', () => {
    const s = cat(
      recordSearch({ ...base, assignments: [set({ status: 'sent', detail: null })] }),
      'question sets'
    )
    expect(s.missing[0]).toMatch(/sent, and the client has not started it/)
    expect(s.inaccessible).toEqual([])
  })

  it('files a set that would not load as inaccessible — not as missing, and not skipped', () => {
    const s = cat(
      recordSearch({ ...base, assignments: [set({ detail: null, error: 'timeout' })] }),
      'question sets'
    )
    expect(s.inaccessible).toEqual([{ label: 'Wage & Hour follow-up', why: 'timeout' }])
    expect(s.missing).toEqual([])
  })

  it('files a failed list of sets as inaccessible', () => {
    const s = cat(recordSearch({ ...base, assignments: { error: 'permission denied' } }), 'question sets')
    expect(s.inaccessible[0].why).toBe('permission denied')
  })
})

describe('uploaded documents', () => {
  it('lists each one as on file and not read — never as reviewed, never as inaccessible', () => {
    const d = cat(
      recordSearch({ ...base, documents: [{ name: 'paystub-march.pdf', category: 'Pay records' }] }),
      'documents'
    )
    expect(d.reviewed).toEqual([])
    expect(d.inaccessible).toEqual([])
    expect(d.notRead[0].label).toBe('paystub-march.pdf (Pay records)')
    expect(d.notRead[0].why).toMatch(/not document contents/)
  })

  it('says when there are none', () => {
    expect(cat(recordSearch(base), 'documents').missing).toEqual([
      'The client has not uploaded any documents.',
    ])
  })

  it('files a failed document list as inaccessible', () => {
    const d = cat(recordSearch({ ...base, documents: { error: 'boom' } }), 'documents')
    expect(d.inaccessible).toEqual([{ label: 'The list of uploaded documents', why: 'boom' }])
  })
})

describe('totals', () => {
  it('adds across every source', () => {
    const t = searchTotals(
      recordSearch({
        ...base,
        answers: null,
        assignments: [set(), set({ name: 'Who’s Who', detail: null })],
        documents: [{ name: 'a.pdf', category: '' }],
      })
    )
    expect(t).toEqual({ reviewed: 1, missing: 1, notRead: 1, inaccessible: 1 })
  })
})

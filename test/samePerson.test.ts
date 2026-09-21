import { describe, it, expect } from 'vitest'
import { alsoOn } from '@/lib/samePerson'

const names: Record<string, string> = { f1: 'Chungdam La.inc', f2: 'Tour anglese. inc', f3: 'Guhara. inc' }
const nameOf = (id: string) => names[id] ?? ''

describe('telling one person on two cases from two people', () => {
  it('names the other case on both rows', () => {
    // The thing that was missing. Two rows showing the same name, case type
    // and phone read as a duplicate record — and one of them was a live case.
    const out = alsoOn(
      [
        { id: 'a', phone: '4243332514', caseFolderId: 'f1' },
        { id: 'b', phone: '(424) 333-2514', caseFolderId: 'f2' },
      ],
      nameOf
    )
    expect(out.get('a')).toEqual(['Tour anglese. inc'])
    expect(out.get('b')).toEqual(['Chungdam La.inc'])
  })

  it('says nothing about somebody on one case', () => {
    const out = alsoOn(
      [
        { id: 'a', phone: '4243332514', caseFolderId: 'f1' },
        { id: 'b', phone: '2135774446', caseFolderId: 'f2' },
      ],
      nameOf
    )
    expect(out.size).toBe(0)
  })

  it('does not treat two rows on the SAME case as two cases', () => {
    // A client entered twice on one matter is a real duplicate. Saying "also
    // on this same case" would be noise, and would hide the duplicate.
    const out = alsoOn(
      [
        { id: 'a', phone: '4243332514', caseFolderId: 'f1' },
        { id: 'b', phone: '4243332514', caseFolderId: 'f1' },
      ],
      nameOf
    )
    expect(out.size).toBe(0)
  })

  it('never matches on a missing or short phone number', () => {
    // An empty number is not evidence that two rows are one person, and
    // treating it as one would put two strangers on each other's cases.
    const out = alsoOn(
      [
        { id: 'a', phone: '', caseFolderId: 'f1' },
        { id: 'b', phone: '', caseFolderId: 'f2' },
        { id: 'c', phone: '123', caseFolderId: 'f1' },
        { id: 'd', phone: '123', caseFolderId: 'f2' },
      ],
      nameOf
    )
    expect(out.size).toBe(0)
  })

  it('lists every other case when there are more than two', () => {
    const out = alsoOn(
      [
        { id: 'a', phone: '4243332514', caseFolderId: 'f1' },
        { id: 'b', phone: '4243332514', caseFolderId: 'f2' },
        { id: 'c', phone: '4243332514', caseFolderId: 'f3' },
      ],
      nameOf
    )
    expect(out.get('a')?.sort()).toEqual(['Guhara. inc', 'Tour anglese. inc'])
  })

  it('tells an unassigned row which case the person is already on, and not the reverse', () => {
    // Useful one way: somebody sitting in Unassigned who is already on a case
    // is worth knowing about. Useless the other: "also on nothing" is noise.
    const out = alsoOn(
      [
        { id: 'onACase', phone: '4243332514', caseFolderId: 'f1' },
        { id: 'unassigned', phone: '4243332514', caseFolderId: null },
      ],
      nameOf
    )
    expect(out.get('unassigned')).toEqual(['Chungdam La.inc'])
    expect(out.has('onACase')).toBe(false)
  })
})

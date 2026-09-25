import { describe, it, expect } from 'vitest'
import {
  HOLDINGS,
  caseNames,
  caseRecord,
  citeCase,
  holdingsFor,
  isVerbatim,
  render,
} from '@/lib/authority/cases'
import { ALL_CLAIMS } from '@/lib/authority/claims'

describe('the opinions held in full', () => {
  it('holds the cases the wage-and-hour elements actually turn on', () => {
    const have = caseNames().map(c => c.key)
    for (const key of ['brinker', 'augustus', 'troester', 'ferra', 'donohue', 'naranjo', 'naranjo2']) {
      expect(have, `${key} is not on file`).toContain(key)
    }
  })

  it('has the real opinions, not summaries of them', () => {
    // Each of these is a phrase from the opinion itself. A file that has been
    // replaced by a headnote, a brief, or anything generated will not have them.
    expect(caseRecord('brinker')!.text).toMatch(/meal and rest periods/i)
    expect(caseRecord('augustus')!.text).toMatch(/rest period/i)
    expect(caseRecord('troester')!.text).toMatch(/de minimis/i)
    for (const { key } of caseNames()) {
      // A Court of Appeal opinion runs shorter than a Supreme Court one; either
      // way a headnote or a summary is a fraction of this.
      const floor = /Cal\.App\./.test(caseRecord(key)!.citation) ? 20000 : 40000
      expect(caseRecord(key)!.text.length, key).toBeGreaterThan(floor)
    }
  })

  it('says where each came from and how it is paginated', () => {
    for (const { key } of caseNames()) {
      const c = caseRecord(key)!
      expect(c.source, key).toMatch(/^https?:\/\/|Caselaw Access Project/)
      expect(c.fetchedOn, key).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(c.pagination.length, key).toBeGreaterThan(20)
      expect(c.citation, key).toMatch(/Cal\.\s?(App\.\s?)?(4th|5th)/)
    }
  })

  it('cites a case the way a brief does', () => {
    expect(citeCase('brinker')).toBe('Brinker Restaurant Corp. v. Superior Court (2012) 53 Cal.4th 1004')
    expect(citeCase('nothing-like-this')).toContain('unknown case')
  })
})

describe('the passages the office relies on', () => {
  it('quotes the opinion verbatim, every one of them', () => {
    // This is the guarantee the whole case-law layer rests on. A quotation that
    // drifted — a tidied ellipsis, a fixed typo, a remembered phrasing — is a
    // sentence the Supreme Court did not write, appearing in work product under
    // its name. Nothing downstream could tell. This test can.
    for (const h of HOLDINGS) {
      expect(isVerbatim(h), `${h.id}: this quote is not in ${h.case}:\n  ${h.quote}`).toBe(true)
    }
  })

  it('names a case that is actually on file', () => {
    const have = new Set(caseNames().map(c => c.key))
    for (const h of HOLDINGS) {
      expect(have.has(h.case), `${h.id} cites ${h.case}, which is not on file`).toBe(true)
    }
  })

  it('claims no reporter page, because no stored text carries one', () => {
    // Every pinpoint here is a slip-opinion page, marked in the text and
    // checkable. A reporter page would have to come from memory, and a citation
    // that looks right and is not is worse than one that is absent.
    for (const h of HOLDINGS) {
      expect(h.pinpoint, `${h.id}`).not.toMatch(/Cal\.\s?(4th|5th)/)
      if (h.case === 'brinker') expect(h.pinpoint, 'Brinker has no page markers at all').toBe('')
      else if (h.pinpoint) expect(h.pinpoint, `${h.id}`).toMatch(/^slip op\. p\. \d+$/)
    }
  })

  it('quotes a passage, not a page', () => {
    // A quote cut between two phrases once ran on for 7,445 characters — the
    // start matched the court's holding, the end matched the trial court's,
    // and everything between rode along. A holding is a few sentences.
    for (const h of HOLDINGS) expect(h.quote.length, `${h.id} quotes ${h.quote.length} characters`).toBeLessThan(900)
  })

  it('writes down the edge of every holding', () => {
    // The corpus's rule, made structural: a holding recorded without what it
    // leaves open is how a case gets read past its holding in a brief.
    for (const h of HOLDINGS) {
      expect(h.limits.length, `${h.id} states no limits`).toBeGreaterThan(30)
      expect(h.appliedTo.length, `${h.id} says nothing about what it means here`).toBeGreaterThan(30)
      expect(h.proposition.length, `${h.id}`).toBeGreaterThan(20)
    }
  })

  it('distinguishes a holding from a concurrence', () => {
    for (const h of HOLDINGS) {
      expect(['majority', 'concurrence', 'dissent'], `${h.id}`).toContain(h.opinionPart)
    }
  })

  it('has unique ids, because everything else joins on them', () => {
    const ids = HOLDINGS.map(h => h.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('leads with the court’s words and labels the office’s', () => {
    if (!HOLDINGS.length) return
    const out = render(HOLDINGS[0])
    expect(out).toContain(HOLDINGS[0].quote)
    expect(out).toContain('WHAT IT DOES NOT DECIDE')
    expect(out).toContain('THE OFFICE READS THIS AS')
  })

  it('catches a quotation that is not in the opinion', () => {
    // The test above is only worth having if this one passes.
    expect(
      isVerbatim({
        id: 'invented',
        case: 'brinker',
        proposition: 'x',
        quote: 'An employer must ensure that no work whatsoever is performed during a meal period.',
        pinpoint: '',
        opinionPart: 'majority',
        bearsOn: [],
        limits: 'x',
        appliedTo: 'x',
      })
    ).toBe(false)
  })

  it('attaches every holding to a claim or element that exists', () => {
    // The matrix finds a holding by the key it bears on. A typo here —
    // 'feha-retaliation:adverse-actions' — would leave the holding on file and
    // never in front of the model, and nothing else would notice.
    const real = new Set(ALL_CLAIMS.flatMap(c => [c.id, ...c.elements.map(e => `${c.id}:${e.key}`)]))
    for (const h of HOLDINGS) {
      expect(h.bearsOn.length, `${h.id} bears on nothing`).toBeGreaterThan(0)
      for (const key of h.bearsOn) expect(real.has(key), `${h.id} -> ${key} is not a claim or element`).toBe(true)
    }
  })

  it('finds the holdings that bear on an element', () => {
    for (const h of HOLDINGS) {
      for (const key of h.bearsOn) {
        expect(holdingsFor(key), `${h.id} -> ${key}`).toContain(h)
      }
    }
  })
})

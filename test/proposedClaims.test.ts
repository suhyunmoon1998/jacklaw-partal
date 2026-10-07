import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { section, parseKey } from '@/lib/authority'
import { ALL_CLAIMS } from '@/lib/authority/claims'
import { PROPOSED_CLAIMS } from '@/lib/authority/proposedClaims'
import { claimsFor } from '@/lib/caseReading'

/**
 * Claims proposed for an attorney's review (lib/authority/proposedClaims.ts).
 * What is tested is that they are copied, not written — every element is the
 * instruction's own wording and every quotation is in the text it names — and
 * that none of them reaches a reading before it is approved.
 */
const flat = (s: string) => s.replace(/\s+/g, ' ').trim()
const text = (key: string) => {
  const { law, num } = parseKey(key)
  return section(law, num)
}
const quotes = (s: string) => Array.from(s.matchAll(/"([^"]{20,})"/g)).map(m => m[1])

describe('a proposed claim is copied from the instruction, not written', () => {
  for (const proposal of PROPOSED_CLAIMS) {
    it(`${proposal.claim.id}: every element is ${proposal.transcribedFrom}'s own wording`, () => {
      const source = text(proposal.transcribedFrom)
      expect(source, `${proposal.transcribedFrom} is on file`).toBeTruthy()
      for (const element of proposal.claim.elements) {
        expect(flat(source!).includes(flat(element.says)), `${element.key}: "${element.says}"`).toBe(true)
      }
    })
  }

  it('reads every element and section from a provision on file, or from the Wage Order an attorney settles', () => {
    for (const { claim } of PROPOSED_CLAIMS) {
      for (const ref of [...claim.sections, ...claim.elements.map(e => e.from)]) {
        if (ref.includes('{order}')) continue
        expect(text(ref), `${claim.id}: ${ref}`).toBeTruthy()
      }
      expect(text(`CACI ${claim.caci}`), `${claim.id}: CACI ${claim.caci}`).toBeTruthy()
    }
  })

  it('quotes a remedy or a note only from the text it names', () => {
    for (const { claim, forTheAttorney, transcribedFrom } of PROPOSED_CLAIMS) {
      const named = claim.remedy.match(/^((?:LAB|CACI) [\d.A-Z]+),/)?.[1]
      for (const q of quotes(claim.remedy)) {
        expect(named, `${claim.id}: a quoted remedy names its source`).toBeTruthy()
        expect(flat(text(named!)!).includes(flat(q)), `${claim.id} remedy: "${q}"`).toBe(true)
      }
      for (const q of quotes(forTheAttorney)) {
        expect(flat(text(transcribedFrom)!).includes(flat(q)), `${claim.id} note: "${q}"`).toBe(true)
      }
      for (const cited of claim.expectedDefense.match(/CACI \d{4}[A-Z]?/g) ?? []) {
        expect(text(cited), `${claim.id}: ${cited}`).toBeTruthy()
      }
    }
  })
})

describe('nothing proposed reaches a reading before an attorney approves it', () => {
  it('takes no id an active claim has', () => {
    const active = new Set(ALL_CLAIMS.map(c => c.id))
    for (const { claim } of PROPOSED_CLAIMS) expect(active.has(claim.id), claim.id).toBe(false)
  })

  it('is in no reading stage', () => {
    const read = new Set((['claims 1', 'claims 2', 'claims 3'] as const).flatMap(s => claimsFor(s).map(c => c.id)))
    for (const { claim } of PROPOSED_CLAIMS) expect(read.has(claim.id), claim.id).toBe(false)
  })

  it('is imported by nothing that reads, sends or shows', () => {
    const sources = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap(d =>
        d.isDirectory() ? sources(join(dir, d.name)) : /\.(ts|tsx)$/.test(d.name) ? [join(dir, d.name)] : []
      )
    const importers = [...sources('lib'), ...sources('app'), ...sources('components')].filter(
      f => !f.endsWith('proposedClaims.ts') && /proposedClaims/.test(readFileSync(f, 'utf8'))
    )
    expect(importers).toEqual([])
  })
})

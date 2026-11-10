import { describe, expect, it } from 'vitest'
import { isAllowedOpinionSource, quoteIsIn, validateHolding, validateOpinion } from '@/lib/authority/fetchedOpinions'
import { buildAuthorityPack } from '@/lib/authorityPack'
import type { HoldingWithOpinion } from '@/lib/authority/fetchedOpinionStore'
import type { StoredReading } from '@/lib/caseReadingShape'

// A synthetic opinion: public-law shape, invented text.
const text =
  'Opinion of the court. '.repeat(20) +
  'A client employer shares with a labor contractor all civil legal responsibility for the payment of wages to workers it supplies. ' +
  'Further discussion follows. '.repeat(10)

const opinion = {
  key: 'synthetic-v-example',
  kind: 'court opinion',
  name: 'Synthetic v. Example',
  citation: '(2099) 1 Cal.App.6th 1',
  court: 'Court of Appeal',
  sourceUrl: 'https://www.courts.ca.gov/opinions/archive/B000000.PDF',
  text,
}
const holding = {
  id: 'synthetic-shared-liability',
  opinionKey: 'synthetic-v-example',
  proposition: 'A client employer shares liability for unpaid wages of supplied workers.',
  quote: 'A client employer shares with a labor contractor   all civil legal responsibility',
  opinionPart: 'majority',
  bearsOn: ['client-employer:wages-unpaid'],
  limits: 'Does not decide whether the contractor was itself excluded.',
  proposedBy: 'Eleanor',
}

describe('an opinion Eleanor fetched', () => {
  it('is held only from the closed list of sources, over https', () => {
    expect(isAllowedOpinionSource('https://www.courts.ca.gov/x.pdf')).toBe(true)
    expect(isAllowedOpinionSource('https://www.dir.ca.gov/dlse/precedent.pdf')).toBe(true)
    expect(isAllowedOpinionSource('http://www.courts.ca.gov/x.pdf')).toBe(false)
    expect(isAllowedOpinionSource('https://courts.ca.gov.evil.example/x.pdf')).toBe(false)
    expect(isAllowedOpinionSource('https://casetext.com/case/x')).toBe(false)
    expect(validateOpinion({ ...opinion, sourceUrl: 'https://example.com/x' })).toEqual({ ok: false, reason: 'SourceNotAllowed' })
  })

  it('is refused with a bad key, kind or a text too short to be an opinion', () => {
    expect(validateOpinion({ ...opinion, key: 'Bad Key!' })).toEqual({ ok: false, reason: 'InvalidKey' })
    expect(validateOpinion({ ...opinion, kind: 'blog' })).toEqual({ ok: false, reason: 'InvalidKind' })
    expect(validateOpinion({ ...opinion, text: 'too short' })).toEqual({ ok: false, reason: 'TextTooShort' })
    expect(validateOpinion(opinion).ok).toBe(true)
  })
})

describe('a holding proposed from it', () => {
  it('is accepted when its quote is in the text, whitespace aside', () => {
    expect(quoteIsIn(text, holding.quote)).toBe(true)
    expect(validateHolding(holding, text).ok).toBe(true)
  })

  it('is refused when the quote drifted from the text', () => {
    const drifted = { ...holding, quote: 'A client employer shares with a labor contractor civil responsibility' }
    expect(validateHolding(drifted, text)).toEqual({ ok: false, reason: 'QuoteNotInOpinion' })
  })

  it('is refused when it names an element the claim library does not hold', () => {
    const r = validateHolding({ ...holding, bearsOn: ['client-employer:made-up'] }, text)
    expect(r).toEqual({ ok: false, reason: 'UnknownElement', detail: 'client-employer:made-up' })
  })
})

describe('approved fetched holdings in a case pack', () => {
  const reading: StoredReading = { wageOrder: { confirmed: false }, claims1: [], claims2: [], claims3: [] }
  const approved = (over: Partial<HoldingWithOpinion> = {}, kind: 'court opinion' | 'agency precedent' = 'court opinion'): HoldingWithOpinion => ({
    ...holding,
    opinionPart: 'majority',
    pinpoint: '',
    appliedTo: '',
    adverse: false,
    status: 'Approved',
    decidedBy: 'Jack',
    opinion: { ...opinion, kind, docket: '', decided: '', sourceUrl: opinion.sourceUrl, fetchedOn: '2026-11-09', sha256: 'x'.repeat(64), text },
    ...over,
  } as HoldingWithOpinion)
  const claim = (approvedList: HoldingWithOpinion[]) =>
    buildAuthorityPack(reading, '2026-11-09', ['client-employer'], approvedList).claims.find(c => c.claimId === 'client-employer')!

  it('joins the claim it bears on, labelled as fetched and approved, quote checked again', () => {
    const c = claim([approved()])
    const h = c.holdings.find(x => x.id === holding.id)!
    expect(h.verbatim).toBe(true)
    expect(h.origin).toMatch(/Fetched by Eleanor .* approved by Jack/)
    expect(h.sourceUrl).toBe(opinion.sourceUrl)
  })

  it('keeps contrary authority apart from what supports the claim', () => {
    const c = claim([approved({ adverse: true })])
    expect(c.holdings.some(x => x.id === holding.id)).toBe(false)
    expect(c.adverse.holdings.map(x => x.id)).toEqual([holding.id])
    expect(c.adverse.note).toMatch(/Contrary authority held below/)
  })

  it('says a DLSE precedent is an agency precedent, not a court decision', () => {
    const c = claim([approved({}, 'agency precedent')])
    expect(c.holdings.find(x => x.id === holding.id)!.kind).toBe('agency precedent')
    expect(c.gaps.some(g => /agency's precedent, not a court's decision/.test(g))).toBe(true)
  })

  it('flags a holding whose quote is no longer in the stored text', () => {
    const c = claim([approved({ quote: 'words the opinion never used anywhere at all' })])
    expect(c.holdings.find(x => x.id === holding.id)!.verbatim).toBe(false)
    expect(c.gaps.some(g => /not in the opinion held/.test(g))).toBe(true)
  })
})

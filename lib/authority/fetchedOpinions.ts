/**
 * Opinions and DLSE precedential decisions Eleanor fetches, and the holdings
 * proposed from them (supabase/migrations/0029_authority_opinions.sql).
 *
 * The same guarantee as lib/authority/cases.ts, enforced when a holding is
 * proposed instead of when the build runs: the quotation must appear in the
 * stored text word for word, whitespace aside. A holding that drifted — a tidied
 * ellipsis, a remembered phrasing — is refused, not stored. And a stored holding
 * reaches a case's Authority Pack only after an attorney approves it.
 *
 * Where the text may come from is closed: the courts' own site, the Caselaw
 * Access Project, CourtListener, and the Department of Industrial Relations for
 * DLSE precedents. A DLSE precedential decision is an agency's precedent, not a
 * court's decision, and is labelled so wherever it shows.
 */

import { createHash } from 'crypto'
import { ALL_CLAIMS } from '@/lib/authority/claims'

export type OpinionKind = 'court opinion' | 'agency precedent'

export const OPINION_SOURCES = ['courts.ca.gov', 'static.case.law', 'courtlistener.com', 'dir.ca.gov'] as const

export interface OpinionInput {
  key: string
  kind: OpinionKind
  name: string
  citation: string
  court: string
  docket?: string
  decided?: string
  sourceUrl: string
  text: string
  fetchedBy?: string
}

export interface StoredOpinion extends Required<Omit<OpinionInput, 'fetchedBy'>> {
  fetchedOn: string
  sha256: string
  fetchedBy: string
}

export interface HoldingInput {
  id: string
  opinionKey: string
  proposition: string
  quote: string
  pinpoint?: string
  opinionPart: 'majority' | 'concurrence' | 'dissent'
  bearsOn: string[]
  limits: string
  appliedTo?: string
  adverse?: boolean
  proposedBy: string
}

export interface StoredHolding extends Required<Omit<HoldingInput, 'proposedBy'>> {
  status: 'Proposed' | 'Approved' | 'Rejected'
  proposedBy: string
  decidedBy: string | null
}

export const sha256Of = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex')

/** https, and a host in the closed list (or a subdomain of one). */
export function isAllowedOpinionSource(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return false
    const host = u.hostname.toLowerCase()
    return OPINION_SOURCES.some(allowed => host === allowed || host.endsWith(`.${allowed}`))
  } catch {
    return false
  }
}

/** The same test as isVerbatim in cases.ts: whitespace is the only thing allowed to differ. */
export function quoteIsIn(text: string, quote: string): boolean {
  const flat = (s: string) => s.replace(/\s+/g, ' ').trim()
  const q = flat(quote)
  return q.length > 0 && flat(text).includes(q)
}

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export type OpinionRefusal = 'InvalidKey' | 'InvalidKind' | 'MissingField' | 'SourceNotAllowed' | 'TextTooShort'

export function validateOpinion(raw: unknown): { ok: true; opinion: OpinionInput } | { ok: false; reason: OpinionRefusal } {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const key = clean(r.key, 61).toLowerCase()
  if (!/^[a-z0-9][a-z0-9-]{1,60}$/.test(key)) return { ok: false, reason: 'InvalidKey' }
  if (r.kind !== 'court opinion' && r.kind !== 'agency precedent') return { ok: false, reason: 'InvalidKind' }
  const name = clean(r.name, 300)
  const citation = clean(r.citation, 200)
  const court = clean(r.court, 200)
  const sourceUrl = clean(r.sourceUrl, 600)
  if (!name || !citation || !court || !sourceUrl) return { ok: false, reason: 'MissingField' }
  if (!isAllowedOpinionSource(sourceUrl)) return { ok: false, reason: 'SourceNotAllowed' }
  const text = typeof r.text === 'string' ? r.text : ''
  if (text.trim().length <= 500) return { ok: false, reason: 'TextTooShort' }
  return {
    ok: true,
    opinion: {
      key, kind: r.kind, name, citation, court, sourceUrl, text,
      docket: clean(r.docket, 100), decided: clean(r.decided, 40), fetchedBy: clean(r.fetchedBy, 80) || 'Eleanor',
    },
  }
}

/** Every 'claim-id:element-key' the library knows. */
const ELEMENT_KEYS = new Set(ALL_CLAIMS.flatMap(c => c.elements.map(e => `${c.id}:${e.key}`)))

export type HoldingRefusal = 'InvalidId' | 'MissingField' | 'InvalidOpinionPart' | 'UnknownElement' | 'QuoteNotInOpinion'

export function validateHolding(
  raw: unknown,
  opinionText: string
): { ok: true; holding: HoldingInput } | { ok: false; reason: HoldingRefusal; detail?: string } {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const id = clean(r.id, 81).toLowerCase()
  if (!/^[a-z0-9][a-z0-9-]{2,80}$/.test(id)) return { ok: false, reason: 'InvalidId' }
  const opinionKey = clean(r.opinionKey, 61).toLowerCase()
  const proposition = clean(r.proposition, 1000)
  const quote = typeof r.quote === 'string' ? r.quote.trim() : ''
  const limits = clean(r.limits, 2000)
  const proposedBy = clean(r.proposedBy, 80)
  if (!opinionKey || !proposition || quote.length < 20 || quote.length > 2000 || !limits || !proposedBy) {
    return { ok: false, reason: 'MissingField' }
  }
  const opinionPart = r.opinionPart
  if (opinionPart !== 'majority' && opinionPart !== 'concurrence' && opinionPart !== 'dissent') {
    return { ok: false, reason: 'InvalidOpinionPart' }
  }
  const bearsOn = Array.isArray(r.bearsOn) ? r.bearsOn.map(b => clean(b, 120)).filter(Boolean) : []
  const unknown = bearsOn.filter(b => !ELEMENT_KEYS.has(b))
  if (!bearsOn.length || unknown.length) return { ok: false, reason: 'UnknownElement', detail: unknown.join(', ') }
  if (!quoteIsIn(opinionText, quote)) return { ok: false, reason: 'QuoteNotInOpinion' }
  return {
    ok: true,
    holding: {
      id, opinionKey, proposition, quote, opinionPart, bearsOn, limits, proposedBy,
      pinpoint: clean(r.pinpoint, 60), appliedTo: clean(r.appliedTo, 2000), adverse: r.adverse === true,
    },
  }
}

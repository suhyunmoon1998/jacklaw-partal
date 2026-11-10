/**
 * The database side of lib/authority/fetchedOpinions.ts. Public law only.
 *
 * An opinion is kept once per key: the same text again is a no-op; different
 * text under a key already held is refused, so a stored text never changes
 * under a holding quoted from it. A holding is checked against the stored text
 * before it is written, and is decided only by an attorney.
 */

import { getSupabase } from '@/lib/supabase'
import {
  sha256Of,
  validateHolding,
  validateOpinion,
  type HoldingRefusal,
  type OpinionKind,
  type OpinionRefusal,
  type StoredHolding,
} from '@/lib/authority/fetchedOpinions'

/** The office's calendar day, as the pack counts it. */
const officeToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

export type SaveOpinionResult =
  | { ok: true; key: string; sha256: string; created: boolean }
  | { ok: false; reason: OpinionRefusal | 'KeyHeldWithOtherText' | 'StoreFailed' }

export async function saveOpinion(raw: unknown): Promise<SaveOpinionResult> {
  const checked = validateOpinion(raw)
  if (!checked.ok) return checked
  const o = checked.opinion
  const sha256 = sha256Of(o.text)
  const db = getSupabase()
  const { data: held, error: readError } = await db.from('authority_opinions').select('sha256').eq('key', o.key).maybeSingle()
  if (readError) return { ok: false, reason: 'StoreFailed' }
  if (held) return held.sha256 === sha256 ? { ok: true, key: o.key, sha256, created: false } : { ok: false, reason: 'KeyHeldWithOtherText' }
  const { error } = await db.from('authority_opinions').insert({
    key: o.key, kind: o.kind, name: o.name, citation: o.citation, court: o.court, docket: o.docket ?? '',
    decided: o.decided ?? '', source_url: o.sourceUrl, fetched_on: officeToday(), sha256, text: o.text,
    fetched_by: o.fetchedBy ?? 'Eleanor',
  })
  return error ? { ok: false, reason: 'StoreFailed' } : { ok: true, key: o.key, sha256, created: true }
}

export interface OpinionSummary {
  key: string
  kind: OpinionKind
  name: string
  citation: string
  court: string
  decided: string
  sourceUrl: string
  fetchedOn: string
  sha256: string
}

export async function listOpinions(): Promise<OpinionSummary[]> {
  const { data, error } = await getSupabase()
    .from('authority_opinions')
    .select('key, kind, name, citation, court, decided, source_url, fetched_on, sha256')
    .order('key')
  if (error) throw new Error(`Could not list the opinions: ${error.message}`)
  return (data ?? []).map(r => ({
    key: r.key, kind: r.kind, name: r.name, citation: r.citation, court: r.court, decided: r.decided,
    sourceUrl: r.source_url, fetchedOn: String(r.fetched_on), sha256: r.sha256,
  }))
}

export type ProposeHoldingResult =
  | { ok: true; id: string }
  | { ok: false; reason: HoldingRefusal | 'OpinionNotHeld' | 'IdTaken' | 'StoreFailed'; detail?: string }

export async function proposeHolding(raw: unknown): Promise<ProposeHoldingResult> {
  const opinionKey = String((raw as { opinionKey?: unknown } | null)?.opinionKey ?? '').trim().toLowerCase()
  const db = getSupabase()
  const { data: opinion } = await db.from('authority_opinions').select('text').eq('key', opinionKey).maybeSingle()
  if (!opinion) return { ok: false, reason: 'OpinionNotHeld' }
  const checked = validateHolding(raw, String(opinion.text))
  if (!checked.ok) return checked
  const h = checked.holding
  const { data: taken } = await db.from('authority_holdings').select('id').eq('id', h.id).maybeSingle()
  if (taken) return { ok: false, reason: 'IdTaken' }
  const { error } = await db.from('authority_holdings').insert({
    id: h.id, opinion_key: h.opinionKey, proposition: h.proposition, quote: h.quote, pinpoint: h.pinpoint ?? '',
    opinion_part: h.opinionPart, bears_on: h.bearsOn, limits: h.limits, applied_to: h.appliedTo ?? '',
    adverse: h.adverse === true, status: 'Proposed', proposed_by: h.proposedBy,
  })
  return error ? { ok: false, reason: 'StoreFailed' } : { ok: true, id: h.id }
}

/** An attorney's decision; nothing else approves a holding. */
export async function decideHolding(id: string, decision: 'Approved' | 'Rejected', decidedBy: string) {
  const { data, error } = await getSupabase()
    .from('authority_holdings')
    .update({ status: decision, decided_by: decidedBy, decided_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'Proposed')
    .select('id')
  if (error) return { ok: false as const, reason: 'StoreFailed' as const }
  return data?.length ? { ok: true as const } : { ok: false as const, reason: 'NotProposed' as const }
}

export interface HoldingWithOpinion extends StoredHolding {
  opinion: OpinionSummary & { text: string }
}

/** Holdings in one status, each with the opinion it quotes (its text, so the quote is checked again where used). */
export async function holdingsWithStatus(status: StoredHolding['status']): Promise<HoldingWithOpinion[]> {
  const { data, error } = await getSupabase()
    .from('authority_holdings')
    .select('*, authority_opinions(*)')
    .eq('status', status)
    .order('created_at')
  if (error) throw new Error(`Could not read the holdings: ${error.message}`)
  return (data ?? []).map(r => {
    const o = r.authority_opinions
    return {
      id: r.id, opinionKey: r.opinion_key, proposition: r.proposition, quote: r.quote, pinpoint: r.pinpoint,
      opinionPart: r.opinion_part, bearsOn: r.bears_on, limits: r.limits, appliedTo: r.applied_to, adverse: r.adverse,
      status: r.status, proposedBy: r.proposed_by, decidedBy: r.decided_by,
      opinion: {
        key: o.key, kind: o.kind, name: o.name, citation: o.citation, court: o.court, decided: o.decided,
        sourceUrl: o.source_url, fetchedOn: String(o.fetched_on), sha256: o.sha256, text: o.text,
      },
    }
  })
}

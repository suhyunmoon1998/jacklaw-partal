/**
 * Reading and writing the fact ledger.
 *
 * The one rule that shapes this file: a fact is never updated in place. A
 * re-extraction does not overwrite what is there — it is reconciled against it,
 * and anything replaced is marked superseded with the reason and left on the
 * table. That is what makes "what did we believe, and when" answerable, and it
 * is why the corpus insists on it.
 */

import { getSupabase } from '@/lib/supabase'
import { LedgerEntry } from '@/lib/factLedger'

interface Row {
  id: string
  proposition: string
  verbatim: string
  source_kind: string
  source_pin: string
  source_on: string
  period: string
  actors: string[]
  location: string
  status: string
  confidence: string
  corroboration: string[]
  contrary: string
  legal_tags: string[]
  damages_tags: string[]
  open_loop: string
  added_by: string
  superseded_by: string | null
  superseded_why: string | null
}

const toEntry = (r: Row): LedgerEntry => ({
  id: r.id,
  proposition: r.proposition,
  verbatim: r.verbatim,
  provenance: { kind: r.source_kind, pinpoint: r.source_pin, on: r.source_on },
  period: r.period,
  actors: r.actors ?? [],
  location: r.location,
  status: r.status as LedgerEntry['status'],
  confidenceBasis: r.confidence as LedgerEntry['confidenceBasis'],
  corroboration: r.corroboration ?? [],
  contrary: r.contrary,
  legalTags: r.legal_tags ?? [],
  damagesTags: r.damages_tags ?? [],
  openLoop: r.open_loop,
  addedBy: r.added_by,
  supersededBy: r.superseded_by,
  supersededWhy: r.superseded_why,
})

const toRow = (clientId: string, e: LedgerEntry) => ({
  id: e.id,
  client_id: clientId,
  proposition: e.proposition,
  verbatim: e.verbatim,
  source_kind: e.provenance.kind,
  source_pin: e.provenance.pinpoint,
  source_on: e.provenance.on,
  period: e.period,
  actors: e.actors,
  location: e.location,
  status: e.status,
  confidence: e.confidenceBasis,
  corroboration: e.corroboration,
  contrary: e.contrary,
  legal_tags: e.legalTags,
  damages_tags: e.damagesTags,
  open_loop: e.openLoop,
  added_by: e.addedBy,
  superseded_by: e.supersededBy,
  superseded_why: e.supersededWhy,
})

/** Everything on file for a client, superseded rows included. */
export async function readLedger(clientId: string): Promise<LedgerEntry[]> {
  const { data, error } = await getSupabase()
    .from('case_facts')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(`Could not read the fact ledger: ${error.message}`)
  return (data ?? []).map(r => toEntry(r as Row))
}

/**
 * Adds facts, leaving what is there alone.
 *
 * Deliberately an insert and not an upsert. An id that already exists means the
 * caller is re-running an extraction over a ledger that already holds it, and
 * quietly rewriting those rows would be exactly the silent overwrite the ledger
 * exists to prevent — so it fails and the caller reconciles instead.
 */
export async function addFacts(clientId: string, entries: LedgerEntry[]): Promise<number> {
  if (!entries.length) return 0
  const { error } = await getSupabase()
    .from('case_facts')
    .insert(entries.map(e => toRow(clientId, e)))
  if (error) throw new Error(`Could not store facts: ${error.message}`)
  return entries.length
}

/**
 * Marks a fact replaced by a later one.
 *
 * The old row stays. Both ids must already be in the ledger, so a supersession
 * cannot point at nothing — a dangling pointer here would read as "this was
 * corrected" with no way to see what by.
 */
export async function supersede(
  oldId: string,
  newId: string,
  why: string
): Promise<void> {
  const { error } = await getSupabase()
    .from('case_facts')
    .update({ superseded_by: newId, superseded_why: why })
    .eq('id', oldId)
  if (error) throw new Error(`Could not record the supersession: ${error.message}`)
}

/** Wipes a client's ledger. Only for re-extracting from scratch, on purpose. */
export async function clearLedger(clientId: string): Promise<void> {
  const { error } = await getSupabase().from('case_facts').delete().eq('client_id', clientId)
  if (error) throw new Error(`Could not clear the ledger: ${error.message}`)
}

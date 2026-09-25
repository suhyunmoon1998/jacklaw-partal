/**
 * Where drafts are kept.
 *
 * Unlike a snapshot, a draft that could not be stored is not swallowed: it ran,
 * it was paid for, and a success reported over a lost draft is the failure this
 * project has already paid for once with a whole reading.
 */

import { getSupabase } from '@/lib/supabase'
import { DraftKind, StoredDraft } from '@/lib/briefDraftShape'
import { Spend } from '@/lib/spend'

export async function keepDraft(clientId: string, draft: StoredDraft, spent: Spend): Promise<void> {
  const { error } = await getSupabase().from('brief_drafts').insert({
    client_id: clientId,
    draft,
    basis: draft.basis,
    model: draft.model,
    spent,
  })
  if (error) throw new Error(`The draft was written but could not be stored: ${error.message}`)
}

/**
 * Whether drafts can be kept at all, asked BEFORE paying for one.
 *
 * A missing or unreadable table used to surface only after both model calls
 * had run — and every retry paid again and lost again.
 */
export async function canKeepDrafts(): Promise<string | null> {
  const { error } = await getSupabase().from('brief_drafts').select('id').limit(1)
  return error ? `Drafts cannot be stored right now (${error.message}), so none was written.` : null
}

/**
 * The newest draft of each kind. Throws when the table cannot be read, so the
 * sheet can say so rather than showing "no draft" over one that exists.
 */
export async function lastDrafts(clientId: string): Promise<Record<DraftKind, StoredDraft | null>> {
  const { data, error } = await getSupabase()
    .from('brief_drafts')
    .select('draft')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw new Error(`Could not read the drafts: ${error.message}`)
  const rows = (data ?? []).map(r => r.draft as StoredDraft)
  // Drafts written before kinds existed carried all four sections; they read as trial.
  const kindOf = (d: StoredDraft): DraftKind => d.kind ?? 'trial'
  return {
    trial: rows.find(d => kindOf(d) === 'trial') ?? null,
    factual: rows.find(d => kindOf(d) === 'factual') ?? null,
  }
}

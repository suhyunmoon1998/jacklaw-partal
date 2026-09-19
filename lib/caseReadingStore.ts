/**
 * Where a case reading lives between stages.
 *
 * One row per client, written into stage by stage. The store is small and the
 * care is in two places.
 *
 * A STAGE MERGES, IT DOES NOT REPLACE. Four requests write into one row, and
 * the last one must not erase the first three. So a stage sends what it added
 * and this merges it — which also means two stages that somehow overlap leave
 * both results rather than a race.
 *
 * A READING THAT NO LONGER MATCHES THE LEDGER IS STILL RETURNED. It comes back
 * marked stale. An empty panel tells the office nothing; an old reading shown
 * as current is worse than nothing; an old reading labelled old is what a case
 * file actually needs — the findings are still true of the facts they were
 * read against, and the office can decide whether that matters.
 */

import { getSupabase } from '@/lib/supabase'
import { StoredReading } from '@/lib/caseReadingShape'

export interface ReadingRow {
  reading: StoredReading
  fingerprint: string
  /** True when the ledger has moved since this was read. */
  stale: boolean
  updatedAt: string
}

/** What is on file, or null. `against` is the ledger's fingerprint right now. */
export async function readReading(clientId: string, against: string): Promise<ReadingRow | null> {
  const { data, error } = await getSupabase()
    .from('case_readings')
    .select('fingerprint, result, updated_at')
    .eq('client_id', clientId)
    .maybeSingle()
  if (error) throw new Error(`Could not read the case reading: ${error.message}`)
  if (!data) return null
  return {
    reading: (data.result ?? {}) as StoredReading,
    fingerprint: data.fingerprint,
    stale: data.fingerprint !== against,
    updatedAt: data.updated_at,
  }
}

/**
 * Merges one stage's result into what is on file.
 *
 * A fingerprint that differs from the stored one starts the reading over: the
 * facts have moved, and stages read against different ledgers must not be
 * stitched into one reading that is true of neither.
 */
export async function saveStage(
  clientId: string,
  fingerprint: string,
  patch: StoredReading
): Promise<StoredReading> {
  const existing = await readReading(clientId, fingerprint)
  const base = existing && !existing.stale ? existing.reading : {}
  const merged: StoredReading = { ...base, ...patch, took: { ...(base.took ?? {}), ...(patch.took ?? {}) } }

  const { error } = await getSupabase()
    .from('case_readings')
    .upsert(
      {
        client_id: clientId,
        fingerprint,
        result: merged,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'client_id' }
    )
  if (error) throw new Error(`Could not store the reading: ${error.message}`)
  return merged
}

/** Throws the reading away, so the next run starts from nothing. */
export async function clearReading(clientId: string): Promise<void> {
  const { error } = await getSupabase().from('case_readings').delete().eq('client_id', clientId)
  if (error) throw new Error(`Could not clear the reading: ${error.message}`)
}

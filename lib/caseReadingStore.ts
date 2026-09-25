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
import { Stage, StoredReading, staleStages } from '@/lib/caseReadingShape'

export interface ReadingRow {
  reading: StoredReading
  fingerprint: string
  /**
   * True when the FACTS have moved since this was read.
   *
   * Different from a stale stage. A fact added or superseded makes every stage
   * stale, because every stage read a ledger that no longer exists. A model
   * moved for one stage makes only that stage stale — see `staleStages`.
   */
  stale: boolean
  /** Stages whose own inputs have moved, given what they would be read under now. */
  staleStages?: Stage[]
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
  // Per-stage bookkeeping is merged, not replaced. A patch that carried only
  // its own stage's stamp once wiped the others', and a chronology current a
  // minute before showed as stale.
  const merged: StoredReading = {
    ...base,
    ...patch,
    took: { ...(base.took ?? {}), ...(patch.took ?? {}) },
    stamps: { ...(base.stamps ?? {}), ...(patch.stamps ?? {}) },
    spent: { ...(base.spent ?? {}), ...(patch.spent ?? {}) },
  }

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

/**
 * The reading, with each stage judged against what it would be read under now.
 *
 * A convenience over readReading for callers that have the ledger in hand:
 * facts moved makes everything stale, otherwise only the stages whose own
 * inputs moved.
 */
export function withStageStaleness(
  row: ReadingRow | null,
  now: Partial<Record<Stage, string>>
): ReadingRow | null {
  if (!row) return null
  return {
    ...row,
    staleStages: row.stale ? (Object.keys(now) as Stage[]) : staleStages(row.reading, now),
  }
}

/** Throws the reading away, so the next run starts from nothing. */
export async function clearReading(clientId: string): Promise<void> {
  const { error } = await getSupabase().from('case_readings').delete().eq('client_id', clientId)
  if (error) throw new Error(`Could not clear the reading: ${error.message}`)
}

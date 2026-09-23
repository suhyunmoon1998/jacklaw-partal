/**
 * Keeping the brief that is about to be replaced.
 *
 * Written before a re-read rather than after, because after is too late: the
 * reading the office is comparing against is the one that is being thrown
 * away. Both the brief and the ledger it was read against are stored whole,
 * so a comparison can be recomputed later by code that does not exist yet.
 */

import { getSupabase } from '@/lib/supabase'
import { Brief } from '@/lib/caseBrief'
import { FactSnapshot } from '@/lib/briefChanges'

export interface Snapshot {
  brief: Brief
  facts: FactSnapshot[]
  readOn: string | null
  takenAt: string
}

/** The one before this. Null when this is the first reading of the case. */
export async function lastSnapshot(clientId: string): Promise<Snapshot | null> {
  const { data, error } = await getSupabase()
    .from('brief_snapshots')
    .select('brief, facts, read_on, created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return {
    brief: data.brief as Brief,
    facts: (data.facts ?? []) as FactSnapshot[],
    readOn: data.read_on ?? null,
    takenAt: data.created_at,
  }
}

/**
 * Keeps one.
 *
 * Failure is logged and swallowed. A snapshot that could not be written costs
 * the office a comparison next time; refusing the re-read over it would cost
 * them the reading itself, which is worse.
 */
export async function keepSnapshot(
  clientId: string,
  snapshot: { brief: Brief; facts: FactSnapshot[]; readOn: string | null }
): Promise<boolean> {
  const { error } = await getSupabase().from('brief_snapshots').insert({
    client_id: clientId,
    brief: snapshot.brief,
    facts: snapshot.facts,
    read_on: snapshot.readOn,
  })
  if (error) {
    console.error('could not keep the brief snapshot for', clientId, error)
    return false
  }
  return true
}

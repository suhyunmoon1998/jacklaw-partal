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
import { SnapshotRow } from '@/lib/briefHistory'

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
 * The newest `limit`, returned oldest first — the order versions are read in.
 *
 * Throws, unlike the rest of this file: a history that silently came back
 * empty would read as "this case has never changed".
 */
export async function listSnapshots(clientId: string, limit = 40): Promise<SnapshotRow[]> {
  const { data, error } = await getSupabase()
    .from('brief_snapshots')
    .select('brief, facts, read_on, created_at, reason')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`Could not read the brief's earlier versions: ${error.message}`)
  return (data ?? [])
    .map(r => ({
      brief: r.brief as Brief,
      facts: (r.facts ?? []) as FactSnapshot[],
      readOn: r.read_on ?? null,
      takenAt: r.created_at,
      reason: r.reason ?? 'opened',
    }))
    .reverse()
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
  snapshot: { brief: Brief; facts: FactSnapshot[]; readOn: string | null; reason?: string }
): Promise<boolean> {
  const { error } = await getSupabase().from('brief_snapshots').insert({
    client_id: clientId,
    brief: snapshot.brief,
    facts: snapshot.facts,
    read_on: snapshot.readOn,
    reason: snapshot.reason ?? 'opened',
  })
  if (error) {
    console.error('could not keep the brief snapshot for', clientId, error)
    return false
  }
  return true
}

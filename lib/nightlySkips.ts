import { getSupabase } from '@/lib/supabase'

/**
 * Steps the night tried and could not finish, held back for twenty hours.
 *
 * Read and written tolerantly: a missing table (migration 0024 not applied yet)
 * or a failed read means no skips, never a stopped run — this only saves money,
 * it must not cost a client their reading.
 */
export const SKIP_HOURS = 20

export const skipKey = (clientId: string, step: string) => `${clientId}\u0000${step}`

/** Pure: the waiting list without the client/step pairs held back. */
export function withoutSkipped<T extends { clientId: string; needs: string }>(waiting: T[], skipped: ReadonlySet<string>): T[] {
  return waiting.filter(w => !skipped.has(skipKey(w.clientId, w.needs)))
}

export async function readSkips(now = new Date()): Promise<Set<string>> {
  const since = new Date(now.getTime() - SKIP_HOURS * 3_600_000).toISOString()
  try {
    const { data, error } = await getSupabase()
      .from('nightly_step_skips')
      .select('client_id, step')
      .gt('failed_at', since)
    if (error) {
      console.warn(`nightly skips not read (${error.message}); running without them`)
      return new Set()
    }
    return new Set((data ?? []).map(r => skipKey(String(r.client_id), String(r.step))))
  } catch (err) {
    console.warn('nightly skips not read; running without them', err)
    return new Set()
  }
}

export async function recordSkip(clientId: string, step: string, reason: string): Promise<void> {
  try {
    const { error } = await getSupabase()
      .from('nightly_step_skips')
      .upsert({ client_id: clientId, step, reason: reason.slice(0, 500), failed_at: new Date().toISOString() }, { onConflict: 'client_id,step' })
    if (error) console.warn(`nightly skip not recorded (${error.message})`)
  } catch (err) {
    console.warn('nightly skip not recorded', err)
  }
}

export async function clearSkip(clientId: string, step: string): Promise<void> {
  try {
    await getSupabase().from('nightly_step_skips').delete().eq('client_id', clientId).eq('step', step)
  } catch {
    // Nothing to clear is the usual case.
  }
}

/**
 * Where the record of each extraction's search is kept.
 *
 * Appended, never overwritten: the newest row describes the facts on file, and
 * the older ones answer "what had we looked at when we told the client that".
 */

import { getSupabase } from '@/lib/supabase'
import { SearchRecord } from '@/lib/sourceSearch'

/**
 * Keeps one.
 *
 * Failure is logged and swallowed, as a brief snapshot's is. The extraction it
 * describes has run and been paid for; refusing to store its facts because the
 * note about them could not be written would cost the office the reading.
 */
export async function keepSearch(clientId: string, record: SearchRecord): Promise<boolean> {
  const { error } = await getSupabase().from('source_searches').insert({ client_id: clientId, record })
  if (error) {
    console.error('could not keep the source search for', clientId, error)
    return false
  }
  return true
}

/** The newest, or null — including when the table cannot be read. */
export async function lastSearch(clientId: string): Promise<SearchRecord | null> {
  const { data, error } = await getSupabase()
    .from('source_searches')
    .select('record')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  return data.record as SearchRecord
}

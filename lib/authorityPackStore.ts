/**
 * A client's Authority Pack, built from the case reading on file (lib/authorityPack.ts).
 *
 * Built on request rather than stored: it is a view of the reading and of the
 * authority held, both of which change, and a stored copy would go stale
 * without saying so. Reads only; nothing is written, sent or run.
 */

import { readLedger } from '@/lib/factStore'
import { readingFingerprint } from '@/lib/caseReading'
import { readReading } from '@/lib/caseReadingStore'
import { buildAuthorityPack } from '@/lib/authorityPack'
import type { AuthorityPack } from '@/lib/authorityPackShape'
import { holdingsWithStatus } from '@/lib/authority/fetchedOpinionStore'

/** The office's calendar day. */
export function officeToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

export interface ClientAuthorityPack {
  pack: AuthorityPack
  /** No reading on file: the pack lists only the claims asked for. */
  hasReading: boolean
  /** The facts moved since the reading: its claims may no longer be the case's. */
  readingStale: boolean
  readingUpdatedAt: string | null
}

export async function readClientAuthorityPack(clientId: string, alsoClaims: string[] = []): Promise<ClientAuthorityPack> {
  const fingerprint = readingFingerprint(await readLedger(clientId))
  const row = await readReading(clientId, fingerprint)
  return {
    // Before migration 0029 is applied the table is missing: the pack still builds, from the repository's holdings alone.
    pack: buildAuthorityPack(row?.reading ?? {}, officeToday(), alsoClaims, await holdingsWithStatus('Approved').catch(() => [])),
    hasReading: Boolean(row),
    readingStale: row?.stale ?? false,
    readingUpdatedAt: row?.updatedAt ?? null,
  }
}

/** Claim ids from a query string: "meal-periods,overtime". */
export function claimIdsFrom(raw: string | null): string[] {
  return (raw ?? '').split(',').map(s => s.trim()).filter(s => /^[a-z0-9-]{1,60}$/.test(s)).slice(0, 40)
}

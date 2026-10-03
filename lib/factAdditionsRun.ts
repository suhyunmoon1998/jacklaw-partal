import { extractAdditions } from '@/lib/factExtraction'
import { gatherExtractionInput } from '@/lib/factInput'
import { unreadRows } from '@/lib/factAdditions'
import { addFacts, clearContradictions, readLedger, saveContradictions, supersede } from '@/lib/factStore'
import { keepSearch } from '@/lib/sourceSearchStore'
import { snapshotNow } from '@/lib/briefVersions'
import { Meter } from '@/lib/spend'
import { SearchRecord } from '@/lib/sourceSearch'

/**
 * Adding answers that arrived after the ledger was read — a follow-up round's,
 * usually — without renumbering or replacing anything already on file.
 *
 * One body for the two callers allowed to: the admin panel's "add the new
 * answers" (app/api/admin/clients/[id]/facts) and the nightly run, which does
 * it unprompted once a client finishes a question set (owner's decision,
 * 2026-10-03). The facts they correct are marked superseded, not removed. The
 * claims reading is left in place and goes stale on its own, because its
 * fingerprint is the standing ledger's; the night then reads it again.
 */
export type AdditionsResult =
  | {
      ok: true
      added: number
      answered: number
      superseded: Awaited<ReturnType<typeof extractAdditions>>['kept']
      setAside: Awaited<ReturnType<typeof extractAdditions>>['setAside']
      contradictions: Awaited<ReturnType<typeof extractAdditions>>['contradictions']
      searched: SearchRecord
    }
  | {
      ok: false
      status: number
      error: string
      /** Every answer on file already has a fact: there was nothing to read, and nothing was paid for. */
      nothingNew?: boolean
      /** The new answers were read and produced no facts. */
      noFacts?: boolean
      answered?: number
      /** What was searched, so a caller can record that these answers have been looked at. */
      searched?: SearchRecord
    }

export async function addArrivedAnswers(clientId: string, meter: Meter): Promise<AdditionsResult> {
  const existing = await readLedger(clientId)
  if (!existing.length) {
    return { ok: false, status: 409, error: 'There are no facts on file to add to. Read the answers into facts first.' }
  }
  const input = await gatherExtractionInput(clientId)
  if (!input) return { ok: false, status: 404, error: 'No such client.' }
  // A set that would not load is not a set with no new answers. Reading the
  // rest now would mark this round read with that set's answers missing.
  if (input.setsError) {
    return { ok: false, status: 502, error: `A question set could not be read (${input.setsError}), so nothing was added.` }
  }
  const sets = unreadRows(existing, input.extra)
  if (!sets.length) {
    return { ok: false, status: 409, error: 'Every answer on file is already in the facts.', nothingNew: true, searched: input.searched }
  }

  let read: Awaited<ReturnType<typeof extractAdditions>>
  try {
    read = await extractAdditions({ clientId, clientName: input.clientName, sets, ledger: existing, meter })
  } catch (err) {
    return { ok: false, status: 502, error: (err as Error).message }
  }
  if (!read.entries.length) {
    return {
      ok: false,
      status: 502,
      error: 'The new answers produced no facts. Nothing was changed.',
      noFacts: true,
      answered: read.answered,
      searched: input.searched,
    }
  }

  try {
    await snapshotNow(clientId, 'before follow-up answers were added to the facts')
    // Facts first: a supersession must point at a fact that exists.
    await addFacts(clientId, read.entries)
    for (const s of read.kept) await supersede(s.oldId, s.newId, s.why)
    // The contradictions were found again over the ledger as it now stands.
    await clearContradictions(clientId)
    await saveContradictions(clientId, read.contradictions)
    await keepSearch(clientId, input.searched)
  } catch (err) {
    // Paid for and only partly stored. Loud, so nobody reads a half-updated
    // ledger as whole.
    return { ok: false, status: 500, error: (err as Error).message }
  }

  return {
    ok: true,
    added: read.entries.length,
    answered: read.answered,
    superseded: read.kept,
    setAside: read.setAside,
    contradictions: read.contradictions,
    searched: input.searched,
  }
}

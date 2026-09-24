/**
 * The brief as the server sees it, so a version can be kept without a browser.
 *
 * The sheet assembles the brief from five requests and used to post what it
 * built back to be kept. That meant a version existed only if somebody opened
 * the sheet before the reading under it was replaced — and re-reading the facts
 * clears the reading outright. The brief the office had last week was gone the
 * moment somebody pressed "Read the answers" again without looking first.
 *
 * So the same inputs are gathered here, from the same tables, and put through
 * the same buildBrief. The routes that destroy a reading call snapshotNow
 * first. The sheet's own copy is still what it shows; this is what is kept.
 */

import { getSupabase } from '@/lib/supabase'
import { Brief, BriefInput, Finding, buildBrief } from '@/lib/caseBrief'
import { FactSnapshot } from '@/lib/briefChanges'
import { completed, StoredAnalysis } from '@/lib/caseAnalysisShape'
import { readLedger } from '@/lib/factStore'
import { LedgerEntry, standing } from '@/lib/factLedger'
import { readingFingerprint, stampsNow } from '@/lib/caseReading'
import { readReading } from '@/lib/caseReadingStore'
import { STAGES, allClaims, staleStages } from '@/lib/caseReadingShape'
import { planQuestions, readPlans } from '@/lib/followUpStore'
import { keepSnapshot, listSnapshots } from '@/lib/briefSnapshots'
import { baselineFor } from '@/lib/briefHistory'

/** What a snapshot keeps of a fact. The same fields the sheet sends. */
export const toSnapshot = (e: LedgerEntry): FactSnapshot => ({
  id: e.id,
  proposition: e.proposition,
  verbatim: e.verbatim,
  status: e.status,
  provenance: e.provenance,
  supersededBy: e.supersededBy,
  supersededWhy: e.supersededWhy,
})

/**
 * The brief, from what is on file now. Null when nothing has been read.
 *
 * Mirrors app/admin/reading/[clientId]/page.tsx input for input. If the two
 * drift, a version is kept that the office never saw — so a change to what the
 * sheet feeds buildBrief belongs here too.
 */
export async function assembleBrief(
  clientId: string
): Promise<{ brief: Brief; facts: FactSnapshot[] } | null> {
  const db = getSupabase()
  const [{ data: client }, { data: analysisRow }, entries, plans] = await Promise.all([
    db.from('clients').select('name, case_type').eq('id', clientId).maybeSingle(),
    db.from('case_analyses').select('result').eq('client_id', clientId).maybeSingle(),
    readLedger(clientId),
    readPlans(clientId).catch(() => []),
  ])
  if (!client) return null

  const row = await readReading(clientId, readingFingerprint(entries))
  const stored = row && !row.stale ? row.reading : null
  const reading = row?.reading ?? null
  const analysis = completed((analysisRow?.result ?? null) as StoredAnalysis | null)
  const findings = allClaims<Finding>(reading)
  // The sheet's own test for "nothing to show". A brief of empty sections is
  // not a version of anything.
  if (!analysis && findings.length === 0 && !reading?.spine) return null

  const questions = plans[0] ? await planQuestions(plans[0].questionSetId).catch(() => []) : []

  const input: BriefInput = {
    clientName: client.name ?? '',
    caseType: client.case_type ?? '',
    analysis,
    findings,
    wageOrder: (reading?.wageOrder as BriefInput['wageOrder']) ?? null,
    spine: (reading?.spine as BriefInput['spine']) ?? null,
    pendingQuestions: questions
      .map(q => ({ text: q.label ?? '', why: (q as { why?: string }).why }))
      .filter(q => q.text),
    ledger: entries.map(e => ({
      id: e.id,
      proposition: e.proposition,
      status: e.status,
      actors: e.actors ?? [],
      legalTags: e.legalTags ?? [],
    })),
    factCount: standing(entries).length,
    readOn: row?.updatedAt ?? null,
    stale: row?.stale ?? false,
    staleStages: row?.stale ? STAGES.slice() : staleStages(stored, stampsNow(entries, stored ?? {})),
  }
  return { brief: buildBrief(input), facts: entries.map(toSnapshot) }
}

/**
 * Keeps the brief as it stands, if it is not already the newest version.
 *
 * Never throws. It is called on the way into something destructive, and a
 * snapshot that could not be taken must not stop the office re-reading a case —
 * it is logged, and the history has a gap where it would have been.
 */
export async function snapshotNow(clientId: string, reason: string): Promise<boolean> {
  try {
    const current = await assembleBrief(clientId)
    if (!current) return false
    const { isNew } = baselineFor(await listSnapshots(clientId), current)
    if (!isNew) return false
    return await keepSnapshot(clientId, { ...current, readOn: current.brief.readOn ?? null, reason })
  } catch (err) {
    console.error('could not snapshot the brief for', clientId, 'before:', reason, err)
    return false
  }
}

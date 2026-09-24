'use client'

/**
 * The whole case on one sheet, to be saved or printed.
 *
 * The Analysis tab stacks four panels — the damages reading, the fact ledger,
 * the claims reading, the follow-up queue — each built at a different time
 * against a different half of the problem. This assembles all four into the
 * order a lawyer reads a case, which is the order the office's methodology
 * asks for, and is where they take it away: an attorney putting a case in
 * front of someone else needs a file, and the answer to "can I have this?"
 * should not be a screenshot of a scrolling panel.
 *
 * Deliberately a page and not a generated PDF. The document is laid out once,
 * in ReadingDocument, and a second implementation in pdfkit would be a second
 * thing to keep true — it would drift, and the drift would be silent. The
 * browser's own Save as PDF prints exactly what the office read.
 */

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { StoredReading, allClaims } from '@/lib/caseReadingShape'
import { Finding, buildBrief } from '@/lib/caseBrief'
import BriefDocument, { VersionLine } from '@/components/admin/BriefDocument'
import { releaseTest } from '@/lib/releaseTest'
import { Changes, FactSnapshot } from '@/lib/briefChanges'
import { defenceRecords } from '@/lib/defenceRecord'
import { LedgerFact } from '@/lib/factualBrief'

const headers = {}

export default function ReadingSheetPage() {
  const params = useParams<{ clientId: string }>()
  const clientId = params?.clientId ?? ''

  const [clientName, setClientName] = useState('')
  const [reading, setReading] = useState<StoredReading | null>(null)
  const [facts, setFacts] = useState(0)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [stale, setStale] = useState(false)
  const [staleStages, setStaleStages] = useState<string[]>([])
  const [caseType, setCaseType] = useState('')
  /** The damages reading, null until it has been run. */
  const [analysis, setAnalysis] = useState<Parameters<typeof buildBrief>[0]['analysis']>(null)
  const [questions, setQuestions] = useState<{ text: string; why?: string }[]>([])
  /** The ledger's ids, so a fact not on file can be told from one that is. */
  const [factIds, setFactIds] = useState<string[]>([])
  const [ledger, setLedger] = useState<FactSnapshot[]>([])
  /** What moved since the last reading. Null until the comparison comes back. */
  const [changes, setChanges] = useState<Changes | null>(null)
  /** Every version kept, newest first. Undefined while loading; null if it could not load. */
  const [versions, setVersions] = useState<VersionLine[] | null | undefined>(undefined)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)
  /** null until the server has said. The cookie is what decides, not localStorage. */
  const [signedIn, setSignedIn] = useState<boolean | null>(null)

  const load = useCallback(async () => {
    if (!clientId) return
    try {
      // The name comes from the client list rather than the reading, which
      // stores findings and not who they are about.
      // All four readings at once. The brief is an assembly of what already
      // exists, so a missing one is a section that says why rather than a
      // failure — only the claims reading is fetched strictly.
      const [rRes, cRes, aRes, fRes, lRes] = await Promise.all([
        fetch(`/api/admin/clients/${clientId}/reading`, { headers, cache: 'no-store' }),
        fetch('/api/admin/clients', { headers, cache: 'no-store' }),
        fetch(`/api/admin/clients/${clientId}/analysis`, { headers, cache: 'no-store' }),
        fetch(`/api/admin/clients/${clientId}/follow-ups`, { headers, cache: 'no-store' }),
        fetch(`/api/admin/clients/${clientId}/facts`, { headers, cache: 'no-store' }),
      ])
      const body = await rRes.json()
      if (!rRes.ok) throw new Error(body?.error || 'Could not load the reading.')
      setReading(body.reading)
      setFacts(body.facts ?? 0)
      setUpdatedAt(body.updatedAt ?? null)
      setStale(Boolean(body.stale))
      setStaleStages(body.staleStages ?? [])

      if (cRes.ok) {
        const { clients } = await cRes.json()
        const mine = (clients ?? []).find((c: { id: string }) => c.id === clientId)
        setClientName(mine?.name ?? '')
        setCaseType(mine?.caseType ?? '')
      }
      if (aRes.ok) {
        const { analysis: a } = await aRes.json()
        setAnalysis(a ?? null)
      }
      if (lRes.ok) {
        const { ids, snapshot } = await lRes.json()
        setFactIds(ids ?? [])
        setLedger(snapshot ?? [])
      }
      if (fRes.ok) {
        const { questions: qs } = await fRes.json()
        setQuestions(
          (qs ?? []).map((q: { label?: string; text?: string; why?: string }) => ({
            text: q.label ?? q.text ?? '',
            why: q.why,
          })).filter((q: { text: string }) => q.text)
        )
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoaded(true)
    }
  }, [clientId])

  useEffect(() => {
    let live = true
    ;(async () => {
      const res = await fetch('/api/admin/login', { cache: 'no-store' }).catch(() => null)
      const ok = Boolean(res?.ok && (await res.json().catch(() => ({}))).authenticated)
      if (!live) return
      setSignedIn(ok)
      if (ok) void load()
      else setLoaded(true)
    })()
    return () => { live = false }
  }, [load])

  const findings = allClaims<Finding>(reading)
  const brief = buildBrief({
    clientName,
    caseType,
    analysis,
    findings,
    wageOrder: (reading?.wageOrder as Parameters<typeof buildBrief>[0]['wageOrder']) ?? null,
    spine: (reading?.spine as Parameters<typeof buildBrief>[0]['spine']) ?? null,
    pendingQuestions: questions,
    // The people map is grouped from the facts the ledger already holds.
    ledger: ledger.map(f => ({
      id: f.id,
      proposition: f.proposition,
      status: f.status,
      actors: (f as unknown as { actors?: string[] }).actors ?? [],
      legalTags: (f as unknown as { legalTags?: string[] }).legalTags ?? [],
    })),
    factCount: facts,
    readOn: updatedAt,
    stale,
    staleStages,
  })
  /** Nothing has been read at all — not one section has anything to show. */
  const empty = !analysis && findings.length === 0 && !reading?.spine
  // Read as an internal working draft: gaps are named, not fatal. An external
  // document is the same test at 'external', where a gap stops it going out.
  const problems = releaseTest(brief, { factIds: new Set(factIds) }, 'internal')
  // The other side's position and this office's answer, paired.
  const defences = defenceRecords(brief, ledger as unknown as LedgerFact[])

  /**
   * Compare this reading against the one kept last time, and keep this one.
   *
   * Runs once the brief has something in it, and only once: opening the sheet
   * is what records a reading, so the office is not asked to remember to.
   * A failure costs a comparison next time and nothing on this screen.
   */
  const [compared, setCompared] = useState(false)
  useEffect(() => {
    if (compared || empty || !loaded) return
    setCompared(true)
    // The server assembles and keeps the brief itself; nothing is sent. The
    // history is read after, so it includes the version this opening kept.
    void fetch(`/api/admin/clients/${clientId}/brief-changes`, { method: 'POST', headers })
      .then(r => (r.ok ? r.json() : null))
      .then(body => setChanges(body?.changes ?? null))
      .catch(() => {})
      .then(() => fetch(`/api/admin/clients/${clientId}/brief-changes`, { headers, cache: 'no-store' }))
      .then(r => (r && r.ok ? r.json() : null))
      .then(body => setVersions(body?.versions ?? null))
      .catch(() => setVersions(null))
  }, [compared, empty, loaded, clientId])

  if (signedIn === false) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
        <p className="text-sm text-gray-500">
          Sign in to the admin panel first, then open this page again.
        </p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-100 print:bg-white">
      {/* Everything here is the office's, not the document's — off the paper. */}
      <div className="print:hidden sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="mx-auto w-full max-w-[52rem] px-6 py-3 flex items-center gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Case brief
            </p>
            <p className="text-sm font-semibold text-black truncate">
              {clientName || 'This client'}
            </p>
          </div>
          <button
            onClick={() => window.print()}
            disabled={empty}
            className="ml-auto text-xs font-semibold px-3 py-1.5 rounded-lg bg-black text-white hover:bg-gray-800 transition-colors disabled:opacity-40"
          >
            Save as PDF
          </button>
        </div>
        <p className="mx-auto w-full max-w-[52rem] px-6 pb-2 text-[11px] text-gray-400">
          Choose “Save as PDF” as the destination in the print dialog to keep a copy.
        </p>
      </div>

      {error && (
        <p className="mx-auto w-full max-w-[52rem] px-6 py-4 text-xs text-red-600">{error}</p>
      )}

      {loaded && !error && empty && (
        <p className="mx-auto w-full max-w-[52rem] px-6 py-8 text-sm text-gray-500">
          Nothing has been read for this client yet. Open them in the admin panel, go to Analysis,
          and run the readings — the brief assembles whatever is there.
        </p>
      )}

      {!empty && (
        <BriefDocument
          brief={brief}
          problems={problems}
          changes={changes}
          versions={versions}
          defences={defences}
        />
      )}
    </main>
  )
}

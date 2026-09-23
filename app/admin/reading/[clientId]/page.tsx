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
import BriefDocument from '@/components/admin/BriefDocument'

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
      const [rRes, cRes, aRes, fRes] = await Promise.all([
        fetch(`/api/admin/clients/${clientId}/reading`, { headers, cache: 'no-store' }),
        fetch('/api/admin/clients', { headers, cache: 'no-store' }),
        fetch(`/api/admin/clients/${clientId}/analysis`, { headers, cache: 'no-store' }),
        fetch(`/api/admin/clients/${clientId}/follow-ups`, { headers, cache: 'no-store' }),
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
    factCount: facts,
    readOn: updatedAt,
    stale,
    staleStages,
  })
  /** Nothing has been read at all — not one section has anything to show. */
  const empty = !analysis && findings.length === 0 && !reading?.spine

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

      {!empty && <BriefDocument brief={brief} />}
    </main>
  )
}

'use client'

/**
 * The reading on its own sheet, to be saved or printed.
 *
 * The Analysis tab shows the same document inside a modal, which is where the
 * office reads it. This is where they take it away: an attorney putting a case
 * in front of someone else needs a file, and the answer to "can I have this?"
 * should not be a screenshot of a scrolling panel.
 *
 * Deliberately a page and not a generated PDF. The document is laid out once,
 * in ReadingDocument, and a second implementation in pdfkit would be a second
 * thing to keep true — it would drift, and the drift would be silent. The
 * browser's own Save as PDF prints exactly what the office read.
 */

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { MOCK_ADMIN_PASSWORD } from '@/lib/mockData'
import { getAdminSession } from '@/lib/auth'
import { StoredReading, allClaims } from '@/lib/caseReadingShape'
import ReadingDocument, { Choice, Finding } from '@/components/admin/ReadingDocument'

const headers = { 'x-admin-key': MOCK_ADMIN_PASSWORD }

export default function ReadingSheetPage() {
  const params = useParams<{ clientId: string }>()
  const clientId = params?.clientId ?? ''

  const [clientName, setClientName] = useState('')
  const [reading, setReading] = useState<StoredReading | null>(null)
  const [facts, setFacts] = useState(0)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    if (!clientId) return
    try {
      // The name comes from the client list rather than the reading, which
      // stores findings and not who they are about.
      const [rRes, cRes] = await Promise.all([
        fetch(`/api/admin/clients/${clientId}/reading`, { headers, cache: 'no-store' }),
        fetch('/api/admin/clients', { headers, cache: 'no-store' }),
      ])
      const body = await rRes.json()
      if (!rRes.ok) throw new Error(body?.error || 'Could not load the reading.')
      setReading(body.reading)
      setFacts(body.facts ?? 0)
      setUpdatedAt(body.updatedAt ?? null)
      if (cRes.ok) {
        const { clients } = await cRes.json()
        setClientName(
          (clients ?? []).find((c: { id: string }) => c.id === clientId)?.name ?? ''
        )
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoaded(true)
    }
  }, [clientId])

  useEffect(() => {
    void load()
  }, [load])

  const findings = allClaims<Finding>(reading)
  const choice = reading?.wageOrder as Choice | undefined

  if (!getAdminSession()) {
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
              Claims &amp; evidence
            </p>
            <p className="text-sm font-semibold text-black truncate">
              {clientName || 'This client'}
            </p>
          </div>
          <button
            onClick={() => window.print()}
            disabled={findings.length === 0}
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

      {loaded && !error && findings.length === 0 && (
        <p className="mx-auto w-full max-w-[52rem] px-6 py-8 text-sm text-gray-500">
          This case has not been read yet. Open the client in the admin panel, go to Analysis, and
          press “Read the case”.
        </p>
      )}

      {findings.length > 0 && (
        <ReadingDocument
          clientName={clientName}
          findings={findings}
          choice={choice}
          facts={facts}
          readOn={updatedAt}
        />
      )}
    </main>
  )
}

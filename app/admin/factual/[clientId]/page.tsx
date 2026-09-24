'use client'

/**
 * The factual brief on its own sheet.
 *
 * Its own page rather than a section of the case brief, because the corpus
 * keeps the two apart: this one develops the record and does not argue the
 * law. Somebody preparing a witness, writing a complaint, or testing what the
 * client actually said wants this one and nothing else on it.
 */

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { LedgerFact, buildFactualBrief } from '@/lib/factualBrief'
import FactualDocument from '@/components/admin/FactualDocument'

export default function FactualSheetPage() {
  const params = useParams<{ clientId: string }>()
  const clientId = params?.clientId ?? ''

  const [clientName, setClientName] = useState('')
  const [caseType, setCaseType] = useState('')
  const [ledger, setLedger] = useState<LedgerFact[]>([])
  const [spine, setSpine] = useState<Parameters<typeof buildFactualBrief>[0]['spine']>(null)
  const [readOn, setReadOn] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [signedIn, setSignedIn] = useState<boolean | null>(null)

  const load = useCallback(async () => {
    if (!clientId) return
    try {
      const [lRes, rRes, cRes] = await Promise.all([
        fetch(`/api/admin/clients/${clientId}/facts`, { cache: 'no-store' }),
        fetch(`/api/admin/clients/${clientId}/reading`, { cache: 'no-store' }),
        fetch('/api/admin/clients', { cache: 'no-store' }),
      ])
      if (lRes.ok) {
        const { snapshot } = await lRes.json()
        setLedger(snapshot ?? [])
      }
      if (rRes.ok) {
        const body = await rRes.json()
        setSpine(body?.reading?.spine ?? null)
        setReadOn(body?.updatedAt ?? null)
      }
      if (cRes.ok) {
        const { clients } = await cRes.json()
        const mine = (clients ?? []).find((c: { id: string }) => c.id === clientId)
        setClientName(mine?.name ?? '')
        setCaseType(mine?.caseType ?? '')
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

  if (signedIn === false) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
        <p className="text-sm text-gray-500">
          Sign in to the admin panel first, then open this page again.
        </p>
      </main>
    )
  }

  const brief = buildFactualBrief({ clientName, caseType, ledger, spine, readOn })
  const empty = ledger.length === 0

  return (
    <main className="min-h-screen bg-gray-100 print:bg-white">
      <div className="print:hidden sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="mx-auto w-full max-w-[52rem] px-6 py-3 flex items-center gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Factual brief
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
      </div>

      {error && (
        <p className="mx-auto w-full max-w-[52rem] px-6 py-4 text-xs text-red-600">{error}</p>
      )}

      {loaded && !error && empty && (
        <p className="mx-auto w-full max-w-[52rem] px-6 py-8 text-sm text-gray-500">
          The answers have not been read into facts for this client yet. Open them in the admin
          panel, go to Analysis, and press “Read the answers”.
        </p>
      )}

      {!empty && <FactualDocument brief={brief} />}
    </main>
  )
}

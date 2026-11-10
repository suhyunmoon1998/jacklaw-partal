'use client'

/**
 * The case's Authority Pack, beside its brief: for each claim the reading raises,
 * the provisions and holdings on file, when each was fetched, and what the pack
 * cannot settle. Loads its own data (/api/admin/clients/[id]/authority-pack).
 */

import { useEffect, useState } from 'react'
import type { AuthorityPack, PackHolding } from '@/lib/authorityPackShape'
import HoldingsReview from '@/components/admin/HoldingsReview'

type Loaded = { pack: AuthorityPack; hasReading: boolean; readingStale: boolean; readingUpdatedAt: string | null }

export default function AuthorityPackPanel({ clientId }: { clientId: string }) {
  const [data, setData] = useState<Loaded | null>(null)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let live = true
    fetch(`/api/admin/clients/${encodeURIComponent(clientId)}/authority-pack`, { cache: 'no-store' })
      .then(async r => (r.ok ? r.json() : Promise.reject(new Error((await r.json().catch(() => ({}))).error ?? `HTTP ${r.status}`))))
      .then(d => live && setData(d))
      .catch(e => live && setError(e instanceof Error ? e.message : 'Could not load the pack.'))
    return () => {
      live = false
    }
  }, [clientId, reload])

  if (error) return <p className="mx-auto w-full max-w-[52rem] px-6 py-4 text-xs text-red-600">Authority Pack: {error}</p>
  if (!data) return null
  const { pack } = data
  const v = pack.verification

  return (
    <section
      aria-label="Authority Pack"
      className="mx-auto w-full max-w-[52rem] bg-white sm:shadow-[0_1px_3px_rgba(0,0,0,0.12)] sm:rounded-sm px-6 sm:px-14 py-8 my-6 print:shadow-none print:break-before-page"
    >
      <h2 className="text-lg font-bold mb-1">Authority Pack</h2>
      <p className="text-xs text-gray-500 mb-4">
        Built {pack.builtOn}. Texts as of {v.asOf ?? '—'}; check again by {v.reverifyBy ?? '—'}
        {v.due && <strong className="text-red-700"> — due now</strong>}, and before any {v.reverifyBefore.join(', ')}.
      </p>
      <ul className="text-xs text-amber-800 bg-amber-50 rounded px-3 py-2 mb-4 space-y-1">
        <li>{v.citator}</li>
        <li>{v.annotations}</li>
        <li>{v.versions}</li>
        <li>{pack.wageOrder.note}</li>
        {data.readingStale && <li>The facts moved since the reading: its claims may no longer be this case&rsquo;s.</li>}
        {!data.hasReading && <li>No reading on file yet: no claims to list.</li>}
      </ul>
      <HoldingsReview onDecided={() => setReload(n => n + 1)} />
      {pack.claims.map(c => (
        <div key={c.claimId} className="mb-6">
          <h3 className="font-semibold">
            {c.name} <span className="text-xs font-normal text-gray-500">{c.standing ?? 'not read yet'}</span>
          </h3>
          <ul className="text-sm mt-1 space-y-0.5">
            {[...c.provisions, ...(c.caci ? [c.caci] : [])].map(p => (
              <li key={p.key}>
                {p.cite}{' '}
                <span className="text-xs text-gray-500">
                  {p.onFile ? `on file, fetched ${p.fetched?.on} (${p.fetched?.from})` : p.note}
                </span>
              </li>
            ))}
          </ul>
          {c.holdings.map(h => <Holding key={h.id} h={h} />)}
          <p className="text-xs text-gray-500 mt-2">{c.adverse.note}</p>
          {c.adverse.holdings.map(h => <Holding key={h.id} h={h} adverse />)}
          {c.gaps.length > 0 && (
            <ul className="text-xs text-red-700 mt-1 list-disc pl-5">
              {c.gaps.map(g => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </section>
  )
}

function Holding({ h, adverse }: { h: PackHolding; adverse?: boolean }) {
  return (
    <div className={`text-sm mt-2 pl-3 border-l-2 ${adverse ? 'border-red-300' : 'border-gray-200'}`}>
      <p>
        {adverse && <span className="text-xs font-semibold text-red-700">CONTRARY </span>}
        <strong>{h.cite}</strong>
        {h.pinpoint ? `, ${h.pinpoint}` : ''}{' '}
        <span className="text-xs text-gray-500">
          ({h.kind === 'agency precedent' ? 'DLSE precedent, not a court decision; ' : ''}
          {h.opinionPart}
          {h.verbatim ? ', quote checked' : ', QUOTE NOT FOUND'})
        </span>
      </p>
      <p>{h.proposition}</p>
      <p className="text-xs text-gray-500">Does not decide: {h.limits}</p>
      <p className="text-xs text-gray-400">
        {h.origin}
        {h.sourceUrl && (
          <>
            {' '}
            <a className="underline" href={h.sourceUrl} target="_blank" rel="noreferrer">source</a>
          </>
        )}
      </p>
    </div>
  )
}

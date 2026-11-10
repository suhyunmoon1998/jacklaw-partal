'use client'

/**
 * Holdings Eleanor proposed from opinions she fetched, waiting for an attorney.
 * Nothing reaches a case pack until it is approved here. Shows the quotation and
 * the source so it can be read against the opinion before deciding.
 */

import { useCallback, useEffect, useState } from 'react'

type Waiting = {
  id: string
  proposition: string
  quote: string
  pinpoint: string
  opinionPart: string
  bearsOn: string[]
  limits: string
  adverse: boolean
  opinion: { name: string; citation: string; kind: string; sourceUrl: string; fetchedOn: string }
}

export default function HoldingsReview({ onDecided }: { onDecided?: () => void }) {
  const [waiting, setWaiting] = useState<Waiting[]>([])
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(() => {
    fetch('/api/admin/authority/holdings', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(d => setWaiting(d.holdings ?? []))
      .catch(e => setError(e instanceof Error ? e.message : 'Could not load the holdings.'))
  }, [])
  useEffect(load, [load])

  const decide = async (id: string, decision: 'Approved' | 'Rejected') => {
    setBusy(id)
    setError('')
    const r = await fetch('/api/admin/authority/holdings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, decision }),
    })
    setBusy('')
    if (!r.ok) return setError(`Could not record the decision (HTTP ${r.status}).`)
    load()
    onDecided?.()
  }

  if (error) return <p className="text-xs text-red-600 mb-4">Holdings awaiting review: {error}</p>
  if (!waiting.length) return null
  return (
    <div className="mb-6 rounded border border-amber-300 bg-amber-50 px-3 py-2">
      <h3 className="font-semibold text-sm">Holdings Eleanor proposed — awaiting an attorney ({waiting.length})</h3>
      {waiting.map(h => (
        <div key={h.id} className="text-sm mt-3 border-t border-amber-200 pt-2">
          <p>
            {h.adverse && <span className="text-xs font-semibold text-red-700">CONTRARY </span>}
            <strong>{h.opinion.name} {h.opinion.citation}</strong>
            {h.pinpoint ? `, ${h.pinpoint}` : ''}{' '}
            <span className="text-xs text-gray-500">
              ({h.opinion.kind === 'agency precedent' ? 'DLSE precedent, not a court decision; ' : ''}
              {h.opinionPart}; bears on {h.bearsOn.join(', ')})
            </span>
          </p>
          <p>{h.proposition}</p>
          <blockquote className="text-xs italic border-l-2 border-gray-300 pl-2 my-1">&ldquo;{h.quote}&rdquo;</blockquote>
          <p className="text-xs text-gray-500">Does not decide: {h.limits}</p>
          <p className="text-xs text-gray-500">
            Fetched {h.opinion.fetchedOn} from{' '}
            <a className="underline" href={h.opinion.sourceUrl} target="_blank" rel="noreferrer">the source</a>. The quote was found in the stored text word for word.
          </p>
          <div className="mt-1 flex gap-2">
            <button className="text-xs px-2 py-1 rounded bg-green-700 text-white disabled:opacity-50" disabled={busy === h.id} onClick={() => decide(h.id, 'Approved')}>
              Approve
            </button>
            <button className="text-xs px-2 py-1 rounded bg-gray-200 disabled:opacity-50" disabled={busy === h.id} onClick={() => decide(h.id, 'Rejected')}>
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

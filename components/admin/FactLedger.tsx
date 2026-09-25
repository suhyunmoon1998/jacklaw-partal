'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Reading a client's answers into the facts everything else stands on.
 *
 * The bottom rung, and the one that had no button. The matrix, the chronology,
 * the Wage Order and the follow-up questions were all reachable from here; the
 * step that creates the facts they read was run once, from a script, for one
 * client — so every other client opened to "no facts on file, so there is
 * nothing to read".
 *
 * Reading again is a destructive act and says so. The facts carry ids that
 * findings cite and that follow-up answers are filed against, so replacing
 * them invalidates the matrix and the spine — which this clears rather than
 * leaving behind as findings citing ids nothing can resolve.
 */

const headers = { 'Content-Type': 'application/json' }

interface Contradiction {
  about: string
  oneAnswer: string
  otherAnswer: string
  whyItMatters: string
  howToResolve: string
}

function Elapsed() {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const m = Math.floor(seconds / 60)
  return <>{m ? `${m}m ` : ''}{seconds % 60}s</>
}

export default function FactLedger({
  clientId,
  onChange,
}: {
  clientId: string
  /** The reading below depends on these facts, so it reloads when they move. */
  onChange?: () => void
}) {
  const [facts, setFacts] = useState<number | null>(null)
  const [unsettled, setUnsettled] = useState(0)
  /** Follow-up answers no fact came from yet. */
  const [unread, setUnread] = useState(0)
  const [contradictions, setContradictions] = useState<Contradiction[]>([])
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/facts`, { headers })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || 'Could not read the ledger.')
      setFacts(body.facts ?? 0)
      setUnsettled(body.unsettled ?? 0)
      setUnread(body.unread ?? 0)
      setContradictions(body.contradictions ?? [])
    } catch (err) {
      setError((err as Error).message)
      setFacts(0)
    }
  }, [clientId])

  useEffect(() => {
    void load()
  }, [load])

  const run = async (replace: boolean) => {
    if (replace && !confirm(
      'Reading again replaces every fact on file. The claim matrix and the chronology were read ' +
      'against those facts and will be cleared with them. Continue?'
    )) return
    setRunning(true)
    setError('')
    setNote('')
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/facts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ replace }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || 'The answers could not be read.')
      setNote(
        `${body.facts} facts from ${body.answered} answers in ${body.seconds}s` +
          (body.contradictions?.length ? `, ${body.contradictions.length} places her answers disagree` : '')
      )
      await load()
      onChange?.()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setRunning(false)
    }
  }

  /**
   * Adds the answers that came in after the facts were read. Nothing on file is
   * replaced or renumbered; a fact they correct is marked replaced, with why.
   */
  const add = async () => {
    setRunning(true)
    setError('')
    setNote('')
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/facts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ add: true }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || 'The new answers could not be added.')
      setNote(
        `${body.added} facts added from ${body.answered} new answers in ${body.seconds}s` +
          (body.superseded?.length ? `, ${body.superseded.length} earlier facts replaced` : '') +
          '. Read the case again: it was read against the facts before these.'
      )
      await load()
      onChange?.()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setRunning(false)
    }
  }

  return (
    <section className="px-5 py-4 border-t border-gray-100">
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Facts on file</h4>
        <span className="text-[11px] text-gray-400">
          {facts === null
            ? 'Loading…'
            : facts
              ? `${facts} facts${unsettled ? `, ${unsettled} not settled` : ''}`
              : 'None yet — nothing above this can run.'}
        </span>
        {Boolean(facts) && unread > 0 && (
          <button
            onClick={add}
            disabled={running}
            title="Reads only the answers not yet in the facts. Nothing on file is replaced or renumbered."
            className="ml-auto text-xs font-semibold px-3 py-1.5 rounded-lg bg-black text-white hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            {running ? 'Reading…' : `Add ${unread} new answer${unread === 1 ? '' : 's'}`}
          </button>
        )}
        <button
          onClick={() => run(Boolean(facts))}
          disabled={running}
          className={`${facts && unread > 0 ? '' : 'ml-auto '}text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-40 transition-colors ${
            facts
              ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              : 'bg-black text-white hover:bg-gray-800'
          }`}
        >
          {running ? 'Reading…' : facts ? 'Read the answers again' : 'Read the answers into facts'}
        </button>
      </div>

      {Boolean(facts) && unread > 0 && !running && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
          {unread} answer{unread === 1 ? '' : 's'} from question sets {unread === 1 ? 'is' : 'are'} not in the
          facts yet, so nothing read from the facts knows {unread === 1 ? 'it' : 'them'}.
        </p>
      )}
      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
          {error}
        </p>
      )}
      {note && !error && (
        <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3">
          {note}
        </p>
      )}

      {running && (
        <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-gold/5 border border-gold/20 mb-3">
          <div className="w-4 h-4 shrink-0 rounded-full border-2 border-gold border-t-transparent animate-spin" />
          <p className="text-[11px] text-gray-500 tabular-nums">
            <Elapsed /> · reading the answers section by section, then over the whole file for
            places they disagree
          </p>
        </div>
      )}

      {contradictions.length > 0 && (
        <details className="rounded-xl border border-amber-200 bg-amber-50/40">
          <summary className="px-4 py-2.5 text-xs font-semibold text-amber-800 cursor-pointer hover:bg-amber-50">
            {contradictions.length} place{contradictions.length === 1 ? '' : 's'} her own answers
            disagree
          </summary>
          <ul className="px-4 pb-3 space-y-3">
            {contradictions.map((c, i) => (
              <li key={i} className="text-xs">
                <p className="font-semibold text-gray-800">{c.about}</p>
                <p className="text-gray-600 mt-0.5">· {c.oneAnswer}</p>
                <p className="text-gray-600">· {c.otherAnswer}</p>
                {c.whyItMatters && <p className="text-gray-500 mt-1">{c.whyItMatters}</p>}
                {c.howToResolve && (
                  <p className="text-gray-500 mt-0.5">
                    <span className="font-semibold">Settle it: </span>
                    {c.howToResolve}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}

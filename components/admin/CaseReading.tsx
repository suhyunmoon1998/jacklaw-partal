'use client'

import { useCallback, useEffect, useState } from 'react'
import { MOCK_ADMIN_PASSWORD } from '@/lib/mockData'
import {
  STAGES,
  STAGE_LABEL,
  Stage,
  StoredReading,
  allClaims,
  describe as describeReading,
  nextStage,
} from '@/lib/caseReadingShape'
import ReadingDocument, { Choice, Finding } from '@/components/admin/ReadingDocument'

/**
 * Reading a case against the authority: the Wage Order, the claims, the spine.
 *
 * It is four requests, not one, because the hosting plan caps a request at 300
 * seconds and a whole reading does not fit — so the panel walks the stages and
 * shows each one as it lands. That is also why there is no full-screen
 * spinner: the office can start on the Wage Order while the claims are still
 * being read, and a still spinner at four minutes reads as broken.
 *
 * What this panel is careful to say out loud:
 *
 *   WHICH ORDER, AND THAT NOBODY HAS CONFIRMED IT. Every rest-period and hours
 *   finding below depends on it, and it is a legal classification this system
 *   proposes rather than decides.
 *
 *   WHICH CLAIMS COULD NOT BE READ. A run that loses one to a flake and
 *   returns nine looks exactly like a complete reading of a nine-claim case.
 *
 *   WHETHER THE FACTS HAVE MOVED SINCE. A matrix saying an element is
 *   contradicted, read against a fact the client has since corrected, is a
 *   wrong answer with a date on it.
 */

const headers = { 'Content-Type': 'application/json', 'x-admin-key': MOCK_ADMIN_PASSWORD }

function Elapsed() {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const m = Math.floor(seconds / 60)
  return <>{m ? `${m}m ` : ''}{seconds % 60}s</>
}

export default function CaseReading({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [reading, setReading] = useState<StoredReading | null>(null)
  const [stale, setStale] = useState(false)
  /** What the API says still has to run. The screen cannot hash a ledger. */
  const [next, setNext] = useState<Stage | null>(null)
  const [outdated, setOutdated] = useState<Stage[]>([])
  const [facts, setFacts] = useState(0)
  const [running, setRunning] = useState<Stage | null>(null)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/reading`, { headers })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || 'Could not load the reading.')
      setReading(body.reading)
      setStale(Boolean(body.stale))
      setOutdated(body.staleStages ?? [])
      setNext((body.next as Stage | null) ?? null)
      setFacts(body.facts ?? 0)
      setUpdatedAt(body.updatedAt ?? null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoaded(true)
    }
  }, [clientId])

  useEffect(() => {
    void load()
  }, [load])

  /** Walks from wherever it is to the end, one request at a time. */
  const walk = async (from: Stage | null) => {
    setError('')
    let stage = from
    let guard = 0
    while (stage && guard++ < STAGES.length + 1) {
      setRunning(stage)
      try {
        const res = await fetch(`/api/admin/clients/${clientId}/reading`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ stage }),
        })
        const body = await res.json()
        if (!res.ok) throw new Error(body?.error || `The ${stage} stage failed.`)
        setReading(body.reading)
        setStale(false)
        setOutdated(body.staleStages ?? [])
        stage = body.next as Stage | null
        setNext(stage)
      } catch (err) {
        setError((err as Error).message)
        break
      }
    }
    setRunning(null)
    void load()
  }

  const start = async () => {
    // A stale reading is read again from the beginning: stages read against
    // different ledgers must not be stitched into one reading true of neither.
    // Only a change in the FACTS starts over. A stage gone stale because its
    // own model moved is simply run again, and the stages that did not move
    // are kept — they are still read by the model that still reads them.
    if (stale && reading) {
      await fetch(`/api/admin/clients/${clientId}/reading`, { method: 'DELETE', headers })
      setReading(null)
      setStale(false)
      await walk('wage order')
      return
    }
    await walk(next)
  }

  const choice = reading?.wageOrder as Choice | undefined
  const findings = allClaims<Finding>(reading)
  const spine = reading?.spine as { events?: unknown[]; anomalies?: unknown[]; records?: unknown[] } | undefined

  return (
    <section className="px-5 py-4 border-t border-gray-100">
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
          Claims &amp; evidence
        </h4>
        <span className="text-[11px] text-gray-400">
          {loaded
            ? `${describeReading(reading)} ${facts} facts on file.` +
              (outdated.length && !stale ? ` ${outdated.length} to re-read.` : '')
            : 'Loading…'}
        </span>
        <button
          onClick={start}
          disabled={Boolean(running) || (!next && !stale)}
          className="ml-auto text-xs font-semibold px-3 py-1.5 rounded-lg bg-black text-white disabled:opacity-40 hover:bg-gray-800 transition-colors"
        >
          {running ? 'Reading…' : stale ? 'Read again' : next ? 'Read the case' : 'Read in full'}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
          {error}
        </p>
      )}

      {stale && !running && (
        <p className="text-xs rounded-lg px-3 py-2 mb-3 bg-amber-50 border border-amber-200 text-amber-800">
          The facts have changed since this was read. What is below was true of the facts it was read
          against — reading again starts from the Wage Order.
        </p>
      )}

      {!stale && outdated.length > 0 && !running && (
        <p className="text-xs rounded-lg px-3 py-2 mb-3 bg-blue-50 border border-blue-200 text-blue-800">
          {outdated.join(' and ')} would be read differently now — the model changed, or the Wage
          Order they were read under did. Everything else stands and will not be run again.
        </p>
      )}

      {running && (
        <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-gold/5 border border-gold/20 mb-3">
          <div className="w-4 h-4 shrink-0 rounded-full border-2 border-gold border-t-transparent animate-spin" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-700">
              {STAGES.indexOf(running) + 1} of {STAGES.length} — {STAGE_LABEL[running]}
            </p>
            <p className="text-[11px] text-gray-400 tabular-nums">
              <Elapsed /> · what is below is already read
            </p>
          </div>
          <div className="flex gap-1 shrink-0">
            {STAGES.map((s, i) => (
              <span
                key={s}
                className={`h-1 w-8 rounded-full ${i <= STAGES.indexOf(running) ? 'bg-gold' : 'bg-gray-200'}`}
              />
            ))}
          </div>
        </div>
      )}

      {loaded && !reading && !running && (
        <p className="text-sm text-gray-500">
          Not read yet. Four passes: which Wage Order governs the employer, then the claims in two
          halves, then the chronology and the evidence spine.
        </p>
      )}

      {findings.length > 0 && (
        // Out of the panel's padding and into its own sheet: the reading is a
        // document somebody sits down with, not a field in a form.
        <div className="-mx-5 mt-4">
          <ReadingDocument
            clientName={clientName}
            findings={findings}
            choice={choice}
            facts={facts}
            readOn={updatedAt}
          />
        </div>
      )}

      {spine && (
        <p className="text-[11px] text-gray-400 mt-3">
          Chronology: {spine.events?.length ?? 0} events, {spine.anomalies?.length ?? 0} anomalies,{' '}
          {spine.records?.length ?? 0} records on the spine.
        </p>
      )}
    </section>
  )
}

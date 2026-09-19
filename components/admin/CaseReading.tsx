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

const STATE_STYLE: Record<string, string> = {
  supported: 'bg-green-100 text-green-700',
  'partially supported': 'bg-amber-100 text-amber-700',
  contradicted: 'bg-red-100 text-red-700',
  unknown: 'bg-gray-100 text-gray-500',
  'needs authority': 'bg-blue-50 text-blue-600',
}

const STANDING_STYLE: Record<string, string> = {
  'elements met': 'bg-green-100 text-green-700',
  'gaps to close': 'bg-amber-100 text-amber-700',
  blocked: 'bg-red-100 text-red-700',
  'not raised by these facts': 'bg-gray-100 text-gray-500',
}

type Finding = {
  claimId: string
  standing: string
  elements: { key: string; state: string; reasoning: string; wouldSettleIt: string }[]
  adverse: string[]
  defense: string
}

type Choice = {
  proposal: { order: string; industry: string; businessIs: string; reliedOn: string; because: string }
  dlse: { entry: string; orders: string; agrees: boolean } | null
  caveat: string
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

function ClaimCard({ f }: { f: Finding }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full text-left px-4 py-2.5 hover:bg-gray-50">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-900">{f.claimId}</span>
          <span
            className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${STANDING_STYLE[f.standing] ?? 'bg-gray-100 text-gray-500'}`}
          >
            {f.standing}
          </span>
          <span className="ml-auto text-gray-300 text-xs">{open ? '−' : '+'}</span>
        </div>
        <div className="flex gap-1 mt-1.5 flex-wrap">
          {f.elements.map(e => (
            <span
              key={e.key}
              title={`${e.key}: ${e.state}`}
              className={`text-[9px] font-bold uppercase px-1 py-0.5 rounded ${STATE_STYLE[e.state] ?? 'bg-gray-100'}`}
            >
              {e.key}
            </span>
          ))}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-3 pt-1 space-y-2.5 bg-gray-50/70 border-t border-gray-100">
          {f.elements.map(e => (
            <div key={e.key}>
              <p className="text-[11px] font-bold text-gray-500">
                {e.key} — <span className="font-medium">{e.state}</span>
              </p>
              <p className="text-xs text-gray-700 mt-0.5">{e.reasoning}</p>
              {e.wouldSettleIt && (
                <p className="text-[11px] text-gray-500 mt-0.5">
                  <span className="font-semibold">Would settle it: </span>
                  {e.wouldSettleIt}
                </p>
              )}
            </div>
          ))}
          {f.adverse.length > 0 && (
            <div className="pt-1 border-t border-gray-200">
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-500 mb-1">
                Cuts against
              </p>
              <ul className="space-y-1">
                {f.adverse.map((a, i) => (
                  <li key={i} className="text-xs text-gray-700">
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {f.defense && (
            <div className="pt-1 border-t border-gray-200">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                Defence to expect
              </p>
              <p className="text-xs text-gray-700">{f.defense}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function CaseReading({ clientId }: { clientId: string }) {
  const [reading, setReading] = useState<StoredReading | null>(null)
  const [stale, setStale] = useState(false)
  const [facts, setFacts] = useState(0)
  const [running, setRunning] = useState<Stage | null>(null)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/reading`, { headers })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || 'Could not load the reading.')
      setReading(body.reading)
      setStale(Boolean(body.stale))
      setFacts(body.facts ?? 0)
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
        stage = body.next as Stage | null
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
    if (stale && reading) {
      await fetch(`/api/admin/clients/${clientId}/reading`, { method: 'DELETE', headers })
      setReading(null)
      setStale(false)
      await walk('wage order')
      return
    }
    await walk(nextStage(reading))
  }

  const choice = reading?.wageOrder as Choice | undefined
  const findings = allClaims<Finding>(reading)
  const next = nextStage(reading)
  const spine = reading?.spine as { events?: unknown[]; anomalies?: unknown[]; records?: unknown[] } | undefined

  return (
    <section className="px-5 py-4 border-t border-gray-100">
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
          Claims &amp; evidence
        </h4>
        <span className="text-[11px] text-gray-400">
          {loaded ? `${describeReading(reading)} ${facts} facts on file.` : 'Loading…'}
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

      {choice?.proposal?.order && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 px-4 py-3 mb-3">
          <p className="text-sm font-semibold text-gray-900">
            IWC Wage Order {choice.proposal.order} — {choice.proposal.industry}
          </p>
          <p className="text-xs text-gray-600 mt-1">{choice.proposal.because}</p>
          <p className="text-[11px] text-gray-500 mt-1.5">
            <span className="font-semibold">Read out of: </span>
            {choice.proposal.reliedOn}
          </p>
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
              proposed, not confirmed
            </span>
            {choice.dlse && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded border ${
                  choice.dlse.agrees
                    ? 'bg-white text-gray-500 border-gray-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}
              >
                Labor Commissioner&rsquo;s index: {choice.dlse.entry} → Order {choice.dlse.orders}
              </span>
            )}
          </div>
        </div>
      )}

      {reading?.failed && reading.failed.length > 0 && (
        <div className="text-xs rounded-lg px-3 py-2 mb-3 bg-red-50 border border-red-200 text-red-700">
          <p className="font-semibold mb-0.5">
            {reading.failed.length} claim{reading.failed.length === 1 ? '' : 's'} could not be read:
          </p>
          <ul>
            {reading.failed.map(f => (
              <li key={f.claimId}>
                • {f.claimId} — {f.why}
              </li>
            ))}
          </ul>
        </div>
      )}

      {findings.length > 0 && (
        <div className="space-y-2">
          {findings.map(f => (
            <ClaimCard key={f.claimId} f={f} />
          ))}
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

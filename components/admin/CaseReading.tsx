'use client'

import { useCallback, useEffect, useState } from 'react'
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
import { ORDERS, ORDER_NAMES } from '@/lib/wageOrderNumber'

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
 *   WHICH ORDER, AND WHETHER AN ATTORNEY HAS DECIDED IT. Every rest-period and
 *   hours finding below depends on it, and it is a legal classification this
 *   system proposes rather than decides. Where it cannot propose one, the claims
 *   wait, and this panel is where an attorney chooses.
 *
 *   WHICH CLAIMS COULD NOT BE READ. A run that loses one to a flake and
 *   returns nine looks exactly like a complete reading of a nine-claim case.
 *
 *   WHETHER THE FACTS HAVE MOVED SINCE. A matrix saying an element is
 *   contradicted, read against a fact the client has since corrected, is a
 *   wrong answer with a date on it.
 */

const headers = { 'Content-Type': 'application/json' }

/** The Labor Commissioner's own index of businesses. Secondary, and it says so. */
const DLSE_PAMPHLET = 'https://www.dir.ca.gov/dlse/whichiwcorderclassifications.pdf'

type OrderProposal = Choice['proposal'] & { whatWouldSettleIt?: string }

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
  /** Why the claims cannot be read yet. The screen cannot run the checks. */
  const [orderProblem, setOrderProblem] = useState('')
  const [orderPick, setOrderPick] = useState('')
  const [savingOrder, setSavingOrder] = useState(false)

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
      setOrderProblem(body.orderProblem ?? '')
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
        setOrderProblem(body.orderProblem ?? '')
        setNext((body.next as Stage | null) ?? null)
        // A Wage Order that cannot be used stops the walk here, whichever way it
        // is wrong: the panel says so, and reading it again is a person's choice.
        stage = body.orderProblem ? null : (body.next as Stage | null)
      } catch (err) {
        setError((err as Error).message)
        break
      }
    }
    setRunning(null)
    void load()
  }

  /**
   * The FEHA claims alone, one request. Offered where the stage is unread on a
   * reading taken before it existed, or where the screen in code skipped it —
   * a person who has read the facts can overrule the screen, and pays for it
   * knowingly.
   */
  const readFeha = async (force: boolean) => {
    if (!window.confirm('Read the seven FEHA claims against this file? One model stage — about as long and as costly as one half of the wage claims.')) return
    setError('')
    setRunning('claims 3')
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/reading`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ stage: 'claims 3', force }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || 'The FEHA stage failed.')
      setReading(body.reading)
    } catch (err) {
      setError((err as Error).message)
    }
    setRunning(null)
    void load()
  }

  /** An attorney's Order, or an empty one to take it back. Nothing is read or paid for here. */
  const saveOrder = async (order: string) => {
    const asked = order
      ? `Use Wage Order ${order} (${ORDER_NAMES[order]}) for ${clientName}? Only an attorney should choose this. The claims are then read under it, about $1.65, tonight or when you press Read the case.`
      : 'Take back this choice and go back to what the reading proposed?'
    if (!window.confirm(asked)) return
    setError('')
    setSavingOrder(true)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/reading`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ order }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || 'The Wage Order could not be saved.')
      setOrderPick('')
    } catch (err) {
      setError((err as Error).message)
    }
    setSavingOrder(false)
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
  const proposal = choice?.proposal as OrderProposal | undefined
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
        {/* A tab in a modal is where this is read; the brief is where the
            whole case is put in one order and taken away. Opened rather than
            downloaded outright, because the attorney should see the page they
            are about to keep. */}
        {/* Two sheets, kept apart the way the corpus keeps them: the record,
            and the argument built on it. */}
        {loaded && (
          <a
            href={`/admin/factual/${clientId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-black transition-colors"
          >
            Open facts
          </a>
        )}
        {loaded && (
          <a
            href={`/admin/reading/${clientId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-black transition-colors"
          >
            Open brief
          </a>
        )}
        <button
          onClick={start}
          disabled={Boolean(running) || (!next && !stale)}
          className={`${loaded ? '' : 'ml-auto '}text-xs font-semibold px-3 py-1.5 rounded-lg bg-black text-white disabled:opacity-40 hover:bg-gray-800 transition-colors`}
        >
          {running
            ? 'Reading…'
            : stale
              ? 'Read again'
              : next
                ? 'Read the case'
                : orderProblem
                  ? 'Waiting on the Wage Order'
                  : 'Read in full'}
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
          {outdated.join(' and ')} would be read differently now — the model, the Wage Order, the
          claim definitions or the authority they were read against changed since. Everything else
          stands and will not be run again.
        </p>
      )}

      {!running && orderProblem && !stale && (
        <div className="text-xs rounded-lg px-3 py-3 mb-3 bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
          <p className="font-semibold">{orderProblem}</p>
          {proposal?.whatWouldSettleIt && (
            <p>
              <span className="font-semibold">What would settle it: </span>
              {proposal.whatWouldSettleIt}
            </p>
          )}
          {proposal?.because && (
            <details>
              <summary className="cursor-pointer font-semibold">What the reading found</summary>
              <p className="mt-1">{proposal.because}</p>
            </details>
          )}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <select
              aria-label="Wage Order"
              value={orderPick}
              onChange={e => setOrderPick(e.target.value)}
              className="max-w-full rounded-md border border-amber-300 bg-white px-2 py-1 text-xs text-gray-800"
            >
              <option value="">Choose a Wage Order…</option>
              {ORDERS.map(order => (
                <option key={order} value={order}>
                  Order {order}: {ORDER_NAMES[order]}
                </option>
              ))}
            </select>
            <button
              onClick={() => saveOrder(orderPick)}
              disabled={!orderPick || savingOrder}
              className="font-semibold px-2.5 py-1 rounded-md bg-black text-white disabled:opacity-40 hover:bg-gray-800"
            >
              {savingOrder ? 'Saving…' : 'Use this Order'}
            </button>
            <a href={DLSE_PAMPHLET} target="_blank" rel="noopener noreferrer" className="underline">
              Labor Commissioner&apos;s index (secondary)
            </a>
          </div>
          <p>
            Only an attorney should choose. To ask the client instead, press{' '}
            <span className="font-semibold">Write the next questions</span> below: this question goes
            into the draft, and you read it before it is sent.
          </p>
        </div>
      )}

      {!running && choice?.confirmed && choice.chosen && (
        <div className="text-xs rounded-lg px-3 py-2 mb-3 bg-gray-50 border border-gray-200 text-gray-700 flex items-start gap-3">
          <p className="flex-1">
            <span className="font-semibold">
              Wage Order {choice.proposal.order} ({ORDER_NAMES[choice.proposal.order]}), chosen by an attorney
            </span>{' '}
            on {new Date(choice.chosen.at).toLocaleDateString()}. The reading had proposed{' '}
            {choice.chosen.modelSaid ? `Order ${choice.chosen.modelSaid}` : 'no Order'}.
          </p>
          <button
            onClick={() => saveOrder('')}
            disabled={savingOrder}
            className="shrink-0 font-semibold px-2.5 py-1 rounded-md border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40"
          >
            Take back
          </button>
        </div>
      )}

      {!stale && !running && reading && Boolean(reading.wageOrder) && (!reading.claims3 || Boolean(reading.fehaSkipped)) && (
        <div className="text-xs rounded-lg px-3 py-2 mb-3 bg-gray-50 border border-gray-200 text-gray-700 flex items-start gap-3">
          <p className="flex-1">
            {reading.claims3
              ? `FEHA claims not read: ${reading.fehaSkipped}`
              : 'The FEHA claims have not been read on this file. It was read before they existed.'}
          </p>
          <button
            onClick={() => readFeha(Boolean(reading.claims3))}
            className="shrink-0 font-semibold px-2.5 py-1 rounded-md border border-gray-300 bg-white hover:bg-gray-100"
          >
            {reading.claims3 ? 'Read them anyway' : 'Read the FEHA claims'}
          </button>
        </div>
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

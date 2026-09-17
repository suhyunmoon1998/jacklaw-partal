'use client'

import { useCallback, useEffect, useState } from 'react'
import { MOCK_ADMIN_PASSWORD } from '@/lib/mockData'
import { Analysis, Basis, Issue, Strength } from '@/lib/caseAnalysis'

/**
 * The AI reading of one client's answers, against California wage-and-hour law.
 *
 * Laid out so a lawyer can scan it in the order they would think: what happened,
 * who they worked for and for how long, what that runs into, what it might be
 * worth, and what we still have to ask. Every figure carries how it was arrived
 * at — stated fact, derived estimate, our assumption, or a legal point to check
 * — because a damages number whose basis is invisible has to be re-derived by
 * hand before anyone can use it.
 *
 * Reading is not free: it is an Opus call over the whole questionnaire. So it is
 * fetched from the store on open and only run when somebody asks for it.
 */

const headers = { 'Content-Type': 'application/json', 'x-admin-key': MOCK_ADMIN_PASSWORD }

const BASIS_STYLE: Record<Basis, { cls: string; title: string }> = {
  FACT: {
    cls: 'bg-green-50 text-green-700 border-green-200',
    title: 'The client stated this',
  },
  ESTIMATE: {
    cls: 'bg-amber-50 text-amber-700 border-amber-200',
    title: 'Derived from what the client stated',
  },
  ASSUMPTION: {
    cls: 'bg-orange-50 text-orange-700 border-orange-300',
    title: 'Supplied by the analysis — the client did not state it',
  },
  CONFIRM: {
    cls: 'bg-blue-50 text-blue-700 border-blue-200',
    title: 'A legal point, rate or cap that has to be checked',
  },
}

const STRENGTH_STYLE: Record<Strength, string> = {
  strong: 'bg-red-100 text-red-700',
  moderate: 'bg-amber-100 text-amber-700',
  weak: 'bg-gray-100 text-gray-600',
  'needs facts': 'bg-blue-50 text-blue-600',
}

/** Strongest first — the reader should not have to sort the list themselves. */
const STRENGTH_ORDER: Strength[] = ['strong', 'moderate', 'needs facts', 'weak']

function BasisChip({ basis }: { basis: Basis }) {
  const s = BASIS_STYLE[basis]
  return (
    <span
      title={s.title}
      className={`text-[10px] font-bold tracking-wide px-1.5 py-0.5 rounded border ${s.cls}`}
    >
      {basis}
    </span>
  )
}

/** Seconds since it started. A still spinner at three minutes reads as broken. */
function Elapsed() {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const m = Math.floor(seconds / 60)
  return <>{m ? `${m}m ` : ''}{seconds % 60}s</>
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-5 py-4 border-t border-gray-100">
      <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2.5">{title}</h4>
      {children}
    </section>
  )
}

function Bullets({ items, className = '' }: { items: string[]; className?: string }) {
  if (!items.length) return null
  return (
    <ul className={`space-y-1.5 ${className}`}>
      {items.map((t, i) => (
        <li key={i} className="text-sm text-gray-700 flex gap-2">
          <span className="text-gray-300 shrink-0">•</span>
          <span>{t}</span>
        </li>
      ))}
    </ul>
  )
}

function IssueCard({ issue }: { issue: Issue }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-black text-white">
            {issue.category}
          </span>
          <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${STRENGTH_STYLE[issue.strength]}`}>
            {issue.strength}
          </span>
          <span className="ml-auto text-gray-300 text-xs">{open ? '−' : '+'}</span>
        </div>
        <p className="text-sm font-semibold text-gray-900">{issue.headline}</p>
        {issue.estimate && (
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
            <span className="font-semibold text-gray-700">{issue.estimate}</span>
            <BasisChip basis={issue.basis} />
          </p>
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-3 bg-gray-50/70 border-t border-gray-100">
          {issue.because.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                What they said
              </p>
              <Bullets items={issue.because} />
            </div>
          )}
          {issue.law && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Law</p>
              <p className="text-sm text-gray-800 font-medium">{issue.law}</p>
              {issue.why && <p className="text-sm text-gray-600 mt-1">{issue.why}</p>}
            </div>
          )}
          {issue.math && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Math</p>
              <pre className="text-xs text-gray-800 bg-white rounded-lg border border-gray-200 p-3 whitespace-pre-wrap font-mono overflow-x-auto">
                {issue.math}
              </pre>
            </div>
          )}
          {issue.confirm.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                Confirm before relying on this
              </p>
              <Bullets items={issue.confirm} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface Loaded {
  analysis: Analysis | null
  createdAt?: string
  model?: string
  durationMs?: number
  stale?: boolean
  lawChanged?: boolean
}

export default function CaseAnalysis({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [state, setState] = useState<Loaded | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showNotRaised, setShowNotRaised] = useState(false)

  useEffect(() => {
    let live = true
    setState(null)
    setError(null)
    fetch(`/api/admin/clients/${clientId}/analysis`, { headers })
      .then(r => r.json())
      .then(d => { if (live) setState(d) })
      .catch(() => { if (live) setState({ analysis: null }) })
    return () => { live = false }
  }, [clientId])

  const run = useCallback(async () => {
    setRunning(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/analysis`, { method: 'POST', headers })
      const data = await res.json()
      if (!res.ok) setError(data?.error ?? 'The analysis could not be run.')
      else setState(data)
    } catch {
      setError('The analysis could not be reached. Try again.')
    }
    setRunning(false)
  }, [clientId])

  if (!state) {
    return <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
  }

  const a = state.analysis

  if (running) {
    return (
      <div className="p-10 text-center">
        <div className="w-8 h-8 mx-auto mb-4 rounded-full border-2 border-gold border-t-transparent animate-spin" />
        <p className="text-sm font-semibold text-gray-700">Reading {clientName}&apos;s answers</p>
        <p className="text-xs text-gray-400 mt-1">
          Against the office&apos;s damages methodology and the Labor Code.
        </p>
        <p className="text-xs text-gray-400 mt-2 tabular-nums">
          <Elapsed /> · usually three to five minutes
        </p>
      </div>
    )
  }

  if (!a) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm font-semibold text-gray-700">No analysis yet</p>
        <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
          Reads everything {clientName} has answered against California wage-and-hour law and
          reports what it runs into, with the arithmetic and what is still missing.
        </p>
        {error && <p className="text-xs text-red-600 mt-3 max-w-sm mx-auto">{error}</p>}
        <button
          onClick={run}
          className="mt-4 px-4 py-2 bg-gold text-white text-sm font-semibold rounded-xl hover:bg-gold/90 transition-colors"
        >
          Run analysis
        </button>
      </div>
    )
  }

  const issues = [...a.issues].sort(
    (x, y) => STRENGTH_ORDER.indexOf(x.strength) - STRENGTH_ORDER.indexOf(y.strength)
  )

  return (
    <div className="pb-2">
      {/* Work product. The one line on this screen that must never be missed. */}
      <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-200">
        <p className="text-[11px] text-amber-800 leading-snug">
          <span className="font-bold">Attorney work product — staff only.</span> Preliminary reading
          by AI. Not advice, not verified, and never to be shown or sent to the client.
        </p>
      </div>

      {(state.stale || error) && (
        <div className="px-5 py-2.5 bg-blue-50 border-b border-blue-200 flex items-center gap-3">
          <p className="text-[11px] text-blue-800 flex-1">
            {error ??
              (state.lawChanged
                ? 'The law source has changed since this was written.'
                : 'The answers or the file have changed since this was written.')}
          </p>
          <button
            onClick={run}
            className="text-[11px] font-bold text-blue-700 hover:text-blue-900 whitespace-nowrap"
          >
            Re-run
          </button>
        </div>
      )}

      <div className="px-5 py-4">
        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">{a.summary}</p>
      </div>

      {a.baseline.length > 0 && (
        <Section title="Employment baseline">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {a.baseline.map((b, i) => (
              <div key={i} className="flex items-baseline gap-2 text-sm">
                <span className="text-gray-400 w-32 shrink-0 truncate" title={b.label}>{b.label}</span>
                <span className="text-gray-900 flex-1">{b.value}</span>
                <BasisChip basis={b.basis} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {issues.length > 0 && (
        <Section title={`Issues (${issues.length})`}>
          <div className="space-y-2">
            {issues.map((issue, i) => <IssueCard key={i} issue={issue} />)}
          </div>
        </Section>
      )}

      <Section title="Preliminary value">
        <div className="space-y-1.5 text-sm">
          {([
            ['Known or strongly supported', a.totals.supported],
            ['Reasonably estimated', a.totals.estimated],
            ['Potential additional statutory', a.totals.potentialStatutory],
          ] as const).map(([label, value]) => (
            <div key={label} className="flex items-baseline gap-2">
              <span className="text-gray-400 flex-1">{label}</span>
              <span className="text-gray-900 font-medium">{value}</span>
            </div>
          ))}
          <div className="flex items-baseline gap-2 pt-2 mt-1 border-t border-gray-100">
            <span className="text-gray-700 font-semibold flex-1">
              Preliminary total
              <span className="block text-[10px] font-normal text-gray-400">
                excluding PAGA, interest, fees and costs
              </span>
            </span>
            <span className="text-gray-900 font-bold">{a.totals.preliminaryTotal}</span>
          </div>
        </div>
        {a.drivers && <p className="text-sm text-gray-600 mt-3 leading-relaxed">{a.drivers}</p>}
      </Section>

      {a.separateExposure.length > 0 && (
        <Section title="Separate exposure">
          <div className="space-y-2">
            {a.separateExposure.map((e, i) => (
              <div key={i} className="text-sm">
                <div className="flex items-baseline gap-2">
                  <span className="text-gray-400 flex-1">{e.label}</span>
                  <span className="text-gray-900 font-medium">{e.value}</span>
                </div>
                {e.note && <p className="text-xs text-gray-500 mt-0.5">{e.note}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {a.limitations && (
        <Section title="Limitations">
          <p className="text-sm text-gray-700 leading-relaxed">{a.limitations}</p>
        </Section>
      )}

      {a.doubleCounting.length > 0 && (
        <Section title="Overlap to resolve before totalling">
          <Bullets items={a.doubleCounting} />
        </Section>
      )}

      {a.missingFacts.length > 0 && (
        <Section title="Missing facts that could change the result">
          <Bullets items={a.missingFacts} />
        </Section>
      )}

      {a.nextSteps.length > 0 && (
        <Section title="Next">
          <Bullets items={a.nextSteps} />
        </Section>
      )}

      {a.notRaised.length > 0 && (
        <Section title={`Considered and set aside (${a.notRaised.length})`}>
          <button
            onClick={() => setShowNotRaised(s => !s)}
            className="text-xs font-semibold text-gray-500 hover:text-gray-800"
          >
            {showNotRaised ? 'Hide' : 'Show'}
          </button>
          {showNotRaised && (
            <div className="mt-2 space-y-1.5">
              {a.notRaised.map((n, i) => (
                <p key={i} className="text-sm text-gray-600">
                  <span className="font-medium text-gray-800">{n.category}</span> — {n.why}
                </p>
              ))}
            </div>
          )}
        </Section>
      )}

      <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-3">
        <p className="text-[11px] text-gray-400 flex-1">
          {state.createdAt && `Read ${new Date(state.createdAt).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
          })}`}
          {state.model && ` · ${state.model}`}
          {state.durationMs ? ` · ${Math.round(state.durationMs / 1000)}s` : ''}
        </p>
        <button
          onClick={run}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-700 hover:text-white transition-colors"
        >
          Re-run
        </button>
      </div>
    </div>
  )
}

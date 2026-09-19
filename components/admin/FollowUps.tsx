'use client'

import { useCallback, useEffect, useState } from 'react'
import { MOCK_ADMIN_PASSWORD } from '@/lib/mockData'
// From the shape module, never from the engine: importing a value out of
// lib/followUp.ts pulls the model SDK and node:fs into the browser bundle, and
// the build says so in a stack trace that names neither.
import { LADDER } from '@/lib/followUpShape'
import type { FollowUp } from '@/lib/followUpShape'
import type { FollowUpPlan } from '@/lib/followUpStore'

/**
 * The next questions to put to a client, laid out for the person who has to
 * approve them.
 *
 * Every other panel in this admin is read. This one is signed off: the
 * questions were written by a model and go to a real worker's phone, so the
 * whole layout is built around making approval possible rather than making
 * generation easy.
 *
 * Three things are therefore always visible and never behind a click.
 *
 *   THE TRANSLATION AND THE ENGLISH, TOGETHER. The client reads the Korean.
 *   Nobody can approve a Korean question by reading an English one, and nobody
 *   at this firm should have to approve a Korean question they cannot check.
 *   Both, side by side, every time.
 *
 *   WHAT EACH QUESTION IS FOR. A question that closes nothing is a question
 *   that should not be asked, and the reviewer can only see that if the reason
 *   is on the same row.
 *
 *   WHAT WAS LEFT OUT. The corpus's stopping rule makes the omissions a
 *   finding rather than a gap, and the reviewer is the person entitled to
 *   disagree with them.
 *
 * Nothing here sends. A generated round lands as a draft assignment, which the
 * client's portal already hides, and it goes out from the Question Sets tab
 * like any other — by a person, on purpose.
 */

const headers = { 'Content-Type': 'application/json', 'x-admin-key': MOCK_ADMIN_PASSWORD }

// A number key, not the literal union LADDER carries: a stored rung comes back
// from the database as a plain integer, and vet() is what decides whether it is
// one the ladder has.
const RUNG_LABEL = new Map<number, string>(LADDER.map(l => [l.rung as number, l.key as string]))

/** Warmer as the question gets harder to ask. */
const RUNG_STYLE: Record<number, string> = {
  1: 'bg-gray-100 text-gray-600',
  2: 'bg-blue-50 text-blue-700',
  3: 'bg-blue-50 text-blue-700',
  4: 'bg-blue-50 text-blue-700',
  5: 'bg-violet-50 text-violet-700',
  6: 'bg-emerald-50 text-emerald-700',
  7: 'bg-violet-50 text-violet-700',
  8: 'bg-amber-100 text-amber-800',
  9: 'bg-gray-100 text-gray-600',
  10: 'bg-gray-100 text-gray-600',
}

const KIND_TITLE: Record<string, string> = {
  'open loop': 'A fact on file points at something nobody has yet',
  element: 'An element of a claim the office cannot presently reach',
  'date conflict': 'Two facts put the same event at different times',
  silence: 'A stretch of the employment nothing is known about',
  anomaly: 'Something odd in the record',
  contradiction: 'Two of her own answers disagree',
  'damages input': 'A number a damages figure needs',
  record: 'A document nobody has',
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

function QuestionRow({ q, why }: { q: FollowUp; why: string }) {
  return (
    <li className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span
            title={`Rung ${q.rung} of the question ladder`}
            className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${RUNG_STYLE[q.rung] ?? 'bg-gray-100 text-gray-600'}`}
          >
            {RUNG_LABEL.get(q.rung) ?? `rung ${q.rung}`}
          </span>
          <span
            title={KIND_TITLE[q.resolves.kind] ?? 'What this closes'}
            className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-50 text-gray-500 border border-gray-200"
          >
            {q.resolves.kind}
          </span>
          <span className="text-[10px] text-gray-300 font-mono truncate">{q.resolves.ref}</span>
          {q.askOnlyIf && (
            <span className="text-[10px] text-gray-400 ml-auto">
              only after {q.askOnlyIf.questionId}
            </span>
          )}
        </div>

        {/* What she reads, first and largest. The English is the check on it. */}
        {q.inTheirLanguage ? (
          <>
            <p className="text-[15px] text-gray-900 leading-relaxed">{q.inTheirLanguage.label}</p>
            <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{q.label}</p>
          </>
        ) : (
          <p className="text-[15px] text-gray-900 leading-relaxed">{q.label}</p>
        )}

        {q.options.length > 0 && (
          <ul className="mt-2.5 space-y-1">
            {q.options.map((o, i) => (
              <li key={i} className="text-xs text-gray-600 flex gap-2">
                <span className="text-gray-300 shrink-0">○</span>
                <span>
                  {q.inTheirLanguage?.options?.[i] ?? o}
                  {q.inTheirLanguage?.options?.[i] && (
                    <span className="text-gray-400"> · {o}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}

        {why && (
          <p className="text-xs text-gray-500 mt-2.5 pt-2.5 border-t border-gray-100">
            <span className="font-semibold text-gray-600">Why: </span>
            {why}
          </p>
        )}
      </div>
    </li>
  )
}

function BuiltFrom({ from, factCount }: { from: FollowUpPlan['builtFrom']; factCount: number }) {
  // Three states, and the third is not the second. A round nobody recorded the
  // inputs for is not a round we know was written from the ledger alone.
  if (!from) {
    return (
      <div className="text-[11px] rounded-lg px-3 py-2 border bg-gray-50 border-gray-200 text-gray-500">
        Written against {factCount} facts. Nothing recorded what else was on file at the time.
      </div>
    )
  }
  const thin = !from.matrix && !from.spine
  return (
    <div
      className={`text-[11px] rounded-lg px-3 py-2 border ${
        thin ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-gray-50 border-gray-200 text-gray-500'
      }`}
    >
      Written against {from.ledger} facts
      {from.matrix ? `, ${from.matrix} claims` : ''}
      {from.spine ? ', and the evidence spine' : ''}.
      {thin && (
        <>
          {' '}
          The claim matrix and evidence spine were not on file, so this round could not ask about
          elements nobody can reach, gaps in the timeline, or dates that do not line up.
        </>
      )}
    </div>
  )
}

export default function FollowUps({ clientId }: { clientId: string }) {
  const [plans, setPlans] = useState<FollowUpPlan[] | null>(null)
  const [questions, setQuestions] = useState<FollowUp[] | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [limit, setLimit] = useState(20)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/follow-ups`, { headers })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || 'Could not load the rounds.')
      setPlans(body.plans ?? [])
    } catch (err) {
      setError((err as Error).message)
      setPlans([])
    }
  }, [clientId])

  useEffect(() => {
    void load()
  }, [load])

  const write = async () => {
    setRunning(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/follow-ups`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ limit }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || 'The questions could not be written.')
      setQuestions(body.questions ?? [])
      await load()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setRunning(false)
    }
  }

  const review = async (planId: string) => {
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/follow-ups`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ planId, by: 'admin' }),
      })
      if (!res.ok) throw new Error((await res.json())?.error || 'Could not record the review.')
      await load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const latest = plans?.[0]

  return (
    <section className="px-5 py-4 border-t border-gray-100">
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
          Next questions
        </h4>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-[11px] text-gray-400">
            at most{' '}
            <input
              type="number"
              min={1}
              max={40}
              value={limit}
              onChange={e => setLimit(Math.min(40, Math.max(1, Number(e.target.value) || 1)))}
              className="w-12 text-center border border-gray-200 rounded px-1 py-0.5 text-gray-700 tabular-nums"
            />
          </label>
          <button
            onClick={write}
            disabled={running}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-black text-white disabled:opacity-40 hover:bg-gray-800 transition-colors"
          >
            {running ? 'Writing…' : 'Write the next questions'}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
          {error}
        </p>
      )}

      {running && (
        <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-gold/5 border border-gold/20 mb-3">
          <div className="w-4 h-4 shrink-0 rounded-full border-2 border-gold border-t-transparent animate-spin" />
          <p className="text-[11px] text-gray-500 tabular-nums">
            <Elapsed /> · reading the whole file before it writes anything
          </p>
        </div>
      )}

      {plans === null && !running && <p className="text-xs text-gray-400">Loading…</p>}

      {plans !== null && plans.length === 0 && !running && (
        <p className="text-sm text-gray-500">
          No round has been written yet. A round is written from what the file already knows it is
          missing, and lands as a draft the client cannot see.
        </p>
      )}

      {latest && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-gray-500">
              {latest.questions.length} questions · {new Date(latest.createdAt).toLocaleDateString()}
            </span>
            {latest.reviewedAt ? (
              <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">
                read by {latest.reviewedBy}
              </span>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                not reviewed
              </span>
            )}
            {plans.length > 1 && (
              <span className="text-gray-400">· {plans.length - 1} earlier</span>
            )}
          </div>

          <BuiltFrom from={latest.builtFrom} factCount={latest.factCount} />

          {latest.vetProblems.length > 0 && (
            <div className="text-xs rounded-lg px-3 py-2 bg-red-50 border border-red-200 text-red-700">
              <p className="font-semibold mb-1">
                {latest.vetProblems.length} question
                {latest.vetProblems.length === 1 ? '' : 's'} need rewriting before this goes out:
              </p>
              <ul className="space-y-0.5">
                {latest.vetProblems.map(p =>
                  p.problems.map((x, i) => (
                    <li key={`${p.id}-${i}`}>• {x}</li>
                  ))
                )}
              </ul>
            </div>
          )}

          {questions && questions.length > 0 && (
            <ul className="space-y-2">
              {questions.map(q => (
                <QuestionRow
                  key={q.id}
                  q={q}
                  why={latest.questions.find(m => m.questionKey === q.id)?.whyItMatters ?? q.whyItMatters}
                />
              ))}
            </ul>
          )}

          {!questions && (
            <ul className="space-y-1.5">
              {latest.questions.map(m => (
                <li key={m.questionKey} className="text-xs text-gray-600 flex gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0 ${RUNG_STYLE[m.rung] ?? 'bg-gray-100 text-gray-600'}`}
                  >
                    {RUNG_LABEL.get(m.rung) ?? m.rung}
                  </span>
                  <span>{m.whyItMatters}</span>
                </li>
              ))}
              <li className="text-[11px] text-gray-400 pt-1">
                The questions themselves are in the Question Sets tab, under this client&rsquo;s draft
                assignment.
              </li>
            </ul>
          )}

          {latest.leftOut.length > 0 && (
            <details className="rounded-xl border border-gray-200">
              <summary className="px-4 py-2.5 text-xs font-semibold text-gray-600 cursor-pointer hover:bg-gray-50">
                Deliberately not asked ({latest.leftOut.length})
              </summary>
              <ul className="px-4 pb-3 space-y-2.5">
                {latest.leftOut.map((x, i) => (
                  <li key={i} className="text-xs">
                    <p className="text-gray-700 font-medium">{x.gap}</p>
                    <p className="text-gray-500 mt-0.5">{x.why}</p>
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="flex items-center gap-3 flex-wrap pt-1">
            {!latest.reviewedAt && (
              <button
                onClick={() => review(latest.id)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                I have read every question
              </button>
            )}
            <p className="text-[11px] text-gray-400">
              {latest.reviewedAt
                ? 'Send it from the Question Sets tab, where it is waiting as a draft.'
                : 'It is a draft. The client cannot see it and nothing here sends it.'}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}

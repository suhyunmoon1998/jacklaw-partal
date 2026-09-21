'use client'

import { useCallback, useEffect, useState } from 'react'
import { MOCK_ADMIN_PASSWORD } from '@/lib/mockData'
// From the shape module, never from the engine: importing a value out of
// lib/followUp.ts pulls the model SDK and node:fs into the browser bundle, and
// the build says so in a stack trace that names neither.
import { LADDER } from '@/lib/followUpShape'
import type { FollowUp } from '@/lib/followUpShape'
import type { FollowUpPlan } from '@/lib/followUpStore'
import type { Question } from '@/types'
import { roundAsText } from '@/lib/roundAsText'

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

/** What the client will actually see, plus what it is for and whether it goes. */
function QuestionRow({
  q,
  meta,
  keep,
  onToggle,
  locked,
}: {
  q: Question
  meta?: FollowUpPlan['questions'][number]
  keep: boolean
  onToggle: () => void
  locked: boolean
}) {
  const theirs = q.ko ?? q.es ?? q.zh
  return (
    <li className={`rounded-xl border overflow-hidden ${keep ? 'border-gray-200' : 'border-gray-200 bg-gray-50 opacity-55'}`}>
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={keep}
            disabled={locked}
            onChange={onToggle}
            aria-label={keep ? 'Struck from this round' : 'Put back in this round'}
            className="mt-1 shrink-0 w-4 h-4 accent-black disabled:opacity-40"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {meta && (
                <span
                  title={`Rung ${meta.rung} of the question ladder`}
                  className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${RUNG_STYLE[meta.rung] ?? 'bg-gray-100 text-gray-600'}`}
                >
                  {RUNG_LABEL.get(meta.rung) ?? `rung ${meta.rung}`}
                </span>
              )}
              {meta && (
                <span
                  title={KIND_TITLE[meta.resolvesKind] ?? 'What this closes'}
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-50 text-gray-500 border border-gray-200"
                >
                  {meta.resolvesKind}
                </span>
              )}
              {q.showIf && (
                <span className="text-[10px] text-gray-400 ml-auto">
                  only after {q.showIf.questionId}
                </span>
              )}
              {!keep && (
                <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200">
                  struck
                </span>
              )}
            </div>

            {/* What she reads, first and largest. The English is the check on it. */}
            {theirs?.label ? (
              <>
                <p className="text-[15px] text-gray-900 leading-relaxed">{theirs.label}</p>
                <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{q.label}</p>
              </>
            ) : (
              <p className="text-[15px] text-gray-900 leading-relaxed">{q.label}</p>
            )}

            {q.options && q.options.length > 0 && (
              <ul className="mt-2.5 space-y-1">
                {q.options.map((o, i) => (
                  <li key={i} className="text-xs text-gray-600 flex gap-2">
                    <span className="text-gray-300 shrink-0">\u25cb</span>
                    <span>
                      {theirs?.options?.[i] ?? o}
                      {theirs?.options?.[i] && <span className="text-gray-400"> \u00b7 {o}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {meta?.whyItMatters && (
              <p className="text-xs text-gray-500 mt-2.5 pt-2.5 border-t border-gray-100">
                <span className="font-semibold text-gray-600">Why: </span>
                {meta.whyItMatters}
              </p>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}

/**
 * What the round was written against.
 *
 * This used to warn when the claim matrix and the chronology were not on file.
 * It no longer does, because writing a round from the ledger alone is a choice
 * the office makes deliberately: on a measured file it cost 30 cents against
 * $2.85 and produced twenty questions rather than none. What the fuller
 * reading adds is real — questions about elements nobody can reach and gaps in
 * the timeline — and so is its price, and which to pay is a decision about
 * this case rather than a defect to be flagged.
 */
function BuiltFrom({ from, factCount }: { from: FollowUpPlan['builtFrom']; factCount: number }) {
  if (!from) {
    return (
      <div className="text-[11px] rounded-lg px-3 py-2 border bg-gray-50 border-gray-200 text-gray-500">
        Written against {factCount} facts. Nothing recorded what else was on file at the time.
      </div>
    )
  }
  const thin = !from.matrix && !from.spine
  return (
    <div className="text-[11px] rounded-lg px-3 py-2 border bg-gray-50 border-gray-200 text-gray-500">
      Written against {from.ledger} facts
      {from.matrix ? `, ${from.matrix} claims` : ''}
      {from.spine ? ', and the evidence spine' : ''}.
      {thin && (
        <>
          {' '}
          Reading the case first would also let it ask about elements nobody can reach and gaps in
          the timeline.
        </>
      )}
    </div>
  )
}

export default function FollowUps({
  clientId,
  clientName = '',
}: {
  clientId: string
  clientName?: string
}) {
  const [plans, setPlans] = useState<FollowUpPlan[] | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  /** Question ids still in the round. Everything else is struck. */
  const [keep, setKeep] = useState<Set<string>>(new Set())
  const [running, setRunning] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [limit, setLimit] = useState(20)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/follow-ups`, { headers })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || 'Could not load the rounds.')
      const qs: Question[] = body.questions ?? []
      setPlans(body.plans ?? [])
      setQuestions(qs)
      setKeep(new Set(qs.map(q => q.id)))
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
    setNote('')
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/follow-ups`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ limit }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || 'The questions could not be written.')
      await load()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setRunning(false)
    }
  }

  const latest = plans?.[0]
  const metaFor = (id: string) => latest?.questions.find(m => m.questionKey === id)
  const struck = questions.filter(q => !keep.has(q.id))

  /**
   * The whole round on the clipboard, both languages.
   *
   * A round that can only be read inside this modal is a round that gets
   * approved without a second opinion — and the second opinion is what a
   * person reading it is for.
   */
  const copy = async () => {
    if (!latest) return
    try {
      await navigator.clipboard.writeText(
        roundAsText({
          clientName,
          questions,
          meta: latest.questions,
          leftOut: latest.leftOut,
          builtFrom: latest.builtFrom,
          factCount: latest.factCount,
          reviewedBy: latest.reviewedAt ? latest.reviewedBy : null,
        })
      )
      setNote('Copied — both languages, with why each one is asked.')
      setError('')
    } catch {
      setError('The browser would not let this page copy. Select the questions and copy them.')
    }
  }

  const approve = async () => {
    if (!latest) return
    setBusy('approving')
    setError('')
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/follow-ups`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ planId: latest.id, keep: Array.from(keep), by: 'admin' }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || 'Could not record the review.')
      setNote(
        body.dropped?.length
          ? `Approved ${body.kept}. Struck ${body.dropped.length}.`
          : `Approved all ${body.kept}.`
      )
      await load()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy('')
    }
  }

  const send = async () => {
    if (!latest) return
    setBusy('sending')
    setError('')
    try {
      const res = await fetch(`/api/admin/assignments/${latest.assignmentId}/send`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || 'Could not send it.')
      setNote(
        [body.sms ? `Texted ${body.sms}` : null, body.email ? `emailed ${body.email}` : null]
          .filter(Boolean)
          .join(', ') || 'Sent.'
      )
      await load()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy('')
    }
  }

  const reviewed = Boolean(latest?.reviewedAt)

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
            disabled={running || Boolean(busy)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-black text-white disabled:opacity-40 hover:bg-gray-800 transition-colors"
          >
            {running ? 'Writing\u2026' : 'Write the next questions'}
          </button>
        </div>
      </div>

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
            <Elapsed /> \u00b7 reading the whole file before it writes anything
          </p>
        </div>
      )}

      {plans === null && !running && <p className="text-xs text-gray-400">Loading\u2026</p>}

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
              {questions.length} questions \u00b7 {new Date(latest.createdAt).toLocaleDateString()}
            </span>
            {reviewed ? (
              <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">
                approved by {latest.reviewedBy}
              </span>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                not approved \u2014 cannot be sent
              </span>
            )}
            {plans.length > 1 && <span className="text-gray-400">\u00b7 {plans.length - 1} earlier</span>}
            <button
              onClick={copy}
              className="ml-auto text-[11px] font-semibold text-gray-500 hover:text-gray-900 underline underline-offset-2"
            >
              Copy all {questions.length}
            </button>
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
                  p.problems.map((x, i) => <li key={`${p.id}-${i}`}>\u2022 {x}</li>)
                )}
              </ul>
            </div>
          )}

          {!reviewed && questions.length > 0 && (
            <p className="text-[11px] text-gray-500">
              Read every question as the client will see it. Untick any that should not be asked \u2014
              a struck question is deleted, not hidden. Approving is what lets this be sent.
            </p>
          )}

          <ul className="space-y-2">
            {questions.map(q => (
              <QuestionRow
                key={q.id}
                q={q}
                meta={metaFor(q.id)}
                keep={keep.has(q.id)}
                locked={reviewed || Boolean(busy)}
                onToggle={() =>
                  setKeep(prev => {
                    const next = new Set(prev)
                    if (next.has(q.id)) next.delete(q.id)
                    else next.add(q.id)
                    return next
                  })
                }
              />
            ))}
          </ul>

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
            {!reviewed ? (
              <button
                onClick={approve}
                disabled={Boolean(busy) || keep.size === 0}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-black text-white disabled:opacity-40 hover:bg-gray-800 transition-colors"
              >
                {busy === 'approving'
                  ? 'Approving\u2026'
                  : struck.length
                    ? `Approve ${keep.size}, strike ${struck.length}`
                    : `Approve all ${keep.size}`}
              </button>
            ) : (
              <button
                onClick={send}
                disabled={Boolean(busy)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gold text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                {busy === 'sending' ? 'Sending\u2026' : 'Send to the client'}
              </button>
            )}
            <p className="text-[11px] text-gray-400">
              {reviewed
                ? 'Texted first, emailed as well where there is an address. The reminder ladder chases it from here.'
                : keep.size === 0
                  ? 'Nothing left to send.'
                  : 'Nothing is sent until this is approved.'}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}

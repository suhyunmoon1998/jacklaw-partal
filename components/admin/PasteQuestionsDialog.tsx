'use client'

/**
 * Paste text in, get questions out, check them, send them to one client.
 *
 * Every client needs different follow-up, and the questions usually already
 * exist somewhere — an email from the attorney, a page of a discovery request,
 * a list someone typed in Word. This turns that text into a question set for
 * one client without anyone retyping it into the editor field by field.
 *
 * The review step is not a formality. Nothing here is created, assigned, or
 * emailed until the admin has seen every question and pressed send; up to that
 * point the dialog holds a draft and the database has not been touched.
 */

import { useEffect, useRef, useState } from 'react'
import { MOCK_ADMIN_PASSWORD } from '@/lib/mockData'
import { Lang, LANG_ENGLISH_NAME, TranslatedLang } from '@/lib/langs'
import { Question, QuestionType } from '@/types'
import ModalPortal from '@/components/ModalPortal'

const TYPE_LABELS: { value: QuestionType; label: string }[] = [
  { value: 'text', label: 'Short text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'yes_no_unsure', label: 'Yes / No / Not sure' },
  { value: 'select', label: 'Choose one' },
  { value: 'multiselect', label: 'Choose many' },
  { value: 'date', label: 'Date' },
  { value: 'phone', label: 'Phone' },
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency' },
]

const NEEDS_OPTIONS: QuestionType[] = ['select', 'multiselect']

/** Editing shape — a stable key so rows do not jump around while typing. */
interface Draft extends Question {
  key: string
}

let seq = 0
const nextKey = () => `gen-${++seq}`

/** The gating question, named the way the admin sees it on screen. */
function gateLabel(questions: Draft[], questionId: string): string {
  const gate = questions.find(q => q.id === questionId)
  if (!gate) return 'an earlier question'
  const n = questions.indexOf(gate) + 1
  const short = gate.label.length > 40 ? `${gate.label.slice(0, 40)}…` : gate.label
  return `Q${n} "${short}"`
}

const adminHeaders = {
  'Content-Type': 'application/json',
  'x-admin-key': MOCK_ADMIN_PASSWORD,
}

export default function PasteQuestionsDialog({
  clientId,
  clientName,
  initialText = '',
  autoGenerate = false,
  onClose,
  onCreated,
}: {
  clientId: string
  clientName: string
  /** Text already pasted elsewhere — on the add-client screen, for instance. */
  initialText?: string
  /**
   * Read `initialText` straight away instead of showing it back for a second
   * paste. The admin has already typed the questions once by the time this is
   * set; the review step below is still where they approve them.
   */
  autoGenerate?: boolean
  onClose: () => void
  /**
   * Fired with the new assignment id once it exists, so the caller can send it.
   * `asDraft` is passed on because a draft is deliberately not shown to the
   * client yet — emailing it the moment it was built would undo the choice.
   */
  onCreated: (assignmentId: string, setName: string, asDraft: boolean) => void
}) {
  const [text, setText] = useState(initialText)
  const [stage, setStage] = useState<'paste' | 'review'>('paste')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)

  const [setName, setSetName] = useState('')
  const [questions, setQuestions] = useState<Draft[]>([])
  const [translatedInto, setTranslatedInto] = useState<Lang | null>(null)
  const [showTranslation, setShowTranslation] = useState(false)
  const [asDraft, setAsDraft] = useState(false)

  const areaRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { areaRef.current?.focus() }, [])

  /** Dropping a .txt/.md/.csv reads it in; dropping selected text pastes it. */
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      if (file.size > 1_000_000) { setError('That file is too large to read here.'); return }
      setText(await file.text())
      return
    }
    const dropped = e.dataTransfer.getData('text/plain')
    if (dropped) setText(prev => (prev ? `${prev}\n${dropped}` : dropped))
  }

  const generate = async () => {
    setBusy(true)
    setError('')
    const res = await fetch('/api/admin/questions/generate', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ text, clientId }),
    }).catch(() => null)

    setBusy(false)
    if (!res) { setError('Could not reach the server. Check your connection and try again.'); return }

    const body = await res.json().catch(() => ({}))
    if (!res.ok) { setError(body.error ?? 'Could not read those questions.'); return }

    const generated: Question[] = body.questions ?? []
    if (generated.length === 0) { setError('No questions were found in that text.'); return }

    setQuestions(generated.map(q => ({ ...q, key: nextKey() })))
    setSetName(body.setName ?? 'Additional Questions')
    setTranslatedInto(body.translatedInto ?? null)
    setShowTranslation(Boolean(body.translatedInto))
    setStage('review')
  }

  /**
   * Runs the paste through the generator once, on open, when the caller already
   * has the text. The guard is a ref rather than state so a re-render while the
   * request is in flight cannot start a second one.
   */
  const autoRan = useRef(false)
  useEffect(() => {
    if (!autoGenerate || autoRan.current || !initialText.trim()) return
    autoRan.current = true
    generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const update = (key: string, patch: Partial<Draft>) =>
    setQuestions(prev => prev.map(q => (q.key === key ? { ...q, ...patch } : q)))

  const updateTranslation = (key: string, patch: Record<string, unknown>) => {
    if (!translatedInto || translatedInto === 'en') return
    const lang = translatedInto as TranslatedLang
    setQuestions(prev =>
      prev.map(q => (q.key === key ? { ...q, [lang]: { ...(q[lang] ?? {}), ...patch } } : q))
    )
  }

  const remove = (key: string) => setQuestions(prev => prev.filter(q => q.key !== key))

  const move = (index: number, delta: number) =>
    setQuestions(prev => {
      const next = [...prev]
      const to = index + delta
      if (to < 0 || to >= next.length) return prev
      ;[next[index], next[to]] = [next[to], next[index]]
      return next
    })

  /**
   * Creates the set, hands it to this one client, and returns the assignment
   * so the caller can open the send dialog. Two calls, and the set is removed
   * again if the assignment fails — a set nobody holds is just clutter.
   */
  const createAndSend = async () => {
    const cleaned = questions.filter(q => q.label.trim())
    if (!setName.trim()) { setError('Give this batch a name.'); return }
    if (cleaned.length === 0) { setError('Keep at least one question.'); return }

    setBusy(true)
    setError('')

    const created = await fetch('/api/admin/question-sets', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        name: setName.trim(),
        description: `Built from text pasted for ${clientName}.`,
        // Strip the editor-only React key before it reaches the API, the same
        // way the question-set editor does.
        questions: cleaned.map(q => ({ ...q, key: undefined })),
      }),
    }).catch(() => null)

    if (!created?.ok) {
      setBusy(false)
      const body = await created?.json().catch(() => ({}))
      setError(body?.error ?? 'Could not create the question set.')
      return
    }
    const { id: setId } = await created.json()

    const assigned = await fetch('/api/admin/assignments', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ clientId, questionSetId: setId, asDraft }),
    }).catch(() => null)

    if (!assigned?.ok) {
      await fetch(`/api/admin/question-sets/${setId}`, {
        method: 'DELETE',
        headers: adminHeaders,
      }).catch(() => null)
      setBusy(false)
      setError('The questions were built but could not be assigned. Nothing was sent.')
      return
    }

    // The route answers with the bare assignment id.
    const { id: assignmentId } = await assigned.json().catch(() => ({}))
    setBusy(false)
    onCreated(typeof assignmentId === 'string' ? assignmentId : '', setName.trim(), asDraft)
  }

  const translatedName = translatedInto ? LANG_ENGLISH_NAME[translatedInto] : ''
  const lang = translatedInto && translatedInto !== 'en' ? (translatedInto as TranslatedLang) : null

  return (
    <ModalPortal>
    <div className="fixed inset-0 bg-black/70 z-[70] overflow-y-auto overscroll-contain" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
      <div
        className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl animate-modal-in overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-black px-5 py-4 flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <h3 className="text-white font-bold truncate">
              {stage === 'paste' ? 'Paste extra questions' : 'Check before sending'}
            </h3>
            <p className="text-white/40 text-xs mt-0.5 truncate">
              {stage === 'paste'
                ? `For ${clientName}. Nothing is sent until you approve it.`
                : `${questions.length} question${questions.length === 1 ? '' : 's'} for ${clientName}`}
            </p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white shrink-0" aria-label="Close">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 shrink-0">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* ── Paste ── */}
        {stage === 'paste' ? (
          <>
            <div className="flex-1 min-h-0 overflow-y-auto p-5">
              <p className="text-sm text-gray-500 mb-3">
                Paste the questions — from an email, a document, a discovery request. The
                wording, the question type and the answer choices are worked out for you,
                and you get to correct all of it before anything goes out.
              </p>
              <textarea
                ref={areaRef}
                value={text}
                onChange={e => { setText(e.target.value); setError('') }}
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                rows={10}
                placeholder={'1. What time did you actually start and stop work each day?\n2. Were you given a 30-minute meal break? Yes/No\n3. Which of these do you still have: paystubs, schedules, text messages…'}
                className={`input-field resize-none font-mono text-[13px] leading-relaxed transition-colors ${
                  dragging ? 'border-gold bg-gold/5' : ''
                }`}
              />
              <p className="text-xs text-gray-400 mt-2">
                {text.trim().length.toLocaleString()} characters · you can also drop a text file here
              </p>
            </div>
            <div className="border-t border-gray-100 px-5 py-4 flex items-center justify-end gap-2 shrink-0">
              <button onClick={onClose} className="px-4 py-2.5 text-sm font-semibold text-gray-500 hover:text-black">
                Cancel
              </button>
              <button
                onClick={generate}
                disabled={busy || !text.trim()}
                className="bg-gold text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gold-dark transition-colors disabled:opacity-40 flex items-center gap-2"
              >
                {busy && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {busy ? 'Reading the questions…' : 'Build the questions'}
              </button>
            </div>
          </>
        ) : (
          /* ── Review ── */
          <>
            <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Name of this batch</label>
                  <input
                    value={setName}
                    onChange={e => { setSetName(e.target.value); setError('') }}
                    className="input-field"
                    placeholder="e.g. Overtime Follow-Up"
                  />
                </div>
                {lang && (
                  <button
                    onClick={() => setShowTranslation(v => !v)}
                    className="text-xs font-semibold text-blue-600 hover:underline pb-3 shrink-0"
                  >
                    {showTranslation ? `Hide ${translatedName}` : `Show ${translatedName}`}
                  </button>
                )}
              </div>

              {lang && (
                <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  {clientName} reads the portal in {translatedName}, so a {translatedName} draft
                  was written alongside each question. Correct anything that reads oddly — the
                  client sees this wording, not the English.
                </p>
              )}

              <div className="space-y-3">
                {questions.map((q, i) => (
                  <div key={q.key} className="border border-gray-200 rounded-xl p-3.5">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-xs font-bold text-gray-300 pt-2.5 w-5 shrink-0">{i + 1}</span>
                      <textarea
                        value={q.label}
                        onChange={e => update(q.key, { label: e.target.value })}
                        rows={2}
                        className="input-field text-sm resize-none flex-1"
                        placeholder="Question the client sees"
                      />
                      <div className="flex flex-col gap-1 shrink-0 pt-1">
                        <button onClick={() => move(i, -1)} disabled={i === 0}
                          className="text-gray-300 hover:text-gold disabled:opacity-30 text-xs px-1" aria-label="Move up">▲</button>
                        <button onClick={() => move(i, 1)} disabled={i === questions.length - 1}
                          className="text-gray-300 hover:text-gold disabled:opacity-30 text-xs px-1" aria-label="Move down">▼</button>
                        <button onClick={() => remove(q.key)}
                          className="text-gray-300 hover:text-red-500 text-xs px-1" aria-label="Remove">✕</button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pl-7">
                      <select
                        value={q.type}
                        onChange={e => {
                          const type = e.target.value as QuestionType
                          update(q.key, {
                            type,
                            options: NEEDS_OPTIONS.includes(type) ? (q.options ?? []) : undefined,
                          })
                        }}
                        className="input-field text-xs py-1.5 w-auto"
                      >
                        {TYPE_LABELS.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={q.required === true}
                          onChange={e => update(q.key, { required: e.target.checked || undefined })}
                          className="w-3.5 h-3.5 accent-gold"
                        />
                        Required
                      </label>
                    </div>

                    {NEEDS_OPTIONS.includes(q.type) && (
                      <input
                        value={(q.options ?? []).join(', ')}
                        onChange={e =>
                          update(q.key, {
                            options: e.target.value.split(',').map(o => o.trim()).filter(Boolean),
                          })
                        }
                        className="input-field text-xs mt-2 ml-7 w-[calc(100%-1.75rem)]"
                        placeholder="Choices, separated by commas"
                      />
                    )}

                    {q.helpText && (
                      <input
                        value={q.helpText}
                        onChange={e => update(q.key, { helpText: e.target.value || undefined })}
                        className="input-field text-xs mt-2 ml-7 w-[calc(100%-1.75rem)]"
                        placeholder="Help text"
                      />
                    )}

                    {q.showIf && (
                      <div className="mt-2 ml-7 flex items-center gap-2 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
                        <span className="text-gray-500">
                          Only shown if{' '}
                          <span className="font-semibold text-gray-700">
                            {gateLabel(questions, q.showIf.questionId)}
                          </span>{' '}
                          is <span className="font-semibold text-gray-700">{q.showIf.value}</span>
                        </span>
                        <button
                          onClick={() => update(q.key, { showIf: undefined })}
                          className="ml-auto text-gray-400 hover:text-red-500 shrink-0"
                          title="Always show this question"
                        >
                          Always ask
                        </button>
                      </div>
                    )}

                    {lang && showTranslation && (
                      <div className="mt-2.5 ml-7 space-y-2 bg-blue-50/60 border border-blue-200 rounded-lg p-2.5">
                        <span className="text-[11px] font-bold tracking-wider uppercase text-blue-700">
                          {translatedName}
                        </span>
                        <textarea
                          value={q[lang]?.label ?? ''}
                          onChange={e => updateTranslation(q.key, { label: e.target.value || undefined })}
                          rows={2}
                          className="input-field text-sm resize-none"
                          placeholder={`Question in ${translatedName}`}
                        />
                        {q.helpText && (
                          <input
                            value={q[lang]?.helpText ?? ''}
                            onChange={e => updateTranslation(q.key, { helpText: e.target.value || undefined })}
                            className="input-field text-xs"
                            placeholder={`Help text in ${translatedName}`}
                          />
                        )}
                        {NEEDS_OPTIONS.includes(q.type) && (
                          <>
                            <input
                              value={(q[lang]?.options ?? []).join(', ')}
                              onChange={e => {
                                const parts = e.target.value.split(',').map(o => o.trim()).filter(Boolean)
                                updateTranslation(q.key, { options: parts.length ? parts : undefined })
                              }}
                              className="input-field text-xs"
                              placeholder={`Choices in ${translatedName}, separated by commas`}
                            />
                            {(q[lang]?.options?.length ?? 0) > 0 &&
                              q[lang]!.options!.length !== (q.options?.length ?? 0) && (
                                <p className="text-[11px] text-red-600">
                                  {q[lang]!.options!.length} {translatedName} choices vs {q.options?.length ?? 0} English —
                                  they are matched in order, so the counts must agree or the translation is dropped.
                                </p>
                              )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 px-5 py-4 shrink-0">
              <label className="flex items-center gap-2 mb-3 text-xs text-gray-600 cursor-pointer select-none">
                <input type="checkbox" checked={asDraft} onChange={e => setAsDraft(e.target.checked)} className="w-4 h-4 accent-gold" />
                Save as a draft instead — build it, but do not show it to the client yet
              </label>
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => { setStage('paste'); setError('') }}
                  className="px-3 py-2.5 text-sm font-semibold text-gray-500 hover:text-black"
                >
                  ← Back to the text
                </button>
                <button
                  onClick={createAndSend}
                  disabled={busy || questions.length === 0}
                  className="bg-gold text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gold-dark transition-colors disabled:opacity-40 flex items-center gap-2"
                >
                  {busy && (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {busy ? 'Building…' : asDraft ? 'Save as draft' : `Send to ${clientName.split(' ')[0]}`}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      </div>
    </div>
    </ModalPortal>
  )
}

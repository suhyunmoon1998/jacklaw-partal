'use client'

/**
 * One assigned question set, for the client it was assigned to.
 *
 * Separate from app/questionnaire/page.tsx (the default onboarding
 * questionnaire) on purpose: that flow and its answers are untouched by
 * anything here. What the two share is the renderer — QuestionInput and the
 * showIf logic — so a set built in the admin panel looks and behaves like the
 * questionnaire clients already know.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import MascotWatermark from '@/components/MascotWatermark'
import { QuestionInput } from '@/components/QuestionField'
import { hasAnswer, isFieldControl, isVisible } from '@/lib/questionLogic'
import { getSession } from '@/lib/auth'
import { useLanguage } from '@/lib/i18n'
import { AnswerValue, AssignmentDetail, Session } from '@/types'

export default function AssignmentQuestionnairePage({
  params,
}: {
  params: { assignmentId: string }
}) {
  const [session, setSession] = useState<Session | null>(null)
  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null)
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({})
  const [loadError, setLoadError] = useState('')
  const [validationError, setValidationError] = useState('')
  const [autoSaved, setAutoSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [justSubmitted, setJustSubmitted] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [retry, setRetry] = useState(0)

  // Only questions edited since the last save go up, so a 48-question set does
  // not rewrite every row on every keystroke.
  const dirty = useRef<Set<string>>(new Set())
  const router = useRouter()
  const { t } = useLanguage()

  useEffect(() => {
    const s = getSession()
    if (!s) {
      router.replace(`/client?next=${encodeURIComponent(`/questionnaire/${params.assignmentId}`)}`)
      return
    }
    setSession(s)

    fetch(`/api/assignments/${params.assignmentId}?clientId=${encodeURIComponent(s.clientId)}`)
      .then(async r => {
        const body = await r.json()
        if (!r.ok) {
          setLoadError(r.status === 403 ? t('qs_wrong_client') : t('qs_unavailable'))
          return
        }
        setAssignment(body.assignment)
        // A client who starts typing before this response lands must not lose
        // those keystrokes, so anything already edited wins over the server copy.
        setAnswers(prev => {
          const fromServer: Record<string, AnswerValue> = body.assignment.answers ?? {}
          const edited = Object.fromEntries(
            Array.from(dirty.current).map(id => [id, prev[id]])
          )
          return { ...fromServer, ...edited }
        })
      })
      .catch(() => setLoadError(t('qs_unavailable')))
  }, [params.assignmentId, router]) // eslint-disable-line react-hooks/exhaustive-deps

  const readOnly = assignment?.status === 'completed'

  const save = useCallback(
    async (submitted: boolean): Promise<boolean> => {
      if (!session) return false
      const sending = Array.from(dirty.current)
      const changed = Object.fromEntries(sending.map(id => [id, answers[id] ?? '']))

      try {
        const res = await fetch(`/api/assignments/${params.assignmentId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId: session.clientId, answers: changed, submitted }),
        })
        if (!res.ok) return false
        // Clear only what actually reached the server, and only after it did.
        // Anything typed while the request was in flight stays queued, and a
        // failed save leaves its answers marked so the retry resends them.
        sending.forEach(id => dirty.current.delete(id))
        setSaveFailed(false)
        return true
      } catch {
        return false
      }
    },
    [session, answers, params.assignmentId]
  )

  // Autosave a second after typing stops, matching the default questionnaire.
  // `retry` re-arms this effect after a failure, since a failed save changes no
  // other state and would otherwise never be attempted again.
  useEffect(() => {
    if (!session || !assignment || readOnly || justSubmitted || dirty.current.size === 0) return
    const timer = setTimeout(() => {
      save(false).then(ok => {
        if (!ok) {
          setSaveFailed(true)
          setTimeout(() => setRetry(n => n + 1), 4000)
          return
        }
        setAutoSaved(true)
        setTimeout(() => setAutoSaved(false), 2000)
      })
    }, 1000)
    return () => clearTimeout(timer)
  }, [answers, session, assignment, readOnly, justSubmitted, retry, save])

  const handleChange = (id: string, val: AnswerValue) => {
    dirty.current.add(id)
    setAnswers(prev => ({ ...prev, [id]: val }))
    setValidationError('')
  }

  // Last line of defence for a closed tab or a followed link: the browser's own
  // "leave site?" prompt while answers are still unsaved.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current.size === 0 || justSubmitted) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [justSubmitted])

  const visibleQuestions = (assignment?.questions ?? []).filter(q => isVisible(q, answers))
  const answeredCount = visibleQuestions.filter(q => hasAnswer(answers[q.id])).length
  const pct = visibleQuestions.length > 0 ? Math.round((answeredCount / visibleQuestions.length) * 100) : 0

  const handleSubmit = async () => {
    const missing = visibleQuestions.find(q => q.required && !hasAnswer(answers[q.id]))
    if (missing) {
      setValidationError(t('q_required_error') + ` "${missing.label}"`)
      document.getElementById(`q-${missing.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setSubmitting(true)
    setValidationError('')
    // Every visible question goes up on submit, not just the dirty keys, so a
    // dropped autosave can never leave a gap in a completed set. Cleared answers
    // are included too, so blanking a field is recorded rather than left behind.
    visibleQuestions.forEach(q => dirty.current.add(q.id))

    let ok = false
    try {
      ok = await save(true)
    } finally {
      // Runs even if the request blew up, so the button can never stay stuck on
      // "Submitting…" with no way forward.
      setSubmitting(false)
    }

    if (ok) setJustSubmitted(true)
    else setSaveFailed(true)
  }

  /** "Save & Exit" has to actually save — leaving cancels the pending autosave. */
  const handleSaveExit = async () => {
    if (dirty.current.size === 0) { router.push('/dashboard'); return }
    setLeaving(true)
    const ok = await save(false)
    setLeaving(false)
    // Staying put on failure is the point: navigating away would discard the
    // answers with nothing left holding them.
    if (ok) router.push('/dashboard')
    else setSaveFailed(true)
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header showBack backHref="/dashboard" showLogout />
        <main className="flex-1 px-4 pt-10 max-w-md mx-auto w-full">
          <div className="card text-center">
            <p className="text-4xl mb-3">🔒</p>
            <p className="text-gray-700 text-sm leading-relaxed">{loadError}</p>
            <button onClick={() => router.push('/dashboard')} className="btn-primary mt-5">
              {t('qs_back_portal')}
            </button>
          </div>
        </main>
      </div>
    )
  }

  if (!session || !assignment) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header showBack backHref="/dashboard" showLogout />
        <main className="flex-1 px-4 pt-5 max-w-2xl mx-auto w-full">
          <div className="animate-shimmer h-8 w-56 rounded-xl mb-3" />
          <div className="animate-shimmer h-40 rounded-2xl" />
        </main>
      </div>
    )
  }

  if (justSubmitted) {
    return (
      <div className="relative min-h-screen bg-gray-50 flex flex-col">
        <MascotWatermark />
        <div className="relative z-10">
          <Header showBack backHref="/dashboard" showLogout />
        </div>
        <main className="relative z-10 flex-1 px-4 pt-10 max-w-md mx-auto w-full">
          <div className="card text-center animate-modal-in">
            <span className="w-14 h-14 rounded-full bg-gold flex items-center justify-center mx-auto mb-4 animate-pop">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <h2 className="text-xl font-bold text-black">{t('qs_thanks_title')}</h2>
            <p className="text-gray-500 text-sm mt-1">{t('qs_thanks_sub')}</p>
            <p className="text-black font-semibold text-sm mt-4">{assignment.questionSetName}</p>
            <button onClick={() => router.push('/dashboard')} className="btn-primary mt-6">
              {t('qs_back_portal')}
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-gray-50 flex flex-col">
      <MascotWatermark />

      <div className="relative z-10">
        <Header showBack backHref="/dashboard" showLogout subtitle={assignment.questionSetName} />
      </div>

      {/* Sticky progress */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 shadow-sm">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center gap-3 mb-2">
            <span className="min-w-0 text-[10px] font-bold tracking-[0.14em] uppercase text-gold truncate">
              {assignment.questionSetName}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              {autoSaved && (
                <span className="flex items-center gap-1 text-[11px] text-green-600 font-medium animate-fade-in">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('q_saved')}
                </span>
              )}
              <span className="text-sm text-black font-bold tabular-nums">{pct}%</span>
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold-light via-gold to-gold-dark transition-all duration-700 ease-out"
              style={{ width: `${Math.max(pct, 2)}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-gray-400 tabular-nums">
            {answeredCount}/{visibleQuestions.length} {t('q_answered')}
          </p>
        </div>
      </div>

      <main className="relative z-10 flex-1 px-4 pt-5 pb-40 max-w-2xl mx-auto w-full">
        {readOnly && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-2xl p-4 flex gap-3">
            <svg className="w-5 h-5 text-green-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-green-800 text-sm leading-relaxed">{t('qs_readonly_note')}</p>
          </div>
        )}

        <div className="card p-5 sm:p-6 mb-4">
          <div className="space-y-5">
            {visibleQuestions.map((q, i) => {
              const answered = hasAnswer(answers[q.id])
              const inputId = `q-${q.id}`
              return (
                <div
                  key={q.id}
                  id={inputId}
                  className="border-t border-gray-100 pt-5 first:border-t-0 first:pt-0"
                >
                  <div className="flex items-start gap-2.5 mb-2.5">
                    <span
                      className={`mt-[3px] w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${
                        answered ? 'bg-gold border-gold' : 'border-gray-200 bg-white'
                      }`}
                      aria-hidden="true"
                    >
                      {answered && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <label
                        htmlFor={isFieldControl(q.type) ? `input-${q.id}` : undefined}
                        className="block text-[15px] font-semibold text-black leading-snug"
                      >
                        <span className="text-gray-300 tabular-nums mr-1.5">{i + 1}.</span>
                        {q.label}
                        {q.required && <span className="text-gold ml-1">*</span>}
                      </label>
                      {q.helpText && <p className="text-xs text-gray-400 mt-1 leading-relaxed">{q.helpText}</p>}
                    </div>
                  </div>
                  <div className="pl-0 sm:pl-[28px]">
                    {readOnly ? (
                      <p className="text-sm text-gray-800 font-medium whitespace-pre-line bg-gray-50 rounded-xl px-4 py-3">
                        {formatReadOnly(answers[q.id])}
                      </p>
                    ) : (
                      <QuestionInput
                        question={q}
                        inputId={`input-${q.id}`}
                        value={answers[q.id] ?? (q.type === 'multiselect' ? [] : '')}
                        onChange={handleChange}
                        yesLabel={t('q_yes')}
                        noLabel={t('q_no')}
                        notSureLabel={t('q_not_sure')}
                        selectPlaceholder={t('q_select')}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {validationError && (
            <div className="mt-5 bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 animate-pop">
              <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
              </svg>
              <p className="text-red-700 text-sm">{validationError}</p>
            </div>
          )}

          {saveFailed && (
            <div className="mt-5 bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 animate-pop">
              <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <div className="min-w-0">
                <p className="text-amber-800 text-sm font-semibold">{t('qs_save_failed')}</p>
                <p className="text-amber-700 text-xs mt-0.5">{t('qs_save_failed_sub')}</p>
              </div>
              <button
                onClick={() => { setSaveFailed(false); setRetry(n => n + 1) }}
                className="ml-auto shrink-0 self-center text-xs font-bold text-amber-900 underline underline-offset-2"
              >
                {t('qs_retry')}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-500 mt-4 [text-shadow:0_1px_8px_#fff,0_0_3px_#fff]">
          {t('q_privacy_note')}
        </p>
      </main>

      {!readOnly && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 pt-2.5 pb-[calc(env(safe-area-inset-bottom,0px)_+_0.5rem)] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] z-20">
          <div className="max-w-2xl mx-auto space-y-2">
            <button onClick={handleSubmit} disabled={submitting} className="btn-primary w-full">
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t('q_submitting')}
                </span>
              ) : t('qs_submit')}
            </button>
            <button
              onClick={handleSaveExit}
              disabled={leaving || submitting}
              className="w-full text-gray-400 text-sm py-1.5 transition-colors hover:text-gray-600 disabled:opacity-50"
            >
              {leaving ? t('q_saving') : t('q_save_exit')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function formatReadOnly(val: AnswerValue | undefined): string {
  if (!hasAnswer(val)) return '—'
  if (Array.isArray(val)) return val.map(v => `• ${v}`).join('\n')
  const s = String(val)
  if (s === 'yes') return '✓ Yes'
  if (s === 'no') return '✗ No'
  if (s === 'not_sure') return '? Not Sure'
  return s
}

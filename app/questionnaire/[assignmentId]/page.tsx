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
import { hasAnswer, isAnsweredFor, isFieldControl, isVisible, localize, localizeName } from '@/lib/questionLogic'
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
  const [saveBlocked, setSaveBlocked] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [retry, setRetry] = useState(0)

  // Answers edited since the last save, so a 48-question set does not rewrite
  // every row on every keystroke.
  //
  // It holds the VALUE, not just the id. Clearing by id alone loses an answer
  // the client re-typed while its own save was in flight: the id is already in
  // the set, re-adding it is a no-op, and the response then clears it — leaving
  // the newer text queued nowhere.
  const dirty = useRef<Map<string, AnswerValue>>(new Map())
  /** One writer at a time, so an older save cannot land on top of a newer one. */
  const inFlight = useRef(false)
  const router = useRouter()
  const { t, lang } = useLanguage()

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
          return { ...fromServer, ...Object.fromEntries(dirty.current) }
        })
      })
      .catch(() => setLoadError(t('qs_unavailable')))
  }, [params.assignmentId, router]) // eslint-disable-line react-hooks/exhaustive-deps

  const readOnly = assignment?.status === 'completed'
  const setTitle = assignment
    ? localizeName(assignment.questionSetName, assignment.questionSetNameTranslations, lang)
    : ''

  /**
   * 'ok'        — everything queued reached the server
   * 'busy'      — another save is running; the caller should try again shortly
   * 'failed'    — worth retrying (offline, server error)
   * 'permanent' — retrying can never help (already submitted, wrong client, gone)
   */
  type SaveResult = 'ok' | 'busy' | 'failed' | 'permanent'

  const save = useCallback(
    async (submitted: boolean): Promise<SaveResult> => {
      if (!session) return 'failed'
      if (inFlight.current) return 'busy'

      const sending = new Map(dirty.current)
      if (sending.size === 0 && !submitted) return 'ok'

      inFlight.current = true
      try {
        const res = await fetch(`/api/assignments/${params.assignmentId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: session.clientId,
            answers: Object.fromEntries(sending),
            submitted,
          }),
        })

        // 409 already submitted, 403 wrong client, 404 removed — the answers are
        // not going to be accepted however many times we ask.
        if (res.status === 409 || res.status === 403 || res.status === 404) return 'permanent'
        if (!res.ok) return 'failed'

        // Clear only the entries whose value is still the one we sent. A key the
        // client re-edited mid-flight holds a different value and stays queued.
        sending.forEach((value, id) => {
          if (dirty.current.get(id) === value) dirty.current.delete(id)
        })
        setSaveFailed(false)
        return 'ok'
      } catch {
        return 'failed'
      } finally {
        inFlight.current = false
      }
    },
    [session, params.assignmentId]
  )

  // Autosave a second after typing stops, matching the default questionnaire.
  // `retry` re-arms this effect after a failure or a collision, since neither
  // changes any other state the effect depends on.
  useEffect(() => {
    if (!session || !assignment || readOnly || justSubmitted || dirty.current.size === 0) return
    const timer = setTimeout(() => {
      // Re-checked here, not just at effect setup: an in-flight save may have
      // drained the queue since this timer was armed.
      if (dirty.current.size === 0) return
      save(false).then(result => {
        if (result === 'ok') {
          setAutoSaved(true)
          setTimeout(() => setAutoSaved(false), 2000)
          return
        }
        if (result === 'permanent') { setSaveBlocked(true); return }
        // 'busy' comes back in a moment; 'failed' needs the client to know.
        if (result === 'failed') setSaveFailed(true)
        setTimeout(() => setRetry(n => n + 1), result === 'busy' ? 400 : 4000)
      })
    }, 1000)
    return () => clearTimeout(timer)
  }, [answers, session, assignment, readOnly, justSubmitted, retry, save])

  const handleChange = (id: string, val: AnswerValue) => {
    dirty.current.set(id, val)
    setAnswers(prev => ({ ...prev, [id]: val }))
    setValidationError('')
  }

  // Last line of defence for a closed tab or a followed link: the browser's own
  // "leave site?" prompt while answers are still unsaved.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current.size === 0 || justSubmitted || saveBlocked) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [justSubmitted, saveBlocked])

  const visibleQuestions = (assignment?.questions ?? []).filter(q => isVisible(q, answers))
  const answeredCount = visibleQuestions.filter(q => isAnsweredFor(q, answers)).length
  const pct = visibleQuestions.length > 0 ? Math.round((answeredCount / visibleQuestions.length) * 100) : 0

  const handleSubmit = async () => {
    const missing = visibleQuestions.find(q => q.required && !isAnsweredFor(q, answers))
    if (missing) {
      setValidationError(t('q_required_error') + ` "${localize(missing, lang).label}"`)
      document.getElementById(`q-${missing.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setSubmitting(true)
    setValidationError('')
    // Every visible question goes up on submit, not just the queued ones, so a
    // dropped autosave can never leave a gap in a completed set. Cleared answers
    // are included too, so blanking a field is recorded rather than left behind.
    visibleQuestions.forEach(q => dirty.current.set(q.id, answers[q.id] ?? ''))

    let result: SaveResult = 'failed'
    try {
      result = await save(true)
      // A collision with an autosave is not a failure — wait it out once.
      if (result === 'busy') {
        await new Promise(r => setTimeout(r, 600))
        result = await save(true)
      }
    } finally {
      // Runs even if the request blew up, so the button can never stay stuck on
      // "Submitting…" with no way forward.
      setSubmitting(false)
    }

    if (result === 'ok') { setJustSubmitted(true); return }
    if (result === 'permanent') { setSaveBlocked(true); return }
    // Leave the queue armed so the autosave keeps trying behind the warning.
    setSaveFailed(true)
    setRetry(n => n + 1)
  }

  /** "Save & Exit" has to actually save — leaving cancels the pending autosave. */
  const flushAndLeave = useCallback(async (to: string): Promise<boolean> => {
    if (dirty.current.size === 0) { router.push(to); return true }
    setLeaving(true)
    let result = await save(false)
    if (result === 'busy') {
      await new Promise(r => setTimeout(r, 600))
      result = await save(false)
    }
    setLeaving(false)

    // Staying put on failure is the point: navigating away would discard the
    // answers with nothing left holding them.
    if (result === 'ok') { router.push(to); return true }
    if (result === 'permanent') { setSaveBlocked(true); return false }
    setSaveFailed(true)
    setRetry(n => n + 1)
    return false
  }, [router, save])

  const handleSaveExit = () => flushAndLeave('/dashboard')

  /**
   * The header's own Back and Log out buttons leave the page too, and they were
   * discarding whatever the autosave had not yet picked up. They now flush
   * first and stay put if that fails.
   */
  const guardedLeave = useCallback(async (): Promise<boolean> => {
    if (dirty.current.size === 0 || readOnly || justSubmitted) return true
    setLeaving(true)
    let result = await save(false)
    if (result === 'busy') {
      await new Promise(r => setTimeout(r, 600))
      result = await save(false)
    }
    setLeaving(false)
    if (result === 'ok') return true
    if (result === 'permanent') { setSaveBlocked(true); return true }
    setSaveFailed(true)
    setRetry(n => n + 1)
    return false
  }, [readOnly, justSubmitted, save])

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
        <div className="relative z-20">
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
            <p className="text-black font-semibold text-sm mt-4">{setTitle}</p>
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

      {/* Above the sticky progress bar below it. The header holds the language
          menu, which opens downward across that bar; while this wrapper sat
          under it, the menu's middle — Español and 中文 — was painted over and
          a client reading neither English nor Korean could not reach their own
          language. */}
      <div className="relative z-40">
        <Header
          showBack
          backHref="/dashboard"
          showLogout
          subtitle={setTitle}
          beforeLeave={guardedLeave}
        />
      </div>

      {/* Sticky progress */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 shadow-sm">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center gap-3 mb-2">
            <span className="min-w-0 text-[10px] font-bold tracking-[0.14em] uppercase text-gold truncate">
              {setTitle}
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
            {visibleQuestions.map((raw, i) => {
              // Skip logic runs on the English question; only what is shown is translated.
              const q = localize(raw, lang)
              const answered = isAnsweredFor(raw, answers)
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
                        {formatReadOnly(answers[q.id], raw.options, q.optionLabels, {
                          yes: t('q_yes'), no: t('q_no'), notSure: t('q_not_sure'),
                        })}
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
                        optionLabels={q.optionLabels}
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

          {saveBlocked && (
            <div className="mt-5 bg-gray-50 border border-gray-300 rounded-xl p-4 flex gap-3">
              <svg className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <div className="min-w-0">
                <p className="text-gray-800 text-sm font-semibold">{t('qs_save_blocked')}</p>
                <p className="text-gray-600 text-xs mt-0.5">{t('qs_save_blocked_sub')}</p>
              </div>
            </div>
          )}

          {saveFailed && !saveBlocked && (
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

function formatReadOnly(
  val: AnswerValue | undefined,
  options?: string[],
  optionLabels?: string[],
  words: { yes: string; no: string; notSure: string } = { yes: 'Yes', no: 'No', notSure: 'Not Sure' }
): string {
  // Answers are stored as the English option; show the client their own wording.
  const shown = (v: string) => {
    const i = options?.indexOf(v) ?? -1
    return i >= 0 ? optionLabels?.[i] ?? v : v
  }
  if (!hasAnswer(val)) return '—'
  if (Array.isArray(val)) return val.map(v => `• ${shown(v)}`).join('\n')
  const s = shown(String(val))
  if (s === 'yes') return `✓ ${words.yes}`
  if (s === 'no') return `✗ ${words.no}`
  if (s === 'not_sure') return `? ${words.notSure}`
  return s
}

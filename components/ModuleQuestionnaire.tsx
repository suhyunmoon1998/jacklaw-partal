'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import MascotWatermark from '@/components/MascotWatermark'
import SectionIcon from '@/components/SectionIcon'
import { getSession, addSubmissionNotification } from '@/lib/auth'
import { ModuleId, liveAnswersFor, preparedSections } from '@/lib/modules'
import { CHAPTER_LABEL, ChapterId, sectionMeta } from '@/lib/questionnaireMeta'
import { AnswerValue, QuestionnaireState, Session } from '@/types'
import { QuestionInput } from '@/components/QuestionField'
import { hasAnswer, isFieldControl, isVisible, missingRequired, resumeSectionIndex } from '@/lib/questionLogic'
import { useLanguage } from '@/lib/i18n'

/** Fixed (not random) so the celebration renders identically on every pass. */
const CONFETTI = [
  { left: '8%', delay: '0ms', color: 'bg-gold' },
  { left: '20%', delay: '120ms', color: 'bg-black' },
  { left: '31%', delay: '60ms', color: 'bg-gold-light' },
  { left: '43%', delay: '200ms', color: 'bg-gold' },
  { left: '54%', delay: '30ms', color: 'bg-black' },
  { left: '66%', delay: '160ms', color: 'bg-gold-light' },
  { left: '78%', delay: '90ms', color: 'bg-gold' },
  { left: '89%', delay: '240ms', color: 'bg-black' },
]

/** Small circular "3 / 7 answered" meter shown in the section header. */
function ProgressRing({ answered, total }: { answered: number; total: number }) {
  const radius = 15
  const circumference = 2 * Math.PI * radius
  const pct = total > 0 ? answered / total : 0
  const complete = total > 0 && answered === total

  return (
    <div className="relative w-11 h-11 shrink-0">
      <svg className="w-11 h-11 -rotate-90" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={radius} fill="none" stroke="#F3F4F6" strokeWidth="4" />
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke={complete ? '#111111' : '#E07820'}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">
        {complete ? (
          <svg className="w-4 h-4 text-black animate-pop" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <span className="text-[11px] font-bold text-gray-500 tabular-nums">
            {answered}/{total}
          </span>
        )}
      </span>
    </div>
  )
}

/**
 * One questionnaire module, on screen.
 *
 * Module 1 and Module 2 are the same screen: the same autosave, the same resume,
 * the same section map, the same validation and the same four languages. What
 * differs is which sections are shown, which columns the progress is written to,
 * and where Submit sends the client — so those are the props, and there is one
 * implementation of everything else.
 */
export default function ModuleQuestionnaire({
  moduleId,
  subtitle,
  submitHref = '/submitted',
}: {
  moduleId: ModuleId
  subtitle: string
  /** Where Submit lands. Module 2 has no separate thank-you page of its own. */
  submitHref?: string
}) {
  const [session, setSession] = useState<Session | null>(null)
  const [qState, setQState] = useState<QuestionnaireState>({
    answers: {},
    completedSections: [],
    lastSaved: '',
    submitted: false,
  })
  const [currentSection, setCurrentSection] = useState(0)
  const [validationError, setValidationError] = useState('')
  const [saving, setSaving] = useState(false)
  const [autoSaved, setAutoSaved] = useState(false)
  const [mapOpen, setMapOpen] = useState(false)
  /**
   * Whether the office has handed this module to this client. Null while we are
   * still finding out — the questionnaire is not drawn on a guess either way.
   */
  const [wasSent, setWasSent] = useState<boolean | null>(null)
  const [toast, setToast] = useState<{ title: string; sub: string; celebrate: boolean } | null>(null)
  const router = useRouter()
  const { lang, t } = useLanguage()

  const ALL_SECTIONS = preparedSections(moduleId, lang, qState.answers)
  /**
   * Routing, validation and progress all read this rather than the raw answers,
   * so a question whose gate has since closed cannot decide what comes next.
   * The raw answers are what gets saved — nothing is thrown away.
   */
  const liveAnswers = liveAnswersFor(lang, qState.answers)
  const SECTIONS = ALL_SECTIONS.filter(s => isVisible(s, liveAnswers))

  useEffect(() => {
    const s = getSession()
    if (!s) { router.replace('/client'); return }
    setSession(s)
    fetch(`/api/modules?clientId=${encodeURIComponent(s.clientId)}`)
      .then(r => r.json())
      .then(({ sent }) => setWasSent(Array.isArray(sent) && sent.includes(moduleId)))
      .catch(() => setWasSent(false))

    fetch(`/api/questionnaire?clientId=${s.clientId}`)
      .then(r => r.json())
      .then(({ state }) => {
        if (state) {
          const mine = moduleId === 'module2' && state.module2 ? state.module2 : state
          setQState({
            answers: state.answers ?? {},
            completedSections: mine.completedSections ?? [],
            submitted: Boolean(mine.submitted),
            lastSaved: mine.lastSaved ?? '',
          })
          // Where they left off is worked out from what is still unanswered, not
          // from a count of sections that may belong to an older questionnaire.
          const resumed = liveAnswersFor(lang, state.answers ?? {})
          setCurrentSection(
            resumeSectionIndex(preparedSections(moduleId, lang, state.answers ?? {}), resumed)
          )
        }
      })
  }, [router]) // eslint-disable-line react-hooks/exhaustive-deps

  const section = SECTIONS[currentSection]
  const totalSections = SECTIONS.length
  const isLastSection = currentSection === totalSections - 1

  const handleAnswerChange = useCallback((id: string, val: AnswerValue) => {
    setQState(prev => ({ ...prev, answers: { ...prev.answers, [id]: val } }))
    setValidationError('')
  }, [])

  const persistState = useCallback((newState: QuestionnaireState) => {
    if (!session) return
    fetch('/api/questionnaire', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: session.clientId,
        module: moduleId,
        answers: newState.answers,
        completedSections: newState.completedSections,
        submitted: newState.submitted,
      }),
    }).catch(() => {
      console.error('Failed to save questionnaire state')
    })
  }, [session, moduleId])

  // Auto-save answers 1 second after any change
  useEffect(() => {
    if (!session) return
    const timer = setTimeout(() => {
      fetch('/api/questionnaire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: session.clientId,
          module: moduleId,
          answers: qState.answers,
          completedSections: qState.completedSections,
          submitted: qState.submitted,
        }),
      }).then(() => {
        setAutoSaved(true)
        setTimeout(() => setAutoSaved(false), 2000)
      })
    }, 1000)
    return () => clearTimeout(timer)
  }, [qState.answers]) // eslint-disable-line react-hooks/exhaustive-deps

  // Milestone toast dismisses itself
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), toast.celebrate ? 2800 : 1900)
    return () => clearTimeout(timer)
  }, [toast])

  // Lock background scroll while the section map sheet is open
  useEffect(() => {
    if (!mapOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [mapOpen])

  const validateSection = (): boolean => {
    const [firstMissing] = missingRequired(section, liveAnswers)
    if (firstMissing) {
      setValidationError(t('q_required_error') + ` "${firstMissing.label}"`)
      return false
    }
    return true
  }

  const handleNext = () => {
    if (!validateSection()) return
    const updatedCompleted = qState.completedSections.includes(currentSection)
      ? qState.completedSections
      : [...qState.completedSections, currentSection]
    const newState = { ...qState, completedSections: updatedCompleted }
    setQState(newState)
    persistState(newState)

    // Celebrate a finished chapter, otherwise just acknowledge the section
    const thisChapter = sectionMeta(section.id).chapter
    const nextSection = SECTIONS[currentSection + 1]
    const chapterDone = !nextSection || sectionMeta(nextSection.id).chapter !== thisChapter
    const remaining = totalSections - (currentSection + 1)
    setToast({
      title: chapterDone ? t('q_chapter_done') : t('q_section_done'),
      sub: chapterDone
        ? t(CHAPTER_LABEL[thisChapter])
        : `${remaining} ${t('q_sections_left')}`,
      celebrate: chapterDone,
    })

    window.scrollTo({ top: 0, behavior: 'smooth' })
    setCurrentSection(prev => prev + 1)
    setValidationError('')
  }

  const handlePrev = () => {
    setValidationError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setCurrentSection(prev => prev - 1)
  }

  const handleSaveExit = () => {
    persistState(qState)
    router.push('/dashboard')
  }

  const handleSubmit = async () => {
    if (!validateSection() || !session) return
    setSaving(true)
    const updatedCompleted = Array.from(new Set([...qState.completedSections, currentSection]))
    const finalState: QuestionnaireState = {
      ...qState,
      completedSections: updatedCompleted,
      submitted: true,
      lastSaved: new Date().toISOString(),
    }
    setQState(finalState)
    persistState(finalState)

    // Store admin notification locally
    addSubmissionNotification({
      clientId: session.clientId,
      clientName: session.name,
      caseType: session.caseType,
      submittedAt: new Date().toISOString(),
    })

    // The firm's email notification fires server-side from persistState's save
    // (see /api/questionnaire), keyed off the DB transition to submitted=true.
    router.push(submitHref)
  }

  if (!session || wasSent === null) return null

  // A module the office has not sent is not theirs to open yet, however they
  // arrived at the address.
  if (!wasSent) {
    return (
      <div className="relative min-h-screen bg-gray-50 flex flex-col">
        <MascotWatermark />
        <div className="relative z-40">
          <Header showBack backHref="/dashboard" showLogout subtitle={subtitle} />
        </div>
        <main className="relative z-10 flex-1 px-4 pt-10 max-w-md mx-auto w-full">
          <div className="card text-center">
            <p className="font-semibold text-black">{t('m_not_sent')}</p>
            <p className="text-sm text-gray-500 mt-1.5">{t('m_not_sent_sub')}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="btn-primary mt-5"
            >
              {t('back')}
            </button>
          </div>
        </main>
      </div>
    )
  }

  if (!section) return null

  const meta = sectionMeta(section.id)
  const visibleQuestions = section.questions.filter(q => isVisible(q, liveAnswers))
  const sectionAnswered = visibleQuestions.filter(q => hasAnswer(liveAnswers[q.id])).length

  // Progress is answer-based, so the bar moves while you type instead of
  // only jumping once per section.
  const allVisibleQuestions = SECTIONS.flatMap(s =>
    s.questions.filter(q => isVisible(q, liveAnswers))
  )
  const totalQuestions = allVisibleQuestions.length
  const answeredQuestions = allVisibleQuestions.filter(q => hasAnswer(liveAnswers[q.id])).length
  const answeredPct = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0

  const cheerKey =
    answeredPct >= 85 ? 'q_cheer_4' : answeredPct >= 55 ? 'q_cheer_3' : answeredPct >= 20 ? 'q_cheer_2' : 'q_cheer_1'

  // Consecutive sections sharing a chapter, in display order
  const chapterGroups: { id: ChapterId; indices: number[] }[] = []
  SECTIONS.forEach((s, i) => {
    const chapter = sectionMeta(s.id).chapter
    const last = chapterGroups[chapterGroups.length - 1]
    if (last && last.id === chapter) last.indices.push(i)
    else chapterGroups.push({ id: chapter, indices: [i] })
  })

  const statusOf = (index: number) => {
    const qs = SECTIONS[index].questions.filter(q => isVisible(q, liveAnswers))
    const answered = qs.filter(q => hasAnswer(liveAnswers[q.id])).length
    return { answered, total: qs.length, done: qs.length > 0 && answered === qs.length }
  }

  const unanswered = SECTIONS.flatMap((s, sIdx) =>
    s.questions
      .filter(q => isVisible(q, liveAnswers) && !hasAnswer(liveAnswers[q.id]))
      .map(q => ({ sectionIndex: sIdx, sectionTitle: s.title, question: q }))
  )

  const goToSection = (sectionIndex: number) => {
    setValidationError('')
    setMapOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setCurrentSection(sectionIndex)
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
        <Header showBack backHref="/dashboard" showLogout subtitle={subtitle} />
      </div>

      {/* Sticky progress bar */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 shadow-sm">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center gap-3 mb-2">
            <span className="inline-flex items-center gap-2 min-w-0">
              <span className="min-w-0 text-[10px] font-bold tracking-[0.14em] uppercase text-gold truncate">
                {t(CHAPTER_LABEL[meta.chapter])}
              </span>
              <span className="text-[11px] text-gray-400 shrink-0 tabular-nums">
                {currentSection + 1}/{totalSections}
              </span>
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
              <span className="text-sm text-black font-bold tabular-nums">{answeredPct}%</span>
            </div>
          </div>

          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="relative h-full rounded-full overflow-hidden bg-gradient-to-r from-gold-light via-gold to-gold-dark transition-all duration-700 ease-out animate-sheen"
              style={{ width: `${Math.max(answeredPct, 2)}%` }}
            />
          </div>

          {/* Chapter-grouped section rail — tap to open the section map */}
          <button
            type="button"
            onClick={() => setMapOpen(true)}
            aria-label={t('q_map_title')}
            className="mt-2 w-full flex items-center gap-2 group"
          >
            {chapterGroups.map(group => (
              <div key={group.id} className="flex gap-[3px] flex-1">
                {group.indices.map(i => {
                  const { done } = statusOf(i)
                  return (
                    <span
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                        i === currentSection
                          ? 'bg-gold'
                          : done
                          ? 'bg-black'
                          : i < currentSection
                          ? 'bg-gold/30'
                          : 'bg-gray-200 group-hover:bg-gray-300'
                      }`}
                    />
                  )
                })}
              </div>
            ))}
            <svg
              className="w-3.5 h-3.5 text-gray-300 shrink-0 group-hover:text-gold transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      <main className="relative z-10 flex-1 px-4 pt-5 pb-44 max-w-2xl mx-auto w-full">
        {/* Section card — key forces re-animation on section change */}
        <div key={currentSection} className="card p-5 sm:p-6 mb-4 animate-section-in">
          <div className="flex items-center gap-3 sm:gap-3.5 mb-5 pb-4 border-b border-gray-100">
            <div className="w-11 h-11 sm:w-12 sm:h-12 bg-black rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-black/15">
              <SectionIcon paths={meta.icon} className="w-[22px] h-[22px] sm:w-6 sm:h-6 text-gold" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-gold mb-0.5">
                {t(CHAPTER_LABEL[meta.chapter])}
              </p>
              <h2 className="text-lg sm:text-xl font-bold text-black leading-tight break-words">{section.title}</h2>
            </div>
            <ProgressRing answered={sectionAnswered} total={visibleQuestions.length} />
          </div>

          <div className="space-y-5">
            {visibleQuestions.map((q, i) => {
              const answered = hasAnswer(liveAnswers[q.id])
              const inputId = `q-${q.id}`
              return (
                <div
                  key={q.id}
                  className="animate-question-in border-t border-gray-100 pt-5 first:border-t-0 first:pt-0"
                  style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
                >
                  <div className="flex items-start gap-2.5 mb-2.5">
                    <span
                      className={`mt-[3px] w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${
                        answered ? 'bg-gold border-gold' : 'border-gray-200 bg-white'
                      }`}
                      aria-hidden="true"
                    >
                      {answered && (
                        <svg className="w-2.5 h-2.5 text-white animate-pop" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <label
                        htmlFor={isFieldControl(q.type) ? inputId : undefined}
                        className="block text-[15px] font-semibold text-black leading-snug"
                      >
                        {q.label}
                        {q.required && <span className="text-gold ml-1">*</span>}
                      </label>
                      {q.helpText && (
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">{q.helpText}</p>
                      )}
                    </div>
                  </div>
                  <div className="pl-0 sm:pl-[28px]">
                    <QuestionInput
                      question={q}
                      inputId={inputId}
                      value={liveAnswers[q.id] ?? (q.type === 'multiselect' ? [] : '')}
                      onChange={handleAnswerChange}
                      yesLabel={t('q_yes')}
                      noLabel={t('q_no')}
                      notSureLabel={t('q_not_sure')}
                      selectPlaceholder={t('q_select')}
                      optionLabels={q.optionLabels}
                      bestLabel={t('nr_best')}
                      lowLabel={t('nr_low')}
                      highLabel={t('nr_high')}
                      maxDate={new Date().toISOString().split('T')[0]}
                    />
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
        </div>

        {isLastSection && unanswered.length > 0 && (
          <div className="card mb-4">
            <p className="text-sm font-semibold text-black mb-1">
              {t('q_unanswered_heading')} ({unanswered.length})
            </p>
            <p className="text-xs text-gray-400 mb-3">{t('q_unanswered_sub')}</p>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {unanswered.map(({ sectionIndex, sectionTitle, question }) => (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => goToSection(sectionIndex)}
                  className="w-full flex items-center justify-between gap-3 text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="min-w-0">
                    <span className="block text-xs text-gray-400">{sectionTitle}</span>
                    <span className="block text-sm text-gray-700 truncate">{question.label}</span>
                  </span>
                  <span className="text-gold text-xs font-semibold shrink-0">{t('q_go')} →</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* White halo keeps these legible where they overlap the watermark */}
        <p className="text-center text-sm text-gray-600 mt-5 font-semibold [text-shadow:0_1px_8px_#fff,0_0_3px_#fff]">
          {isLastSection ? t('q_final_section') : t(cheerKey)}
        </p>
        <p className="text-center text-xs text-gray-500 mt-1.5 [text-shadow:0_1px_8px_#fff,0_0_3px_#fff]">
          {t('q_privacy_note')}
        </p>
      </main>

      {/* Milestone toast */}
      {toast && (
        // Sits clear of the fixed nav plus the iOS home-indicator inset
        <div className="fixed inset-x-0 bottom-0 z-40 px-4 pointer-events-none pb-[calc(env(safe-area-inset-bottom,0px)_+_9.5rem)]">
          <div className="max-w-2xl mx-auto flex justify-center">
            <div className="relative max-w-full animate-toast-in bg-black text-white rounded-2xl shadow-xl shadow-black/25 px-4 py-3 flex items-center gap-3">
              {toast.celebrate && (
                <div className="absolute inset-x-0 -top-2 h-2 overflow-visible" aria-hidden="true">
                  {CONFETTI.map((piece, i) => (
                    <span
                      key={i}
                      className={`absolute top-0 w-1.5 h-2.5 rounded-[1px] animate-confetti ${piece.color}`}
                      style={{ left: piece.left, animationDelay: piece.delay }}
                    />
                  ))}
                </div>
              )}
              <span className="w-8 h-8 rounded-full bg-gold flex items-center justify-center shrink-0 animate-pop">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold leading-tight">{toast.title}</span>
                <span className="block text-xs text-white/60 leading-tight mt-0.5">{toast.sub}</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Section map sheet */}
      {mapOpen && (
        <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/50 animate-fade-in"
            onClick={() => setMapOpen(false)}
          />
          <div className="relative w-full max-w-2xl mx-auto bg-white rounded-t-3xl max-h-[78vh] flex flex-col animate-modal-in">
            <div className="px-5 pt-4 pb-3 border-b border-gray-100">
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3.5" />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-black leading-tight">{t('q_map_title')}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{t('q_map_sub')}</p>
                </div>
                <span className="text-sm font-bold text-gold tabular-nums shrink-0">{answeredPct}%</span>
              </div>
            </div>

            <div className="overflow-y-auto overscroll-contain px-5 py-4">
              {chapterGroups.map(group => (
                <div key={group.id} className="mb-5 last:mb-0">
                  <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-gray-400 mb-2">
                    {t(CHAPTER_LABEL[group.id])}
                  </p>
                  <div className="space-y-1.5">
                    {group.indices.map(i => {
                      const s = SECTIONS[i]
                      const { answered, total, done } = statusOf(i)
                      const isCurrent = i === currentSection
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => goToSection(i)}
                          className={`w-full flex items-center gap-3 text-left p-2.5 rounded-xl border-2 transition-all duration-150 active:scale-[0.99] ${
                            isCurrent
                              ? 'border-gold bg-gold/5'
                              : 'border-transparent hover:bg-gray-50'
                          }`}
                        >
                          <span
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                              done ? 'bg-black text-gold' : isCurrent ? 'bg-gold text-white' : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            <SectionIcon paths={sectionMeta(s.id).icon} className="w-[18px] h-[18px]" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={`block text-sm truncate ${isCurrent || done ? 'font-semibold text-black' : 'text-gray-600'}`}>
                              {s.title}
                            </span>
                            <span className="block text-[11px] text-gray-400 tabular-nums">
                              {answered}/{total} {t('q_answered')}
                            </span>
                          </span>
                          {done && (
                            <svg className="w-4 h-4 text-black shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-3 border-t border-gray-100 pb-[calc(env(safe-area-inset-bottom,0px)_+_0.75rem)]">
              <button
                onClick={() => setMapOpen(false)}
                className="w-full py-3 text-sm font-semibold text-gray-500 hover:text-black transition-colors"
              >
                {t('q_close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 pt-2.5 pb-[calc(env(safe-area-inset-bottom,0px)_+_0.5rem)] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] z-20">
        <div className="max-w-2xl mx-auto space-y-2">
          {!isLastSection && SECTIONS[currentSection + 1] && (
            <p className="text-[11px] text-gray-400 text-center truncate">
              <span className="uppercase tracking-wider font-semibold text-gray-300">{t('q_up_next')}</span>
              {' · '}
              {SECTIONS[currentSection + 1].title}
            </p>
          )}
          <div className="flex gap-3">
            {currentSection > 0 && (
              <button
                onClick={handlePrev}
                className="flex-1 py-4 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-base transition-all duration-150 hover:border-gray-300 hover:shadow-sm active:scale-[0.97] active:bg-gray-50"
              >
                ← {t('q_back')}
              </button>
            )}
            {!isLastSection ? (
              <button onClick={handleNext} className="btn-primary flex-1">
                {t('q_next')} →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="btn-primary flex-1"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {t('q_submitting')}
                  </span>
                ) : t('q_save_submit')}
              </button>
            )}
          </div>
          <button
            onClick={handleSaveExit}
            className="w-full text-gray-400 text-sm py-1.5 transition-colors hover:text-gray-600 active:text-gray-700"
          >
            {t('q_save_exit')}
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { getSession, addSubmissionNotification } from '@/lib/auth'
import { QUESTIONNAIRE_SECTIONS } from '@/lib/questionnaireData'
import { AnswerValue, Question, QuestionnaireState, Session } from '@/types'

function isVisible(q: Question, answers: Record<string, AnswerValue>): boolean {
  if (!q.showIf) return true
  return answers[q.showIf.questionId] === q.showIf.value
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: Question
  value: AnswerValue
  onChange: (id: string, val: AnswerValue) => void
}) {
  const strVal = typeof value === 'string' ? value : ''
  const arrVal = Array.isArray(value) ? value : []

  switch (question.type) {
    case 'yes_no':
      return (
        <div className="flex gap-3">
          {(['yes', 'no'] as const).map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(question.id, opt)}
              className={`flex-1 py-4 rounded-xl border-2 font-semibold text-base transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold ${
                strVal === opt
                  ? 'bg-gold text-white border-gold'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gold/50'
              }`}
            >
              {opt === 'yes' ? 'Yes' : 'No'}
            </button>
          ))}
        </div>
      )

    case 'select':
      return (
        <select
          value={strVal}
          onChange={e => onChange(question.id, e.target.value)}
          className="input-field appearance-none bg-white"
        >
          <option value="">Select an option…</option>
          {question.options?.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )

    case 'multiselect':
      return (
        <div className="space-y-2">
          {question.options?.map(opt => {
            const checked = arrVal.includes(opt)
            return (
              <label
                key={opt}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors active:scale-[0.99] ${
                  checked ? 'border-gold bg-gold/5' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                  checked ? 'bg-gold border-gold' : 'bg-white border-gray-300'
                }`}>
                  {checked && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={`text-sm ${checked ? 'text-gold font-medium' : 'text-gray-700'}`}>{opt}</span>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={e => {
                    const next = e.target.checked
                      ? [...arrVal, opt]
                      : arrVal.filter(v => v !== opt)
                    onChange(question.id, next)
                  }}
                />
              </label>
            )
          })}
        </div>
      )

    case 'textarea':
      return (
        <textarea
          value={strVal}
          onChange={e => onChange(question.id, e.target.value)}
          placeholder={question.placeholder ?? 'Type your answer here…'}
          rows={4}
          className="input-field resize-none"
        />
      )

    case 'date':
      return (
        <input
          type="date"
          value={strVal}
          onChange={e => onChange(question.id, e.target.value)}
          className="input-field"
          max={new Date().toISOString().split('T')[0]}
        />
      )

    case 'phone':
      return (
        <input
          type="tel"
          inputMode="numeric"
          value={strVal}
          onChange={e => onChange(question.id, e.target.value)}
          placeholder={question.placeholder ?? '(555) 000-0000'}
          className="input-field"
        />
      )

    default:
      return (
        <input
          type="text"
          value={strVal}
          onChange={e => onChange(question.id, e.target.value)}
          placeholder={question.placeholder ?? ''}
          className="input-field"
        />
      )
  }
}

export default function QuestionnairePage() {
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
  const router = useRouter()

  useEffect(() => {
    const s = getSession()
    if (!s) { router.replace('/client'); return }
    setSession(s)
    fetch(`/api/questionnaire?clientId=${s.clientId}`)
      .then(r => r.json())
      .then(({ state }) => {
        if (state) {
          setQState(state)
          if (state.completedSections.length > 0) {
            setCurrentSection(Math.min(state.completedSections.length, QUESTIONNAIRE_SECTIONS.length - 1))
          }
        }
      })
  }, [router])

  const section = QUESTIONNAIRE_SECTIONS[currentSection]
  const totalSections = QUESTIONNAIRE_SECTIONS.length
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
        answers: newState.answers,
        completedSections: newState.completedSections,
        submitted: newState.submitted,
      }),
    }).catch(() => {
      console.error('Failed to save questionnaire state')
    })
  }, [session])

  // Auto-save answers 1 second after any change
  useEffect(() => {
    if (!session) return
    const timer = setTimeout(() => {
      fetch('/api/questionnaire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: session.clientId,
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

  const validateSection = (): boolean => {
    for (const q of section.questions) {
      if (!q.required) continue
      if (!isVisible(q, qState.answers)) continue
      const val = qState.answers[q.id]
      const isEmpty = !val || (Array.isArray(val) && val.length === 0) || val === ''
      if (isEmpty) {
        setValidationError(`Please answer: "${q.label}"`)
        return false
      }
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

    try {
      await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: session.name,
          caseType: session.caseType,
          answers: finalState.answers,
        }),
      })
    } catch (err) {
      console.error('Email send failed:', err)
    }
    router.push('/submitted')
  }

  if (!session || !section) return null

  const progressPct = Math.round((currentSection / totalSections) * 100)
  const visibleQuestions = section.questions.filter(q => isVisible(q, qState.answers))

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header showBack backHref="/dashboard" showLogout subtitle="Questionnaire" />

      {/* Sticky progress bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 shadow-sm">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
            <span className="font-semibold text-black">Section {currentSection + 1} <span className="font-normal text-gray-400">of {totalSections}</span></span>
            <div className="flex items-center gap-2">
              {autoSaved && (
                <span className="flex items-center gap-1 text-green-600 font-medium transition-opacity">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved
                </span>
              )}
              <span className="text-gold font-semibold">{progressPct}%</span>
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gold rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {/* Section dots */}
          <div className="mt-2 flex gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
            {QUESTIONNAIRE_SECTIONS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 shrink-0 rounded-full transition-all duration-300 ${
                  i < currentSection
                    ? 'bg-green-400 w-2'
                    : i === currentSection
                    ? 'bg-gold w-5'
                    : 'bg-gray-200 w-1.5'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1 px-4 pt-5 pb-36 max-w-2xl mx-auto w-full">
        {/* Section card */}
        <div className="card mb-4">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
            <div className="w-9 h-9 bg-gold rounded-xl flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-bold">{currentSection + 1}</span>
            </div>
            <h2 className="text-lg font-semibold text-black leading-tight">{section.title}</h2>
          </div>

          <div className="space-y-6">
            {visibleQuestions.map(q => (
              <div key={q.id}>
                <label className="label">
                  {q.label}
                  {q.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {q.helpText && (
                  <p className="text-xs text-gray-400 mb-2 leading-relaxed">{q.helpText}</p>
                )}
                <QuestionInput
                  question={q}
                  value={qState.answers[q.id] ?? (q.type === 'multiselect' ? [] : '')}
                  onChange={handleAnswerChange}
                />
              </div>
            ))}
          </div>

          {validationError && (
            <div className="mt-5 bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
              <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
              </svg>
              <p className="text-red-700 text-sm">{validationError}</p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Answers are saved automatically · Protected by attorney-client privilege
        </p>
      </main>

      {/* Fixed bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 pt-3 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.06)] z-20">
        <div className="max-w-2xl mx-auto space-y-2">
          <div className="flex gap-3">
            {currentSection > 0 && (
              <button
                onClick={handlePrev}
                className="flex-1 py-4 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-base hover:border-gray-300 transition-colors active:bg-gray-50"
              >
                ← Previous
              </button>
            )}
            {!isLastSection ? (
              <button onClick={handleNext} className="btn-primary flex-1">
                Next →
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
                    Submitting…
                  </span>
                ) : 'Submit Questionnaire'}
              </button>
            )}
          </div>
          <button
            onClick={handleSaveExit}
            className="w-full text-gray-400 text-sm py-1.5 transition-colors hover:text-gray-600 active:text-gray-700"
          >
            Save & Exit
          </button>
        </div>
      </div>
    </div>
  )
}

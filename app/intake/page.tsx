'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { INTAKE_SECTIONS, IntakeSection } from '@/lib/intakeFormData'
import { INTAKE_SECTIONS_ES } from '@/lib/intakeFormDataEs'
import { AnswerValue, Question } from '@/types'
import { addSubmissionNotification } from '@/lib/auth'
import { useLanguage } from '@/lib/i18n'

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
              className={`flex-1 py-3 rounded-xl border-2 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold ${
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
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
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

function isVisible(q: Question, answers: Record<string, AnswerValue>): boolean {
  if (!q.showIf) return true
  return answers[q.showIf.questionId] === q.showIf.value
}

export default function IntakePage() {
  const router = useRouter()
  const { lang, setLang, t } = useLanguage()
  const sections = lang === 'es' ? INTAKE_SECTIONS_ES : INTAKE_SECTIONS
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({})
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [userEmail, setUserEmail] = useState<string>('')
  const [emailSubmitted, setEmailSubmitted] = useState(false)
  const [emailInput, setEmailInput] = useState('')

  // Load from localStorage on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('intake_user_email')
    if (savedEmail) {
      setUserEmail(savedEmail)
      setEmailSubmitted(true)
      const draftKey = `intake_form_draft_${savedEmail}`
      const saved = localStorage.getItem(draftKey)
      if (saved) {
        try {
          setAnswers(JSON.parse(saved))
        } catch (err) {
          console.error('Failed to load draft:', err)
        }
      }
    }
  }, [])

  // Auto-save to localStorage
  useEffect(() => {
    if (emailSubmitted && userEmail) {
      const draftKey = `intake_form_draft_${userEmail}`
      localStorage.setItem(draftKey, JSON.stringify(answers))
    }
  }, [answers, emailSubmitted, userEmail])

  const handleEmailSubmit = () => {
    const email = emailInput.trim()
    if (!email) {
      setSubmitError(lang === 'es' ? 'Por favor ingrese su correo electrónico' : 'Please enter your email address')
      return
    }
    if (!email.includes('@')) {
      setSubmitError(lang === 'es' ? 'Por favor ingrese un correo válido' : 'Please enter a valid email address')
      return
    }
    setUserEmail(email)
    setEmailSubmitted(true)
    localStorage.setItem('intake_user_email', email)
    setSubmitError('')
  }

  const handleAnswerChange = (id: string, val: AnswerValue) => {
    setAnswers(prev => ({ ...prev, [id]: val }))
  }

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  const handleSubmit = async () => {
    setSubmitError('')

    setIsSubmitting(true)

    try {
      // In a real app, this would send to a backend
      // For now, we'll just store it and show success
      const submissionId = `intake-${Date.now()}`
      const submissionData = {
        id: submissionId,
        timestamp: new Date().toISOString(),
        answers,
        reviewed: false,
      }

      // Store submission locally for demonstration
      const submissions = JSON.parse(localStorage.getItem('intake_submissions') || '[]')
      submissions.push(submissionData)
      localStorage.setItem('intake_submissions', JSON.stringify(submissions))

      // Create notification for admin
      const clientName = String(answers.legal_name || 'New Client')
      addSubmissionNotification({
        clientId: submissionId,
        clientName,
        caseType: 'Intake Form',
        submittedAt: submissionData.timestamp,
      })

      // Clear the draft
      if (userEmail) {
        const draftKey = `intake_form_draft_${userEmail}`
        localStorage.removeItem(draftKey)
      }

      setSubmitSuccess(true)
      setAnswers({})

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/')
      }, 2000)
    } catch (err) {
      setSubmitError('Failed to submit form. Please try again.')
      console.error('Submission error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveDraft = () => {
    // Draft is auto-saved, just show confirmation
    setSubmitError('')
    const msg = 'Draft saved. You can return to this form anytime.'
    localStorage.setItem('intake_form_message', msg)
    setTimeout(() => {
      localStorage.removeItem('intake_form_message')
    }, 3000)
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-black py-6 px-4 text-center border-b border-white/10">
          <Image src="/logo.png" alt="866 JACK LAW" width={60} height={60} className="rounded-sm mx-auto mb-3" priority />
          <p className="text-white/50 text-sm">Law Offices of Jack D. Josephson, APC</p>
        </header>

        <main className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-md text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-black mb-2">{t('intake_thanks')}</h2>
            <p className="text-gray-600 mb-4">
              {t('intake_success')}
            </p>
            <p className="text-sm text-gray-500">{t('intake_redirecting')}</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col animate-fade-in">
      {/* Header */}
      <header className="bg-black py-6 px-4 border-b border-white/10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex-1 text-center">
            <Image src="/logo.png" alt="866 JACK LAW" width={60} height={60} className="rounded-sm mx-auto mb-3" priority />
            <p className="text-white/50 text-sm">Law Offices of Jack D. Josephson, APC</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setLang('en')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                lang === 'en'
                  ? 'bg-gold text-white'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLang('es')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                lang === 'es'
                  ? 'bg-gold text-white'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Español
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-8 max-w-3xl mx-auto w-full">
        {!emailSubmitted ? (
          // Email input screen
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="max-w-md w-full animate-slide-up">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-black mb-2">
                  {lang === 'es' ? '¡Bienvenido!' : 'Welcome!'}
                </h2>
                <p className="text-gray-600 text-sm">
                  {lang === 'es'
                    ? 'Ingrese su correo electrónico para guardar su progreso'
                    : 'Enter your email to save your progress'}
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <label className="label">{lang === 'es' ? 'Correo Electrónico' : 'Email Address'}</label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={e => {
                    setEmailInput(e.target.value)
                    setSubmitError('')
                  }}
                  placeholder={lang === 'es' ? 'su@correo.com' : 'your@email.com'}
                  className="input-field mb-4"
                  onKeyPress={e => e.key === 'Enter' && handleEmailSubmit()}
                />
                <p className="text-xs text-gray-400 mb-4">
                  {lang === 'es'
                    ? 'Si ya tiene un formulario guardado, su progreso se cargará automáticamente.'
                    : 'If you have a saved form, your progress will load automatically.'}
                </p>

                {submitError && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3">
                    <p className="text-red-700 text-sm">{submitError}</p>
                  </div>
                )}

                <button
                  onClick={handleEmailSubmit}
                  className="btn-primary w-full"
                >
                  {lang === 'es' ? 'Continuar' : 'Continue'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Title */}
            <div className="mb-6 animate-slide-up flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-black mb-2">{t('intake_title')}</h1>
                <p className="text-gray-600 text-sm">
                  {t('intake_subtitle')}
                </p>
              </div>
              <button
                onClick={() => {
                  setEmailSubmitted(false)
                  setUserEmail('')
                  setEmailInput('')
                  localStorage.removeItem('intake_user_email')
                }}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-3 py-1 border border-gray-200 rounded-lg"
              >
                {lang === 'es' ? 'Cambiar' : 'Change'}
              </button>
            </div>

            {/* Current user email */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-xs text-blue-700">
                <strong>{lang === 'es' ? 'Guardado como:' : 'Saved as:'}</strong> {userEmail}
              </p>
            </div>

            {/* Sections */}
            <div className="space-y-4 mb-8">
              {sections.map((section, idx) => {
            const visibleQuestions = section.questions.filter(q => isVisible(q, answers))
            if (visibleQuestions.length === 0) return null

            const isOpen = expandedSections.has(section.id)

            return (
              <div
                key={section.id}
                className={`card animate-slide-up stagger-${Math.min(idx + 1, 5)}`}
              >
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full text-left flex items-center justify-between gap-3 pb-4 border-b border-gray-100 hover:text-gold transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gold/10 rounded-lg flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-gold">{idx + 1}</span>
                      </div>
                      <h2 className="text-lg font-semibold text-black">{section.title}</h2>
                    </div>
                    {section.description && (
                      <p className="text-sm text-gray-500 mt-1 ml-11">{section.description}</p>
                    )}
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Questions */}
                {isOpen && (
                  <div className="pt-4 space-y-5">
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
                          value={answers[q.id] ?? (q.type === 'multiselect' ? [] : '')}
                          onChange={handleAnswerChange}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Error Message */}
        {submitError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
            <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
            </svg>
            <p className="text-red-700 text-sm">{submitError}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 animate-slide-up stagger-5">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="btn-primary"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {lang === 'es' ? 'Enviando…' : 'Submitting…'}
              </span>
            ) : (
              t('intake_submit')
            )}
          </button>

          <button
            onClick={handleSaveDraft}
            disabled={isSubmitting}
            className="w-full py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold transition-all duration-150 hover:border-gray-400 active:scale-[0.97]"
          >
            {t('intake_save_draft')}
          </button>

          <button
            onClick={() => router.push('/')}
            className="w-full text-gray-400 text-sm py-3 transition-colors hover:text-gray-600"
          >
            {t('intake_cancel')}
          </button>
        </div>

            {/* Privacy Notice */}
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-blue-800 text-xs">
                <strong>{lang === 'es' ? 'Privacidad:' : 'Privacy:'}</strong> {t('intake_privacy')}
              </p>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-black/5 border-t border-gray-200 py-6 text-center">
        <p className="text-gray-500 text-xs">
          Law Offices of Jack D. Josephson, APC · California Employment Law
        </p>
      </footer>
    </div>
  )
}

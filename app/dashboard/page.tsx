'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import MascotWatermark from '@/components/MascotWatermark'
import { getSession } from '@/lib/auth'
import { Assignment, Session } from '@/types'
import { QUESTIONNAIRE_SECTIONS } from '@/lib/questionnaireData'
import { FIRM_PHONE_LABEL, FIRM_PHONE_LABEL_HYPHENATED, FIRM_PHONE_TEL } from '@/lib/contact'
import { useLanguage } from '@/lib/i18n'
import { localizeName } from '@/lib/questionLogic'

export default function DashboardPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [questionnaireProgress, setQuestionnaireProgress] = useState(0)
  const [documentCount, setDocumentCount] = useState(0)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const router = useRouter()
  const { t, lang } = useLanguage()

  useEffect(() => {
    const s = getSession()
    if (!s) { router.replace('/client'); return }
    setSession(s)

    const total = QUESTIONNAIRE_SECTIONS.length
    Promise.all([
      fetch(`/api/questionnaire?clientId=${s.clientId}`).then(r => r.json()),
      fetch(`/api/documents?clientId=${s.clientId}`).then(r => r.json()),
    ]).then(([{ state }, { documents }]) => {
      const completed = state?.submitted ? total : (state?.completedSections?.length ?? 0)
      setQuestionnaireProgress(Math.round((completed / total) * 100))
      setDocumentCount(documents?.length ?? 0)
    })

    // Question sets the office assigned to this client specifically. Kept apart
    // from the onboarding progress above — each has its own status.
    fetch(`/api/assignments?clientId=${encodeURIComponent(s.clientId)}`)
      .then(r => r.json())
      .then(({ assignments }) => setAssignments(assignments ?? []))
      .catch(() => setAssignments([]))
  }, [router])

  if (!session) return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header showLogout />
      <main className="flex-1 px-4 pt-5 pb-8 max-w-2xl mx-auto w-full">
        <div className="mb-5">
          <div className="animate-shimmer h-8 w-48 rounded-xl mb-2" />
          <div className="animate-shimmer h-4 w-64 rounded-xl" />
        </div>
        <div className="animate-shimmer h-16 rounded-2xl mb-5" />
        <div className="animate-shimmer h-40 rounded-2xl mb-4" />
        <div className="space-y-3 mb-5">
          <div className="animate-shimmer h-24 rounded-2xl" />
          <div className="animate-shimmer h-24 rounded-2xl" />
        </div>
        <div className="animate-shimmer h-32 rounded-2xl" />
      </main>
    </div>
  )

  const onboardingDone = questionnaireProgress === 100

  return (
    <div className="relative min-h-screen bg-gray-50 flex flex-col animate-fade-in">
      <MascotWatermark />

      <div className="relative z-10">
        <Header showLogout />
      </div>

      <main className="relative z-10 flex-1 px-4 pt-5 pb-8 pb-safe max-w-2xl mx-auto w-full">
        {/* Welcome */}
        <div className="mb-5 animate-slide-up">
          <h2 className="text-2xl font-bold text-black">{t('hello')} {session.name} 👋</h2>
          <p className="text-gray-500 text-sm mt-0.5">{t('welcome_portal')}</p>
        </div>

        {/* What this portal is for, and how to actually reach the office */}
        <div className="mb-5 bg-gold/5 border border-gold/30 rounded-2xl p-4 flex gap-3 animate-slide-up stagger-1">
          <svg className="w-5 h-5 text-gold shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-600 text-sm leading-relaxed">
            <strong className="text-black font-semibold">{t('emergency')}</strong> {t('emergency_sub')}{' '}
            <a
              href={FIRM_PHONE_TEL}
              className="text-gold font-bold underline underline-offset-2 whitespace-nowrap py-3.5 hover:text-gold-dark active:text-gold-dark"
            >
              {FIRM_PHONE_LABEL}
            </a>.
          </p>
        </div>

        {/* Case summary card */}
        <div className="card mb-4 animate-slide-up stagger-2">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">{t('your_case')}</p>
              <p className="text-black font-bold text-lg leading-tight">{session.caseType}</p>
            </div>
            <span className={`text-xs font-semibold px-3 py-1.5 rounded-full shrink-0 ml-3 ${
              onboardingDone
                ? 'bg-green-100 text-green-700'
                : questionnaireProgress > 0
                ? 'bg-amber-100 text-amber-700'
                : 'bg-gray-100 text-gray-500'
            }`}>
              {onboardingDone ? t('status_submitted') : questionnaireProgress > 0 ? t('status_in_progress') : t('status_not_started')}
            </span>
          </div>

          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>{t('q_progress')}</span>
              <span className={onboardingDone ? 'text-green-600 font-semibold' : 'text-gold font-semibold'}>
                {questionnaireProgress}%
              </span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  onboardingDone ? 'bg-green-500' : 'bg-gold'
                }`}
                style={{ width: `${questionnaireProgress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm text-gray-400">
              {documentCount === 0 ? t('no_docs') : `${documentCount} document${documentCount !== 1 ? 's' : ''} uploaded`}
            </span>
          </div>
        </div>

        {/* Action cards */}
        <div className="space-y-3 mb-5">
          <button
            onClick={() => router.push('/questionnaire')}
            className="w-full bg-white border-2 border-transparent hover:border-gold rounded-2xl p-5 text-left flex items-center gap-4 transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98] group animate-slide-up stagger-3"
          >
            <div className="w-12 h-12 bg-gold/10 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-gold group-active:bg-gold transition-colors">
              <svg className="w-6 h-6 text-gold group-hover:text-white group-active:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-black">
                {onboardingDone ? t('view_q') : t('complete_q')}
              </p>
              <p className="text-sm text-gray-500 mt-0.5 truncate">
                {onboardingDone
                  ? t('submitted_thanks')
                  : questionnaireProgress > 0
                  ? `Resume — ${questionnaireProgress}% complete`
                  : `${QUESTIONNAIRE_SECTIONS.length} sections · ~15–25 min`}
              </p>
            </div>
            <svg className="w-5 h-5 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={() => router.push('/documents')}
            className="w-full bg-white border-2 border-transparent hover:border-gold rounded-2xl p-5 text-left flex items-center gap-4 transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98] group animate-slide-up stagger-4"
          >
            <div className="w-12 h-12 bg-gold/10 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-gold group-active:bg-gold transition-colors">
              <svg className="w-6 h-6 text-gold group-hover:text-white group-active:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-black">{t('upload_documents')}</p>
              <p className="text-sm text-gray-500 mt-0.5">
                {documentCount > 0
                  ? `${documentCount} file${documentCount !== 1 ? 's' : ''} uploaded`
                  : 'Paystubs, texts, emails, and more'}
              </p>
            </div>
            <svg className="w-5 h-5 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>


        {/* Question sets assigned to this client */}
        {assignments.length > 0 && (
          <div className="mb-5 animate-slide-up stagger-4">
            <div className="flex items-baseline justify-between gap-3 mb-2 px-1">
              <h3 className="font-bold text-black">{t('qs_your_questionnaires')}</h3>
              <span className="text-xs text-gray-400">{assignments.length}</span>
            </div>
            <p className="text-xs text-gray-500 mb-3 px-1">{t('qs_your_questionnaires_sub')}</p>

            <div className="space-y-3">
              {assignments.map(a => {
                const done = a.status === 'completed'
                const started = a.status === 'in_progress' || a.answeredCount > 0
                const label = done ? t('qs_completed') : started ? t('qs_in_progress') : t('qs_not_started')
                const action = done ? t('qs_view') : started ? t('qs_continue') : t('qs_start')
                const pct = a.questionCount > 0 ? Math.round((a.answeredCount / a.questionCount) * 100) : 0

                return (
                  <button
                    key={a.id}
                    onClick={() => router.push(`/questionnaire/${a.id}`)}
                    className="w-full bg-white border-2 border-transparent hover:border-gold rounded-2xl p-5 text-left transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98] group"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-black truncate">
                          {localizeName(a.questionSetName, a.questionSetNameTranslations, lang)}
                        </p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {a.questionCount} {a.questionCount === 1 ? t('qs_question') : t('qs_questions')}
                        </p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                        done ? 'bg-green-100 text-green-700' : started ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {label}
                      </span>
                    </div>

                    {!done && a.questionCount > 0 && (
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-gold transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 tabular-nums">{pct}%</span>
                      </div>
                    )}

                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-gold">
                      {action}
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Contact Office */}
        <div className="bg-black rounded-2xl p-5 mb-6 animate-slide-up stagger-5">
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-5 h-5 text-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <p className="text-white font-semibold">{t('contact_office')}</p>
          </div>
          <p className="text-white/60 text-sm mb-4 leading-relaxed">{t('contact_msg')}</p>
          <a
            href={FIRM_PHONE_TEL}
            className="flex items-center justify-center gap-2 w-full bg-gold text-white font-bold py-4 rounded-xl hover:bg-gold-dark active:bg-gold-dark transition-colors text-base"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            {FIRM_PHONE_LABEL_HYPHENATED}
          </a>
        </div>

        {/* White halo keeps this legible where it overlaps the watermark */}
        <p className="text-center text-xs text-gray-500 pb-2 [text-shadow:0_1px_8px_#fff,0_0_3px_#fff]">
          Law Offices of Jack D. Josephson, APC<br />
          California Employment Law · Attorney-Client Confidential
        </p>
      </main>
    </div>
  )
}

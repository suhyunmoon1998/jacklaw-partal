'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { getSession } from '@/lib/auth'
import { Session } from '@/types'
import { QUESTIONNAIRE_SECTIONS } from '@/lib/questionnaireData'

export default function DashboardPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [questionnaireProgress, setQuestionnaireProgress] = useState(0)
  const [documentCount, setDocumentCount] = useState(0)
  const router = useRouter()

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
  }, [router])

  if (!session) return null

  const onboardingDone = questionnaireProgress === 100

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header showLogout />

      <main className="flex-1 px-4 pt-5 pb-8 pb-safe max-w-2xl mx-auto w-full">
        {/* Welcome */}
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-black">Hello, {session.name} 👋</h2>
          <p className="text-gray-500 text-sm mt-0.5">Welcome to your client portal.</p>
        </div>

        {/* Emergency warning */}
        <div className="mb-5 bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3">
          <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
          </svg>
          <p className="text-red-700 text-sm leading-relaxed">
            <strong>Do not use this portal for emergencies.</strong> Call our office directly for urgent matters.
          </p>
        </div>

        {/* Case summary card */}
        <div className="card mb-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Your Case</p>
              <p className="text-black font-bold text-lg leading-tight">{session.caseType}</p>
            </div>
            <span className={`text-xs font-semibold px-3 py-1.5 rounded-full shrink-0 ml-3 ${
              onboardingDone
                ? 'bg-green-100 text-green-700'
                : questionnaireProgress > 0
                ? 'bg-amber-100 text-amber-700'
                : 'bg-gray-100 text-gray-500'
            }`}>
              {onboardingDone ? '✓ Submitted' : questionnaireProgress > 0 ? 'In Progress' : 'Not Started'}
            </span>
          </div>

          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>Questionnaire progress</span>
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
              {documentCount === 0 ? 'No documents uploaded yet' : `${documentCount} document${documentCount !== 1 ? 's' : ''} uploaded`}
            </span>
          </div>
        </div>

        {/* Action cards */}
        <div className="space-y-3 mb-5">
          <button
            onClick={() => router.push('/questionnaire')}
            className="w-full bg-white border-2 border-transparent hover:border-gold active:bg-gray-50 rounded-2xl p-5 text-left flex items-center gap-4 transition-all shadow-sm group"
          >
            <div className="w-13 h-13 w-12 h-12 bg-gold/10 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-gold group-active:bg-gold transition-colors">
              <svg className="w-6 h-6 text-gold group-hover:text-white group-active:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-black">
                {onboardingDone ? 'View Questionnaire' : 'Complete Questionnaire'}
              </p>
              <p className="text-sm text-gray-500 mt-0.5 truncate">
                {onboardingDone
                  ? 'Submitted — thank you!'
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
            className="w-full bg-white border-2 border-transparent hover:border-gold active:bg-gray-50 rounded-2xl p-5 text-left flex items-center gap-4 transition-all shadow-sm group"
          >
            <div className="w-12 h-12 bg-gold/10 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-gold group-active:bg-gold transition-colors">
              <svg className="w-6 h-6 text-gold group-hover:text-white group-active:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-black">Upload Documents</p>
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

        {/* Contact Office */}
        <div className="bg-black rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-5 h-5 text-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <p className="text-white font-semibold">Contact Our Office</p>
          </div>
          <p className="text-white/60 text-sm mb-4 leading-relaxed">
            Have questions? Our team is here to help. Do not share sensitive case details by text or email.
          </p>
          <a
            href="tel:+18668225529"
            className="flex items-center justify-center gap-2 w-full bg-gold text-white font-bold py-4 rounded-xl hover:bg-gold-dark active:bg-gold-dark transition-colors text-base"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            866-JACK-LAW
          </a>
        </div>

        <p className="text-center text-xs text-gray-400 pb-2">
          Law Offices of Jack D. Josephson, APC<br />
          California Employment Law · Attorney-Client Confidential
        </p>
      </main>
    </div>
  )
}

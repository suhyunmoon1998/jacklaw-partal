'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { getSession, getQuestionnaireState } from '@/lib/auth'

export default function SubmittedPage() {
  const router = useRouter()

  useEffect(() => {
    const s = getSession()
    if (!s) { router.replace('/client'); return }

    const qState = getQuestionnaireState(s.clientId)
    if (!qState.submitted) {
      router.replace('/questionnaire')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header showLogout />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="card text-center">
            {/* Success icon */}
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-navy mb-3">Thank You!</h2>
            <p className="text-gray-600 leading-relaxed mb-2">
              Your questionnaire has been submitted successfully.
            </p>
            <p className="text-gray-500 text-sm leading-relaxed mb-8">
              Our team will review your information and be in touch.
              Please continue to upload any documents that may support your case.
            </p>

            <div className="bg-orange-50 border border-gold/30 rounded-xl p-4 mb-6 text-left">
              <p className="text-navy text-sm font-semibold mb-1">What happens next?</p>
              <ul className="space-y-1.5">
                {[
                  'Our attorney will review your intake answers.',
                  'We may contact you to schedule a consultation.',
                  'You can upload additional documents at any time.',
                  'Your information remains strictly confidential.',
                ].map(step => (
                  <li key={step} className="flex items-start gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-gold shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {step}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => router.push('/documents')}
                className="btn-primary"
              >
                Upload Documents
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="btn-secondary"
              >
                Return to Dashboard
              </button>
            </div>
          </div>

          <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-700 text-sm text-center">
              <strong>Do not use this portal for emergencies.</strong><br />
              Call our office directly for urgent matters.
            </p>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Law Offices of Jack D. Josephson, APC<br />
            California Employment Law · Attorney-Client Confidential
          </p>
        </div>
      </main>
    </div>
  )
}

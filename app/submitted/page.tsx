'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { getSession } from '@/lib/auth'
import { useLanguage } from '@/lib/i18n'

export default function SubmittedPage() {
  const router = useRouter()
  const { t } = useLanguage()

  useEffect(() => {
    const s = getSession()
    if (!s) { router.replace('/client'); return }

    fetch(`/api/questionnaire?clientId=${s.clientId}`)
      .then(r => r.json())
      .then(({ state }) => {
        // Either step lands here now. Guarding on Module 1 alone would bounce a
        // client who has just submitted Module 2 straight back into Module 1 —
        // and if Module 1 were locked to them, into the locked screen.
        if (!state?.submitted && !state?.module2?.submitted) router.replace('/dashboard')
      })
      .catch(() => {
        // Transient network issue right after submitting — don't bounce the client away.
      })
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

            <h2 className="text-2xl font-bold text-navy mb-3">{t('submitted_heading')}</h2>
            <p className="text-gray-600 leading-relaxed mb-2">{t('submitted_msg')}</p>
            <p className="text-gray-500 text-sm leading-relaxed mb-8">{t('submitted_sub')}</p>

            <div className="bg-orange-50 border border-gold/30 rounded-xl p-4 mb-6 text-left">
              <p className="text-navy text-sm font-semibold mb-1">{t('what_next')}</p>
              <ul className="space-y-1.5">
                {[t('next_step_1'), t('next_step_2'), t('next_step_3'), t('next_step_4')].map(step => (
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
                {t('upload_docs_btn')}
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="btn-secondary"
              >
                {t('return_dashboard')}
              </button>
            </div>
          </div>

          <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-700 text-sm text-center">
              <strong>{t('no_emergency')}</strong><br />
              {t('no_emergency_sub')}
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

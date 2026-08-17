'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { normalizePhone, setSession, getSession, formatPhone } from '@/lib/auth'
import { FIRM_PHONE_LABEL, FIRM_PHONE_TEL } from '@/lib/contact'
import { useLanguage } from '@/lib/i18n'

/**
 * Where to land after signing in. An emailed question-set link sends the client
 * here with ?next=/questionnaire/<assignmentId> so they end up on the set they
 * were asked about instead of the dashboard.
 *
 * Read off window.location rather than useSearchParams so this page keeps
 * prerendering without a Suspense boundary.
 *
 * Only a same-site path is honoured. Checking for a leading "/" is not enough:
 * "//evil.com" is a protocol-relative URL, and browsers treat the backslash in
 * "/\evil.com" as a slash too, so both would leave the site. The allowlist is
 * therefore positive — the two destinations a link is ever sent to.
 */
const SAFE_NEXT = /^\/(dashboard|documents|questionnaire(\/[A-Za-z0-9-]+)?)$/

function nextPath(): string {
  if (typeof window === 'undefined') return '/dashboard'
  const raw = new URLSearchParams(window.location.search).get('next') ?? ''
  return SAFE_NEXT.test(raw) ? raw : '/dashboard'
}

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { lang, setLang, t } = useLanguage()

  useEffect(() => {
    const session = getSession()
    if (session) router.replace(nextPath())
  }, [router])

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d\s\-()]/g, '')
    const digits = raw.replace(/\D/g, '').slice(0, 10)
    setPhone(formatPhone(digits))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const normalized = normalizePhone(phone)
    const res = await fetch('/api/clients/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: normalized }),
    })
    const { client } = await res.json()

    if (client) {
      setSession({ clientId: client.id, phone: normalized, name: client.name, caseType: client.case_type ?? '' })
      router.replace(nextPath())
    } else {
      setError(t('not_found'))
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col animate-fade-in">
      <header className="bg-black py-8 px-4 text-center border-b border-white/10">
        <div className="flex flex-col items-center gap-3">
          <Image src="/logo.png" alt="866 JACK LAW" width={120} height={120} className="rounded-sm animate-slide-up" priority />
          <div>
            <p className="text-white/60 text-sm font-medium">Law Offices of Jack D. Josephson, APC</p>
            <p className="text-gold/90 text-xs mt-0.5 tracking-wider uppercase">Client Portal</p>
          </div>
          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
            className="animate-glow mt-2 bg-gold text-white text-sm font-bold tracking-wider border-2 border-gold hover:bg-gold-dark px-6 py-2.5 rounded-full transition-all duration-150 ease-out hover:-translate-y-0.5 active:scale-[0.97]"
          >
            {lang === 'en' ? 'Español' : 'English'}
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 pt-8 pb-16 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="card animate-slide-up stagger-1">
            <h2 className="text-xl font-semibold text-navy mb-1">{t('welcome')}</h2>
            <p className="text-gray-500 text-sm mb-8">{t('welcome_sub')}</p>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <label htmlFor="phone" className="label">{t('phone_label')}</label>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="(555) 000-0000"
                  className="input-field text-lg"
                  autoFocus
                  autoComplete="tel"
                  disabled={loading}
                />
                <p className="mt-2 text-xs text-gray-400">{t('phone_hint')}</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex gap-3">
                    <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
                    </svg>
                    <p className="text-red-700 text-sm leading-snug">{error}</p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || normalizePhone(phone).length < 7}
                className="btn-primary"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {t('checking')}
                  </span>
                ) : t('continue_btn')}
              </button>
            </form>
          </div>

          <div className="mt-6 bg-gold/5 border border-gold/30 rounded-xl p-4">
            <p className="text-black text-xs font-semibold text-center">{t('emergency')}</p>
            <p className="text-gray-500 text-xs text-center mt-1">
              {t('emergency_sub')}{' '}
              <a
                href={FIRM_PHONE_TEL}
                className="text-gold font-bold underline underline-offset-2 whitespace-nowrap py-3.5 hover:text-gold-dark active:text-gold-dark"
              >
                {FIRM_PHONE_LABEL}
              </a>.
            </p>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Law Offices of Jack D. Josephson, APC · California Employment Law
          </p>
        </div>
      </main>
    </div>
  )
}

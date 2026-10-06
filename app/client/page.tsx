'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { normalizePhone, setSession, getSession, formatPhone } from '@/lib/auth'
import { FIRM_PHONE_LABEL, FIRM_PHONE_TEL } from '@/lib/contact'
import { useLanguage } from '@/lib/i18n'
import LanguagePicker from '@/components/LanguagePicker'

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

/**
 * When the office opened the case, in the client's own language.
 *
 * It is on the picker because two cases with no folder and no note read
 * identically without it, and then the choice is a guess.
 */
function openedOn(iso: string, lang: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  try {
    return d.toLocaleDateString(lang, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return d.toISOString().slice(0, 10)
  }
}

function nextPath(): string {
  if (typeof window === 'undefined') return '/dashboard'
  const raw = new URLSearchParams(window.location.search).get('next') ?? ''
  return SAFE_NEXT.test(raw) ? raw : '/dashboard'
}

/** One case as the sign-in screen offers it. */
interface FoundCase {
  id: string
  name: string
  case_type: string
  case_label: string
  opened: string
}

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  /**
   * Where the sign-in is: the number, then the code texted to it, then — for a
   * person on more than one case — which case. Nothing about the number is
   * shown until the code comes back right.
   */
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  /** When a new code may be asked for, so a second tap does not text twice. */
  const [resendAt, setResendAt] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  /**
   * The cases on this number, once there is more than one to choose between.
   * A client suing two employers has a row per employer, because a row holds
   * one set of questionnaire answers and the two jobs are not the same facts.
   */
  const [choices, setChoices] = useState<FoundCase[]>([])
  const router = useRouter()
  const { t, lang } = useLanguage()

  useEffect(() => {
    const session = getSession()
    if (session) router.replace(nextPath())
  }, [router])

  useEffect(() => {
    if (step !== 'code') return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [step])

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d\s\-()]/g, '')
    const digits = raw.replace(/\D/g, '').slice(0, 10)
    setPhone(formatPhone(digits))
    setError('')
    // Editing the number abandons whatever was found for the old one.
    setChoices([])
  }

  /** True when the list cannot be told apart by what is shown on it. */
  const ambiguous =
    choices.length > 1 &&
    new Set(choices.map(c => `${c.case_label}|${c.case_type}|${openedOn(c.opened, lang)}`)).size <
      choices.length

  const say = (reason: unknown) => {
    const known: Record<string, Parameters<typeof t>[0]> = {
      code_invalid: 'code_invalid',
      code_too_many: 'code_too_many',
      wait: 'code_wait',
      unavailable: 'code_unavailable',
      not_found: 'not_found',
    }
    return t(known[String(reason)] ?? 'code_invalid')
  }

  /**
   * Remembered locally for drawing — the name and the case type. Every request
   * for anything of this client's is answered on the cookie the server set,
   * which the browser cannot write.
   */
  const remember = (client: { id: string; name: string; case_type?: string }) => {
    setSession({
      clientId: client.id,
      phone: normalizePhone(phone),
      name: client.name,
      caseType: client.case_type ?? '',
    })
    router.replace(nextPath())
  }

  const askForCode = async () => {
    setError('')
    setLoading(true)
    const res = await fetch('/api/clients/code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: normalizePhone(phone), lang }),
    }).catch(() => null)
    setLoading(false)
    if (!res?.ok) {
      const body = res ? await res.json().catch(() => ({})) : {}
      setError(say(body.error ?? 'unavailable'))
      return
    }
    setCode('')
    setStep('code')
    setResendAt(Date.now() + 60_000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await askForCode()
  }

  const handleCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/clients/code/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: normalizePhone(phone), code }),
    }).catch(() => null)
    const body = res ? await res.json().catch(() => ({})) : {}
    if (!res?.ok) {
      setError(say(body.error ?? 'unavailable'))
      setLoading(false)
      return
    }
    // One case is the ordinary path. Two means the office has this person on
    // two matters, and only they can say which one they came here for.
    if (body.signedIn) { remember(body.signedIn); return }
    setChoices(body.cases ?? [])
    setLoading(false)
  }

  const signIn = async (client: FoundCase) => {
    const res = await fetch('/api/clients/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: client.id }),
    }).catch(() => null)

    if (!res?.ok) {
      const body = res ? await res.json().catch(() => ({})) : {}
      setError(body.error ?? t('not_found'))
      setLoading(false)
      return
    }
    remember(client)
  }

  const startOver = () => {
    setChoices([])
    setPhone('')
    setCode('')
    setStep('phone')
    setError('')
  }

  const waitSeconds = Math.max(0, Math.ceil((resendAt - now) / 1000))

  const errorBox = error ? (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
      <div className="flex gap-3">
        <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
        </svg>
        <p className="text-red-700 text-sm leading-snug">{error}</p>
      </div>
    </div>
  ) : null

  const spinner = (
    <span className="flex items-center justify-center gap-2">
      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      {t('checking')}
    </span>
  )

  return (
    <div className="min-h-screen bg-white flex flex-col animate-fade-in">
      <header className="bg-black py-8 px-4 text-center border-b border-white/10">
        <div className="flex flex-col items-center gap-3">
          <Image src="/logo.png" alt="866 JACK LAW" width={120} height={120} className="rounded-sm animate-slide-up" priority />
          <div>
            <p className="text-white/60 text-sm font-medium">Law Offices of Jack D. Josephson, APC</p>
            <p className="text-gold/90 text-xs mt-0.5 tracking-wider uppercase">Client Portal</p>
          </div>
          {/* Language choice, in every language, before anything has to be read */}
          <div className="mt-2">
            <LanguagePicker variant="row" />
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 pt-8 pb-16 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="card animate-slide-up stagger-1">
            <h2 className="text-xl font-semibold text-navy mb-1">{t('welcome')}</h2>
            <p className="text-gray-500 text-sm mb-8">{t('welcome_sub')}</p>

            {choices.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">{t('choose_case')}</p>
                {choices.map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => { void signIn(c) }}
                    className="w-full flex items-center gap-3 text-left border border-gray-200 rounded-xl p-4 hover:border-gold hover:bg-gold/5 transition-colors"
                  >
                    <span className="text-xl">📁</span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold text-navy truncate">
                        {c.case_label}
                        {/* Two cases the office has not named yet, opened the
                            same day, would read identically — and then the
                            choice is a coin toss. Numbering them at least makes
                            them two different things to pick between. */}
                        {ambiguous && ` (${i + 1})`}
                      </span>
                      <span className="block text-xs text-gray-400 mt-0.5 truncate">
                        {[c.case_type, openedOn(c.opened, lang)].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
                {errorBox}
                <button
                  onClick={startOver}
                  className="text-sm text-gray-400 hover:text-navy transition-colors pt-1"
                >
                  {t('use_another_number')}
                </button>
              </div>
            ) : step === 'phone' ? (
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

              {errorBox}

              <button
                type="submit"
                disabled={loading || normalizePhone(phone).length < 10}
                className="btn-primary"
              >
                {loading ? spinner : t('continue_btn')}
              </button>
            </form>
            ) : (
            <form onSubmit={handleCode} className="space-y-5" noValidate>
              <p className="text-sm text-gray-600">{t('code_sent')}</p>
              <div>
                <label htmlFor="code" className="label">{t('code_label')}</label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }}
                  placeholder="000000"
                  className="input-field text-lg tracking-[0.4em]"
                  autoFocus
                  autoComplete="one-time-code"
                  disabled={loading}
                />
                <p className="mt-2 text-xs text-gray-400">{t('code_hint')}</p>
              </div>

              {errorBox}

              <button type="submit" disabled={loading || code.length !== 6} className="btn-primary">
                {loading ? spinner : t('verify_btn')}
              </button>

              <div className="flex items-center justify-between gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => { void askForCode() }}
                  disabled={loading || waitSeconds > 0}
                  className="text-gold font-semibold disabled:text-gray-300"
                >
                  {t('code_resend')}{waitSeconds > 0 ? ` (${waitSeconds})` : ''}
                </button>
                <button type="button" onClick={startOver} className="text-gray-400 hover:text-navy transition-colors">
                  {t('use_another_number')}
                </button>
              </div>
              <p className="text-xs text-gray-400">{t('code_none')}</p>
            </form>
            )}
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

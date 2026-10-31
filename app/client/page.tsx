'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { normalizePhone, setSession, getSession, formatPhone } from '@/lib/auth'
import { typedPhoneDigits } from '@/lib/phoneNumber'
import { isLang } from '@/lib/langs'
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
  portal_lang?: string | null
}

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  /**
   * The cases on this number, once there is more than one to choose between.
   * A client suing two employers has a row per employer, because a row holds
   * one set of questionnaire answers and the two jobs are not the same facts.
   */
  const [choices, setChoices] = useState<FoundCase[]>([])
  /**
   * A number with no case on it: someone new, starting by themselves. They give
   * their name, a code is texted to the number, and the code starts their file
   * (app/api/clients/signup). Null while signing in as before.
   */
  const [signup, setSignup] = useState<null | 'name' | 'code'>(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const router = useRouter()
  const { t, lang, adopt } = useLanguage()

  useEffect(() => {
    const session = getSession()
    if (session) router.replace(nextPath())
  }, [router])

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = typedPhoneDigits(e.target.value)
    setPhone(formatPhone(digits))
    setError('')
    // Editing the number abandons whatever was found for the old one.
    setChoices([])
  }

  /** Back to the number box, with nothing found or started. */
  const startOver = () => {
    setChoices([])
    setSignup(null)
    setCode('')
    setError('')
    setPhone('')
  }

  /** What a refused sign-up step means, in the client's language. */
  const signupError = (reason?: string) => {
    switch (reason) {
      case 'wrong-code': return t('signup_wrong_code')
      case 'expired': return t('signup_expired')
      case 'too-many': return t('signup_too_many')
      case 'opted-out': return t('signup_opted_out')
      case 'bad-name': return t('signup_bad_name')
      case 'bad-number': return t('signup_bad_number')
      default: return t('signup_failed')
    }
  }

  /** True when the list cannot be told apart by what is shown on it. */
  const ambiguous =
    choices.length > 1 &&
    new Set(choices.map(c => `${c.case_label}|${c.case_type}|${openedOn(c.opened, lang)}`)).size <
      choices.length

  /**
   * The session the portal actually runs on is the cookie the server sets.
   *
   * What is kept locally is the name and the case type, for drawing; every
   * request for anything of this client's is answered on the cookie, which the
   * browser cannot write.
   */
  const signIn = async (client: FoundCase) => {
    const res = await fetch('/api/clients/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: normalizePhone(phone), clientId: client.id }),
    }).catch(() => null)

    if (!res?.ok) {
      const body = res ? await res.json().catch(() => ({})) : {}
      setError(body.error ?? t('not_found'))
      setLoading(false)
      return
    }

    setSession({
      clientId: client.id,
      phone: normalizePhone(phone),
      name: client.name,
      caseType: client.case_type ?? '',
    })
    // A phone that has never been given a language opens in English; the
    // office's record of this client's language is the better guess.
    if (isLang(client.portal_lang)) adopt(client.portal_lang)
    router.replace(nextPath())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await findAndSignIn()
  }

  const findAndSignIn = async () => {
    setError('')
    setLoading(true)

    const normalized = normalizePhone(phone)
    const res = await fetch('/api/clients/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: normalized }),
    })
    const { clients } = await res.json()
    const found: FoundCase[] = clients ?? []

    // One case is the ordinary path and nothing about it changes. Two means the
    // office has this person on two matters, and only they can say which one
    // they came here for.
    if (found.length === 1) { await signIn(found[0]); return }
    else if (found.length > 1) setChoices(found)
    // Nobody on this number: a new client, who can start here themselves — once
    // the number is a whole one a code can be texted to.
    else if (normalized.length < 10) setError(t('signup_bad_number'))
    else setSignup('name')

    setLoading(false)
  }

  /** Texts the code. A number the office added in the meantime signs in instead. */
  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!name.trim()) { setError(t('signup_bad_name')); return }
    setError('')
    setLoading(true)
    const res = await fetch('/api/clients/signup/code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: normalizePhone(phone), lang }),
    }).catch(() => null)
    const body = res ? await res.json().catch(() => ({})) : {}
    setLoading(false)
    if (res?.ok) { setCode(''); setSignup('code'); return }
    if (body.reason === 'on-file') { setSignup(null); await findAndSignIn(); return }
    setError(signupError(body.reason))
  }

  /** Checks the code and starts their file; the server signs this browser in to it. */
  const startFile = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/clients/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: normalizePhone(phone), code, name, lang }),
    }).catch(() => null)
    const body = res ? await res.json().catch(() => ({})) : {}
    if (!res?.ok || !body.client) {
      setLoading(false)
      if (body.reason === 'on-file') { setSignup(null); await findAndSignIn(); return }
      setError(signupError(body.reason))
      return
    }
    setSession({
      clientId: body.client.id,
      phone: normalizePhone(phone),
      name: body.client.name,
      caseType: body.client.case_type ?? '',
    })
    router.replace(nextPath())
  }

  const errorBox = error && (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
      <div className="flex gap-3">
        <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
        </svg>
        <p className="text-red-700 text-sm leading-snug">{error}</p>
      </div>
    </div>
  )

  const spinner = (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )

  return (
    <div className="min-h-screen bg-canvas flex flex-col animate-fade-in">
      <header className="bg-black pt-10 pb-7 px-4 text-center border-b border-white/10">
        <div className="flex flex-col items-center gap-3">
          <Image src="/logo.png" alt="866 JACK LAW" width={104} height={104} className="rounded-sm animate-slide-up" priority />
          <div>
            <p className="text-white/70 text-sm font-medium">Law Offices of Jack D. Josephson, APC</p>
            <p className="text-gold text-[11px] mt-1 font-semibold tracking-[0.16em] uppercase">Client Portal</p>
          </div>
          {/* Language choice, in every language, before anything has to be read */}
          <div className="mt-2">
            <LanguagePicker variant="row" />
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 pt-8 pb-16">
        <div className="w-full max-w-md">
          <div className="card animate-slide-up stagger-1">
            <h1 className="text-[22px] font-semibold tracking-tight text-gray-950 mb-1">
              {signup ? t('signup_title') : t('welcome')}
            </h1>
            <p className="text-gray-500 text-[15px] leading-relaxed mb-7">
              {signup ? t('signup_sub') : t('welcome_sub')}
            </p>

            {choices.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">{t('choose_case')}</p>
                {choices.map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => { void signIn(c) }}
                    className="w-full flex items-center gap-3 text-left bg-white border border-gray-300 rounded-xl p-4 hover:border-gray-400 hover:bg-gray-50 transition-colors"
                  >
                    <span className="w-9 h-9 rounded-lg bg-canvas border border-line flex items-center justify-center shrink-0">
                      <svg className="w-[18px] h-[18px] text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                      </svg>
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold text-gray-950 truncate">
                        {c.case_label}
                        {/* Two cases the office has not named yet, opened the
                            same day, would read identically — and then the
                            choice is a coin toss. Numbering them at least makes
                            them two different things to pick between. */}
                        {ambiguous && ` (${i + 1})`}
                      </span>
                      <span className="block text-xs text-gray-500 mt-0.5 truncate">
                        {[c.case_type, openedOn(c.opened, lang)].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
                <button
                  onClick={startOver}
                  className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors pt-1"
                >
                  {t('use_another_number')}
                </button>
              </div>
            ) : signup ? (
              <form onSubmit={signup === 'name' ? sendCode : startFile} className="space-y-5" noValidate>
                <p className="text-sm text-gray-600">
                  {t('phone_label')}: <span className="font-semibold text-gray-950">{phone}</span>
                </p>

                {signup === 'name' ? (
                  <div>
                    <label htmlFor="name" className="label">{t('signup_name_label')}</label>
                    <input
                      id="name"
                      value={name}
                      onChange={e => { setName(e.target.value); setError('') }}
                      className="input-field text-lg"
                      autoFocus
                      autoComplete="name"
                      maxLength={100}
                      disabled={loading}
                    />
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600 mb-3">
                      {t('signup_code_sent')} <span className="font-semibold text-gray-950 whitespace-nowrap">{phone}</span>
                    </p>
                    <label htmlFor="code" className="label">{t('signup_code_label')}</label>
                    <input
                      id="code"
                      value={code}
                      onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="000000"
                      className="input-field text-lg tracking-[0.3em]"
                      autoFocus
                      disabled={loading}
                    />
                  </div>
                )}

                {errorBox}

                <button
                  type="submit"
                  disabled={loading || (signup === 'name' ? name.trim().length < 2 : code.length !== 6)}
                  className="btn-primary"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">{spinner}{t('checking')}</span>
                  ) : signup === 'name' ? t('signup_send_code') : t('signup_start')}
                </button>

                <div className="flex flex-wrap justify-between gap-2">
                  <button
                    type="button"
                    onClick={startOver}
                    className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    {t('use_another_number')}
                  </button>
                  {signup === 'code' && (
                    <button
                      type="button"
                      onClick={() => { void sendCode() }}
                      disabled={loading}
                      className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                    >
                      {t('signup_resend')}
                    </button>
                  )}
                </div>
              </form>
            ) : (
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
                <p className="mt-2 text-[13px] text-gray-500">{t('phone_hint')}</p>
              </div>

              {errorBox}

              <button
                type="submit"
                disabled={loading || normalizePhone(phone).length < 7}
                className="btn-primary"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">{spinner}{t('checking')}</span>
                ) : t('continue_btn')}
              </button>
            </form>
            )}
          </div>

          <div className="mt-5 bg-white/70 border border-line rounded-2xl px-4 py-3.5">
            <p className="text-gray-900 text-[13px] font-semibold text-center">{t('emergency')}</p>
            <p className="text-gray-600 text-[13px] text-center mt-1 leading-relaxed">
              {t('emergency_sub')}{' '}
              <a
                href={FIRM_PHONE_TEL}
                className="text-gray-900 font-semibold underline decoration-gray-300 underline-offset-2 whitespace-nowrap py-3.5 hover:decoration-gray-900"
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

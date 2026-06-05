'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import {
  getPendingVerification,
  clearPendingVerification,
  setSession,
  maskPhone,
} from '@/lib/auth'

export default function VerifyPage() {
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [pending, setPending] = useState<{ phone: string; clientId: string; otp: string; clientName: string; caseType: string } | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const router = useRouter()

  useEffect(() => {
    const p = getPendingVerification()
    if (!p) {
      router.replace('/client')
      return
    }
    setPending(p)
  }, [router])

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...code]
    next[index] = digit
    setCode(next)
    setError('')

    // Auto-advance to next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!text) return
    const next = [...code]
    text.split('').forEach((d, i) => { if (i < 6) next[i] = d })
    setCode(next)
    inputRefs.current[Math.min(text.length, 5)]?.focus()
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pending) return

    const entered = code.join('')
    if (entered.length < 6) {
      setError('Please enter all 6 digits.')
      return
    }

    setLoading(true)
    await new Promise(r => setTimeout(r, 600))

    /**
     * TODO (Production): Replace with a real OTP verification API call.
     * Example: POST /api/auth/verify-otp { phone, token }
     * Use Twilio Verify, AWS SNS, or Firebase Auth.
     * Never verify OTPs on the client side.
     */
    if (entered === pending.otp) {
      setSession({
        clientId: pending.clientId,
        phone: pending.phone,
        name: pending.clientName,
        caseType: pending.caseType,
      })
      clearPendingVerification()

      // Resume questionnaire if in progress
      const qRes = await fetch(`/api/questionnaire?clientId=${pending.clientId}`)
      const { state } = await qRes.json()
      if (state && !state.submitted && state.completedSections.length > 0) {
        router.replace('/questionnaire')
      } else {
        router.replace('/dashboard')
      }
    } else {
      setError('Incorrect code. Please try again.')
      setCode(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    }

    setLoading(false)
  }

  const handleResend = () => {
    setResendCooldown(30)
    setCode(['', '', '', '', '', ''])
    setError('')
    inputRefs.current[0]?.focus()
    // In production: re-trigger the SMS via your backend
  }

  if (!pending) return null

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header showBack backHref="/client" />

      <main className="flex-1 flex items-start justify-center px-4 pt-8 pb-16 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="card">
            {/* Icon */}
            <div className="w-14 h-14 bg-gold/10 rounded-full flex items-center justify-center mb-5">
              <svg className="w-7 h-7 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>

            <h2 className="text-xl font-semibold text-black mb-1">Enter Verification Code</h2>
            <p className="text-gray-500 text-sm mb-1">A 6-digit code was sent to</p>
            <p className="text-black font-semibold text-base mb-5">{maskPhone(pending.phone)}</p>

            <form onSubmit={handleVerify} className="space-y-6">
              <div>
                <label className="label text-center block mb-3">Verification Code</label>
                {/* OTP boxes — larger on mobile */}
                <div className="flex gap-2 sm:gap-3 justify-center" onPaste={handlePaste}>
                  {code.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { inputRefs.current[i] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleDigitChange(i, e.target.value)}
                      onKeyDown={e => handleKeyDown(i, e)}
                      className={`w-11 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold border-2 rounded-xl
                        focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold
                        transition-colors ${digit ? 'border-gold bg-gold/10 text-gold' : 'border-gray-200 bg-gray-50'}
                        ${error ? 'border-red-400 bg-red-50' : ''}`}
                      disabled={loading}
                      aria-label={`Digit ${i + 1}`}
                      autoComplete="one-time-code"
                    />
                  ))}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-red-700 text-sm text-center">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || code.join('').length < 6}
                className="btn-primary"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Verifying…
                  </span>
                ) : 'Verify Code'}
              </button>
            </form>
          </div>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              Didn&apos;t receive a code?{' '}
              {resendCooldown > 0 ? (
                <span className="text-gray-400">Resend in {resendCooldown}s</span>
              ) : (
                <button onClick={handleResend} className="text-gold font-medium hover:underline">
                  Resend code
                </button>
              )}
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

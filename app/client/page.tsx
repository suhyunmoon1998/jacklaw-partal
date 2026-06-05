'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  normalizePhone,
  setSession,
  getSession,
  formatPhone,
} from '@/lib/auth'

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Redirect if already logged in
  useEffect(() => {
    const session = getSession()
    if (session) router.replace('/dashboard')
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
      router.replace('/dashboard')
    } else {
      setError('We could not find your file. Please contact the office.')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-black py-8 px-4 text-center border-b border-white/10">
        <div className="flex flex-col items-center gap-3">
          <Image
            src="/logo.png"
            alt="866 JACK LAW"
            width={120}
            height={120}
            className="rounded-sm"
            priority
          />
          <div>
            <p className="text-white/60 text-sm font-medium">Law Offices of Jack D. Josephson, APC</p>
            <p className="text-gold/90 text-xs mt-0.5 tracking-wider uppercase">Client Portal</p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-start justify-center px-4 pt-8 pb-16 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="card">
            <h2 className="text-xl font-semibold text-navy mb-1">Welcome</h2>
            <p className="text-gray-500 text-sm mb-8">
              Enter the phone number you provided to our office to access your portal.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <label htmlFor="phone" className="label">
                  Phone Number
                </label>
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
                <p className="mt-2 text-xs text-gray-400">
                  Use the phone number you gave our office.
                </p>
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
                    Checking...
                  </span>
                ) : 'Continue'}
              </button>
            </form>
          </div>


          <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-700 text-xs font-semibold text-center">
              ⚠ Do not use this portal for emergencies.
            </p>
            <p className="text-red-600 text-xs text-center mt-1">
              For urgent matters, call our office directly.
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

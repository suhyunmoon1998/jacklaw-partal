'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function PortalHome() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <header className="pt-12 pb-8 px-4 text-center">
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/logo.png"
            alt="866 JACK LAW"
            width={100}
            height={100}
            className="rounded-sm"
            priority
          />
          <div>
            <h1 className="text-white font-bold text-xl tracking-tight">866 JACK LAW</h1>
            <p className="text-white/50 text-sm mt-0.5">Law Offices of Jack D. Josephson, APC</p>
          </div>
        </div>
      </header>

      {/* Portal selector */}
      <main className="flex-1 flex flex-col items-center justify-start px-4 pt-4 pb-16">
        <div className="w-full max-w-sm">
          <p className="text-white/40 text-xs uppercase tracking-widest text-center mb-6 font-semibold">
            Select Portal
          </p>

          {/* Intake Form */}
          <button
            onClick={() => router.push('/intake')}
            className="w-full mb-4 group relative bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 hover:border-gold/50 rounded-2xl p-6 text-left transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gold/15 group-hover:bg-gold rounded-xl flex items-center justify-center shrink-0 transition-colors">
                <svg className="w-6 h-6 text-gold group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-base">Client Information Form</p>
                <p className="text-white/40 text-sm mt-0.5">Start your intake questionnaire</p>
              </div>
              <svg className="w-5 h-5 text-white/20 group-hover:text-gold transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* Client Portal */}
          <button
            onClick={() => router.push('/client')}
            className="w-full mb-4 group relative bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 hover:border-gold/50 rounded-2xl p-6 text-left transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gold/15 group-hover:bg-gold rounded-xl flex items-center justify-center shrink-0 transition-colors">
                <svg className="w-6 h-6 text-gold group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-base">Client Portal</p>
                <p className="text-white/40 text-sm mt-0.5">Access your case, questionnaire &amp; documents</p>
              </div>
              <svg className="w-5 h-5 text-white/20 group-hover:text-gold transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* Admin Portal */}
          <button
            onClick={() => router.push('/admin')}
            className="w-full group relative bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 hover:border-gold/50 rounded-2xl p-6 text-left transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gold/15 group-hover:bg-gold rounded-xl flex items-center justify-center shrink-0 transition-colors">
                <svg className="w-6 h-6 text-gold group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-base">Admin Portal</p>
                <p className="text-white/40 text-sm mt-0.5">Internal management · Staff only</p>
              </div>
              <svg className="w-5 h-5 text-white/20 group-hover:text-gold transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          <div className="mt-8 text-center">
            <a
              href="tel:+18668225529"
              className="inline-flex items-center gap-2 text-gold/70 hover:text-gold text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              866-JACK-LAW
            </a>
          </div>
        </div>
      </main>

      <footer className="pb-8 text-center">
        <p className="text-white/20 text-xs">
          Law Offices of Jack D. Josephson, APC · California Employment Law
        </p>
      </footer>
    </div>
  )
}

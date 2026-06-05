'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { clearSession } from '@/lib/auth'

interface HeaderProps {
  showLogout?: boolean
  showBack?: boolean
  backHref?: string
  subtitle?: string
}

export default function Header({ showLogout, showBack, backHref, subtitle }: HeaderProps) {
  const router = useRouter()

  const handleLogout = () => {
    clearSession()
    router.push('/client')
  }

  const handleBack = () => {
    if (backHref) {
      router.push(backHref)
    } else {
      router.back()
    }
  }

  return (
    <header className="bg-black shadow-sm border-b border-white/10">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left: Back button or spacer */}
        <div className="w-20">
          {showBack && (
            <button
              onClick={handleBack}
              className="text-white/70 hover:text-white flex items-center gap-1 text-sm font-medium transition-colors"
              aria-label="Go back"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          )}
        </div>

        {/* Center: Logo */}
        <div className="text-center">
          <div className="flex flex-col items-center">
            <Image
              src="/logo.png"
              alt="866 JACK LAW"
              width={60}
              height={60}
              className="rounded-sm"
              priority
            />
            {subtitle && (
              <p className="text-white/50 text-xs mt-1 tracking-wider uppercase">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right: Logout or spacer */}
        <div className="w-20 flex justify-end">
          {showLogout && (
            <button
              onClick={handleLogout}
              className="text-white/60 hover:text-white text-sm font-medium transition-colors"
            >
              Log out
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
